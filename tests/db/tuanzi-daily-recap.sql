-- Disposable PostgreSQL only; after previous Tuanzi fixtures and migrations.
\set ON_ERROR_STOP on
do $$
declare
  v_space uuid;
  v_day date;
  v_s jsonb;
  v_cat jsonb;
  v_fish jsonb;
  v_reminder jsonb;
  v_message jsonb;
  v_id uuid;
  v_count integer;
begin
  select id into v_space from public.couple_spaces where slug='couple-better-game';
  v_day:=(now() at time zone 'Asia/Shanghai')::date;
  -- Prior lifecycle leaves Cat mood and breakfast/lunch, Fish sleep.
  update public.mood_entries set mood_key='neutral' where couple_space_id=v_space and partner_key='cat' and mood_date=v_day;
  update public.sleep_records set fell_asleep_at='2026-11-05T23:10:00+08'::timestamptz,
    woke_at='2026-11-06T07:10:00+08'::timestamptz
    where couple_space_id=v_space and partner_key='fish' and sleep_date=v_day;
  update public.meals set total_calories_kcal=320
    where couple_space_id=v_space and partner_key='cat' and meal_date=v_day and meal_type='breakfast';
  update public.meals set total_calories_kcal=null
    where couple_space_id=v_space and partner_key='cat' and meal_date=v_day and meal_type='lunch';
  insert into public.meals(couple_space_id,partner_key,meal_date,meal_type,status,total_calories_kcal)
  values(v_space,'cat',v_day,'snack','confirmed',150);
  v_s:=private.life_daily_summary(v_space,'cat',v_day);
  if v_s->>'mood'<>'心动' then raise exception 'incorrect mood mapping: %',v_s;end if;
  if (v_s->>'total')::int<>470 or (v_s->>'unknownCount')::int<>1
    or (v_s->>'snack')::int<>150 then raise exception 'meal aggregation incorrect: %',v_s;end if;
  if private.life_daily_summary_lines(v_s) not like '%今日饮食合计：470 kcal（仅已知部分）%'
    or private.life_daily_summary_lines(v_s) not like '%午餐：热量未知%'
    then raise exception 'unknown calories misleading: %',private.life_daily_summary_lines(v_s);end if;
  v_s:=private.life_daily_summary(v_space,'fish',v_day);
  if (v_s->>'sleepMinutes')::int<>480
    or private.life_daily_summary_lines(v_s) not like '%8小时0分钟%' then
      raise exception 'sleep duration incorrect: %',v_s; end if;

  -- Explicitly verify fully completed days still claim a summary.
  insert into public.sleep_records(couple_space_id,partner_key,sleep_date,fell_asleep_at,woke_at)
  values(v_space,'cat',v_day,'2026-11-05T23:00:00+08','2026-11-06T07:00:00+08')
  on conflict do nothing;
  insert into public.mood_entries(couple_space_id,partner_key,mood_date,mood_key)
  values(v_space,'fish',v_day,'happy');
  insert into public.meals(couple_space_id,partner_key,meal_date,meal_type,status,total_calories_kcal)
  values (v_space,'cat',v_day,'dinner','confirmed',500),
         (v_space,'fish',v_day,'breakfast','confirmed',400),
         (v_space,'fish',v_day,'lunch','confirmed',500),
         (v_space,'fish',v_day,'dinner','confirmed',500);
  -- Verify the outgoing payload has factual snapshots, without claiming real delivery.
  v_cat:=private.life_daily_summary(v_space,'cat',v_day);
  v_fish:=private.life_daily_summary(v_space,'fish',v_day);
  v_reminder:=jsonb_build_object('kind','daily_record','localDate',v_day,
    'missingItems','[]'::jsonb,'partnerMissingItems','[]'::jsonb,
    'selfSummary',v_cat,'partnerSummary',v_fish);
  v_message:=private.life_pushplus_message('cat',v_reminder);
  if v_message->>'content' not like '%今日饮食合计%'
    or v_message->>'content' not like '%今天的记录都齐啦%'
    or v_message->>'content' not like '%老婆的今日记录%'
    then raise exception 'full-day summary not rendered: %',v_message;end if;
  if v_message is distinct from private.life_pushplus_message('cat',v_reminder)
    then raise exception 'unstable summary copy';end if;

  -- Insert a harmless disposable proposal to exercise escaped title and schedule.
  insert into public.life_proposals(couple_space_id,title,scheduled_at)
  values(v_space,'一起散步 <3 & 休息',now()+interval '2 days')
  returning id into v_id;
  perform private.life_proposal_notify(
    (select p from public.life_proposals p where id=v_id),'fish','invite',now(),1);
  select count(*) into v_count from public.life_reminder_instances
    where source_ref=v_id::text and recipient='fish' and title like '%Beside%'
      and content like '%一起散步 &lt;3 &amp; 休息%'
      and content like '%北京时间%' and content not like '%Ta 邀请%';
  if v_count<>1 then raise exception 'proposal copy missing escaping, actor voice, or schedule';end if;
end $$;
