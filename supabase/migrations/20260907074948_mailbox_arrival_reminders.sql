-- Mailbox arrival reminders: sent letters/postcards create one Reminder Center instance for the recipient.

alter table public.life_reminder_rules
  drop constraint if exists life_reminder_rules_source_kind_check;
alter table public.life_reminder_rules
  add constraint life_reminder_rules_source_kind_check
  check (source_kind in ('custom','medicine','anniversary','system','mailbox'));

alter table public.life_reminder_instances
  drop constraint if exists life_reminder_instances_source_kind_check;
alter table public.life_reminder_instances
  add constraint life_reminder_instances_source_kind_check
  check (source_kind in ('custom','medicine','anniversary','system','mailbox'));

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
  v_sender_label text;
  v_item_label text;
begin
  if p_sender not in ('cat','fish') or p_recipient not in ('cat','fish') or p_sender = p_recipient then
    raise exception 'Invalid mailbox reminder identity';
  end if;
  if p_format not in ('letter','postcard') then
    raise exception 'Invalid mailbox reminder format';
  end if;

  v_sender_label := case when p_sender = 'cat' then 'Cat' else 'Fish' end;
  v_item_label := case when p_format = 'postcard' then '明信片' else '手札' end;
  v_title := '小信箱｜收到一' || case when p_format = 'postcard' then '张' else '封' end || '新' || v_item_label || ' 💌';
  v_content := v_sender_label || ' 给你寄来了一' || case when p_format = 'postcard' then '张' else '封' end || v_item_label || '，去小信箱看看吧。';

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

revoke all on function private.create_mailbox_arrival_reminder(uuid, uuid, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function private.create_mailbox_arrival_reminder(uuid, uuid, text, text, text, timestamptz) to service_role;

create or replace function public.create_mailbox_item_authorized(
  p_actor text,
  p_payload jsonb,
  p_status text default 'draft',
  p_source text default 'manual',
  p_space_slug text default 'couple-better-game'
)
returns jsonb
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  v_space_id uuid;
  v_id uuid;
  v_recipient text;
  v_format text := coalesce(nullif(p_payload->>'format',''), 'letter');
  v_body text := btrim(coalesce(p_payload->>'body',''));
  v_title text := nullif(btrim(p_payload->>'title'), '');
  v_theme text := coalesce(nullif(btrim(p_payload->>'themeKey'), ''), 'cream');
  v_sent_at timestamptz;
begin
  if p_actor not in ('cat','fish') then raise exception 'Invalid mailbox actor'; end if;
  if p_status not in ('draft','sent') then raise exception 'Invalid mailbox status'; end if;
  if p_source not in ('manual','chatgpt','import') then raise exception 'Invalid mailbox source'; end if;
  if v_format not in ('letter','postcard') then raise exception 'Invalid mailbox format'; end if;
  if char_length(v_body) < 1 or char_length(v_body) > 2000 then raise exception 'Mailbox body is required and must be at most 2000 characters'; end if;
  if v_title is not null and char_length(v_title) > 120 then raise exception 'Mailbox title is too long'; end if;

  select id into v_space_id
  from public.couple_spaces
  where slug = p_space_slug and archived_at is null;
  if v_space_id is null then raise exception 'Couple space not found'; end if;

  v_recipient := case when p_actor = 'cat' then 'fish' else 'cat' end;
  v_sent_at := case when p_status = 'sent' then now() else null end;

  insert into public.mailbox_letters(
    couple_space_id,
    sender_key,
    recipient_key,
    format,
    title,
    theme_key,
    body,
    status,
    sent_at,
    source
  ) values (
    v_space_id,
    p_actor,
    v_recipient,
    v_format,
    case when v_format = 'letter' then v_title else null end,
    v_theme,
    v_body,
    p_status,
    v_sent_at,
    p_source
  ) returning id into v_id;

  if p_status = 'sent' then
    perform private.create_mailbox_arrival_reminder(
      v_space_id, v_id, p_actor, v_recipient, v_format, v_sent_at
    );
  end if;

  return private.mailbox_letter_json(v_id);
end;
$$;

create or replace function public.send_mailbox_draft_authorized(
  p_actor text,
  p_letter_id uuid,
  p_source text default 'manual',
  p_space_slug text default 'couple-better-game'
)
returns jsonb
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  v_space_id uuid;
  v_recipient text;
  v_format text;
  v_sent_at timestamptz := now();
begin
  if p_actor not in ('cat','fish') then raise exception 'Invalid mailbox actor'; end if;
  if p_source not in ('manual','chatgpt','import') then raise exception 'Invalid mailbox source'; end if;

  select id into v_space_id
  from public.couple_spaces
  where slug = p_space_slug and archived_at is null;
  if v_space_id is null then raise exception 'Couple space not found'; end if;

  update public.mailbox_letters
  set status = 'sent',
      sent_at = v_sent_at,
      source = p_source,
      updated_at = v_sent_at
  where id = p_letter_id
    and couple_space_id = v_space_id
    and sender_key = p_actor
    and status = 'draft'
    and deleted_at is null
  returning recipient_key, format into v_recipient, v_format;

  if not found then raise exception 'Mailbox draft not found or already sent'; end if;

  perform private.create_mailbox_arrival_reminder(
    v_space_id, p_letter_id, p_actor, v_recipient, v_format, v_sent_at
  );

  return private.mailbox_letter_json(p_letter_id);
end;
$$;