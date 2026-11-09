-- Show concrete Life details in partner PushPlus notifications and include each confirmed snack.
-- Forward-only. Do NOT apply to Production without separate user authorization.
-- No backfill, no legacy game changes, no adjustments to scheduler/provider/recipient rules.
alter table public.life_partner_record_events
  add column if not exists meal_id uuid;
alter table public.life_partner_record_events
  drop constraint if exists life_partner_record_events_record_kind_check;
alter table public.life_partner_record_events
  add constraint life_partner_record_events_record_kind_check
  check (record_kind in ('mood','sleep','breakfast','lunch','dinner','snack'));
-- Existing non-snack record kinds remain once per actor/date/type.
-- Snacks are separately deduped by their canonical meal id.
alter table public.life_partner_record_events
  drop constraint if exists life_partner_record_events_couple_space_id_source_actor_rec_key;
create unique index if not exists life_partner_record_event_daily_unique
  on public.life_partner_record_events(couple_space_id,source_actor,record_date,record_kind)
  where record_kind <> 'snack';
create unique index if not exists life_partner_record_event_snack_unique
  on public.life_partner_record_events(couple_space_id,source_actor,meal_id)
  where record_kind = 'snack' and meal_id is not null;
alter table public.life_partner_record_events
  add constraint life_partner_record_event_snack_has_meal
  check (record_kind <> 'snack' or meal_id is not null);

create or replace function private.capture_life_partner_record_event()
returns trigger language plpgsql security definer
set search_path=pg_catalog,public,private as $$
declare
  v_kind text;
  v_date date;
  v_actor text;
  v_meal_id uuid;
begin
  if TG_TABLE_NAME = 'mood_entries' then
    if TG_OP = 'UPDATE' then return NEW; end if;
    v_kind := 'mood'; v_date := NEW.mood_date; v_actor := NEW.partner_key;
  elsif TG_TABLE_NAME = 'sleep_records' then
    if TG_OP = 'UPDATE' then return NEW; end if;
    v_kind := 'sleep'; v_date := NEW.sleep_date; v_actor := NEW.partner_key;
  elsif TG_TABLE_NAME = 'meals' then
    if NEW.deleted_at is not null or NEW.status <> 'confirmed' then return NEW; end if;
    -- Only a newly confirmed snack gets a notification, not a later edit or calorie change.
    if NEW.meal_type = 'snack' then
      if TG_OP = 'UPDATE' and OLD.status = 'confirmed' and OLD.deleted_at is null
         then return NEW; end if;
      v_meal_id := NEW.id;
    elsif TG_OP = 'UPDATE' and OLD.status = 'confirmed'
       and OLD.deleted_at is null and OLD.meal_type = NEW.meal_type
       and OLD.meal_date = NEW.meal_date then return NEW;
    end if;
    v_kind := NEW.meal_type; v_date := NEW.meal_date; v_actor := NEW.partner_key;
  end if;
  if v_date = (now() at time zone 'Asia/Shanghai')::date
     and v_actor in ('cat','fish') then
    insert into public.life_partner_record_events
      (couple_space_id,source_actor,record_date,record_kind,meal_id)
    values(NEW.couple_space_id,v_actor,v_date,v_kind,v_meal_id)
    on conflict do nothing;
  end if;
  return NEW;
end;
$$;
revoke all on function private.capture_life_partner_record_event() from public,anon,authenticated;

-- Read the *current* confirmed facts at dispatch time, never a historical snapshot
-- from an already edited/deleted draft. Return null for deleted/unconfirmed entries.
-- HTML content is truncated, escaped and rendered without note/photo/private metadata.
create or replace function private.life_partner_record_detail(
  p_space uuid,p_actor text,p_day date,p_kind text,p_meal_id uuid
) returns text language plpgsql stable security invoker
set search_path=pg_catalog,public,private as $$
declare
  v_mood text;
  v_minutes integer;
  v_meal public.meals%rowtype;
  v_names text;
  v_label text;
  v_period text;
