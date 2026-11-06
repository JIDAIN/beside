-- Diverse affectionate Tuanzi copy for existing Reminder flows.
-- Forward-only SQL: does not update notification rows or reschedule jobs.
-- This migration must not be applied to Production without separate approval.

-- Stable, bounded copy selection: the same logical notification always receives
-- the same wording on provider retries; no random() or global state.
create or replace function private.tuanzi_copy_variant(p_seed text)
returns integer language sql immutable security invoker
set search_path=pg_catalog as $$
  select 1 + get_byte(decode(md5(coalesce(p_seed,'')),'hex'),0) % 5;
$$;
revoke all on function private.tuanzi_copy_variant(text) from public,anon,authenticated;

create or replace function private.life_pushplus_message(
  p_actor text,
  p_reminder jsonb
) returns jsonb
language plpgsql immutable security invoker
set search_path=pg_catalog,private as $$
declare
  v_kind text := p_reminder->>'kind';
  v_days integer;
  v_self_missing text;
  v_partner_missing text;
  v_variant integer;
  v_title text;
  v_intro text;
  v_outro text;
  v_content text;
begin
  if p_actor not in ('cat','fish') then raise exception 'Invalid reminder actor'; end if;

  v_variant := private.tuanzi_copy_variant(
    p_actor || ':' || coalesce(p_reminder->>'localDate',p_reminder->>'targetDate','')
    || ':' || coalesce(v_kind,'') || ':' || coalesce(p_reminder->>'daysUntil','')
  );

  if v_kind = 'daily_record' then
    select string_agg(value,'、') into v_self_missing
    from jsonb_array_elements_text(coalesce(p_reminder->'missingItems','[]'::jsonb)) x(value);
    select string_agg(value,'、') into v_partner_missing
    from jsonb_array_elements_text(coalesce(p_reminder->'partnerMissingItems','[]'::jsonb)) x(value);

    v_title := case v_variant
      when 1 then '🌙 团子 · 伴岛晚间提醒'
      when 2 then '💌 团子 · Beside 晚安小提醒'
      when 3 then '🌷 团子 · 伴岛今日记录'
      when 4 then '✨ 团子 · 今晚的小提醒'
      else '💗 Beside · 团子的晚间问候' end;
    v_intro := case v_variant
      when 1 then '两位主人晚上好呀～团子来看看今天还有哪些记录没写完～ 🌙'
      when 2 then '主人～夜晚到啦，团子来轻轻提醒一下今天的伴岛记录～ 💕'
      when 3 then '主人主人～今天的生活日常，团子帮你和老婆核对好啦！ 🌷'
      when 4 then '晚上好呀主人～团子带着今天的记录小清单来啦！ ✨'
      else '亲爱的主人～Beside 今天的生活记录还有一点小尾巴哦～ 💗' end;
    v_outro := case v_variant
      when 1 then '有空再慢慢补上就好，不用着急呀～ 💗'
      when 2 then '今天辛苦啦，想起来的时候再补充也可以～ 🌼'
      when 3 then '团子会好好收藏你们的每一天，慢慢来就好～ 💕'
      when 4 then '别有压力，记录是为了留下生活，不是完成任务哦～ 💛'
      else '团子只是温柔提醒一下，祝两位主人今晚好梦～ 🌙' end;
    return jsonb_build_object('title',v_title,'content',
      v_intro || '<br><br>'
      || '💛 主人：' || coalesce('还差 ' || v_self_missing,'今天已经记齐啦～')
      || '<br>💚 老婆：' || coalesce('还差 ' || v_partner_missing,'今天已经记齐啦～')
      || '<br><br>' || v_outro || ' ——团子');
  end if;

  -- Anniversary days remain factual. Only the affectionate delivery words vary.
  v_days := coalesce((p_reminder->>'daysUntil')::integer,0);
  v_title := case
    when v_days=0 then '💕 团子 · 伴岛纪念日'
    when v_days=1 then '💝 团子 · Beside 纪念日提醒'
    else '💗 团子 · 伴岛纪念日倒数' end;
  v_intro := case v_variant
    when 1 then '主人主人～团子来报喜啦！'
    when 2 then '亲爱的主人～有件甜甜的小事要告诉你～'
    when 3 then '主人～团子悄悄来送一份甜蜜提醒啦！'
    when 4 then '报告主人～伴岛的纪念日小提醒送到！'
    else '主人～团子已经替你们开始期待啦！' end;
  if v_days=0 then
    v_content := '今天是你和亲亲老婆的纪念日呀！';
  elsif v_days=1 then
    v_content := '明天就是你和宝贝老婆的纪念日啦！';
  else
    v_content := '还有 ' || v_days || ' 天，就是你和老婆的纪念日啦！';
  end if;
  v_outro := case v_variant
    when 1 then '愿两位主人一直开开心心、甜甜蜜蜜～ 💕'
    when 2 then '想庆祝的话，可以一起留一点美好的时光呀～ 🌷'
    when 3 then '团子祝你们把平凡的日子也过得闪闪发亮～ ✨'
    when 4 then '不需要准备很多，和宝贝在一起就是温柔的日常～ 💗'
    else '今天也要和老婆好好相爱呀～ 🥰' end;
  return jsonb_build_object('title',v_title,
    'content',v_intro || '<br><br>' || v_content || '<br><br>' || v_outro || ' ——团子');
