-- Daily real-value recap and affectionate, factual proposal messages.
-- Forward-only; Production requires separate user approval.
-- Daily snapshot: preserve unknown calorie estimates and include snack in a
-- separate total. The aggregation never writes or infers personal intake.
create or replace function private.life_daily_summary(
  p_space uuid,p_actor text,p_day date
) returns jsonb language plpgsql stable security invoker
set search_path=pg_catalog,public,private as $$
declare
  v_mood text;
  v_sleep_minutes integer;
  v_breakfast integer;
  v_lunch integer;
  v_dinner integer;
  v_snack integer;
  v_total integer;
  v_snack_count integer;
  v_unknown integer;
  v_confirmed integer;
  v_breakfast_unknown boolean;
  v_lunch_unknown boolean;
  v_dinner_unknown boolean;
begin
  if p_actor not in ('cat','fish') then raise exception 'invalid actor'; end if;
  select case mood_key
    when 'happy' then '开心' when 'calm' then '平静'
    when 'neutral' then '心动' when 'anxious' then '烦躁'
    when 'sad' then '伤心' when 'angry' then '生气'
    when 'tired' then '心累' when 'excited' then '兴奋'
    else '未知心情' end into v_mood
    from public.mood_entries
    where couple_space_id=p_space and partner_key=p_actor and mood_date=p_day;
  select round(extract(epoch from (woke_at-fell_asleep_at))/60)::integer into v_sleep_minutes
    from public.sleep_records
    where couple_space_id=p_space and partner_key=p_actor and sleep_date=p_day;
  select
    sum(total_calories_kcal) filter(where meal_type='breakfast'),
    sum(total_calories_kcal) filter(where meal_type='lunch'),
    sum(total_calories_kcal) filter(where meal_type='dinner'),
    sum(total_calories_kcal) filter(where meal_type='snack'),
    sum(total_calories_kcal),
    count(*) filter(where meal_type='snack'),
    count(*) filter(where total_calories_kcal is null),
    count(*),
    count(*) filter(where meal_type='breakfast' and total_calories_kcal is null)>0,
    count(*) filter(where meal_type='lunch' and total_calories_kcal is null)>0,
    count(*) filter(where meal_type='dinner' and total_calories_kcal is null)>0
  into v_breakfast,v_lunch,v_dinner,v_snack,v_total,v_snack_count,
       v_unknown,v_confirmed,v_breakfast_unknown,v_lunch_unknown,v_dinner_unknown
  from public.meals where couple_space_id=p_space and partner_key=p_actor
    and meal_date=p_day and deleted_at is null and status='confirmed';
  return jsonb_build_object(
    'mood',v_mood,'sleepMinutes',v_sleep_minutes,
    'breakfast',v_breakfast,'lunch',v_lunch,'dinner',v_dinner,
    'snack',v_snack,'total',v_total,
    'breakfastUnknown',v_breakfast_unknown,'lunchUnknown',v_lunch_unknown,
    'dinnerUnknown',v_dinner_unknown,
    'snackCount',v_snack_count,'unknownCount',v_unknown,
    'confirmedCount',v_confirmed
  );
end $$;
revoke all on function private.life_daily_summary(uuid,text,date) from public,anon,authenticated;

create or replace function private.life_daily_summary_lines(p jsonb)
returns text language plpgsql immutable security invoker
set search_path=pg_catalog as $$
declare
  v_snacks int:=coalesce((p->>'snackCount')::integer,0);
  v_unknown int:=coalesce((p->>'unknownCount')::integer,0);
  v_sleep int:=(p->>'sleepMinutes')::integer;
  v_total text;
  v_b text;
  v_l text;
  v_d text;
