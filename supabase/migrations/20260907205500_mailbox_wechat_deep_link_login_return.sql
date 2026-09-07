-- Route WeChat mailbox notification clicks through a server-side auth gate.
-- Logged-in WeChat browsers go straight to the mailbox; logged-out browsers
-- land on /login with a safe return path and continue to the mailbox after login.

create or replace function private.life_wechat_mailbox_message(
  p_actor text,
  p_instance jsonb
) returns jsonb
language plpgsql
stable
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
    'url', 'https://couple-better-game.vercel.app/open/mailbox'
  );
end;
$$;

revoke all on function private.life_wechat_mailbox_message(text,jsonb) from public, anon, authenticated;
grant execute on function private.life_wechat_mailbox_message(text,jsonb) to service_role;
