-- Make Island Life PushPlus reminders warmer and user-facing, while keeping cat/fish only as internal actor keys.

create or replace function private.life_cute_partner_term(p_seed text)
returns text
language sql
immutable
security invoker
set search_path = pg_catalog
as $$
  select (array[
    '主人的宝宝',
    '主人的老婆',
    '主人的宝贝老婆',
    '主人的亲亲老婆',
    '主人最爱的宝贝'
  ])[1 + mod(abs(hashtext(coalesce(p_seed, '团子'))::bigint), 5)::integer];
$$;

create or replace function private.life_pushplus_center_message(
  p_actor text,
  p_instance jsonb
) returns jsonb
language plpgsql
immutable
security invoker
set search_path = pg_catalog, private
as $$
declare
  v_kind text := coalesce(p_instance->>'source_kind', '');
  v_title text := btrim(coalesce(p_instance->>'title', ''));
  v_content text := btrim(coalesce(p_instance->>'content', ''));
  v_seed text := coalesce(nullif(p_instance->>'source_ref',''), nullif(p_instance->>'id',''), '团子');
  v_partner text := private.life_cute_partner_term(v_seed);
  v_format text := coalesce(p_instance->'metadata'->>'format', '');
  v_days integer := nullif(p_instance->'metadata'->>'daysUntil','')::integer;
begin
  if p_actor not in ('cat','fish') then raise exception 'Invalid reminder actor'; end if;

  if v_kind = 'mailbox' then
    if v_format = 'postcard' then
      return jsonb_build_object(
        'title', '💌 主人～收到明信片啦！',
        'content', '主人～' || v_partner || '给主人寄来了一张明信片啦！团子已经帮主人放进小信箱，快去看看呀～ 💗 ——团子'
      );
    end if;
    return jsonb_build_object(
      'title', '💌 主人～有一封手札来啦！',
      'content', '主人～' || v_partner || '给主人写了一封手札！团子已经悄悄放进小信箱啦，快去拆开看看吧～ 💕 ——团子'
    );
  end if;

  if v_kind = 'anniversary' then
    if coalesce(v_days, 0) = 0 then
      return jsonb_build_object(
        'title', '💕 主人～今天是特别的日子呀！',
        'content', '主人～今天是主人和' || v_partner || '的纪念日呀！团子祝你们一直黏黏糊糊、开开心心，把今天过成软乎乎的一天～ 💗 ——团子'
      );
    elsif v_days = 1 then
      return jsonb_build_object(
        'title', '💕 主人～明天就是纪念日啦！',
        'content', '主人～明天就是主人和' || v_partner || '的纪念日啦！可以偷偷留一点时间给彼此，团子已经开始替你们期待啦～ ✨ ——团子'
      );
    end if;
    return jsonb_build_object(
      'title', '💕 主人～纪念日还有 ' || v_days || ' 天',
      'content', '主人～再过 ' || v_days || ' 天就是主人和' || v_partner || '的纪念日啦！有想一起做的小事，可以慢慢偷偷准备起来呀～ 💗 ——团子'
    );
  end if;

  if v_kind = 'medicine' then
    return jsonb_build_object(
      'title', '💊 主人～药箱里有个小提醒',
      'content', '主人～团子来轻轻敲一下：' || coalesce(nullif(v_content,''), '药箱里有东西需要主人留意啦') || '。有空记得看看药箱哦，不急不慌～ 💗 ——团子'
    );
  end if;

  return jsonb_build_object(
    'title', case when v_title = '' then '⏰ 主人～团子来提醒你啦' else '⏰ 主人～' || v_title end,
    'content', '主人～团子来提醒你啦：' || coalesce(nullif(v_content,''), nullif(v_title,''), '有一件小事到时间啦') || '。忙完手头这点再去做也可以，团子会乖乖陪着主人～ 💕 ——团子'
  );
end;
$$;

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
  v_kind text := p_reminder->>'kind';
  v_days integer;