begin
  if p_actor not in ('cat','fish') then return null; end if;
  if p_kind = 'mood' then
    select case mood_key
      when 'happy' then '开心' when 'calm' then '平静'
      when 'neutral' then '心动' when 'anxious' then '烦躁'
      when 'sad' then '伤心' when 'angry' then '生气'
      when 'tired' then '心累' when 'excited' then '兴奋'
      else '未知心情' end into v_mood
    from public.mood_entries
    where couple_space_id=p_space and partner_key=p_actor and mood_date=p_day;
    if v_mood is null then return null; end if;
    return '💗 心情：'||v_mood;
  elsif p_kind = 'sleep' then
    select round(extract(epoch from (woke_at-fell_asleep_at))/60)::integer
      into v_minutes
    from public.sleep_records
    where couple_space_id=p_space and partner_key=p_actor and sleep_date=p_day;
    if v_minutes is null then return null; end if;
    return '🌙 睡眠：'||(v_minutes/60)::text||'小时'||(v_minutes%60)::text||'分钟';
  elsif p_kind in ('breakfast','lunch','dinner','snack') then
    -- For main meals, retain the current per-day slot; for snacks resolve the exact event.
    select * into v_meal from public.meals m
    where m.couple_space_id=p_space and m.partner_key=p_actor
      and m.meal_date=p_day and m.status='confirmed' and m.deleted_at is null
      and m.meal_type=p_kind
      and (p_kind <> 'snack' or m.id=p_meal_id)
    order by m.created_at desc,m.id desc limit 1;
    if not found then return null; end if;
    select string_agg(replace(replace(replace(n,'&','&amp;'),'<','&lt;'),'>','&gt;'),'、'
                      order by sort_order,id)
      into v_names
    from (
      select left(btrim(coalesce(nullif(display_name,''),raw_name)),32) as n,
             sort_order,id
      from public.meal_items
      where meal_id=v_meal.id
        and nullif(btrim(coalesce(nullif(display_name,''),raw_name)),'') is not null
      order by sort_order,id limit 4
    ) items;
    v_label := case p_kind when 'breakfast' then '🍳 早餐'
      when 'lunch' then '🍱 午餐'
      when 'dinner' then '🍚 晚餐'
      else '🍪 加餐' end;
    if p_kind = 'snack' then
      v_period := case v_meal.snack_period
        when 'morning' then '上午' when 'afternoon' then '下午'
        when 'night' then '晚上' else '' end;
      v_label := '🍪 '||v_period||'加餐';
    end if;
    return v_label||'：'||coalesce(v_names,'已记录')
      ||'（'||case when v_meal.total_calories_kcal is null then '热量未知'
        else v_meal.total_calories_kcal::text||' kcal' end||'）';
  end if;
  return null;
end;
$$;
revoke all on function private.life_partner_record_detail(uuid,text,date,text,uuid)
  from public,anon,authenticated;

-- Preserve existing 5-minute coalescing, PushPlus delivery reservations,
-- per-recipient opt-outs and date boundary. Only item rendering changes.
create or replace function private.dispatch_life_partner_record_events(
  p_now timestamptz default now(),
  p_space_slug text default 'couple-better-game'
) returns jsonb language plpgsql security definer
set search_path=pg_catalog,public,private as $$
declare
  v_space uuid;
  v_group record;
  v_recipient text;
  v_pref public.life_notification_preferences%rowtype;
  v_delivery uuid;
  v_send jsonb;
  v_items text;
  v_count integer := 0;
  v_failed integer := 0;
  v_variant integer;
  v_title text;
  v_open text;
  v_close text;