begin
  if p is null then return '暂无详细记录';end if;
  v_b:=case when p->>'breakfast' is not null then p->>'breakfast'||' kcal'
    when coalesce((p->>'breakfastUnknown')::boolean,false) then '热量未知'
    else '未记录' end;
  v_l:=case when p->>'lunch' is not null then p->>'lunch'||' kcal'
    when coalesce((p->>'lunchUnknown')::boolean,false) then '热量未知'
    else '未记录' end;
  v_d:=case when p->>'dinner' is not null then p->>'dinner'||' kcal'
    when coalesce((p->>'dinnerUnknown')::boolean,false) then '热量未知'
    else '未记录' end;
  v_total:=case when p->>'total' is null then
      case when coalesce((p->>'confirmedCount')::integer,0)>0 then '暂无已知热量'
        else '暂无已记录饮食' end
    else p->>'total'||' kcal'||
      case when v_unknown>0 or v_b='未记录' or v_l='未记录' or v_d='未记录'
        then '（仅已知部分）' else '' end end;
  return '💗 心情：'||coalesce(p->>'mood','未记录')
    ||'<br>🌙 睡眠：'||case when v_sleep is null then '未记录'
        else (v_sleep/60)::text||'小时'||(v_sleep%60)::text||'分钟' end
    ||'<br>🍳 早餐：'||v_b||'<br>🍱 午餐：'||v_l
    ||'<br>🍚 晚餐：'||v_d
    ||'<br>🍪 零食：'||case when v_snacks=0 then '未记录'
         when p->>'snack' is null then v_snacks::text||'条（热量未知）'
         else p->>'snack'||' kcal（'||v_snacks::text||'条）' end
    ||'<br><b>今日饮食合计：'||v_total||'</b>'
    ||case when v_unknown>0 then '<br>其中'||v_unknown::text||'条已确认饮食热量未知' else '' end;
end $$;
revoke all on function private.life_daily_summary_lines(jsonb) from public,anon,authenticated;

create or replace function public.claim_life_notification_reminders(
  p_actor text,
  p_now timestamptz default now(),
  p_space_slug text default 'couple-better-game'
) returns jsonb
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  v_space_id uuid;
  v_pref public.life_notification_preferences%rowtype;
  v_local_ts timestamp without time zone;
  v_local_date date;
  v_local_time time without time zone;
  v_delivery_id uuid;
  v_completeness jsonb;
  v_partner_completeness jsonb;
  v_partner_actor text;
  v_self_summary jsonb;
  v_partner_summary jsonb;
  v_reminders jsonb := '[]'::jsonb;
begin
  if p_actor not in ('cat', 'fish') then raise exception 'Invalid reminder actor'; end if;

  select id into v_space_id
  from public.couple_spaces
  where slug = p_space_slug and archived_at is null;
  if v_space_id is null then raise exception 'Couple space not found'; end if;

  select * into v_pref
  from public.life_notification_preferences
  where couple_space_id = v_space_id and actor = p_actor;
  if not found or not v_pref.enabled then
    return jsonb_build_object('actor', p_actor, 'reminders', v_reminders);
  end if;

  v_local_ts := p_now at time zone v_pref.timezone;
  v_local_date := v_local_ts::date;
  v_local_time := v_local_ts::time;

  if v_pref.daily_record_reminder_enabled
     and v_local_time >= v_pref.daily_record_reminder_time
     and v_local_time < (v_pref.daily_record_reminder_time + interval '20 minutes')::time
  then
    v_completeness := private.life_daily_record_completeness(v_space_id, p_actor, v_local_date);
    v_partner_actor := case when p_actor = 'cat' then 'fish' else 'cat' end;
    v_partner_completeness := private.life_daily_record_completeness(v_space_id, v_partner_actor, v_local_date);

    -- Daily recap is sent even if every required field is already completed.
    if true then
      v_self_summary := private.life_daily_summary(v_space_id,p_actor,v_local_date);
      v_partner_summary := private.life_daily_summary(v_space_id,v_partner_actor,v_local_date);
      v_delivery_id := private.reserve_life_notification_delivery(
        v_space_id,
        p_actor,
        'daily_record',
        v_local_date,
        'daily_record:' || p_actor || ':' || v_local_date::text,
        jsonb_build_object(
          'recordDate', v_local_date,
          'missingItems', v_completeness->'missingItems',
          'missingKeys', v_completeness->'missingKeys',
          'partnerMissingItems', v_partner_completeness->'missingItems',
          'partnerMissingKeys', v_partner_completeness->'missingKeys',
          'selfSummary', v_self_summary,
          'partnerSummary', v_partner_summary
        )
      );

      if v_delivery_id is not null then
        v_reminders := v_reminders || jsonb_build_array(jsonb_build_object(
          'deliveryId', v_delivery_id,
          'kind', 'daily_record',
          'localDate', v_local_date,
          'missingItems', v_completeness->'missingItems',
          'missingKeys', v_completeness->'missingKeys',
          'partnerMissingItems', v_partner_completeness->'missingItems',
          'partnerMissingKeys', v_partner_completeness->'missingKeys',
          'selfSummary', v_self_summary,
          'partnerSummary', v_partner_summary
        ));
      end if;
    end if;
  end if;

  return jsonb_build_object('actor', p_actor, 'reminders', v_reminders);
