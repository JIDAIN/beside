-- Proposed (not applied): Beside Together V1. Shared Life facts, separate from Legacy Game.
create table public.life_proposals (
  id uuid primary key default gen_random_uuid(),
  couple_space_id uuid not null references public.couple_spaces(id) on delete cascade,
  created_by text not null check (created_by in ('cat','fish')),
  recipient_key text not null check (recipient_key in ('cat','fish')),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  note text not null default '' check (char_length(note) <= 500),
  scheduled_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes between 5 and 180),
  status text not null default 'pending' check (status in ('pending','counter','agreed','reschedule','awaiting_result','closed')),
  waiting_for text check (waiting_for in ('cat','fish')),
  candidate_at timestamptz,
  candidate_duration integer check (candidate_duration between 5 and 180),
  encouragement_by text check (encouragement_by in ('cat','fish')),
  reschedule_count integer not null default 0 check (reschedule_count between 0 and 2),
  results jsonb not null default '{}'::jsonb,
  outcome text check (outcome in ('joint_done','partial','solo','not_done','unconfirmed','declined','expired','withdrawn','cancelled')),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint life_proposals_distinct_partners check (created_by <> recipient_key)
);
create index life_proposals_space_open_idx on public.life_proposals(couple_space_id,status,scheduled_at);
alter table public.life_proposals enable row level security;
revoke all on public.life_proposals from public,anon,authenticated;
grant select,insert,update on public.life_proposals to service_role;

create table public.life_proposal_events (
  id uuid primary key default gen_random_uuid(),
  couple_space_id uuid not null references public.couple_spaces(id) on delete cascade,
  proposal_id uuid not null references public.life_proposals(id) on delete cascade,
  actor text not null check (actor in ('cat','fish','system')),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  request_id uuid,
  created_at timestamptz not null default now(),
  unique(couple_space_id,actor,request_id)
);
create index life_proposal_events_proposal_idx on public.life_proposal_events(proposal_id,created_at);
alter table public.life_proposal_events enable row level security;
revoke all on public.life_proposal_events from public,anon,authenticated;
grant select,insert on public.life_proposal_events to service_role;

alter table public.life_reminder_instances drop constraint if exists life_reminder_instances_source_kind_check;
alter table public.life_reminder_instances add constraint life_reminder_instances_source_kind_check
 check (source_kind in ('custom','medicine','anniversary','system','mailbox','proposal'));

create or replace function private.life_proposal_as_json(p public.life_proposals)
returns jsonb language sql stable security invoker set search_path=pg_catalog,public as $$
 select jsonb_build_object(
  'id',p.id,'createdBy',p.created_by,'recipientKey',p.recipient_key,
  'title',p.title,'note',p.note,'scheduledAt',p.scheduled_at,
  'durationMinutes',p.duration_minutes,'status',p.status,'waitingFor',p.waiting_for,
  'candidateAt',p.candidate_at,'candidateDuration',p.candidate_duration,
  'encouragementBy',p.encouragement_by,'rescheduleCount',p.reschedule_count,
  'results',p.results,'outcome',p.outcome,'version',p.version,
  'createdAt',p.created_at,'updatedAt',p.updated_at,'closedAt',p.closed_at
 );
$$;

