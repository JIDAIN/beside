-- Beside frequent-food templates.
-- Templates are personal reusable defaults only; meal_items always receive copied values.

begin;

create table if not exists public.favorite_food_templates (
  id uuid primary key default gen_random_uuid(),
  couple_space_id uuid not null references public.couple_spaces(id) on delete cascade,
  partner_key text not null check (partner_key in ('fish','cat')),
  name text not null check (char_length(btrim(name)) between 1 and 200),
  portion_description text check (portion_description is null or char_length(portion_description) <= 300),
  calories_kcal integer check (calories_kcal is null or calories_kcal >= 0),
  carbs_g numeric(8,2) check (carbs_g is null or carbs_g >= 0),
  protein_g numeric(8,2) check (protein_g is null or protein_g >= 0),
  fat_g numeric(8,2) check (fat_g is null or fat_g >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (couple_space_id, partner_key)
    references public.partner_profiles(couple_space_id, partner_key)
);

create index if not exists favorite_food_templates_space_partner_updated_idx
  on public.favorite_food_templates(couple_space_id, partner_key, updated_at desc);

create or replace trigger favorite_food_templates_set_updated_at
before update on public.favorite_food_templates
for each row execute function private.set_updated_at();

alter table public.favorite_food_templates enable row level security;
revoke all on table public.favorite_food_templates from public, anon, authenticated;
grant select, insert, update, delete on table public.favorite_food_templates to service_role;

comment on table public.favorite_food_templates is
  'Per-partner reusable food defaults. Meal items copy values and never reference templates.';

-- Keep Life export/snapshot coverage complete for the new user-data table.
create or replace function private.life_user_payload(p_space_id uuid)
returns jsonb language sql stable security invoker set search_path=public,private as $$
  select jsonb_build_object(
    'mood_entries',coalesce((select jsonb_agg(to_jsonb(t)) from public.mood_entries t where t.couple_space_id=p_space_id),'[]'::jsonb),
    'sleep_records',coalesce((select jsonb_agg(to_jsonb(t)) from public.sleep_records t where t.couple_space_id=p_space_id),'[]'::jsonb),
    'activity_entries',coalesce((select jsonb_agg(to_jsonb(t)) from public.activity_entries t where t.couple_space_id=p_space_id),'[]'::jsonb),
    'meals',coalesce((select jsonb_agg(to_jsonb(t)) from public.meals t where t.couple_space_id=p_space_id),'[]'::jsonb),
    'meal_items',coalesce((select jsonb_agg(to_jsonb(i)) from public.meal_items i join public.meals m on m.id=i.meal_id where m.couple_space_id=p_space_id),'[]'::jsonb),
    'favorite_food_templates',coalesce((select jsonb_agg(to_jsonb(t)) from public.favorite_food_templates t where t.couple_space_id=p_space_id),'[]'::jsonb),
    'medicine_items',coalesce((select jsonb_agg(to_jsonb(t)) from public.medicine_items t where t.couple_space_id=p_space_id),'[]'::jsonb),
    'weight_measurements',coalesce((select jsonb_agg(to_jsonb(t)) from public.weight_measurements t where t.couple_space_id=p_space_id),'[]'::jsonb),
    'mailbox_letters',coalesce((select jsonb_agg(to_jsonb(t)) from public.mailbox_letters t where t.couple_space_id=p_space_id),'[]'::jsonb),
    'partner_profiles',coalesce((select jsonb_agg(to_jsonb(t)) from public.partner_profiles t where t.couple_space_id=p_space_id),'[]'::jsonb)
  );
$$;

-- Preserve the latest mailbox compatibility restore semantics while adding templates.
create or replace function public.restore_life_backup_snapshot(
  p_snapshot_id uuid,
  p_created_by text default null,
  p_space_slug text default 'couple-better-game'
)
returns jsonb
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  v_space_id uuid;
  v_payload jsonb;
  v_scope text;
begin
  select id into v_space_id
  from public.couple_spaces
  where slug = p_space_slug and archived_at is null;

  select payload, scope into v_payload, v_scope
  from public.life_backup_snapshots
  where id = p_snapshot_id and couple_space_id = v_space_id;

  if v_payload is null then raise exception 'Backup snapshot not found'; end if;

  perform public.create_life_backup_snapshot('full', 'pre_restore', p_created_by, p_space_slug);

  if v_scope in ('user','full') then
    delete from public.meal_items
      where meal_id in (select id from public.meals where couple_space_id = v_space_id);
    delete from public.meals where couple_space_id = v_space_id;
    delete from public.favorite_food_templates where couple_space_id = v_space_id;
    delete from public.mood_entries where couple_space_id = v_space_id;
    delete from public.sleep_records where couple_space_id = v_space_id;
    delete from public.activity_entries where couple_space_id = v_space_id;
    delete from public.medicine_items where couple_space_id = v_space_id;
    delete from public.weight_measurements where couple_space_id = v_space_id;
    delete from public.mailbox_letters where couple_space_id = v_space_id;

    insert into public.mood_entries
      select * from jsonb_populate_recordset(null::public.mood_entries, coalesce(v_payload#>'{user,mood_entries}', '[]'::jsonb));
    insert into public.sleep_records
      select * from jsonb_populate_recordset(null::public.sleep_records, coalesce(v_payload#>'{user,sleep_records}', '[]'::jsonb));
    insert into public.activity_entries
      select * from jsonb_populate_recordset(null::public.activity_entries, coalesce(v_payload#>'{user,activity_entries}', '[]'::jsonb));
    insert into public.meals
      select * from jsonb_populate_recordset(null::public.meals, coalesce(v_payload#>'{user,meals}', '[]'::jsonb));
    insert into public.meal_items
      select * from jsonb_populate_recordset(null::public.meal_items, coalesce(v_payload#>'{user,meal_items}', '[]'::jsonb));
    insert into public.favorite_food_templates
      select * from jsonb_populate_recordset(null::public.favorite_food_templates, coalesce(v_payload#>'{user,favorite_food_templates}', '[]'::jsonb));
    insert into public.medicine_items
      select * from jsonb_populate_recordset(null::public.medicine_items, coalesce(v_payload#>'{user,medicine_items}', '[]'::jsonb));
    insert into public.weight_measurements
      select * from jsonb_populate_recordset(null::public.weight_measurements, coalesce(v_payload#>'{user,weight_measurements}', '[]'::jsonb));

    insert into public.mailbox_letters(
      id,couple_space_id,sender_key,recipient_key,format,body,sent_at,source,
      created_at,updated_at,deleted_at,title,theme_key,status
    )
    select
      x.id,x.couple_space_id,x.sender_key,x.recipient_key,coalesce(x.format,'letter'),x.body,
      case when x.status='draft' then null else coalesce(x.sent_at,x.created_at,now()) end,
      coalesce(x.source,'manual'),coalesce(x.created_at,now()),coalesce(x.updated_at,x.created_at,now()),
      x.deleted_at,case when coalesce(x.format,'letter')='letter' then x.title else null end,
      coalesce(x.theme_key,'cream'),case when x.status='draft' then 'draft' else 'sent' end
    from jsonb_populate_recordset(null::public.mailbox_letters, coalesce(v_payload#>'{user,mailbox_letters}', '[]'::jsonb)) x;

    update public.partner_profiles p
    set nickname=x.nickname,emoji=x.emoji,target_weight_kg=x.target_weight_kg,updated_at=now()
    from jsonb_populate_recordset(null::public.partner_profiles, coalesce(v_payload#>'{user,partner_profiles}', '[]'::jsonb)) x
    where p.couple_space_id=v_space_id and p.partner_key=x.partner_key;
  end if;

  if v_scope in ('config','full') then
    update public.app_configs a
    set heatmap_start_date=x.heatmap_start_date,coin_week_start_day=x.coin_week_start_day,
        coin_deficit_streak_days=x.coin_deficit_streak_days,visual_rules=x.visual_rules,
        anniversary_date=x.anniversary_date,updated_at=now()
    from jsonb_populate_recordset(null::public.app_configs, coalesce(v_payload#>'{config,app_configs}', '[]'::jsonb)) x
    where a.couple_space_id=v_space_id;
  end if;

  return jsonb_build_object('ok',true,'restoredSnapshotId',p_snapshot_id,'restoredAt',now());
end;
$$;

revoke all on function private.life_user_payload(uuid) from public, anon, authenticated;
grant execute on function private.life_user_payload(uuid) to service_role;
revoke all on function public.restore_life_backup_snapshot(uuid, text, text) from public, anon, authenticated;
grant execute on function public.restore_life_backup_snapshot(uuid, text, text) to service_role;

commit;
