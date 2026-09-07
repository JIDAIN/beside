-- Unify Island Life AI reminder naming to 团子 for both Cat and Fish,
-- and make mailbox arrival titles warmer. PushPlus's outer WeChat template
-- label ("设备通知") is provider-controlled and cannot be changed here.

create or replace function private.life_pushplus_message(
  p_actor text,
  p_reminder jsonb
) returns jsonb
language plpgsql
immutable
security invoker
set search_path = pg_catalog
as $$
declare
  v_ai_name text := '团子';
  v_kind text := p_reminder->>'kind';
  v_days integer;
begin
  if p_actor not in ('cat', 'fish') then
    raise exception 'Invalid reminder actor';
  end if;

  if v_kind = 'daily_record' then
    return jsonb_build_object(
      'title', v_ai_name || '提醒｜今天还没记录',
      'content', '今天还没有看到你的生活记录。记一点就好，不用补全，也不用和 Ta 比较。——' || v_ai_name
    );
  end if;

  v_days := coalesce((p_reminder->>'daysUntil')::integer, 0);
  if v_days = 0 then
    return jsonb_build_object(
      'title', v_ai_name || '提醒｜今天是你们的纪念日',
      'content', '今天是你们的纪念日 💛 不需要完成什么任务，给彼此留一点开心的时间就很好。——' || v_ai_name
    );
  elsif v_days = 1 then
    return jsonb_build_object(
      'title', v_ai_name || '提醒｜明天是你们的纪念日',
      'content', '明天就是你们的纪念日啦 💛 想庆祝的话，可以提前留一点时间给彼此。——' || v_ai_name
    );
  end if;

  return jsonb_build_object(
    'title', v_ai_name || '提醒｜纪念日还有 ' || v_days || ' 天',
    'content', '还有 ' || v_days || ' 天就是你们的纪念日啦 💛 想庆祝的话，可以提前想想怎么一起过。——' || v_ai_name
  );
end;
$$;

