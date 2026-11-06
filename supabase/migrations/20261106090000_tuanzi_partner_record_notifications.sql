-- Tuanzi partner activity notifications + personal-view evening couple digest.
-- Forward migration only. Requires explicit separate Production Supabase authorization.

alter table public.life_notification_preferences
  add column if not exists partner_record_notifications_enabled boolean not null default true;

alter table public.life_notification_deliveries
  drop constraint if exists life_notification_deliveries_kind_check;
alter table public.life_notification_deliveries
  add constraint life_notification_deliveries_kind_check
  check (kind in ('daily_record','anniversary','reminder','partner_record'));

create table if not exists public.life_partner_record_events (
  id uuid primary key default gen_random_uuid(),
  couple_space_id uuid not null references public.couple_spaces(id) on delete cascade,
  source_actor text not null check (source_actor in ('cat','fish')),
  record_date date not null,
  record_kind text not null check (record_kind in ('mood','sleep','breakfast','lunch','dinner')),
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  unique(couple_space_id,source_actor,record_date,record_kind)
);
create index if not exists life_partner_record_events_pending_idx
  on public.life_partner_record_events(couple_space_id,source_actor,record_date,created_at)
  where delivered_at is null;
alter table public.life_partner_record_events enable row level security;
revoke all on public.life_partner_record_events from public,anon,authenticated;
grant select,insert,update on public.life_partner_record_events to service_role;

-- All canonical writers (Web and MCP) share these source tables.
-- Only the first transition to present/confirmed for today's local date enqueues.
create or replace function private.capture_life_partner_record_event()
returns trigger language plpgsql security definer
set search_path=pg_catalog,public,private as $$
declare
  v_kind text;
  v_date date;
  v_actor text;
begin
  if TG_TABLE_NAME = 'mood_entries' then
    v_kind := 'mood'; v_date := NEW.mood_date; v_actor := NEW.partner_key;
  elsif TG_TABLE_NAME = 'sleep_records' then
    v_kind := 'sleep'; v_date := NEW.sleep_date; v_actor := NEW.partner_key;
  elsif TG_TABLE_NAME = 'meals' then
    if NEW.deleted_at is not null or NEW.status <> 'confirmed'
       or NEW.meal_type not in ('breakfast','lunch','dinner') then return NEW; end if;
    if TG_OP = 'UPDATE' and OLD.status = 'confirmed'
       and OLD.deleted_at is null and OLD.meal_type = NEW.meal_type
       and OLD.meal_date = NEW.meal_date then return NEW; end if;
    v_kind := NEW.meal_type; v_date := NEW.meal_date; v_actor := NEW.partner_key;
  end if;
  if v_date = (now() at time zone 'Asia/Shanghai')::date
     and v_actor in ('cat','fish') then
    insert into public.life_partner_record_events(couple_space_id,source_actor,record_date,record_kind)
    values(NEW.couple_space_id,v_actor,v_date,v_kind)
    on conflict(couple_space_id,source_actor,record_date,record_kind) do nothing;
  end if;
  return NEW;
end; $$;

drop trigger if exists mood_partner_record_event on public.mood_entries;
create trigger mood_partner_record_event after insert or update on public.mood_entries
for each row execute function private.capture_life_partner_record_event();
drop trigger if exists sleep_partner_record_event on public.sleep_records;
create trigger sleep_partner_record_event after insert or update on public.sleep_records
for each row execute function private.capture_life_partner_record_event();
drop trigger if exists meal_partner_record_event on public.meals;
create trigger meal_partner_record_event after insert or update on public.meals
for each row execute function private.capture_life_partner_record_event();

-- Each actor gets her own missing-items view of the same couple snapshot.
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

    if not coalesce((v_completeness->>'complete')::boolean, false)
       or not coalesce((v_partner_completeness->>'complete')::boolean, false) then
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
          'partnerMissingKeys', v_partner_completeness->'missingKeys'
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
          'partnerMissingKeys', v_partner_completeness->'missingKeys'
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
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  v_kind text := p_reminder->>'kind';
  v_days integer;
  v_missing text;
  v_partner_missing text;
