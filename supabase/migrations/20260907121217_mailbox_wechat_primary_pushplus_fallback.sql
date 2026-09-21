-- Mailbox reminders use the WeChat Public Platform test account as the primary channel.
-- PushPlus stays available as a fallback. Other reminder sources continue to use PushPlus.

create or replace function private.life_wechat_mailbox_message(
  p_actor text,
  p_instance jsonb
) returns jsonb
language plpgsql
immutable
security invoker
set search_path = pg_catalog, private
as $$
declare
  v_format text := coalesce(p_instance->'metadata'->>'format', 'letter');
  v_seed text := coalesce(nullif(p_instance->>'source_ref',''), nullif(p_instance->>'id',''), '团子');
  v_partner text := private.life_cute_partner_term(v_seed);
  v_due_at timestamptz := coalesce(nullif(p_instance->>'due_at','')::timestamptz, now());
  v_type text;
  v_content text;
  v_remark text;
begin
  if p_actor not in ('cat','fish') then raise exception 'Invalid reminder actor'; end if;

  if v_format = 'postcard' then
    v_type := '小信箱 · 明信片';
    v_content := v_partner || '给主人寄来了一张明信片啦！';
    v_remark := '团子已经帮主人放进小信箱，快去看看呀～ 💗';
  else
    v_type := '小信箱 · 手札';
    v_content := v_partner || '给主人写了一封手札啦！';
    v_remark := '团子已经悄悄放进小信箱，快去拆开看看吧～ 💕';
  end if;

  return jsonb_build_object(
    'first', '主人～团子来报信啦！ 💌',
    'type', v_type,
    'content', v_content,
    'time', to_char(v_due_at at time zone 'Asia/Shanghai', 'YYYY-MM-DD HH24:MI'),
    'remark', v_remark,
    'url', 'https://couple-better-game.vercel.app/nest/mailbox'
  );
end;
$$;

