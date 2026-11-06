-- Disposable PostgreSQL 17 only: dependency fixture for Tuanzi notifications.
\set ON_ERROR_STOP on
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create schema private;
create table public.couple_spaces(id uuid primary key default gen_random_uuid(),slug text not null unique,archived_at timestamptz);
create table public.partner_profiles(couple_space_id uuid references public.couple_spaces(id),partner_key text,primary key(couple_space_id,partner_key));
create table public.life_notification_preferences(
 couple_space_id uuid references public.couple_spaces(id),actor text,enabled boolean not null default true,
 timezone text not null default 'Asia/Shanghai',daily_record_reminder_enabled boolean not null default true,
 daily_record_reminder_time time not null default '21:00',medicine_reminder_enabled boolean default true,
 medicine_offsets integer[] default array[7,0],anniversary_reminder_enabled boolean default true,
 anniversary_offsets integer[] default array[7,1,0],updated_at timestamptz default now(),
 primary key(couple_space_id,actor));
create table public.life_notification_deliveries(
 id uuid primary key default gen_random_uuid(),couple_space_id uuid,actor text,
 kind text not null check(kind in ('daily_record','anniversary','reminder')),
 local_date date,dedupe_key text,status text not null default 'reserved',
 attempt_count integer default 1,metadata jsonb,provider_message_id text,provider_error text,
 reserved_at timestamptz default now(),updated_at timestamptz default now(),completed_at timestamptz,
 unique(couple_space_id,dedupe_key));
create table public.mood_entries(id uuid primary key default gen_random_uuid(),couple_space_id uuid,partner_key text,mood_date date,mood_key text);
create table public.sleep_records(id uuid primary key default gen_random_uuid(),couple_space_id uuid,partner_key text,sleep_date date,fell_asleep_at timestamptz,woke_at timestamptz);
create table public.meals(id uuid primary key default gen_random_uuid(),couple_space_id uuid,partner_key text,meal_date date,meal_type text,status text,total_calories_kcal integer,deleted_at timestamptz);
insert into public.couple_spaces(slug) values('couple-better-game');
insert into public.partner_profiles select id,k from public.couple_spaces cross join(values ('cat'),('fish')) x(k);
insert into public.life_notification_preferences(couple_space_id,actor)
 select id,k from public.couple_spaces cross join(values ('cat'),('fish')) x(k);
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


create table public.push_test_log(recipient text,title text,content text);
create or replace function private.life_pushplus_token(p_actor text)
returns text language sql stable as $$select 'mock-token'::text;$$;
create or replace function private.life_pushplus_send(p_actor text,p_title text,p_content text)
returns jsonb language plpgsql as $$
begin
 insert into public.push_test_log values(p_actor,p_title,p_content);
 return jsonb_build_object('ok',true,'providerMessageId','test');
end;$$;
create or replace function private.reserve_life_notification_delivery(
 p_space_id uuid,p_actor text,p_kind text,p_local_date date,p_dedupe_key text,
 p_metadata jsonb default '{}'::jsonb
) returns uuid language plpgsql as $$
declare v_id uuid;
begin
 insert into public.life_notification_deliveries(couple_space_id,actor,kind,local_date,dedupe_key,metadata)
 values (p_space_id,p_actor,p_kind,p_local_date,p_dedupe_key,p_metadata)
 on conflict(couple_space_id,dedupe_key) do nothing returning id into v_id;
 return v_id;
end;$$;
create or replace function public.complete_life_notification_delivery(
 p_delivery_id uuid,p_actor text,p_success boolean,p_provider_message_id text,p_error text,
 p_space_slug text default 'couple-better-game'
) returns jsonb language plpgsql as $$
begin
 update public.life_notification_deliveries set status=case when p_success then 'accepted' else 'failed' end,
 provider_message_id=p_provider_message_id,provider_error=p_error
 where id=p_delivery_id and actor=p_actor;
 return jsonb_build_object('ok',true);
end;$$;
create or replace function private.dispatch_life_pushplus_for_actor(
 p_actor text,p_now timestamptz default now(),p_space_slug text default 'couple-better-game'
) returns jsonb language sql as $$select '{}'::jsonb;$$;
create or replace function private.dispatch_due_life_reminders_for_actor(
 p_actor text,p_now timestamptz default now(),p_space_slug text default 'couple-better-game'
) returns jsonb language sql as $$select '{}'::jsonb;$$;

-- Minimal proposal reminder dependencies for the daily recap regression suite.
create table public.life_proposals(
 id uuid primary key default gen_random_uuid(),
 couple_space_id uuid not null references public.couple_spaces(id),
 title text not null,note text default '',duration_minutes integer default 30,candidate_duration integer,scheduled_at timestamptz not null,candidate_at timestamptz
);
create table public.life_reminder_instances(
 id uuid primary key default gen_random_uuid(),
 couple_space_id uuid not null,recipient text not null,
 source_kind text,source_ref text,title text,content text,
 due_at timestamptz not null,dedupe_key text not null,
 metadata jsonb,status text default 'pending',snoozed_until timestamptz,
 notified_at timestamptz,updated_at timestamptz default now(),
 unique(couple_space_id,recipient,dedupe_key)
);

-- Intercept the real PushPlus transport in disposable PostgreSQL only.
create schema if not exists extensions;
create type extensions.http_response as (status integer,content text,headers jsonb);
create or replace function extensions.http_post(p_url text,p_payload text,p_type text)
returns extensions.http_response language plpgsql as $$
declare v jsonb:=p_payload::jsonb;
begin
  insert into public.push_test_log(recipient,title,content)
  values(v->>'token',v->>'title',v->>'content');
  return (200,'{"code":200,"data":"mock-provider"}',null::jsonb)::extensions.http_response;
end $$;
