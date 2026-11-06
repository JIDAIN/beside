-- Run only against disposable CI PostgreSQL. Fail loudly on broken constraints.
\set ON_ERROR_STOP on

-- Creation, trusted actor, voluntary encouragement, event idempotency and reminders.
do $$
declare p jsonb; same jsonb; accepted jsonb; k uuid:=gen_random_uuid(); n int;
begin
 p:=public.mutate_life_proposal('cat','create',null,jsonb_build_object(
  'title','一起散步','note','','scheduledAt',now()+interval '3 hours','durationMinutes',30),0,k);
 same:=public.mutate_life_proposal('cat','create',null,jsonb_build_object(
  'title','not another proposal','scheduledAt',now()+interval '2 hours','durationMinutes',30),0,k);
 if p->>'id' is distinct from same->>'id' then raise exception 'idempotency failed';end if;
 select count(*) into n from public.life_proposal_events where proposal_id=(p->>'id')::uuid;
 if n<>1 then raise exception 'event duplicated';end if;
 begin
  perform public.mutate_life_proposal('cat','accept',(p->>'id')::uuid,'{}'::jsonb,(p->>'version')::int,gen_random_uuid());
  raise exception 'actor authorization bypassed';
 exception when others then
  if sqlerrm='actor authorization bypassed' then raise;end if;
 end;
 accepted:=public.mutate_life_proposal('fish','encourage',(p->>'id')::uuid,
  '{}'::jsonb,(p->>'version')::int,gen_random_uuid());
 if accepted->>'status'<>'agreed' or accepted->>'encouragementBy'<>'fish' then
  raise exception 'voluntary encouragement failed';
 end if;
 select count(*) into n from public.life_reminder_instances where source_ref=p->>'id'
  and status='pending' and source_kind='proposal';
 if n<4 then raise exception 'missing accepted, before, or encouragement reminder: %',n;end if;
 if not has_table_privilege('service_role','public.life_proposals','DELETE')
  or not has_table_privilege('service_role','public.life_proposal_events','DELETE') then
  raise exception 'restore requires service_role DELETE permissions';
 end if;
 if has_table_privilege('anon','public.life_proposals','SELECT')
  or has_function_privilege('anon','public.mutate_life_proposal(text,text,uuid,jsonb,integer,uuid,text)','EXECUTE') then
  raise exception 'unauthorized table/function grant';
 end if;
end $$;


-- Each partner's pending proposal cap: two per initiator, not globally two.
truncate public.life_proposal_events, public.life_proposals cascade;
truncate public.life_reminder_instances;
do $$
declare p jsonb; n integer;
begin
 for n in 1..2 loop
   p:=public.mutate_life_proposal('cat','create',null,
     jsonb_build_object('title','待回应 '||n,'scheduledAt',now()+interval '5 hours','durationMinutes',10),0,gen_random_uuid());
 end loop;
 begin
   perform public.mutate_life_proposal('cat','create',null,
     jsonb_build_object('title','第三个待回应','scheduledAt',now()+interval '5 hours','durationMinutes',10),0,gen_random_uuid());
   raise exception 'pending quota bypassed';
 exception when others then
   if sqlerrm not like '%PENDING_QUOTA%' then raise;end if;
 end;
 -- Fish may still initiate two of their own.
 p:=public.mutate_life_proposal('fish','create',null,
   jsonb_build_object('title','Fish 的邀请','scheduledAt',now()+interval '5 hours','durationMinutes',10),0,gen_random_uuid());
 if p->>'createdBy'<>'fish' then raise exception 'actor ownership wrong';end if;
end $$;