-- Stateful source reuses the existing Reminder Engine and PushPlus delivery path.
-- Only generic copy is sent over external providers; private notes never leave the app.
create or replace function private.life_proposal_notify(
 p public.life_proposals,p_recipient text,p_kind text,p_at timestamptz,p_version integer
) returns void language plpgsql security invoker set search_path=pg_catalog,public as $$
declare v_title text; v_body text;
begin
 if p_recipient not in ('cat','fish') then raise exception 'invalid recipient'; end if;
 v_title := case p_kind
  when 'invite' then '一起做吧｜收到新邀请 ♡'
  when 'counter' then '一起做吧｜Ta 提出了新建议'
  when 'accepted' then '一起做吧｜小约定成立啦'
  when 'changed' then '一起做吧｜时间调整好啦'
  when 'declined' then '一起做吧｜这次先休息'
  when 'before' then '一起做吧｜小约定快开始啦'
  when 'encourage' then '一起做吧｜拉你一把 ♡'
  when 'result' then '一起做吧｜今天做得怎么样？'
  when 'followup' then '一起做吧｜有件小事待确认'
  else '一起做吧｜团子的小提醒' end;
 v_body := case p_kind
  when 'invite' then 'Ta 邀请你一起做件小事，打开伴岛看看吧。'
  when 'counter' then 'Ta 想调整一下时间或时长，等你回应哦。'
  when 'accepted' then '我们的小约定定好啦！'
  when 'changed' then '新的约定时间已经确认啦。'
  when 'declined' then '这次邀请先结束了，下次再一起做吧。'
  when 'before' then '可以慢慢准备一下啦，不必追求完美。'
  when 'encourage' then '你说过愿意被拉一把，先试 5 分钟也很好呀。'
  when 'result' then '我们的小约定进行得怎么样？去小窝轻轻记录一下吧。'
  when 'followup' then '如果已经做了，可以回来补记；不想记录也没关系。'
  else '打开伴岛看看吧。' end;
 insert into public.life_reminder_instances(
  couple_space_id,recipient,source_kind,source_ref,title,content,due_at,dedupe_key,metadata
 ) values(
  p.couple_space_id,p_recipient,'proposal',p.id::text,v_title,v_body,greatest(p_at,now()),
  'proposal:'||p.id::text||':'||p_kind||':'||p_version::text||':'||p_recipient,
  jsonb_build_object('proposalId',p.id,'phase',p_kind,'destination','/nest/together')
 ) on conflict(couple_space_id,recipient,dedupe_key) do nothing;
end; $$;

create or replace function private.life_proposal_clear_reminders(p public.life_proposals)
returns void language sql security invoker set search_path=pg_catalog,public as $$
 update public.life_reminder_instances set status='dismissed',updated_at=now()
 where couple_space_id=p.couple_space_id and source_kind='proposal'
  and source_ref=p.id::text and status in ('pending','snoozed');
$$;

create or replace function private.life_proposal_schedule(p public.life_proposals)
returns void language plpgsql security invoker set search_path=pg_catalog,public,private as $$
declare v_actor text;
begin
 foreach v_actor in array array['cat','fish']::text[] loop
  if p.scheduled_at-interval '15 minutes'>now() then
   perform private.life_proposal_notify(p,v_actor,'before',p.scheduled_at-interval '15 minutes',p.version);
  end if;
  if p.encouragement_by=v_actor then
   perform private.life_proposal_notify(p,v_actor,'encourage',p.scheduled_at,p.version);
  end if;
 end loop;
end; $$;

create or replace function public.list_life_proposals(p_space_slug text default 'couple-better-game')
returns jsonb language sql stable security invoker set search_path=pg_catalog,public,private as $$
 select coalesce(jsonb_agg(private.life_proposal_as_json(p) order by p.updated_at desc),'[]'::jsonb)
 from (select p.* from public.life_proposals p join public.couple_spaces c
  on c.id=p.couple_space_id where c.slug=p_space_slug and c.archived_at is null
  order by p.updated_at desc limit 150) p;
$$;

-- One advisory lock per couple serializes both actor quotas and status/version transitions.
create or replace function public.mutate_life_proposal(
 p_actor text,p_action text,p_id uuid,p_data jsonb,p_expected_version integer,
 p_request_id uuid,p_space_slug text default 'couple-better-game'
) returns jsonb language plpgsql security invoker set search_path=pg_catalog,public,private as $$
declare
 v_space uuid; v public.life_proposals%rowtype; v_existing uuid;
 v_at timestamptz; v_dur integer; v_title text; v_note text;
 v_other text; v_results jsonb; v_outcome text; v_now timestamptz:=now();
