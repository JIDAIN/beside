-- Disposable-database smoke: proposal reminders carry an ID-specific link,
-- and the existing generic Beside footer remains unchanged.
\set ON_ERROR_STOP on
do $$
declare
  v_space uuid;
  v_proposal public.life_proposals%rowtype;
  v_content text;
begin
  select id into v_space from public.couple_spaces where slug='couple-better-game';
  insert into public.life_proposals(couple_space_id,title,note,duration_minutes,scheduled_at)
  values(v_space,'一起来散步','',30,now()+interval '2 days')
  returning * into v_proposal;

  perform private.life_proposal_notify(v_proposal,'fish','invite',now(),1);
  select content into v_content from public.life_reminder_instances
  where source_ref=v_proposal.id::text and recipient='fish' limit 1;
  if v_content not like '%/open/together?proposal='||v_proposal.id::text||'%' then
    raise exception 'missing proposal deep link: %',v_content;
  end if;
  if v_content not like '%一起来散步%' then
    raise exception 'original proposal content missing';
  end if;
  if private.life_pushplus_append_site_link(v_content,'一起做吧')
    not like '%https://couple-better-game.vercel.app/nest/together%' then
    raise exception 'generic footer was lost';
  end if;
end $$;