-- Reject quota overflow, then verify negotiation and two successful reschedules.
truncate public.life_proposal_events, public.life_proposals cascade;
truncate public.life_reminder_instances;
do $$
declare p jsonb; accepted jsonb; r jsonb; old_time text; n int;
begin
 for n in 1..3 loop
  p:=public.mutate_life_proposal('cat','create',null,jsonb_build_object(
   'title','计划 '||n,'scheduledAt',now()+make_interval(hours=>n+2),'durationMinutes',20),0,gen_random_uuid());
  accepted:=public.mutate_life_proposal('fish','accept',(p->>'id')::uuid,
   '{}'::jsonb,(p->>'version')::int,gen_random_uuid());
 end loop;
 p:=public.mutate_life_proposal('cat','create',null,jsonb_build_object(
  'title','第四个约定','scheduledAt',now()+interval '6 hours','durationMinutes',20),0,gen_random_uuid());
 begin
  perform public.mutate_life_proposal('fish','accept',(p->>'id')::uuid,'{}'::jsonb,(p->>'version')::int,gen_random_uuid());
  raise exception 'agreement quota not enforced';
 exception when others then
  if sqlerrm not like '%AGREEMENT_QUOTA%' then raise;end if;
 end;
end $$;
truncate public.life_proposal_events,public.life_proposals cascade;
truncate public.life_reminder_instances;

do $$
declare p jsonb;r jsonb;old_time text; n int;
begin
 p:=public.mutate_life_proposal('cat','create',null,
  jsonb_build_object('title','敷面膜','scheduledAt',now()+interval '3 hours','durationMinutes',15),0,gen_random_uuid());
 r:=public.mutate_life_proposal('fish','counter',(p->>'id')::uuid,jsonb_build_object(
  'scheduledAt',now()+interval '4 hours','durationMinutes',10),(p->>'version')::int,gen_random_uuid());
 if r->>'status'<>'counter' or r->>'waitingFor'<>'cat' then raise exception 'counter state invalid';end if;
 r:=public.mutate_life_proposal('cat','accept',(p->>'id')::uuid,'{}'::jsonb,(r->>'version')::int,gen_random_uuid());
 old_time:=r->>'scheduledAt';
 r:=public.mutate_life_proposal('cat','reschedule',(p->>'id')::uuid,
  jsonb_build_object('scheduledAt',now()+interval '5 hours','durationMinutes',10),
  (r->>'version')::int,gen_random_uuid());
 r:=public.mutate_life_proposal('fish','decline',(p->>'id')::uuid,'{}'::jsonb,(r->>'version')::int,gen_random_uuid());
 if r->>'status'<>'agreed' or r->>'scheduledAt'<>old_time or (r->>'rescheduleCount')::int<>0 then
  raise exception 'declining reschedule changed the original plan';end if;
 for n in 1..2 loop
  r:=public.mutate_life_proposal('cat','reschedule',(p->>'id')::uuid,
   jsonb_build_object('scheduledAt',now()+make_interval(hours=>6+n),'durationMinutes',10),
   (r->>'version')::int,gen_random_uuid());
  r:=public.mutate_life_proposal('fish','accept',(p->>'id')::uuid,'{}'::jsonb,
   (r->>'version')::int,gen_random_uuid());
 end loop;
 if (r->>'rescheduleCount')::int<>2 then raise exception 'reschedule counter mismatch';end if;
 begin
  perform public.mutate_life_proposal('cat','reschedule',(p->>'id')::uuid,
   jsonb_build_object('scheduledAt',now()+interval '7 hours','durationMinutes',10),
   (r->>'version')::int,gen_random_uuid());
  raise exception 'third reschedule allowed';
 exception when others then if sqlerrm not like '%reschedule unavailable%' then raise;end if;
 end;
end $$;