end;
$$;



create or replace function private.life_pushplus_message(
  p_actor text,
  p_reminder jsonb
) returns jsonb
language plpgsql immutable security invoker
set search_path=pg_catalog,private as $$
declare
  v_kind text := p_reminder->>'kind';
  v_days integer;
  v_self_missing text;
  v_partner_missing text;
  v_variant integer;
  v_title text;
  v_intro text;
  v_outro text;
  v_content text;
begin
  if p_actor not in ('cat','fish') then raise exception 'Invalid reminder actor'; end if;

  v_variant := private.tuanzi_copy_variant(
    p_actor || ':' || coalesce(p_reminder->>'localDate',p_reminder->>'targetDate','')
    || ':' || coalesce(v_kind,'') || ':' || coalesce(p_reminder->>'daysUntil','')
  );

  if v_kind = 'daily_record' then
    select string_agg(value,'、') into v_self_missing
    from jsonb_array_elements_text(coalesce(p_reminder->'missingItems','[]'::jsonb)) x(value);
    select string_agg(value,'、') into v_partner_missing
    from jsonb_array_elements_text(coalesce(p_reminder->'partnerMissingItems','[]'::jsonb)) x(value);

    v_title := case v_variant
      when 1 then '🌙 团子 · 伴岛晚间提醒'
      when 2 then '💌 团子 · Beside 晚安小提醒'
      when 3 then '🌷 团子 · 伴岛今日记录'
      when 4 then '✨ 团子 · 伴岛今晚的小提醒'
      else '💗 Beside · 团子的晚间问候' end;
    v_intro := case v_variant
      when 1 then '两位主人晚上好呀～团子来看看今天还有哪些记录没写完～ 🌙'
      when 2 then '主人～夜晚到啦，团子来轻轻提醒一下今天的伴岛记录～ 💕'
      when 3 then '主人主人～今天的生活日常，团子帮你和老婆核对好啦！ 🌷'
      when 4 then '晚上好呀主人～团子带着今天的记录小清单来啦！ ✨'
      else '亲爱的主人～Beside 今天的生活记录还有一点小尾巴哦～ 💗' end;
    v_outro := case v_variant
      when 1 then '有空再慢慢补上就好，不用着急呀～ 💗'
      when 2 then '今天辛苦啦，想起来的时候再补充也可以～ 🌼'
      when 3 then '团子会好好收藏你们的每一天，慢慢来就好～ 💕'
      when 4 then '别有压力，记录是为了留下生活，不是完成任务哦～ 💛'
      else '团子只是温柔提醒一下，祝两位主人今晚好梦～ 🌙' end;
    return jsonb_build_object('title',v_title,'content',
      v_intro || '<br><br>'
      || '💛 主人的今日记录<br>' || private.life_daily_summary_lines(p_reminder->'selfSummary')
      || '<br><br>💚 老婆的今日记录<br>' || private.life_daily_summary_lines(p_reminder->'partnerSummary')
      || '<br><br>' ||
         case when v_self_missing is null and v_partner_missing is null
           then '今天的记录都齐啦，团子给两位主人送个晚安抱抱～ 💕'
           else '还可以补记：' ||
             case when v_self_missing is not null then '主人（'||v_self_missing||'）' else '' end ||
             case when v_partner_missing is not null then
               case when v_self_missing is not null then '；' else '' end
               || '老婆（'||v_partner_missing||'）' else '' end
           end
      || '<br><br>' || v_outro || ' ——团子');
  end if;

  -- Anniversary days remain factual. Only the affectionate delivery words vary.
  v_days := coalesce((p_reminder->>'daysUntil')::integer,0);
  v_title := case
    when v_days=0 then '💕 团子 · 伴岛纪念日'
    when v_days=1 then '💝 团子 · Beside 纪念日提醒'
    else '💗 团子 · 伴岛纪念日倒数' end;
  v_intro := case v_variant
    when 1 then '主人主人～团子来报喜啦！'
    when 2 then '亲爱的主人～有件甜甜的小事要告诉你～'
    when 3 then '主人～团子悄悄来送一份甜蜜提醒啦！'
    when 4 then '报告主人～伴岛的纪念日小提醒送到！'
    else '主人～团子已经替你们开始期待啦！' end;
  if v_days=0 then
    v_content := '今天是你和亲亲老婆的纪念日呀！';
  elsif v_days=1 then
    v_content := '明天就是你和宝贝老婆的纪念日啦！';
  else
    v_content := '还有 ' || v_days || ' 天，就是你和老婆的纪念日啦！';
  end if;
  v_outro := case v_variant
    when 1 then '愿两位主人一直开开心心、甜甜蜜蜜～ 💕'
    when 2 then '想庆祝的话，可以一起留一点美好的时光呀～ 🌷'
    when 3 then '团子祝你们把平凡的日子也过得闪闪发亮～ ✨'
    when 4 then '不需要准备很多，和宝贝在一起就是温柔的日常～ 💗'
    else '今天也要和老婆好好相爱呀～ 🥰' end;
  return jsonb_build_object('title',v_title,
    'content',v_intro || '<br><br>' || v_content || '<br><br>' || v_outro || ' ——团子');