begin
  if p_actor not in ('cat', 'fish') then
    raise exception 'Invalid reminder actor';
  end if;

  if v_kind = 'daily_record' then
    select string_agg(value, '、') into v_missing
    from jsonb_array_elements_text(coalesce(p_reminder->'missingItems','[]'::jsonb)) x(value);
    select string_agg(value, '、') into v_partner_missing
    from jsonb_array_elements_text(coalesce(p_reminder->'partnerMissingItems','[]'::jsonb)) x(value);
    return jsonb_build_object(
      'title','🌙 团子 · 今晚的小岛日记',
      'content','两位主人晚上好呀～团子来看看今天的小岛日记啦！ 💕<br><br>'
        || '💛 主人：' || coalesce('还差 ' || v_missing,'今天已经记齐啦～')
        || '<br>💚 老婆：' || coalesce('还差 ' || v_partner_missing,'今天已经记齐啦～')
        || '<br><br>有空再慢慢补上就好，团子会好好收藏你们的每一天～ 💗 ——团子'
    );
  end if;

  v_days := coalesce((p_reminder->>'daysUntil')::integer, 0);
  if v_days = 0 then
    return jsonb_build_object(
      'title', '💕 主人～今天是特别的日子呀！',
      'content', '主人～今天是主人和主人最爱的宝贝的纪念日呀！团子祝你们一直黏黏糊糊、开开心心～ 💗 ——团子'
    );
  elsif v_days = 1 then
    return jsonb_build_object(
      'title', '💕 主人～明天就是纪念日啦！',
      'content', '主人～明天就是主人和主人的亲亲老婆的纪念日啦！团子已经替你们开始期待啦～ ✨ ——团子'
    );
  end if;

  return jsonb_build_object(
    'title', '💕 主人～纪念日还有 ' || v_days || ' 天',
    'content', '主人～还有 ' || v_days || ' 天就是主人和主人的宝贝老婆的纪念日啦！可以慢慢想想要一起做什么呀～ 💗 ——团子'
  );
end;
$$;

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
begin
  select id into v_space from public.couple_spaces
    where slug=p_space_slug and archived_at is null;
  if v_space is null then return jsonb_build_object('sent',0,'failed',0); end if;

  -- Two groups are never confused: source actor and record date are part of each batch.
  for v_group in
    select e.source_actor,e.record_date,min(e.created_at) as first_at,
           array_agg(e.id order by e.created_at,e.id) as ids,
           string_agg(case e.record_kind
             when 'mood' then '💗 心情'
             when 'sleep' then '🌙 睡眠'
             when 'breakfast' then '🍳 早餐'
             when 'lunch' then '🍱 午餐'
             when 'dinner' then '🍚 晚餐' end,'<br>' order by
               array_position(array['mood','sleep','breakfast','lunch','dinner'],e.record_kind)) as labels
      from public.life_partner_record_events e
     where e.couple_space_id=v_space and e.delivered_at is null
       and e.created_at <= p_now - interval '5 minutes'
     group by e.source_actor,e.record_date
  loop
    v_recipient := case when v_group.source_actor='cat' then 'fish' else 'cat' end;
    select * into v_pref from public.life_notification_preferences
      where couple_space_id=v_space and actor=v_recipient;
    -- Disabled recipient preferences silence new events without resending later.
    if not found or not v_pref.enabled or not v_pref.partner_record_notifications_enabled then
      update public.life_partner_record_events set delivered_at=p_now
       where id=any(v_group.ids) and delivered_at is null;
      continue;
    end if;
    if private.life_pushplus_token(v_recipient) is null then continue; end if;

    -- Revalidate against current facts to avoid announcements of deleted entries.
    select string_agg(case e.record_kind
             when 'mood' then '💗 心情已记录'
             when 'sleep' then '🌙 睡眠已记录'
             when 'breakfast' then '🍳 早餐已记录'
             when 'lunch' then '🍱 午餐已记录'
             when 'dinner' then '🍚 晚餐已记录' end,'<br>' order by
             array_position(array['mood','sleep','breakfast','lunch','dinner'],e.record_kind))
      into v_items
      from public.life_partner_record_events e
      where e.id=any(v_group.ids) and e.delivered_at is null
        and coalesce((private.life_daily_record_completeness(v_space,e.source_actor,e.record_date)->>e.record_kind)::boolean,false);
    if v_items is null then
      update public.life_partner_record_events set delivered_at=p_now
       where id=any(v_group.ids) and delivered_at is null;
      continue;
    end if;
    v_delivery := private.reserve_life_notification_delivery(
      v_space,v_recipient,'partner_record',v_group.record_date,
      'partner_record:'||v_recipient||':'||v_group.source_actor||':'||v_group.record_date||':'||v_group.first_at::text,
      jsonb_build_object('sourceActor',v_group.source_actor,'recordDate',v_group.record_date)
    );
    if v_delivery is null then continue; end if;
    v_send := private.life_pushplus_send(v_recipient,'💗 团子 · 老婆的生活动态',
      '主人主人～你的亲亲老婆刚刚更新了小岛日记啦！💕<br><br>'
      ||v_items||'<br><br>快来看看宝贝的日常吧～ 💗 ——团子');
    if coalesce((v_send->>'ok')::boolean,false) then
      perform public.complete_life_notification_delivery(v_delivery,v_recipient,true,v_send->>'providerMessageId',null,p_space_slug);
      update public.life_partner_record_events set delivered_at=p_now
       where id=any(v_group.ids) and delivered_at is null;
      v_count := v_count+1;
    else
      perform public.complete_life_notification_delivery(v_delivery,v_recipient,false,null,v_send->>'error',p_space_slug);
      v_failed := v_failed+1;
    end if;
  end loop;
  return jsonb_build_object('sent',v_count,'failed',v_failed);
