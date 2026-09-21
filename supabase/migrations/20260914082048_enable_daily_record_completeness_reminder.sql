-- Enable a 21:00 daily completeness reminder for Cat/Fish.
-- A day is complete only when mood, sleep, breakfast, lunch, and dinner are all recorded.
-- Meals count only when confirmed; snacks do not participate.

alter table public.life_notification_preferences
  alter column daily_record_reminder_time set default time '21:00';

update public.life_notification_preferences
set daily_record_reminder_enabled = true,
    daily_record_reminder_time = time '21:00',
    updated_at = now()
where actor in ('cat', 'fish');

create or replace function private.life_daily_record_completeness(
  p_space_id uuid,
  p_actor text,
  p_record_date date
) returns jsonb
language plpgsql
stable
security invoker
set search_path = public, private
as $$
declare
  v_mood boolean;
  v_sleep boolean;
  v_breakfast boolean;
  v_lunch boolean;
  v_dinner boolean;
  v_missing_items text[] := array[]::text[];
  v_missing_keys text[] := array[]::text[];
begin
  if p_actor not in ('cat', 'fish') then
    raise exception 'Invalid reminder actor';
  end if;

  select exists(
    select 1 from public.mood_entries m
    where m.couple_space_id = p_space_id
      and m.partner_key = p_actor
      and m.mood_date = p_record_date
  ) into v_mood;

  select exists(
    select 1 from public.sleep_records s
    where s.couple_space_id = p_space_id
      and s.partner_key = p_actor
      and s.sleep_date = p_record_date
  ) into v_sleep;

  select exists(
    select 1 from public.meals m
    where m.couple_space_id = p_space_id
      and m.partner_key = p_actor
      and m.meal_date = p_record_date
      and m.meal_type = 'breakfast'
      and m.status = 'confirmed'
      and m.deleted_at is null
  ) into v_breakfast;

  select exists(
    select 1 from public.meals m
    where m.couple_space_id = p_space_id
      and m.partner_key = p_actor
      and m.meal_date = p_record_date
      and m.meal_type = 'lunch'
      and m.status = 'confirmed'
      and m.deleted_at is null
  ) into v_lunch;

  select exists(
    select 1 from public.meals m
    where m.couple_space_id = p_space_id
      and m.partner_key = p_actor
      and m.meal_date = p_record_date
      and m.meal_type = 'dinner'
      and m.status = 'confirmed'
      and m.deleted_at is null
  ) into v_dinner;

  if not v_mood then
    v_missing_items := array_append(v_missing_items, '心情');
    v_missing_keys := array_append(v_missing_keys, 'mood');
  end if;
  if not v_sleep then
    v_missing_items := array_append(v_missing_items, '睡眠');
    v_missing_keys := array_append(v_missing_keys, 'sleep');
  end if;
  if not v_breakfast then
    v_missing_items := array_append(v_missing_items, '早餐');
    v_missing_keys := array_append(v_missing_keys, 'breakfast');
  end if;
  if not v_lunch then
    v_missing_items := array_append(v_missing_items, '午餐');
    v_missing_keys := array_append(v_missing_keys, 'lunch');
  end if;
  if not v_dinner then
    v_missing_items := array_append(v_missing_items, '晚餐');
    v_missing_keys := array_append(v_missing_keys, 'dinner');
  end if;

  return jsonb_build_object(
    'recordDate', p_record_date,
    'complete', v_mood and v_sleep and v_breakfast and v_lunch and v_dinner,
    'mood', v_mood,
    'sleep', v_sleep,
    'breakfast', v_breakfast,
    'lunch', v_lunch,
    'dinner', v_dinner,
    'missingItems', to_jsonb(v_missing_items),
    'missingKeys', to_jsonb(v_missing_keys)
  );
end;
$$;

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

    if not coalesce((v_completeness->>'complete')::boolean, false) then
      v_delivery_id := private.reserve_life_notification_delivery(
        v_space_id,
        p_actor,
        'daily_record',
        v_local_date,
        'daily_record:' || p_actor || ':' || v_local_date::text,
        jsonb_build_object(
          'recordDate', v_local_date,
          'missingItems', v_completeness->'missingItems',
          'missingKeys', v_completeness->'missingKeys'
        )
      );

      if v_delivery_id is not null then
        v_reminders := v_reminders || jsonb_build_array(jsonb_build_object(
          'deliveryId', v_delivery_id,
          'kind', 'daily_record',
          'localDate', v_local_date,
          'missingItems', v_completeness->'missingItems',
          'missingKeys', v_completeness->'missingKeys'
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
begin
  if p_actor not in ('cat', 'fish') then
    raise exception 'Invalid reminder actor';
  end if;

  if v_kind = 'daily_record' then
    select string_agg(value, '、')
    into v_missing
    from jsonb_array_elements_text(coalesce(p_reminder->'missingItems', '[]'::jsonb)) as x(value);

    if nullif(v_missing, '') is null then
      v_missing := '今天的记录';
    end if;

    return jsonb_build_object(
      'title', '🌙 团子来检查今天的小记录啦',
      'content', '主人～今天还差：' || v_missing || '。有空记一下吧～ 💗 ——团子'
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