end;
$$;
revoke all on function private.life_pushplus_message(text,jsonb) from public,anon,authenticated;


create or replace function private.life_proposal_notify(
 p public.life_proposals,p_recipient text,p_kind text,p_at timestamptz,p_version integer
) returns void language plpgsql security invoker set search_path=pg_catalog,public as $$
declare v_title text; v_body text; v_variant integer; v_intro text; v_outro text; v_name text; v_date text; v_suffix text;
begin
 if p_recipient not in ('cat','fish') then raise exception 'invalid recipient'; end if;
 v_title := case p_kind
  when 'invite' then '一起做吧｜收到新邀请 ♡'
  when 'counter' then '一起做吧｜Ta 提出了新建议'
  when 'accepted' then '一起做吧｜小约定成立啦'
  when 'changed' then '一起做吧｜时间调整好啦'
  when 'declined' then '一起做吧｜这次先休息'
  when 'unchanged' then '一起做吧｜保留原来的约定'
  when 'cancelled' then '一起做吧｜约定已取消'
  when 'withdrawn' then '一起做吧｜邀请已撤回'
  when 'before' then '一起做吧｜小约定快开始啦'
  when 'encourage' then '一起做吧｜拉你一把 ♡'
  when 'result' then '一起做吧｜今天做得怎么样？'
  when 'followup' then '一起做吧｜有件小事待确认'
  else '一起做吧｜团子的小提醒' end;
 v_body := case p_kind
  when 'invite' then 'Ta 邀请你一起做件小事，打开伴岛看看吧。'
  when 'counter' then 'Ta 想调整一下时间或时长，等你回应哦。'
  when 'accepted' then '我们的小约定定好啦！'
  when 'changed' then '新的约定时间已经确认啦。'
  when 'declined' then '这次邀请先结束了，下次再一起做吧。'
  when 'unchanged' then '这次先按原约定进行，有需要也可以再商量。'
  when 'cancelled' then 'Ta 已经取消了这次约定，不需要再准备啦。'
  when 'withdrawn' then 'Ta 已撤回这次邀请，下次再一起做点小事吧。'
  when 'before' then '可以慢慢准备一下啦，不必追求完美。'
  when 'encourage' then '你说过愿意被拉一把，先试 5 分钟也很好呀。'
  when 'result' then '我们的小约定进行得怎么样？去小窝轻轻记录一下吧。'
  when 'followup' then '如果已经做了，可以回来补记；不想记录也没关系。'
  else '打开伴岛看看吧。' end;
 -- Keep the proposal title and scheduled time factual, HTML-escaped for PushPlus.
 v_variant:=private.tuanzi_copy_variant(p.id::text||':'||p_kind||':'||p_version||':'||p_recipient);
 v_name:=replace(replace(replace(coalesce(p.title,''),'&','&amp;'),'<','&lt;'),'>','&gt;');
 v_date:=to_char(coalesce(case when p_kind in ('counter','changed') then p.candidate_at end,p.scheduled_at) at time zone 'Asia/Shanghai','MM月DD日 HH24:MI');
 v_intro:=case v_variant
   when 1 then '主人主人～团子来给你送消息啦！💗'
   when 2 then '亲爱的主人～有件关于你和老婆的小事呀～ 🌷'
   when 3 then '主人～团子悄悄来报个信啦！💕'
   when 4 then '报告主人～伴岛「一起做吧」有新消息哦！✨'
   else '主人主人～宝贝老婆的小约定有进展啦～ 💌' end;
 v_outro:=case v_variant
   when 1 then '有空再看看吧，不用着急呀～'
   when 2 then '团子把消息带到啦～'
   when 3 then '一起慢慢商量就好～'
   when 4 then '去伴岛看看详情吧～'
   else '小约定也要轻轻松松的呀～' end;
 -- Avoid claiming a partner initiated a system-scheduled reminder.
 v_body:=v_intro||'<br><br>'
   ||case p_kind
     when 'invite' then '亲亲老婆邀请你一起做：'
     when 'counter' then '老婆给这个小约定提出了新建议：'
     when 'accepted' then '你们的小约定已经定好啦：'
     when 'changed' then '你们确认了新的约定时间：'
     when 'declined' then '老婆这次想先休息，下次有机会再一起做：'
     when 'unchanged' then '这次先保留原来的约定：'
     when 'cancelled' then '这个小约定已经取消啦：'
     when 'withdrawn' then '这个邀请已经撤回啦：'
     when 'before' then '你们的小约定快开始啦：'
     when 'encourage' then '你之前想让团子轻轻拉你一把：'
     when 'result' then '小约定结束啦，来记录一下真实的完成情况吧：'
     when 'followup' then '这个小约定还有结果可以补充：'
     else '你们的小约定有新消息：' end
   ||'<br><b>'||v_name||'</b>'
   ||'<br>🕒 '||v_date||'（北京时间）'
   ||'<br><br>'||v_outro||' ——团子';
 v_title:='💌 团子 · Beside 一起做吧';
 insert into public.life_reminder_instances(
  couple_space_id,recipient,source_kind,source_ref,title,content,due_at,dedupe_key,metadata
 ) values(
  p.couple_space_id,p_recipient,'proposal',p.id::text,v_title,v_body,greatest(p_at,now()),
  'proposal:'||p.id::text||':'||p_kind||':'||p_version::text||':'||p_recipient,
  jsonb_build_object('proposalId',p.id,'phase',p_kind,'destination','/nest/together')
 ) on conflict(couple_space_id,recipient,dedupe_key) do update
   set status='pending', snoozed_until=null,
       due_at=excluded.due_at, title=excluded.title, content=excluded.content, updated_at=now()
   where public.life_reminder_instances.notified_at is null
     and public.life_reminder_instances.status='dismissed';
end; $$;


revoke all on function public.claim_life_notification_reminders(text,timestamptz,text) from public,anon,authenticated;
grant execute on function public.claim_life_notification_reminders(text,timestamptz,text) to service_role;
revoke all on function private.life_pushplus_message(text,jsonb) from public,anon,authenticated;
revoke all on function private.life_proposal_notify(public.life_proposals,text,text,timestamptz,integer) from public,anon,authenticated;
grant execute on function private.life_proposal_notify(public.life_proposals,text,text,timestamptz,integer) to service_role;
