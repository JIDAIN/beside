-- Disposable PostgreSQL 17 only, after original Together fixture and lifecycle.
\set ON_ERROR_STOP on
truncate public.life_proposal_events,public.life_proposals cascade;
truncate public.life_reminder_instances;

-- Early solo completion must not close the shared agreement or wake the other
-- partner's end-of-activity reminder before the actual scheduled end.
do $$
declare p jsonb; a jsonb; b jsonb; n int; proposal_id uuid;
begin
 p:=public.mutate_life_proposal('cat','create',null,jsonb_build_object(
   'title','提前收拾阳台','scheduledAt',now()+interval '3 hours',
   'durationMinutes',15),0,gen_random_uuid());
 a:=public.mutate_life_proposal('fish','accept',(p->>'id')::uuid,
   '{}'::jsonb,(p->>'version')::int,gen_random_uuid());
 proposal_id:=(p->>'id')::uuid;

 begin
   perform public.mutate_life_proposal('cat','result',proposal_id,
     '{"result":"not_done"}'::jsonb,(a->>'version')::int,gen_random_uuid());
   raise exception 'premature not_done allowed';
 exception when others then
   if sqlerrm='premature not_done allowed' then raise; end if;
   if sqlerrm not like '%not started%' then raise;end if;
 end;
 begin
   perform public.mutate_life_proposal('cat','result',proposal_id,
     '{"result":"partial"}'::jsonb,(a->>'version')::int,gen_random_uuid());
   raise exception 'premature partial allowed';
 exception when others then
   if sqlerrm='premature partial allowed' then raise;end if;
   if sqlerrm not like '%not started%' then raise;end if;
 end;

 a:=public.mutate_life_proposal('cat','result',proposal_id,
   '{"result":"done"}'::jsonb,(a->>'version')::int,gen_random_uuid());
 if a->>'status'<>'agreed' or a->'results'->>'cat'<>'done'
   or a->'results' ? 'fish' then
   raise exception 'early report changed the shared state: %',a;
 end if;
 select count(*) into n from public.life_reminder_instances
 where source_ref=proposal_id::text and recipient='fish'
   and metadata->>'phase'='before' and status='pending';
 if n<>1 then raise exception 'partner pre-start reminder lost';end if;
 select count(*) into n from public.life_reminder_instances
 where source_ref=proposal_id::text and recipient='cat'
   and metadata->>'phase'='before' and status='pending';
 if n<>0 then raise exception 'early finisher still has pre-start reminder';end if;
 select count(*) into n from public.life_reminder_instances
 where source_ref=proposal_id::text and metadata->>'phase' in ('result','followup');
 if n<>0 then raise exception 'end reminders generated before end';end if;

 begin
   perform public.mutate_life_proposal('fish','cancel',proposal_id,
     '{}'::jsonb,(a->>'version')::int,gen_random_uuid());
   raise exception 'cancel allowed after completed work';
 exception when others then
   if sqlerrm='cancel allowed after completed work' then raise;end if;
   if sqlerrm not like '%cannot cancel%' then raise;end if;
 end;
 begin
   perform public.mutate_life_proposal('fish','reschedule',proposal_id,
     jsonb_build_object('scheduledAt',now()+interval '4 hours','durationMinutes',15),
     (a->>'version')::int,gen_random_uuid());
   raise exception 'reschedule allowed after completed work';
 exception when others then
   if sqlerrm='reschedule allowed after completed work' then raise;end if;
   if sqlerrm not like '%reschedule unavailable%' then raise;end if;
 end;

 begin
   perform public.mutate_life_proposal('cat','result',proposal_id,
     '{"result":"done"}'::jsonb,(a->>'version')::int,gen_random_uuid());
   raise exception 'duplicate result was allowed';
 exception when others then
   if sqlerrm='duplicate result was allowed' then raise;end if;
   if sqlerrm not like '%RESULT_ALREADY_RECORDED%' then raise;end if;
 end;

 b:=public.mutate_life_proposal('fish','result',proposal_id,
   '{"result":"done"}'::jsonb,(a->>'version')::int,gen_random_uuid());
 if b->>'status'<>'closed' or b->>'outcome'<>'joint_done'
   or b->'results'->>'cat'<>'done' or b->'results'->>'fish'<>'done' then
   raise exception 'both completing early did not close correctly: %',b;
 end if;
 select count(*) into n from public.life_reminder_instances
 where source_ref=proposal_id::text and status='pending'
   and metadata->>'phase' in ('before','encourage','result','followup');
 if n<>0 then raise exception 'completed agreement retains actionable reminders';end if;
end $$;

-- A solo early result keeps partner notifications independent. After real end
-- only the non-reporting partner receives the result and follow-up requests.
truncate public.life_proposal_events,public.life_proposals cascade;
truncate public.life_reminder_instances;
do $$
declare p jsonb; a jsonb; proposal_id uuid; n int;
begin
 p:=public.mutate_life_proposal('cat','create',null,jsonb_build_object(
   'title','提前完成只记一人','scheduledAt',now()+interval '2 hours',
   'durationMinutes',15),0,gen_random_uuid());
 a:=public.mutate_life_proposal('fish','accept',(p->>'id')::uuid,
   '{}'::jsonb,(p->>'version')::int,gen_random_uuid());
 proposal_id:=(p->>'id')::uuid;
 a:=public.mutate_life_proposal('cat','result',proposal_id,
   '{"result":"done"}'::jsonb,(a->>'version')::int,gen_random_uuid());
 update public.life_proposals
   set scheduled_at=now()-interval '40 minutes' where id=proposal_id;
 perform private.sweep_life_proposals();
 if not exists(select 1 from public.life_proposals where id=proposal_id
   and status='awaiting_result' and results->>'cat'='done') then
   raise exception 'sweep did not await other partner';end if;
 select count(*) into n from public.life_reminder_instances
 where source_ref=proposal_id::text and recipient='fish'
   and status='pending' and metadata->>'phase' in ('result','followup');
 if n<>2 then raise exception 'missing other partner result/followup: %',n;end if;
 select count(*) into n from public.life_reminder_instances
 where source_ref=proposal_id::text and recipient='cat'
   and status='pending' and metadata->>'phase' in ('result','followup');
 if n<>0 then raise exception 'already reporting partner received extra result reminder';end if;
end $$;

select 'Together early completion and reminder lifecycle verified' as result;
