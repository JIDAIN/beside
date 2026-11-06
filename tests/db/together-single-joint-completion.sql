-- Disposable PostgreSQL 17 only; after Together base + early-result migrations.
\set ON_ERROR_STOP on
truncate public.life_proposal_events,public.life_proposals cascade;
truncate public.life_reminder_instances;

do $$
declare p jsonb; a jsonb; b jsonb; again jsonb; pid uuid; key uuid; n int;
begin
 p:=public.mutate_life_proposal('cat','create',null,jsonb_build_object(
  'title','一起收拾阳台','scheduledAt',now()+interval '2 hours','durationMinutes',15),0,gen_random_uuid());
 a:=public.mutate_life_proposal('fish','accept',(p->>'id')::uuid,
  '{}'::jsonb,(p->>'version')::int,gen_random_uuid());
 pid:=(p->>'id')::uuid;
 key:=gen_random_uuid();
 b:=public.mutate_life_proposal('cat','result',pid,
  '{"result":"done"}'::jsonb,(a->>'version')::int,key);
 if b->>'status'<>'closed' or b->>'outcome'<>'joint_done' then
  raise exception 'one confirmation did not close: %',b;
 end if;
 if b->'results'->>'cat'<>'done' or b->'results' ? 'fish' then
  raise exception 'partner falsely marked as independently confirmed: %',b;end if;
 if (select count(*) from public.life_proposal_events where proposal_id=pid
   and event_type='result' and actor='cat')<>1 then raise exception 'confirming actor missing';end if;
 select count(*) into n from public.life_reminder_instances
  where source_ref=pid::text and status in ('pending','snoozed') and notified_at is null;
 if n<>0 then raise exception 'completion did not clear pending reminders';end if;
 again:=public.mutate_life_proposal('cat','result',pid,
  '{"result":"done"}'::jsonb,(a->>'version')::int,key);
 if again->>'status'<>'closed' or again->>'version'<>b->>'version' then
  raise exception 'request retry changed result';end if;
 begin
  perform public.mutate_life_proposal('fish','result',pid,
    '{"result":"done"}'::jsonb,(b->>'version')::int,gen_random_uuid());
  raise exception 'second confirmation was accepted after close';
 exception when others then
  if sqlerrm='second confirmation was accepted after close' then raise;end if;
  if sqlerrm not like '%cannot record result%' then raise;end if;
 end;
end $$;

-- A partner may confirm shared completion after the start, without waiting for
-- the scheduled end or for the other person's separate result.
truncate public.life_proposal_events,public.life_proposals cascade;
truncate public.life_reminder_instances;
do $$
declare p jsonb; a jsonb; b jsonb; pid uuid;
begin
 p:=public.mutate_life_proposal('fish','create',null,jsonb_build_object(
  'title','一起做饭','scheduledAt',now()+interval '3 hours','durationMinutes',60),0,gen_random_uuid());
 a:=public.mutate_life_proposal('cat','accept',(p->>'id')::uuid,
  '{}'::jsonb,(p->>'version')::int,gen_random_uuid());
 pid:=(p->>'id')::uuid;
 update public.life_proposals set scheduled_at=now()-interval '5 minutes' where id=pid;
 b:=public.mutate_life_proposal('fish','result',pid,
  '{"result":"done"}'::jsonb,(a->>'version')::int,gen_random_uuid());
 if b->>'status'<>'closed' or b->>'outcome'<>'joint_done' or b->'results'->>'fish'<>'done'
  then raise exception 'one confirmation during work failed: %',b;end if;
end $$;

-- A partial result does not assert joint completion. The other person can
-- truthfully confirm completion and close the shared agreement later.
truncate public.life_proposal_events,public.life_proposals cascade;
truncate public.life_reminder_instances;
do $$
declare p jsonb; a jsonb; b jsonb; c jsonb; pid uuid;
begin
 p:=public.mutate_life_proposal('cat','create',null,jsonb_build_object(
  'title','整理房间','scheduledAt',now()+interval '3 hours','durationMinutes',30),0,gen_random_uuid());
 a:=public.mutate_life_proposal('fish','accept',(p->>'id')::uuid,
  '{}'::jsonb,(p->>'version')::int,gen_random_uuid());
 pid:=(p->>'id')::uuid;
 update public.life_proposals set scheduled_at=now()-interval '5 minutes' where id=pid;
 b:=public.mutate_life_proposal('cat','result',pid,
  '{"result":"partial"}'::jsonb,(a->>'version')::int,gen_random_uuid());
 if b->>'status'<>'agreed' or b->>'outcome' is not null then
  raise exception 'partial result prematurely closed: %',b;end if;
 c:=public.mutate_life_proposal('fish','result',pid,
  '{"result":"done"}'::jsonb,(b->>'version')::int,gen_random_uuid());
 if c->>'status'<>'closed' or c->>'outcome'<>'joint_done' then
  raise exception 'final joint confirmation did not close: %',c;end if;
end $$;
select 'one trusted joint confirmation is enough' as result;