end;
$$;
revoke all on function private.life_pushplus_message(text,jsonb) from public,anon,authenticated;

create or replace function private.dispatch_life_partner_record_events(
  p_now timestamptz default now(),
  p_space_slug text default 'couple-better-game'
) returns jsonb language plpgsql security definer
set search_path=pg_catalog,public,private as $$
declare
  v_space uuid;
  v_group record;
  v_recipient text;
  v_pref public.life_notification_preferences%rowtype;
  v_delivery uuid;
  v_send jsonb;
  v_items text;
  v_count integer := 0;
  v_failed integer := 0;
  v_variant integer;
  v_title text;
  v_open text;
  v_close text;
begin
  select id into v_space from public.couple_spaces
    where slug=p_space_slug and archived_at is null;
  if v_space is null then return jsonb_build_object('sent',0,'failed',0); end if;

  -- Two groups are never confused: source actor and record date are part of each batch.
  for v_group in
    select e.source_actor,e.record_date,min(e.created_at) as first_at,
           array_agg(e.id order by e.created_at,e.id) as ids,
           string_agg(case e.record_kind
             when 'mood' then '💗 心情'
             when 'sleep' then '🌙 睡眠'
             when 'breakfast' then '🍳 早餐'
             when 'lunch' then '🍱 午餐'
             when 'dinner' then '🍚 晚餐' end,'<br>' order by
               array_position(array['mood','sleep','breakfast','lunch','dinner'],e.record_kind)) as labels
      from public.life_partner_record_events e
     where e.couple_space_id=v_space and e.delivered_at is null
     group by e.source_actor,e.record_date
    having max(e.created_at) <= p_now - interval '5 minutes'
        or min(e.created_at) <= p_now - interval '15 minutes'
  loop
    -- Never emit delayed notifications for an earlier day.
    if v_group.record_date <> (p_now at time zone 'Asia/Shanghai')::date then
      update public.life_partner_record_events set delivered_at=p_now
       where id=any(v_group.ids) and delivered_at is null;
      continue;
    end if;
    v_recipient := case when v_group.source_actor='cat' then 'fish' else 'cat' end;
    select * into v_pref from public.life_notification_preferences
      where couple_space_id=v_space and actor=v_recipient;
    -- Disabled recipient preferences silence new events without resending later.
    if not found or not v_pref.enabled or not v_pref.partner_record_notifications_enabled then
      update public.life_partner_record_events set delivered_at=p_now
       where id=any(v_group.ids) and delivered_at is null;
      continue;
    end if;
    if private.life_pushplus_token(v_recipient) is null then continue; end if;

    -- Revalidate against current facts to avoid announcements of deleted entries.
    select string_agg(case e.record_kind
             when 'mood' then '💗 心情已记录'
             when 'sleep' then '🌙 睡眠已记录'
             when 'breakfast' then '🍳 早餐已记录'
             when 'lunch' then '🍱 午餐已记录'
             when 'dinner' then '🍚 晚餐已记录' end,'<br>' order by
             array_position(array['mood','sleep','breakfast','lunch','dinner'],e.record_kind))
      into v_items
      from public.life_partner_record_events e
      where e.id=any(v_group.ids) and e.delivered_at is null
        and coalesce((private.life_daily_record_completeness(v_space,e.source_actor,e.record_date)->>e.record_kind)::boolean,false);
    if v_items is null then
      -- Keep cancelled records pending until the day ends: a re-created
      -- record can still generate its first real notification.
      continue;
    end if;
    v_delivery := private.reserve_life_notification_delivery(
      v_space,v_recipient,'partner_record',v_group.record_date,
      'partner_record:'||v_recipient||':'||v_group.source_actor||':'||v_group.record_date||':'||v_group.first_at::text,
      jsonb_build_object('sourceActor',v_group.source_actor,'recordDate',v_group.record_date)
    );
    if v_delivery is null then continue; end if;
    -- One stable variant per logical delivery group, independent of retries.
    v_variant := private.tuanzi_copy_variant('partner:' || v_recipient || ':' || v_group.first_at::text);
    v_title := case v_variant
      when 1 then '💗 团子 · 伴岛生活动态'
      when 2 then '💕 Beside · 团子的悄悄话'
      when 3 then '🌷 团子 · 伴岛小消息'
      when 4 then '💌 团子 · Beside生活更新'
      else '✨ 团子 · 伴岛生活动态' end;
    v_open := case v_variant
      when 1 then '主人主人～你的亲亲老婆刚刚更新了今天的生活记录啦！ 💕'
      when 2 then '主人～团子来送消息啦！宝贝老婆刚刚在 Beside 留下了今天的生活记录～ 🌷'
      when 3 then '亲爱的主人～你家老婆刚刚记录了几件日常小事，团子来告诉你啦！ 💗'
      when 4 then '报告主人～你的宝贝在伴岛更新了今天的生活记录哦！ ✨'
      else '主人～收到老婆的新动态啦！团子已经帮你留意到啦～ 💌' end;
    v_close := case v_variant
      when 1 then '来看看宝贝今天的日常吧～ 💗'
      when 2 then '有空就来伴岛看看老婆留下的小记录呀～ 💕'
      when 3 then '团子把消息送到啦，想她的话就来看看吧～ 🌸'
      when 4 then '今天的点滴也被好好记下来了呢～ 💛'
      else '快来瞧瞧宝贝今天记录了什么吧～ 🥰' end;
    v_send := private.life_pushplus_send(v_recipient,v_title,
      v_open || '<br><br>' || v_items || '<br><br>' || v_close || ' ——团子');
    if coalesce((v_send->>'ok')::boolean,false) then
      perform public.complete_life_notification_delivery(v_delivery,v_recipient,true,v_send->>'providerMessageId',null,p_space_slug);
      -- The successful batch settles all included events, even ones cancelled
      -- before sending. This prevents stale rows from keeping the same
      -- accepted delivery key and blocking later groups.
      update public.life_partner_record_events e set delivered_at=p_now
       where e.id=any(v_group.ids) and e.delivered_at is null;
      v_count := v_count+1;
    else
      perform public.complete_life_notification_delivery(v_delivery,v_recipient,false,null,v_send->>'error',p_space_slug);
      v_failed := v_failed+1;
    end if;
  end loop;
  return jsonb_build_object('sent',v_count,'failed',v_failed);
end; $$;


revoke all on function private.dispatch_life_partner_record_events(timestamptz,text) from public,anon,authenticated;