begin
 if p_actor not in ('cat','fish') or p_request_id is null then raise exception 'invalid identity or request id'; end if;
 if p_action not in ('create','accept','encourage','counter','reschedule','decline','withdraw','cancel','result') then raise exception 'invalid action'; end if;
 select id into v_space from public.couple_spaces where slug=p_space_slug and archived_at is null;
 if v_space is null then raise exception 'couple space not found'; end if;
 perform pg_advisory_xact_lock(hashtext(v_space::text));
 select proposal_id into v_existing from public.life_proposal_events
 where couple_space_id=v_space and actor=p_actor and request_id=p_request_id;
 if found then
  select * into v from public.life_proposals where id=v_existing and couple_space_id=v_space;
  return private.life_proposal_as_json(v);
 end if;
 v_other:=case p_actor when 'cat' then 'fish' else 'cat' end;
 if p_action='create' then
  v_title:=btrim(coalesce(p_data->>'title',''));
  v_note:=btrim(coalesce(p_data->>'note',''));
  if char_length(v_title) not between 1 and 120 or char_length(v_note)>500 then raise exception 'invalid content'; end if;
  v_at:=nullif(p_data->>'scheduledAt','')::timestamptz;
  v_dur:=nullif(p_data->>'durationMinutes','')::integer;
  if v_at is null or v_at<=v_now or v_at>v_now+interval '7 days' or v_dur not between 5 and 180 or v_dur is null then raise exception 'invalid schedule'; end if;
  if (select count(*) from public.life_proposals where couple_space_id=v_space
   and created_by=p_actor and status in ('pending','counter'))>=2 then raise exception 'PENDING_QUOTA'; end if;
  insert into public.life_proposals(couple_space_id,created_by,recipient_key,title,note,scheduled_at,duration_minutes,waiting_for)
  values(v_space,p_actor,v_other,v_title,v_note,v_at,v_dur,v_other) returning * into v;
  perform private.life_proposal_notify(v,v_other,'invite',v_now,v.version);
 else
  select * into v from public.life_proposals where id=p_id and couple_space_id=v_space for update;
  if not found then raise exception 'proposal not found'; end if;
  if p_expected_version is distinct from v.version then raise exception 'VERSION_CONFLICT'; end if;
  if v.status in ('pending','counter') and v_now >= least(v.created_at+interval '48 hours',v.scheduled_at) then
   raise exception 'proposal expired';
  end if;
  if p_action in ('accept','encourage') then
   if v.status not in ('pending','counter','reschedule') or v.waiting_for<>p_actor then raise exception 'not your turn'; end if;
   if v.status='reschedule' then
    if v_now>=v.scheduled_at or v.reschedule_count>=2 then raise exception 'reschedule expired'; end if;
    v.scheduled_at:=v.candidate_at; v.duration_minutes:=v.candidate_duration;
    v.reschedule_count:=v.reschedule_count+1;
   elsif v.status='counter' then
    v.scheduled_at:=v.candidate_at;v.duration_minutes:=v.candidate_duration;
   end if;
   if v.scheduled_at<=v_now or v.scheduled_at>v_now+interval '7 days' then raise exception 'invalid schedule'; end if;
   if v.status<>'reschedule' and (select count(*) from public.life_proposals
    where couple_space_id=v_space and status in ('agreed','reschedule')
     and scheduled_at>v_now and scheduled_at<=v_now+interval '7 days')>=3 then raise exception 'AGREEMENT_QUOTA'; end if;
   v.encouragement_by:=case when p_action='encourage' then p_actor else v.encouragement_by end;
   v.status:='agreed';v.waiting_for:=null;v.candidate_at:=null;v.candidate_duration:=null;
   v.version:=v.version+1;
   perform private.life_proposal_clear_reminders(v);
   perform private.life_proposal_notify(v,v_other,'accepted',v_now,v.version);
   perform private.life_proposal_schedule(v);
  elsif p_action in ('counter','reschedule') then
   v_at:=nullif(p_data->>'scheduledAt','')::timestamptz;v_dur:=nullif(p_data->>'durationMinutes','')::integer;
   if v_at is null or v_at<=v_now or v_at>v_now+interval '7 days' or v_dur is null or v_dur not between 5 and 180 then raise exception 'invalid schedule'; end if;
   if p_action='counter' then
    if v.status not in ('pending','counter') or v.waiting_for<>p_actor then raise exception 'not your turn'; end if;
    v.status:='counter';
   else
    if v.status<>'agreed' or v_now>=v.scheduled_at or v.reschedule_count>=2 then raise exception 'reschedule unavailable'; end if;
    v.status:='reschedule';
   end if;
   v.waiting_for:=v_other;v.candidate_at:=v_at;v.candidate_duration:=v_dur;v.version:=v.version+1;
   perform private.life_proposal_clear_reminders(v);
   perform private.life_proposal_notify(v,v_other,'counter',v_now,v.version);
   if v.status='reschedule' then perform private.life_proposal_schedule(v); end if;
  elsif p_action='decline' then
   if v.waiting_for<>p_actor or v.status not in ('pending','counter','reschedule') then raise exception 'not your turn'; end if;
   v.version:=v.version+1;
   perform private.life_proposal_clear_reminders(v);
   if v.status='reschedule' then
    v.status:='agreed';v.waiting_for:=null;v.candidate_at:=null;v.candidate_duration:=null;
    perform private.life_proposal_schedule(v);
   else
    v.status:='closed';v.outcome:='declined';v.closed_at:=v_now;v.waiting_for:=null;
   end if;
   perform private.life_proposal_notify(v,v_other,'declined',v_now,v.version);
  elsif p_action='withdraw' then
   if v.created_by<>p_actor or v.status not in ('pending','counter') then raise exception 'cannot withdraw'; end if;
   v.status:='closed';v.outcome:='withdrawn';v.closed_at:=v_now;v.waiting_for:=null;v.version:=v.version+1;
   perform private.life_proposal_clear_reminders(v);
  elsif p_action='cancel' then
   if v.status not in ('agreed','reschedule') or v_now>=v.scheduled_at+make_interval(mins=>v.duration_minutes) then raise exception 'cannot cancel'; end if;
   v.status:='closed';v.outcome:='cancelled';v.closed_at:=v_now;v.waiting_for:=null;v.version:=v.version+1;
   perform private.life_proposal_clear_reminders(v);
  elsif p_action='result' then
   if v.status not in ('agreed','reschedule','awaiting_result') and not (v.status='closed' and v.outcome='unconfirmed') then raise exception 'cannot record result'; end if;
   if v_now<v.scheduled_at then raise exception 'not started'; end if;
   if p_data->>'result' not in ('done','partial','not_done') then raise exception 'invalid result'; end if;
   v.results:=jsonb_set(v.results,array[p_actor],to_jsonb(p_data->>'result'),true);
   if v.results ? 'cat' and v.results ? 'fish' then
    v_outcome:=case
     when v.results->>'cat'='done' and v.results->>'fish'='done' then 'joint_done'
     when v.results->>'cat'='not_done' and v.results->>'fish'='not_done' then 'not_done'
     when (v.results->>'cat'='done' and v.results->>'fish'='not_done') or (v.results->>'fish'='done' and v.results->>'cat'='not_done') then 'solo'
     else 'partial' end;
    v.status:='closed';v.outcome:=v_outcome;v.closed_at:=v_now;
    perform private.life_proposal_clear_reminders(v);
   else
    v.status:='awaiting_result';v.waiting_for:=null;
   end if;
   v.version:=v.version+1;
  end if;
  update public.life_proposals set
   scheduled_at=v.scheduled_at,duration_minutes=v.duration_minutes,status=v.status,
   waiting_for=v.waiting_for,candidate_at=v.candidate_at,candidate_duration=v.candidate_duration,
   encouragement_by=v.encouragement_by,reschedule_count=v.reschedule_count,results=v.results,
   outcome=v.outcome,closed_at=v.closed_at,version=v.version,updated_at=v_now
   where id=v.id returning * into v;
 end if;
 insert into public.life_proposal_events(couple_space_id,proposal_id,actor,event_type,payload,request_id)
 values(v_space,v.id,p_actor,p_action,
  jsonb_build_object('scheduledAt',v.scheduled_at,'durationMinutes',v.duration_minutes,
   'result',case when p_action='result' then p_data->>'result' else null end,'version',v.version),
  p_request_id);
 return private.life_proposal_as_json(v);