end; $$;

revoke all on function private.capture_life_partner_record_event() from public,anon,authenticated;
revoke all on function private.dispatch_life_partner_record_events(timestamptz,text) from public,anon,authenticated;
revoke all on function public.claim_life_notification_reminders(text,timestamptz,text) from public,anon,authenticated;
revoke all on function private.life_pushplus_message(text,jsonb) from public,anon,authenticated;
grant execute on function private.dispatch_life_partner_record_events(timestamptz,text) to service_role;
grant execute on function public.claim_life_notification_reminders(text,timestamptz,text) to service_role;

-- Reuse the existing 5-minute cadence without changing its scheduler or its other reminder sources.
create or replace function private.dispatch_life_pushplus_reminders(
  p_now timestamptz default now(),
  p_space_slug text default 'couple-better-game'
) returns jsonb language plpgsql security definer
set search_path=pg_catalog,public,private as $$
declare
  v_cat_legacy jsonb;
  v_fish_legacy jsonb;
  v_cat_center jsonb;
  v_fish_center jsonb;
  v_partner jsonb;
begin
  v_cat_legacy:=private.dispatch_life_pushplus_for_actor('cat',p_now,p_space_slug);
  v_fish_legacy:=private.dispatch_life_pushplus_for_actor('fish',p_now,p_space_slug);
  v_cat_center:=private.dispatch_due_life_reminders_for_actor('cat',p_now,p_space_slug);
  v_fish_center:=private.dispatch_due_life_reminders_for_actor('fish',p_now,p_space_slug);
  v_partner:=private.dispatch_life_partner_record_events(p_now,p_space_slug);
  return jsonb_build_object('cat',jsonb_build_object('legacy',v_cat_legacy,'center',v_cat_center),
    'fish',jsonb_build_object('legacy',v_fish_legacy,'center',v_fish_center),'partnerRecords',v_partner);
end; $$;
revoke all on function private.dispatch_life_pushplus_reminders(timestamptz,text) from public,anon,authenticated;


-- Extend reminder settings without changing the medicine-specific update RPC.
create or replace function public.get_life_reminder_settings(
  p_actor text,
  p_space_slug text default 'couple-better-game'
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_space_id uuid;
  v_pref public.life_notification_preferences%rowtype;
begin
  if p_actor not in ('cat', 'fish') then raise exception 'Invalid reminder actor'; end if;
  select id into v_space_id from public.couple_spaces where slug = p_space_slug and archived_at is null;
  if v_space_id is null then raise exception 'Couple space not found'; end if;

  select * into v_pref
  from public.life_notification_preferences
  where couple_space_id = v_space_id and actor = p_actor;
  if not found then raise exception 'Reminder preferences not found'; end if;

  return jsonb_build_object(
    'actor', p_actor,
    'timezone', v_pref.timezone,
    'medicineReminderEnabled', v_pref.medicine_reminder_enabled,
    'medicineOffsets', v_pref.medicine_offsets,
    'anniversaryReminderEnabled', v_pref.anniversary_reminder_enabled,
    'anniversaryOffsets', v_pref.anniversary_offsets,
    'partnerRecordNotificationsEnabled', v_pref.partner_record_notifications_enabled,
    'dailyRecordReminderEnabled', v_pref.daily_record_reminder_enabled,
    'pushPlusConfigured', private.life_pushplus_token(p_actor) is not null
  );
end;
$$;


create or replace function public.update_life_couple_notification_settings(
  p_actor text,
  p_partner_enabled boolean,
  p_daily_enabled boolean,
  p_space_slug text default 'couple-better-game'
) returns jsonb language plpgsql security definer
set search_path=pg_catalog,public,private as $$
declare v_space uuid;
begin
  if p_actor not in ('cat','fish') or p_partner_enabled is null or p_daily_enabled is null then
    raise exception 'Invalid notification settings';
  end if;
  select id into v_space from public.couple_spaces where slug=p_space_slug and archived_at is null;
  if v_space is null then raise exception 'Couple space not found'; end if;
  update public.life_notification_preferences
    set partner_record_notifications_enabled=p_partner_enabled,
        daily_record_reminder_enabled=p_daily_enabled,updated_at=now()
  where couple_space_id=v_space and actor=p_actor;
  if not found then raise exception 'Notification preferences not found'; end if;
  return public.get_life_reminder_settings(p_actor,p_space_slug);
end; $$;
revoke all on function public.update_life_couple_notification_settings(text,boolean,boolean,text) from public,anon,authenticated;
grant execute on function public.update_life_couple_notification_settings(text,boolean,boolean,text) to service_role;
