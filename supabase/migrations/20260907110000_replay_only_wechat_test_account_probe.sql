-- Add a minimal WeChat public-platform test-account sender without changing the current PushPlus delivery path.
-- Runtime credentials stay in Supabase Vault; this migration only adds server-side helper functions.

create or replace function private.life_wechat_config(p_key text)
returns text
language plpgsql
stable
security definer
set search_path = pg_catalog, vault, private
as $$
declare
  v_name text;
  v_value text;
begin
  v_name := case p_key
    when 'app_id' then 'life_wechat_app_id'
    when 'app_secret' then 'life_wechat_app_secret'
    when 'template_id' then 'life_wechat_template_id'
    when 'openid_cat' then 'life_wechat_openid_cat'
    when 'openid_fish' then 'life_wechat_openid_fish'
    else null
  end;

  if v_name is null then
    raise exception 'Invalid WeChat config key';
  end if;

  select nullif(btrim(v.decrypted_secret), '') into v_value
  from vault.decrypted_secrets v
  where v.name = v_name
  order by v.updated_at desc
  limit 1;

  return v_value;
end;
$$;

create or replace function private.life_wechat_send_template(
  p_actor text,
  p_first text,
  p_type text,
  p_content text,
  p_time text,
  p_remark text,
  p_url text default 'https://couple-better-game.vercel.app/me/reminders'
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, extensions, private
as $$
declare
  v_app_id text;
  v_app_secret text;
  v_template_id text;
  v_openid text;
  v_token_response extensions.http_response;
  v_token_body jsonb;
  v_access_token text;
  v_send_response extensions.http_response;
  v_send_body jsonb;
  v_error text;
begin
  if p_actor not in ('cat','fish') then
    raise exception 'Invalid reminder actor';
  end if;

  v_app_id := private.life_wechat_config('app_id');
  v_app_secret := private.life_wechat_config('app_secret');
  v_template_id := private.life_wechat_config('template_id');
  v_openid := private.life_wechat_config(case when p_actor='cat' then 'openid_cat' else 'openid_fish' end);

  if v_app_id is null or v_app_secret is null or v_template_id is null then
    return jsonb_build_object('ok', false, 'error', 'WeChat test account configuration is incomplete');
  end if;
  if v_openid is null then
    return jsonb_build_object('ok', false, 'error', 'WeChat OpenID is not configured for ' || p_actor);
  end if;

  begin
    select * into v_token_response
    from extensions.http_get(
      ('https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=' || v_app_id || '&secret=' || v_app_secret)::varchar
    );

    begin
      v_token_body := coalesce(v_token_response.content, '{}')::jsonb;
    exception when others then
      v_token_body := '{}'::jsonb;
    end;

    v_access_token := nullif(btrim(coalesce(v_token_body->>'access_token','')), '');
    if v_token_response.status not between 200 and 299 or v_access_token is null then
      v_error := left(
        'token HTTP ' || coalesce(v_token_response.status::text,'unknown') ||
        ', errcode=' || coalesce(v_token_body->>'errcode','unknown') ||
        ', errmsg=' || coalesce(v_token_body->>'errmsg','empty'),
        1000
      );
      return jsonb_build_object('ok', false, 'error', v_error);
    end if;

    select * into v_send_response
    from extensions.http_post(
      ('https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=' || v_access_token)::varchar,
      jsonb_build_object(
        'touser', v_openid,
        'template_id', v_template_id,
        'url', p_url,
        'data', jsonb_build_object(
          'first', jsonb_build_object('value', coalesce(p_first,'')),
          'keyword1', jsonb_build_object('value', coalesce(p_type,'')),
          'keyword2', jsonb_build_object('value', coalesce(p_content,'')),
          'keyword3', jsonb_build_object('value', coalesce(p_time,'')),
          'remark', jsonb_build_object('value', coalesce(p_remark,''))
        )
      )::text::varchar,
      'application/json'::varchar
    );

    begin
      v_send_body := coalesce(v_send_response.content, '{}')::jsonb;
    exception when others then
      v_send_body := '{}'::jsonb;
    end;

    if v_send_response.status between 200 and 299
       and coalesce((v_send_body->>'errcode')::integer, -1) = 0 then
      return jsonb_build_object(
        'ok', true,
        'provider', 'wechat_test_account',
        'providerMessageId', v_send_body->>'msgid'
      );
    end if;

    v_error := left(
      'send HTTP ' || coalesce(v_send_response.status::text,'unknown') ||
      ', errcode=' || coalesce(v_send_body->>'errcode','unknown') ||
      ', errmsg=' || coalesce(v_send_body->>'errmsg','empty'),
      1000
    );
    return jsonb_build_object('ok', false, 'error', v_error);
  exception when others then
    return jsonb_build_object('ok', false, 'error', left(sqlerrm, 1000));
  end;
end;
$$;

create or replace function public.test_life_wechat(p_actor text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_result jsonb;
  v_time text;
begin
  if p_actor not in ('cat','fish') then
    raise exception 'Invalid reminder actor';
  end if;

  v_time := to_char(now() at time zone 'Asia/Shanghai', 'YYYY-MM-DD HH24:MI');
  v_result := private.life_wechat_send_template(
    p_actor,
    '主人～团子的微信铃铛接好啦！ 💌',
    '连接测试',
    '以后团子可以从这里给主人送小岛提醒啦～',
    v_time,
    '团子已经准备好啦 💗',
    'https://couple-better-game.vercel.app/me/reminders'
  );

  return jsonb_build_object(
    'actor', p_actor,
    'ok', coalesce((v_result->>'ok')::boolean, false),
    'provider', v_result->>'provider',
    'providerMessageId', v_result->>'providerMessageId',
    'error', v_result->>'error'
  );
end;
$$;

revoke all on function private.life_wechat_config(text) from public, anon, authenticated;
revoke all on function private.life_wechat_send_template(text,text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.test_life_wechat(text) from public, anon, authenticated;

grant execute on function private.life_wechat_config(text) to service_role;
grant execute on function private.life_wechat_send_template(text,text,text,text,text,text,text) to service_role;
grant execute on function public.test_life_wechat(text) to service_role;