end; $$;

-- A lifecycle sweep is not a second message dispatcher. It only manages state
-- and creates instances consumed by existing Reminder Engine delivery cron.
create or replace function private.sweep_life_proposals(p_now timestamptz default now())
returns integer language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare v public.life_proposals%rowtype; v_end timestamptz; v_count integer:=0; v_actor text;
begin
 for v in select * from public.life_proposals where status<>'closed'
  and (status in ('pending','counter') and least(created_at+interval '48 hours',scheduled_at)<=p_now
   or status in ('agreed','reschedule') and scheduled_at+make_interval(mins=>duration_minutes)<=p_now
   or status='awaiting_result' and scheduled_at+make_interval(mins=>duration_minutes)+interval '48 hours'<=p_now)
  for update skip locked
 loop
  v_end:=v.scheduled_at+make_interval(mins=>v.duration_minutes);
  if v.status in ('pending','counter') then
   v.status:='closed';v.outcome:='expired';v.closed_at:=p_now;v.waiting_for:=null;
  elsif v.status in ('agreed','reschedule') then
   v.status:='awaiting_result';v.waiting_for:=null;v.candidate_at:=null;v.candidate_duration:=null;
  else
   v.status:='closed';v.outcome:='unconfirmed';v.closed_at:=p_now;
  end if;
  v.version:=v.version+1;
  perform private.life_proposal_clear_reminders(v);
  if v.status='awaiting_result' then
   foreach v_actor in array array['cat','fish']::text[] loop
    if not (v.results ? v_actor) then
     perform private.life_proposal_notify(v,v_actor,'result',p_now,v.version);
     perform private.life_proposal_notify(v,v_actor,'followup',v_end+interval '24 hours',v.version);
    end if;
   end loop;
  end if;
  update public.life_proposals set status=v.status,outcome=v.outcome,waiting_for=v.waiting_for,
   candidate_at=v.candidate_at,candidate_duration=v.candidate_duration,version=v.version,
   closed_at=v.closed_at,updated_at=p_now where id=v.id;
  insert into public.life_proposal_events(couple_space_id,proposal_id,actor,event_type,payload)
  values(v.couple_space_id,v.id,'system',case when v.status='closed' then 'auto_close' else 'awaiting_result' end,
   jsonb_build_object('status',v.status,'outcome',v.outcome));
  v_count:=v_count+1;
 end loop;
 return v_count;
end; $$;

revoke all on function private.life_proposal_as_json(public.life_proposals) from public,anon,authenticated;
revoke all on function private.life_proposal_notify(public.life_proposals,text,text,timestamptz,integer) from public,anon,authenticated;
revoke all on function private.life_proposal_clear_reminders(public.life_proposals) from public,anon,authenticated;
revoke all on function private.life_proposal_schedule(public.life_proposals) from public,anon,authenticated;
revoke all on function private.sweep_life_proposals(timestamptz) from public,anon,authenticated;
revoke all on function public.list_life_proposals(text) from public,anon,authenticated;
revoke all on function public.mutate_life_proposal(text,text,uuid,jsonb,integer,uuid,text) from public,anon,authenticated;
grant execute on function public.list_life_proposals(text) to service_role;
grant execute on function public.mutate_life_proposal(text,text,uuid,jsonb,integer,uuid,text) to service_role;

do $$ begin
 if exists(select 1 from cron.job where jobname='life-proposal-sweep-v1') then
  perform cron.unschedule('life-proposal-sweep-v1');
 end if;
 perform cron.schedule('life-proposal-sweep-v1','*/5 * * * *','select private.sweep_life_proposals();');
end $$;
