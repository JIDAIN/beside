-- Early actual completion of an agreed Together activity.
-- Preserve per-partner results, scheduled reminders and original timing.
-- Forward-only migration; not Production approved in this branch.

create or replace function public.mutate_life_proposal(
 p_actor text,p_action text,p_id uuid,p_data jsonb,p_expected_version integer,
 p_request_id uuid,p_space_slug text default 'couple-better-game'
) returns jsonb language plpgsql security invoker set search_path=pg_catalog,public,private as $$
declare
 v_space uuid; v public.life_proposals%rowtype; v_existing uuid;
 v_at timestamptz; v_dur integer; v_title text; v_note text; v_end timestamptz;
 v_other text; v_outcome text; v_was_closed boolean:=false; v_now timestamptz;
begin
 if p_actor not in ('cat','fish') or p_request_id is null then raise exception 'invalid identity or request id'; end if;
 if p_action not in ('create','accept','encourage','counter','reschedule','decline','withdraw','cancel','result') then raise exception 'invalid action'; end if;
 select id into v_space from public.couple_spaces where slug=p_space_slug and archived_at is null;
 if v_space is null then raise exception 'couple space not found'; end if;
 perform pg_advisory_xact_lock(hashtext(v_space::text));
 v_now := clock_timestamp();
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
   perform private.life_proposal_notify(v,v_other,
    case when v.status='agreed' then 'unchanged' else 'declined' end,v_now,v.version);
  elsif p_action='withdraw' then
   if v.created_by<>p_actor or v.status not in ('pending','counter') then raise exception 'cannot withdraw'; end if;
   v.status:='closed';v.outcome:='withdrawn';v.closed_at:=v_now;v.waiting_for:=null;v.version:=v.version+1;
   perform private.life_proposal_clear_reminders(v);
   perform private.life_proposal_notify(v,v_other,'withdrawn',v_now,v.version);
  elsif p_action='cancel' then
   if v.status not in ('agreed','reschedule') or v_now>=v.scheduled_at+make_interval(mins=>v.duration_minutes) then raise exception 'cannot cancel'; end if;
   v.status:='closed';v.outcome:='cancelled';v.closed_at:=v_now;v.waiting_for:=null;v.version:=v.version+1;
   perform private.life_proposal_clear_reminders(v);
   perform private.life_proposal_notify(v,v_other,'cancelled',v_now,v.version);
  elsif p_action='result' then
   v_was_closed := (v.status='closed');
   if v.status not in ('agreed','reschedule','awaiting_result') and not (v.status='closed' and v.outcome='unconfirmed') then raise exception 'cannot record result'; end if;
   -- Actual work can be completed before its scheduled start.
   -- Early input only accepts a factual 'done' result for a confirmed agreement;
   -- do not permit premature 'not_done' or partial guesses.
   if v_now<v.scheduled_at
      and (v.status<>'agreed' or p_data->>'result'<>'done')
   then raise exception 'not started'; end if;
   if v.results ? p_actor then raise exception 'RESULT_ALREADY_RECORDED'; end if;
   if coalesce(p_data->>'result','') not in ('done','partial','not_done') then raise exception 'invalid result'; end if;
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
    -- One person's early completion must not pretend the whole scheduled
    -- activity has ended. Keep the agreement until its actual end so the
    -- other person still gets their start/finish reminders.
    v_end:=v.scheduled_at+make_interval(mins=>v.duration_minutes);
    if v_was_closed then
      v.status:='closed';
    elsif v.status in ('agreed','reschedule') and v_now<v_end then
      -- Preserve agreed/reschedule until the scheduled end.
      null;
    else
      v.status:='awaiting_result';
      v.waiting_for:=null;
    end if;
   end if;
   v.version:=v.version+1;
   if v.status='agreed' and v_now<v.scheduled_at+make_interval(mins=>v.duration_minutes) then
    -- Suppress only the reporter's future start nudges. The other partner's
    -- own start reminder must remain independently actionable.
    update public.life_reminder_instances
       set status='dismissed',updated_at=v_now
     where couple_space_id=v_space and source_kind='proposal'
       and source_ref=v.id::text and recipient=p_actor
       and status in ('pending','snoozed') and notified_at is null
       and metadata->>'phase' in ('before','encourage');
   end if;
   if v.status='awaiting_result' then
    perform private.life_proposal_clear_reminders(v);
    perform private.life_proposal_notify(v,v_other,'result',v_now,v.version);
    if v.scheduled_at+make_interval(mins=>v.duration_minutes)+interval '24 hours' > v_now + interval '30 minutes' then
     perform private.life_proposal_notify(v,v_other,'followup',
      v.scheduled_at+make_interval(mins=>v.duration_minutes)+interval '24 hours',v.version);
    end if;
   end if;
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

revoke all on function public.mutate_life_proposal(text,text,uuid,jsonb,integer,uuid,text) from public,anon,authenticated;
grant execute on function public.mutate_life_proposal(text,text,uuid,jsonb,integer,uuid,text) to service_role;
