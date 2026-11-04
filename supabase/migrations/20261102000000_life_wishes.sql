-- Prepared migration. Not applied to Production without explicit Supabase authorization.
create table if not exists public.life_wishes (
  id uuid primary key default gen_random_uuid(),
  couple_space_id uuid not null references public.couple_spaces(id) on delete cascade,
  created_by text not null check (created_by in ('cat','fish')),
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint life_wishes_title check (length(btrim(data->>'title')) between 1 and 120),
  constraint life_wishes_category check ((data->>'category') in ('go','play','eat','do'))
);
create index if not exists life_wishes_space_active_idx
  on public.life_wishes(couple_space_id,updated_at desc) where deleted_at is null;
alter table public.life_wishes enable row level security;
revoke all on public.life_wishes from public, anon, authenticated;
-- Only the service role is allowed to call these RPCs; Web identity is resolved by Next.js.
create or replace function public.list_life_wishes(p_space_slug text)
returns jsonb language sql stable security invoker set search_path=public as $$
  select coalesce(jsonb_agg(
    (w.data - 'id' - 'createdBy' - 'createdAt' - 'updatedAt')
    || jsonb_build_object('id',w.id,'createdBy',w.created_by,'createdAt',w.created_at,'updatedAt',w.updated_at)
    order by w.updated_at desc
  ),'[]'::jsonb)
  from public.life_wishes w
  join public.couple_spaces c on c.id=w.couple_space_id
  where c.slug=p_space_slug and w.deleted_at is null
$$;
create or replace function public.write_life_wish(
  p_space_slug text,p_actor text,p_id uuid,p_data jsonb,p_delete boolean default false
) returns jsonb language plpgsql security invoker set search_path=public as $$
declare
  v_space uuid;
  v_row public.life_wishes%rowtype;
  v_data jsonb;
begin
  if p_actor not in ('cat','fish') then raise exception 'invalid actor'; end if;
  select id into v_space from public.couple_spaces where slug=p_space_slug;
  if v_space is null then raise exception 'unknown couple space'; end if;
  if p_id is null and p_delete then raise exception 'missing id'; end if;
  if not p_delete then
    if p_data is null or jsonb_typeof(p_data)<>'object'
      or length(btrim(p_data->>'title')) not between 1 and 120
      or (p_data->>'category') not in ('go','play','eat','do')
      or jsonb_typeof(p_data->'referenceUrls')<>'array'
      or jsonb_typeof(p_data->'checklist')<>'array'
      or jsonb_typeof(p_data->'visits')<>'array' then
      raise exception 'invalid wish payload';
    end if;
  end if;
  -- id and createdBy are always created by the server/DB, never JSON supplied by the caller.
  if p_id is null then
    v_data:=(p_data - 'id' - 'createdBy' - 'createdAt' - 'updatedAt')
      || jsonb_build_object('imagePath',null);
    insert into public.life_wishes(couple_space_id,created_by,data)
      values(v_space,p_actor,v_data) returning * into v_row;
  else
    update public.life_wishes set
      data=case when p_delete then data else
        (p_data - 'id' - 'createdBy' - 'createdAt' - 'updatedAt')
        || jsonb_build_object('imagePath',data->'imagePath') end,
      deleted_at=case when p_delete then now() else deleted_at end,
      updated_at=now()
    where id=p_id and couple_space_id=v_space and deleted_at is null
    returning * into v_row;
    if not found then raise exception 'wish not found'; end if;
  end if;
  return (v_row.data - 'id' - 'createdBy' - 'createdAt' - 'updatedAt')
    || jsonb_build_object('id',v_row.id,'createdBy',v_row.created_by,'createdAt',v_row.created_at,'updatedAt',v_row.updated_at);
end $$;

-- Image binding happens only after a server-controlled Storage upload.
create or replace function public.bind_life_wish_image(
  p_space_slug text,p_id uuid,p_new_path text
) returns jsonb language plpgsql security invoker set search_path=public as $$
declare v_row public.life_wishes%rowtype; v_previous text; v_prefix text;
begin
  v_prefix:=p_space_slug || '/' || p_id::text || '/';
  if p_new_path is not null and (length(p_new_path)>300
      or left(p_new_path,length(v_prefix))<>v_prefix
      or p_new_path !~ '^[a-zA-Z0-9_./-]+[.]webp$') then
    raise exception 'invalid image path';
  end if;
  update public.life_wishes w set
    data=jsonb_set(w.data,'{imagePath}',coalesce(to_jsonb(p_new_path),'null'::jsonb),true),
    updated_at=now()
  from public.couple_spaces c
  where c.id=w.couple_space_id and c.slug=p_space_slug
    and w.id=p_id and w.deleted_at is null
  returning w.* into v_row;
  if not found then raise exception 'wish not found'; end if;
  -- Previous image is returned only for server-side cleanup.
  -- The caller must retrieve the current path before calling this function.
  return (v_row.data - 'id' - 'createdBy' - 'createdAt' - 'updatedAt')
    || jsonb_build_object('id',v_row.id,'createdBy',v_row.created_by,'createdAt',v_row.created_at,'updatedAt',v_row.updated_at);
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('wish-photos','wish-photos',false,1048576,array['image/webp'])
on conflict (id) do nothing;
revoke execute on function public.list_life_wishes(text) from public,anon,authenticated;
revoke execute on function public.write_life_wish(text,text,uuid,jsonb,boolean) from public,anon,authenticated;
revoke execute on function public.bind_life_wish_image(text,uuid,text) from public,anon,authenticated;
grant execute on function public.list_life_wishes(text) to service_role;
grant execute on function public.write_life_wish(text,text,uuid,jsonb,boolean) to service_role;
grant execute on function public.bind_life_wish_image(text,uuid,text) to service_role;