create or replace function private.life_mailbox_notification_send(
  p_actor text,
  p_instance jsonb
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, private
as $$
declare
  v_wechat_message jsonb;
  v_wechat jsonb;
  v_push_message jsonb;
  v_push jsonb;
  v_primary_error text;
begin
  if p_actor not in ('cat','fish') then raise exception 'Invalid reminder actor'; end if;

  v_wechat_message := private.life_wechat_mailbox_message(p_actor, p_instance);
  v_wechat := private.life_wechat_send_template(
    p_actor,
    v_wechat_message->>'first',
    v_wechat_message->>'type',
    v_wechat_message->>'content',
    v_wechat_message->>'time',
    v_wechat_message->>'remark',
    v_wechat_message->>'url'
  );

  if coalesce((v_wechat->>'ok')::boolean, false) then
    return v_wechat || jsonb_build_object(
      'provider', 'wechat_test_account',
      'fallbackUsed', false,
      'primaryProvider', 'wechat_test_account'
    );
  end if;

  v_primary_error := v_wechat->>'error';
  v_push_message := private.life_pushplus_center_message(p_actor, p_instance);
  v_push := private.life_pushplus_send(p_actor, v_push_message->>'title', v_push_message->>'content');

  if coalesce((v_push->>'ok')::boolean, false) then
    return jsonb_build_object(
      'ok', true,
      'provider', 'pushplus_wechat',
      'providerMessageId', v_push->>'providerMessageId',
      'fallbackUsed', true,
      'primaryProvider', 'wechat_test_account',
      'primaryError', v_primary_error
    );
  end if;

  return jsonb_build_object(
    'ok', false,
    'provider', 'wechat_test_account',
    'fallbackUsed', true,
    'primaryProvider', 'wechat_test_account',
    'primaryError', v_primary_error,
    'fallbackError', v_push->>'error',
    'error', left(
      'WeChat failed: ' || coalesce(v_primary_error, 'unknown') ||
      '; PushPlus fallback failed: ' || coalesce(v_push->>'error', 'unknown'),
      1000
    )
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
  v_message jsonb;
  v_sent integer := 0;
  v_failed integer := 0;
  v_wechat_sent integer := 0;
  v_pushplus_fallback_sent integer := 0;
  v_effective_due timestamptz;
  v_has_pushplus boolean;
  v_has_wechat boolean;
begin
  if p_actor not in ('cat','fish') then raise exception 'Invalid reminder actor'; end if;

  v_has_pushplus := private.life_pushplus_token(p_actor) is not null;
  v_has_wechat :=
    private.life_wechat_config('app_id') is not null
    and private.life_wechat_config('app_secret') is not null
    and private.life_wechat_config('template_id') is not null
    and private.life_wechat_config(case when p_actor='cat' then 'openid_cat' else 'openid_fish' end) is not null;

  if not v_has_pushplus and not v_has_wechat then
    return jsonb_build_object('actor',p_actor,'configured',false,'sent',0,'failed',0);
  end if;

  select id into v_space_id from public.couple_spaces where slug = p_space_slug and archived_at is null;
  if v_space_id is null then
    return jsonb_build_object('actor',p_actor,'configured',true,'sent',0,'failed',0);
  end if;

  for v_row in
    select i.* from public.life_reminder_instances i
    where i.couple_space_id = v_space_id
      and i.recipient = p_actor
      and i.status in ('pending','snoozed')
      and coalesce(i.snoozed_until,i.due_at) <= p_now
      and i.notified_at is null
    order by coalesce(i.snoozed_until,i.due_at), i.created_at
    limit 20
  loop
    -- Only mailbox has a WeChat-primary route for now. Other sources still require PushPlus.
    if v_row.source_kind <> 'mailbox' and not v_has_pushplus then
      continue;
    end if;

    v_effective_due := coalesce(v_row.snoozed_until, v_row.due_at);
    v_delivery_id := private.reserve_life_notification_delivery(
      v_space_id,
      p_actor,
      'reminder',
      (p_now at time zone 'Asia/Shanghai')::date,
      'reminder:' || v_row.id::text || ':' || extract(epoch from v_effective_due)::bigint::text,
      jsonb_build_object(
        'instanceId', v_row.id,
        'sourceKind', v_row.source_kind,
        'effectiveDueAt', v_effective_due,
        'preferredProvider', case when v_row.source_kind='mailbox' then 'wechat_test_account' else 'pushplus_wechat' end
      )
    );
    if v_delivery_id is null then continue; end if;

    if v_row.source_kind = 'mailbox' then
      v_send := private.life_mailbox_notification_send(p_actor, to_jsonb(v_row));
    else
      v_message := private.life_pushplus_center_message(p_actor, to_jsonb(v_row));
      v_send := private.life_pushplus_send(p_actor, v_message->>'title', v_message->>'content')
        || jsonb_build_object('provider','pushplus_wechat','fallbackUsed',false);
    end if;

    update public.life_notification_deliveries d
    set provider = coalesce(nullif(v_send->>'provider',''), d.provider),
        metadata = d.metadata || jsonb_strip_nulls(jsonb_build_object(
          'fallbackUsed', case when v_send ? 'fallbackUsed' then (v_send->>'fallbackUsed')::boolean else null end,
          'primaryProvider', v_send->>'primaryProvider',
          'primaryError', v_send->>'primaryError'
        )),
        updated_at = now()
    where d.id = v_delivery_id;

    if coalesce((v_send->>'ok')::boolean,false) then
      perform public.complete_life_notification_delivery(
        v_delivery_id,
        p_actor,
        true,
        v_send->>'providerMessageId',
        null,
        p_space_slug
      );
      update public.life_reminder_instances
      set notified_at = p_now, updated_at = now()
      where id = v_row.id;

      v_sent := v_sent + 1;
      if v_send->>'provider' = 'wechat_test_account' then
        v_wechat_sent := v_wechat_sent + 1;
      elsif v_row.source_kind = 'mailbox' and coalesce((v_send->>'fallbackUsed')::boolean,false) then
        v_pushplus_fallback_sent := v_pushplus_fallback_sent + 1;
      end if;
    else
      perform public.complete_life_notification_delivery(
        v_delivery_id,
        p_actor,
        false,
        null,
        v_send->>'error',
        p_space_slug
      );
      v_failed := v_failed + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'actor', p_actor,
    'configured', true,
    'sent', v_sent,
    'failed', v_failed,
    'wechatSent', v_wechat_sent,
    'pushplusFallbackSent', v_pushplus_fallback_sent
  );
end;
$$;

revoke all on function private.life_wechat_mailbox_message(text,jsonb) from public, anon, authenticated;
revoke all on function private.life_mailbox_notification_send(text,jsonb) from public, anon, authenticated;
revoke all on function private.dispatch_due_life_reminders_for_actor(text,timestamptz,text) from public, anon, authenticated;

grant execute on function private.life_wechat_mailbox_message(text,jsonb) to service_role;
grant execute on function private.life_mailbox_notification_send(text,jsonb) to service_role;
grant execute on function private.dispatch_due_life_reminders_for_actor(text,timestamptz,text) to service_role;
