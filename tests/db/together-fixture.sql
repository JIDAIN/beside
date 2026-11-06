-- Ephemeral PostgreSQL 17 fixture for Together migration tests (CI only).
-- Only the narrow dependencies that the un-applied migration references.
create role service_role nologin;
create role anon nologin;
create role authenticated nologin;
create schema private;
create schema cron;

create table public.couple_spaces (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique, archived_at timestamptz
);
create table public.partner_profiles (
 couple_space_id uuid not null references public.couple_spaces(id),
 partner_key text not null, nickname text, emoji text,
 target_weight_kg numeric, updated_at timestamptz default now(),
 primary key(couple_space_id,partner_key)
);
create table public.app_configs (
 couple_space_id uuid primary key references public.couple_spaces(id),
 heatmap_start_date date, coin_week_start_day int,
 coin_deficit_streak_days int, visual_rules jsonb,
 anniversary_date date, updated_at timestamptz default now()
);
create table public.life_reminder_instances (
 id uuid primary key default gen_random_uuid(),
 couple_space_id uuid not null references public.couple_spaces(id),
 recipient text not null, source_kind text not null, source_ref text,
 title text not null, content text, due_at timestamptz not null,
 dedupe_key text not null, metadata jsonb not null default '{}'::jsonb,
 status text not null default 'pending', snoozed_until timestamptz,
 notified_at timestamptz, updated_at timestamptz default now(),
 constraint life_reminder_instances_source_kind_check
  check(source_kind in ('custom','medicine','anniversary','system','mailbox')),
 unique(couple_space_id,recipient,dedupe_key)
);
create table public.life_backup_snapshots (
 id uuid primary key default gen_random_uuid(),
 couple_space_id uuid not null references public.couple_spaces(id),
 scope text not null, reason text not null,
 schema_version integer not null default 1,
 payload jsonb not null, row_counts jsonb not null default '{}'::jsonb,
 created_by text, created_at timestamptz not null default now()
);
create table public.mood_entries(id uuid primary key default gen_random_uuid(),couple_space_id uuid);
create table public.sleep_records(id uuid primary key default gen_random_uuid(),couple_space_id uuid);
create table public.activity_entries(id uuid primary key default gen_random_uuid(),couple_space_id uuid);
create table public.meals(id uuid primary key default gen_random_uuid(),couple_space_id uuid);
create table public.meal_items(id uuid primary key default gen_random_uuid(),meal_id uuid references public.meals(id));
create table public.favorite_food_templates(id uuid primary key default gen_random_uuid(),couple_space_id uuid);
create table public.medicine_items(id uuid primary key default gen_random_uuid(),couple_space_id uuid);
create table public.weight_measurements(id uuid primary key default gen_random_uuid(),couple_space_id uuid);
create table public.mailbox_letters (
 id uuid primary key default gen_random_uuid(),couple_space_id uuid,
 sender_key text,recipient_key text,format text,body text,
 sent_at timestamptz,source text,created_at timestamptz default now(),
 updated_at timestamptz default now(),deleted_at timestamptz,
 title text,theme_key text,status text
);
create or replace function private.life_config_payload(p_space_id uuid)
returns jsonb language sql stable as $$
 select jsonb_build_object('app_configs',coalesce(
  (select jsonb_agg(to_jsonb(a)) from public.app_configs a where a.couple_space_id=p_space_id),
  '[]'::jsonb));
$$;
create table cron.job(jobid bigint generated always as identity primary key,
 jobname text not null unique,schedule text,command text,active boolean default true);
create function cron.unschedule(p_jobid bigint) returns boolean language plpgsql as $$
begin delete from cron.job where jobid=p_jobid;return found;end $$;
create function cron.schedule(p_name text,p_schedule text,p_command text) returns bigint
language plpgsql as $$
declare v_id bigint;
begin
 insert into cron.job(jobname,schedule,command) values(p_name,p_schedule,p_command)
 returning jobid into v_id;
 return v_id;
end $$;

insert into public.couple_spaces(slug) values('couple-better-game');
insert into public.partner_profiles(couple_space_id,partner_key)
select id,person from public.couple_spaces cross join (values('cat'),('fish')) as p(person);
insert into public.app_configs(couple_space_id,visual_rules)
select id,'{}'::jsonb from public.couple_spaces;