begin
  select id into v_space from public.couple_spaces
    where slug=p_space_slug and archived_at is null;
  if v_space is null then return jsonb_build_object('sent',0,'failed',0); end if;

  for v_group in
    select e.source_actor,e.record_date,min(e.created_at) as first_at,
           array_agg(e.id order by e.created_at,e.id) as ids
      from public.life_partner_record_events e
     where e.couple_space_id=v_space and e.delivered_at is null
     group by e.source_actor,e.record_date
    having max(e.created_at) <= p_now - interval '5 minutes'
        or min(e.created_at) <= p_now - interval '15 minutes'
  loop
    if v_group.record_date <> (p_now at time zone 'Asia/Shanghai')::date then
      update public.life_partner_record_events set delivered_at=p_now
       where id=any(v_group.ids) and delivered_at is null;
      continue;
    end if;
    v_recipient := case when v_group.source_actor='cat' then 'fish' else 'cat' end;
    select * into v_pref from public.life_notification_preferences
      where couple_space_id=v_space and actor=v_recipient;
    if not found or not v_pref.enabled or not v_pref.partner_record_notifications_enabled then
      update public.life_partner_record_events set delivered_at=p_now
       where id=any(v_group.ids) and delivered_at is null;
      continue;
    end if;
    if private.life_pushplus_token(v_recipient) is null then continue; end if;

    select string_agg(
             private.life_partner_record_detail(v_space,e.source_actor,e.record_date,
                                                e.record_kind,e.meal_id),
             '<br>' order by e.created_at,e.id)
      into v_items
    from public.life_partner_record_events e
    where e.id=any(v_group.ids) and e.delivered_at is null;
    if v_items is null then
      -- Retain cancelled same-day events; edits or a fresh confirmed record
      -- can still make the original daily slot eligible before day-end.
      continue;
    end if;

    v_delivery := private.reserve_life_notification_delivery(
      v_space,v_recipient,'partner_record',v_group.record_date,
      'partner_record:'||v_recipient||':'||v_group.source_actor||':'
        ||v_group.record_date||':'||v_group.first_at::text,
      jsonb_build_object('sourceActor',v_group.source_actor,'recordDate',v_group.record_date)
    );
    if v_delivery is null then continue; end if;
    v_variant := private.tuanzi_copy_variant(
      'partner:' || v_recipient || ':' || v_group.first_at::text);
    v_title := case v_variant
      when 1 then '💗 团子 · 伴岛生活动态'
      when 2 then '💕 Beside · 团子的悄悄话'
      when 3 then '🌷 团子 · 伴岛小消息'
      when 4 then '💌 团子 · Beside生活更新'
      else '✨ 团子 · 伴岛生活动态' end;
    v_open := case v_variant
      when 1 then '主人主人～你的亲亲老婆刚刚更新了今天的生活记录啦！ 💕'
      when 2 then '主人～团子来送消息啦！宝贝老婆刚刚在 Beside 留下了今天的生活记录～ 🌷'
      when 3 then '亲爱的主人～你家老婆刚刚记录了几件日常小事，团子来告诉你啦！ 💗'
      when 4 then '报告主人～你的宝贝在伴岛更新了今天的生活记录哦！ ✨'
      else '主人～收到老婆的新动态啦！团子已经帮你留意到啦～ 💌' end;
    v_close := case v_variant
      when 1 then '团子把这些日常小事送到啦～ 💗'
      when 2 then '不用打开伴岛也能看到老婆的最新记录啦～ 💕'
      when 3 then '今天的点滴，团子都替你们好好记着呢～ 🌸'
      when 4 then '今天的日常也被好好收藏啦～ 💛'
      else '主人～团子已经把老婆的新动态告诉你啦～ 🥰' end;
    v_send := private.life_pushplus_send(v_recipient,v_title,
      v_open || '<br><br>' || v_items || '<br><br>' || v_close || ' ——团子');
    if coalesce((v_send->>'ok')::boolean,false) then
      perform public.complete_life_notification_delivery(
        v_delivery,v_recipient,true,v_send->>'providerMessageId',null,p_space_slug);
      update public.life_partner_record_events e set delivered_at=p_now
       where e.id=any(v_group.ids) and e.delivered_at is null;
      v_count := v_count+1;
    else
      perform public.complete_life_notification_delivery(
        v_delivery,v_recipient,false,null,v_send->>'error',p_space_slug);
      v_failed := v_failed+1;
    end if;
  end loop;
  return jsonb_build_object('sent',v_count,'failed',v_failed);
end;
$$;
revoke all on function private.dispatch_life_partner_record_events(timestamptz,text)
  from public,anon,authenticated;
grant execute on function private.dispatch_life_partner_record_events(timestamptz,text)
  to service_role;
