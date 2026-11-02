-- Planned migration only. Apply to Production only after separate explicit database authorization.
create table if not exists public.life_wishes (
 id uuid primary key default gen_random_uuid(),
 couple_space_id uuid not null references public.couple_spaces(id),
 created_by text not null check (created_by in ('cat','fish')),
 data jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 deleted_at timestamptz,
 constraint life_wishes_title check (length(trim(data->>'title')) between 1 and 120),
 constraint life_wishes_category check (data->>'category' in ('go','play','eat','do'))
);
create index if not exists life_wishes_space_active_idx on public.life_wishes(couple_space_id,updated_at desc) where deleted_at is null;
alter table public.life_wishes enable row level security;
revoke all on public.life_wishes from anon, authenticated;
-- Only the trusted Next.js service role accesses this shared resource.
create or replace function public.list_life_wishes(p_space_slug text)
returns jsonb language sql stable security invoker set search_path = public as $$
 select coalesce(jsonb_agg(jsonb_build_object(
 'id',w.id,'createdBy',w.created_by,'createdAt',w.created_at,
 'updatedAt',w.updated_at
 ) || w.data order by w.updated_at desc), '[]'::jsonb)
 from public.life_wishes w
 join public.couple_spaces c on c.id=w.couple_space_id
 where c.slug=p_space_slug and w.deleted_at is null
$$;
create or replace function public.write_life_wish(p_space_slug text,p_actor text,p_id uuid,p_data jsonb,p_delete boolean default false)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare v_space uuid; v_row public.life_wishes%rowtype; v_title text; v_category text;
begin
 if p_actor not in ('cat','fish') then raise exception 'invalid actor'; end if;
 select id into v_space from public.couple_spaces where slug=p_space_slug;
 if v_space is null then raise exception 'unknown couple space'; end if;
 if p_id is null and p_delete then raise exception 'missing id'; end if;
 if not p_delete then
   v_title:=trim(p_data->>'title'); v_category:=p_data->>'category';
   if v_title is null or length(v_title) not between 1 and 120 then raise exception 'invalid title'; end if;
   if v_category not in ('go','play','eat','do') then raise exception 'invalid category'; end if;
   if jsonb_typeof(p_data->'referenceUrls') <> 'array' or jsonb_typeof(p_data->'checklist') <> 'array' or jsonb_typeof(p_data->'visits') <> 'array' then
      raise exception 'invalid collections';
   end if;
 end if;
 if p_id is null then
   insert into public.life_wishes(couple_space_id,created_by,data)
   values(v_space,p_actor,p_data) returning * into v_row;
 else
   update public.life_wishes set
   data=case when p_delete then data else p_data end,
   deleted_at=case when p_delete then now() else deleted_at end,
   updated_at=now()
   where id=p_id and couple_space_id=v_space and deleted_at is null returning * into v_row;
   if not found then raise exception 'wish not found'; end if;
 end if;
 return jsonb_build_object('id',v_row.id,'createdBy',v_row.created_by,'createdAt',v_row.created_at,'updatedAt',v_row.updated_at) || v_row.data;
end $$;
revoke execute on function public.list_life_wishes(text) from public,anon,authenticated;
revoke execute on function public.write_life_wish(text,text,uuid,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.list_life_wishes(text) to service_role;
grant execute on function public.write_life_wish(text,text,uuid,jsonb,boolean) to service_role;