create or replace function public.test_life_pushplus(p_actor text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_ai_name text := '团子';
  v_result jsonb;
begin
  if p_actor not in ('cat', 'fish') then
    raise exception 'Invalid reminder actor';
  end if;
  if private.life_pushplus_token(p_actor) is null then
    return jsonb_build_object('actor', p_actor, 'ok', false, 'error', 'PushPlus token is not configured');
  end if;

  v_result := private.life_pushplus_send(
    p_actor,
    v_ai_name || '提醒｜微信提醒已连接',
    '微信提醒已经连接成功。以后需要提醒你的时候，我会从这里发给你。——' || v_ai_name
  );

  return jsonb_build_object(
    'actor', p_actor,
    'ok', coalesce((v_result->>'ok')::boolean, false),
    'providerMessageId', v_result->>'providerMessageId',
    'error', v_result->>'error'
  );
end;
$$;

create or replace function private.dispatch_due_life_reminders_for_actor(
  p_actor text,
  p_now timestamptz default now(),
  p_space_slug text default 'couple-better-game'
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_space_id uuid;
  v_row record;
  v_delivery_id uuid;
  v_send jsonb;
  v_sent integer := 0;
  v_failed integer := 0;
  v_ai_name text := '团子';
  v_effective_due timestamptz;
begin
  if p_actor not in ('cat','fish') then raise exception 'Invalid reminder actor'; end if;
  if private.life_pushplus_token(p_actor) is null then return jsonb_build_object('actor',p_actor,'configured',false,'sent',0,'failed',0); end if;
  select id into v_space_id from public.couple_spaces where slug = p_space_slug and archived_at is null;
  if v_space_id is null then return jsonb_build_object('actor',p_actor,'configured',true,'sent',0,'failed',0); end if;

  for v_row in
    select i.* from public.life_reminder_instances i
    where i.couple_space_id = v_space_id and i.recipient = p_actor and i.status in ('pending','snoozed')
      and coalesce(i.snoozed_until,i.due_at) <= p_now and i.notified_at is null
    order by coalesce(i.snoozed_until,i.due_at), i.created_at limit 20
  loop
    v_effective_due := coalesce(v_row.snoozed_until, v_row.due_at);
    v_delivery_id := private.reserve_life_notification_delivery(
      v_space_id,
      p_actor,
      'reminder',
      (p_now at time zone 'Asia/Shanghai')::date,
      'reminder:' || v_row.id::text || ':' || extract(epoch from v_effective_due)::bigint::text,
      jsonb_build_object('instanceId',v_row.id,'sourceKind',v_row.source_kind,'effectiveDueAt',v_effective_due)
    );
    if v_delivery_id is null then continue; end if;

    v_send := private.life_pushplus_send(
      p_actor,
      v_row.title,
      coalesce(v_row.content,'') || case when coalesce(v_row.content,'')='' then '' else '<br><br>' end || '——' || v_ai_name
    );
    if coalesce((v_send->>'ok')::boolean,false) then
      perform public.complete_life_notification_delivery(v_delivery_id,p_actor,true,v_send->>'providerMessageId',null,p_space_slug);
      update public.life_reminder_instances set notified_at = p_now, updated_at = now() where id = v_row.id;
      v_sent := v_sent + 1;
    else
      perform public.complete_life_notification_delivery(v_delivery_id,p_actor,false,null,v_send->>'error',p_space_slug);
      v_failed := v_failed + 1;
    end if;
  end loop;
  return jsonb_build_object('actor',p_actor,'configured',true,'sent',v_sent,'failed',v_failed);
end;
$$;

create or replace function private.create_mailbox_arrival_reminder(
  p_space_id uuid,
  p_letter_id uuid,
  p_sender text,
  p_recipient text,
  p_format text,
  p_due_at timestamptz default now()
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_instance_id uuid;
  v_title text;
  v_content text;
begin
  if p_sender not in ('cat','fish') or p_recipient not in ('cat','fish') or p_sender = p_recipient then
    raise exception 'Invalid mailbox reminder identity';
  end if;
  if p_format not in ('letter','postcard') then
    raise exception 'Invalid mailbox reminder format';
  end if;

  if p_format = 'postcard' then
    v_title := '💌 收到明信片啦～';
    v_content := 'Ta 给你寄来了一张明信片，去小信箱看看吧～';
  else
    v_title := '💌 有一封手札来啦～';
    v_content := 'Ta 给你写了一封手札，去小信箱拆开看看吧～';
  end if;

  insert into public.life_reminder_instances(
    couple_space_id,
    recipient,
    source_kind,
    source_ref,
    title,
    content,
    due_at,
    dedupe_key,
    metadata
  ) values (
    p_space_id,
    p_recipient,
    'mailbox',
    p_letter_id::text,
    v_title,
    v_content,
    p_due_at,
    'mailbox:' || p_letter_id::text || ':' || p_recipient,
    jsonb_build_object(
      'letterId', p_letter_id,
      'senderKey', p_sender,
      'format', p_format,
      'destination', '/mailbox'
    )
  )
  on conflict (couple_space_id, recipient, dedupe_key) do nothing
  returning id into v_instance_id;

  return v_instance_id;
end;
$$;

-- Refresh only future/unnotified mailbox reminder copy; delivered history remains immutable.
update public.life_reminder_instances
set title = case when metadata->>'format' = 'postcard'
      then '💌 收到明信片啦～'
      else '💌 有一封手札来啦～' end,
    content = case when metadata->>'format' = 'postcard'
      then 'Ta 给你寄来了一张明信片，去小信箱看看吧～'
      else 'Ta 给你写了一封手札，去小信箱拆开看看吧～' end,
    updated_at = now()
where source_kind = 'mailbox'
  and notified_at is null
  and status in ('pending','snoozed');

revoke all on function private.life_pushplus_message(text,jsonb) from public,anon,authenticated;
revoke all on function public.test_life_pushplus(text) from public,anon,authenticated;
revoke all on function private.dispatch_due_life_reminders_for_actor(text,timestamptz,text) from public,anon,authenticated;
revoke all on function private.create_mailbox_arrival_reminder(uuid,uuid,text,text,text,timestamptz) from public,anon,authenticated;

grant execute on function public.test_life_pushplus(text) to service_role;
grant execute on function private.create_mailbox_arrival_reminder(uuid,uuid,text,text,text,timestamptz) to service_role;