-- Pending expiry, overdue result sweep, retroactive supplement without reopening.
truncate public.life_proposal_events,public.life_proposals cascade;
truncate public.life_reminder_instances;
do $$
declare p jsonb; r jsonb; pid uuid; n int;
begin
 p:=public.mutate_life_proposal('cat','create',null,jsonb_build_object(
  'title','超时邀请','scheduledAt',now()+interval '6 hours','durationMinutes',10),0,gen_random_uuid());
 update public.life_proposals set created_at=now()-interval '49 hours' where id=(p->>'id')::uuid;
 perform private.sweep_life_proposals();
 select count(*) into n from public.life_proposals where id=(p->>'id')::uuid
  and status='closed' and outcome='expired';
 if n<>1 then raise exception 'pending proposal not expired';end if;

 p:=public.mutate_life_proposal('cat','create',null,jsonb_build_object(
  'title','忘记确认','scheduledAt',now()+interval '3 hours','durationMinutes',10),0,gen_random_uuid());
 r:=public.mutate_life_proposal('fish','accept',(p->>'id')::uuid,'{}'::jsonb,(p->>'version')::int,gen_random_uuid());
 pid:=(p->>'id')::uuid;
 update public.life_proposals set scheduled_at=now()-interval '50 hours', duration_minutes=10 where id=pid;
 perform private.sweep_life_proposals();
 select count(*) into n from public.life_proposals where id=pid and status='closed' and outcome='unconfirmed';
 if n<>1 then raise exception '48-hour auto close failed';end if;
 r:=public.mutate_life_proposal('cat','result',pid,'{"result":"done"}'::jsonb,(r->>'version')::int+1,gen_random_uuid());
 if r->>'status'<>'closed' then raise exception 'late supplement reopened historical record';end if;
 r:=public.mutate_life_proposal('fish','result',pid,'{"result":"not_done"}'::jsonb,(r->>'version')::int,gen_random_uuid());
 if r->>'status'<>'closed' or r->>'outcome'<>'solo' then raise exception 'late outcome recomputation failed';end if;
end $$;

-- New snapshot restores complete event facts; old snapshot cannot erase proposals.
truncate public.life_proposal_events,public.life_proposals cascade;
truncate public.life_reminder_instances;
do $$
declare p jsonb; b jsonb; sid uuid; legacy_id uuid; count_before int; count_after int;
begin
 p:=public.mutate_life_proposal('cat','create',null,jsonb_build_object(
  'title','恢复测试','scheduledAt',now()+interval '3 hours','durationMinutes',15),0,gen_random_uuid());
 b:=public.create_life_backup_snapshot('full','manual','cat');
 sid:=(b->>'id')::uuid;
 if (b->'rowCounts'->>'proposals')::int<>1 then raise exception 'snapshot proposal count missing';end if;
 update public.life_proposals set title='modified before restore' where id=(p->>'id')::uuid;
 perform public.restore_life_backup_snapshot(sid,'cat');
 if not exists(select 1 from public.life_proposals where id=(p->>'id')::uuid and title='恢复测试') then
  raise exception 'proposal restore failed';end if;
 select count(*) into count_before from public.life_proposal_events;
 if count_before<>1 then raise exception 'proposal event restore failed';end if;
 insert into public.life_backup_snapshots(couple_space_id,scope,reason,payload,created_by)
 select couple_space_id,'user','import',payload #- '{user,life_proposals}' #- '{user,life_proposal_events}','cat'
 from public.life_backup_snapshots where id=sid returning id into legacy_id;
 perform public.restore_life_backup_snapshot(legacy_id,'cat');
 select count(*) into count_after from public.life_proposals;
 if count_after<>1 then raise exception 'old snapshot erased future proposal data';end if;
end $$;


-- Reject malformed/cross-couple backups atomically without altering any record.
do $$
declare payload jsonb; snapshot_id uuid; hostile_id uuid; old_count integer;
begin
 select id,payload into snapshot_id,payload from public.life_backup_snapshots
  where reason='manual' order by created_at desc limit 1;
 select count(*) into old_count from public.life_proposals;
 payload:=jsonb_set(payload,'{user,life_proposals,0,couple_space_id}',
   to_jsonb('00000000-0000-4000-8000-000000000001'::text),false);
 insert into public.life_backup_snapshots(couple_space_id,scope,reason,payload,created_by)
 select couple_space_id,'user','import',payload,'cat' from public.life_backup_snapshots
 where id=snapshot_id returning id into hostile_id;
 begin
   perform public.restore_life_backup_snapshot(hostile_id,'cat');
   raise exception 'cross couple restore bypassed';
 exception when others then
   if sqlerrm not like '%space mismatch%' then raise;end if;
 end;
 if (select count(*) from public.life_proposals)<>old_count then
  raise exception 'invalid restore altered live proposal state';
 end if;
end $$;

select 'Together migration smoke passed' as result;