begin
  if p_actor not in ('cat', 'fish') then raise exception 'Invalid reminder actor'; end if;

  if v_kind = 'daily_record' then
    return jsonb_build_object(
      'title', '🌙 主人～团子来看看你啦',
      'content', '主人～今天团子还没看到你的生活记录呀。随手记一点点就好，不用补全，也不用和任何人比。团子只是想陪主人把今天轻轻收好～ 💗 ——团子'
    );
  end if;

  v_days := coalesce((p_reminder->>'daysUntil')::integer, 0);
  if v_days = 0 then
    return jsonb_build_object(
      'title', '💕 主人～今天是特别的日子呀！',
      'content', '主人～今天是主人和主人最爱的宝贝的纪念日呀！团子祝你们一直黏黏糊糊、开开心心～ 💗 ——团子'
    );
  elsif v_days = 1 then
    return jsonb_build_object(
      'title', '💕 主人～明天就是纪念日啦！',
      'content', '主人～明天就是主人和主人的亲亲老婆的纪念日啦！团子已经替你们开始期待啦～ ✨ ——团子'
    );
  end if;

  return jsonb_build_object(
    'title', '💕 主人～纪念日还有 ' || v_days || ' 天',
    'content', '主人～还有 ' || v_days || ' 天就是主人和主人的宝贝老婆的纪念日啦！可以慢慢想想要一起做什么呀～ 💗 ——团子'
  );
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
  v_partner text := private.life_cute_partner_term(p_letter_id::text);
begin
  if p_sender not in ('cat','fish') or p_recipient not in ('cat','fish') or p_sender = p_recipient then raise exception 'Invalid mailbox reminder identity'; end if;
  if p_format not in ('letter','postcard') then raise exception 'Invalid mailbox reminder format'; end if;

  if p_format = 'postcard' then
    v_title := '💌 主人～收到明信片啦！';
    v_content := v_partner || '给主人寄来了一张明信片啦！快去小信箱看看呀～ 💗';
  else
    v_title := '💌 主人～有一封手札来啦！';
    v_content := v_partner || '给主人写了一封手札！快去小信箱拆开看看吧～ 💕';
  end if;

  insert into public.life_reminder_instances(couple_space_id, recipient, source_kind, source_ref, title, content, due_at, dedupe_key, metadata)
  values (
    p_space_id, p_recipient, 'mailbox', p_letter_id::text, v_title, v_content, p_due_at,
    'mailbox:' || p_letter_id::text || ':' || p_recipient,
    jsonb_build_object('letterId', p_letter_id, 'senderKey', p_sender, 'format', p_format, 'destination', '/mailbox')
  )
  on conflict (couple_space_id, recipient, dedupe_key) do nothing
  returning id into v_instance_id;

  return v_instance_id;
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
      v_space_id, p_actor, 'reminder', (p_now at time zone 'Asia/Shanghai')::date,
      'reminder:' || v_row.id::text || ':' || extract(epoch from v_effective_due)::bigint::text,
      jsonb_build_object('instanceId',v_row.id,'sourceKind',v_row.source_kind,'effectiveDueAt',v_effective_due)
    );
    if v_delivery_id is null then continue; end if;

    v_message := private.life_pushplus_center_message(p_actor, to_jsonb(v_row));
    v_send := private.life_pushplus_send(p_actor, v_message->>'title', v_message->>'content');
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

create or replace function public.test_life_pushplus(p_actor text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_result jsonb;
begin
  if p_actor not in ('cat', 'fish') then raise exception 'Invalid reminder actor'; end if;
  if private.life_pushplus_token(p_actor) is null then
    return jsonb_build_object('actor', p_actor, 'ok', false, 'error', 'PushPlus token is not configured');
  end if;

  v_result := private.life_pushplus_send(
    p_actor,
    '🔔 主人～团子的微信铃铛接好啦！',
    '主人～团子的微信提醒已经连接成功啦！以后有重要的小事，团子就从这里轻轻叫主人～ 💗 ——团子'
  );

  return jsonb_build_object(
    'actor', p_actor,
    'ok', coalesce((v_result->>'ok')::boolean, false),
    'providerMessageId', v_result->>'providerMessageId',
    'error', v_result->>'error'
  );
end;
$$;

revoke all on function private.life_cute_partner_term(text) from public, anon, authenticated;
revoke all on function private.life_pushplus_center_message(text, jsonb) from public, anon, authenticated;
grant execute on function private.life_cute_partner_term(text) to service_role;
grant execute on function private.life_pushplus_center_message(text, jsonb) to service_role;
