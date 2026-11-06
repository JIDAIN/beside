-- Disposable PostgreSQL 17 only, run after existing Tuanzi lifecycle smoke.
\set ON_ERROR_STOP on
do $$
declare
  v_actor text;
  v_msg jsonb;
  v_again jsonb;
  v_variants integer[];
  v_titles text[];
  v_day date:=date '2026-11-06';
  v_date date;
begin
  for v_actor in select unnest(array['cat','fish']) loop
    v_variants:=array[]::integer[];
    v_titles:=array[]::text[];
    for n in 0..49 loop
      v_date:=v_day+n;
      v_msg:=private.life_pushplus_message(v_actor,jsonb_build_object(
        'kind','daily_record','localDate',v_date,
        'missingItems',jsonb_build_array('早餐','心情'),
        'partnerMissingItems',jsonb_build_array('睡眠')));
      v_again:=private.life_pushplus_message(v_actor,jsonb_build_object(
        'kind','daily_record','localDate',v_date,
        'missingItems',jsonb_build_array('早餐','心情'),
        'partnerMissingItems',jsonb_build_array('睡眠')));
      if v_msg is distinct from v_again then raise exception 'retry copy changed';end if;
      if v_msg->>'title' not like '%伴岛%' and v_msg->>'title' not like '%Beside%' then
        raise exception 'unapproved product name in title: %',v_msg;
      end if;
      if (v_msg->>'content') not like '%主人：还差 早餐、心情%'
      or (v_msg->>'content') not like '%老婆：还差 睡眠%'
      then raise exception 'missing details not preserved: %',v_msg;end if;
      if (v_msg->>'content') like '%小岛日记%' then raise exception 'legacy copy present';end if;
      v_variants:=array_append(v_variants,private.tuanzi_copy_variant(v_actor||':'||v_date||':daily:'));
      v_titles:=array_append(v_titles,v_msg->>'title');
    end loop;
    if (select count(distinct x) from unnest(v_variants) x)<5 then
      raise exception 'not all daily variants exercised for %',v_actor;
    end if;
    if (select count(distinct x) from unnest(v_titles) x)<5 then
      raise exception 'not all daily titles exercised for %',v_actor;
    end if;
  end loop;
  for n in 0..19 loop
    v_msg:=private.life_pushplus_message('cat',jsonb_build_object(
     'kind','anniversary','targetDate',v_day+n,'daysUntil',n));
    if (v_msg->>'title') not like '%伴岛%' and (v_msg->>'title') not like '%Beside%' then
      raise exception 'anniversary brand missing: %',v_msg; end if;
    if n=0 and (v_msg->>'content') not like '%今天%' then raise exception 'today copy lost';end if;
    if n=1 and (v_msg->>'content') not like '%明天%' then raise exception 'tomorrow copy lost';end if;
    if n>=2 and (v_msg->>'content') not like '%'||n::text||' 天%' then
      raise exception 'countdown lost';
    end if;
  end loop;
end $$;
-- Test multiple batches and ensure each partner gets Beside-branded copy.
truncate public.push_test_log;
truncate public.life_partner_record_events;
do $$
declare v_space uuid;v_day date;v_msg text;
begin
 select id into v_space from public.couple_spaces limit 1;
 v_day:=(now() at time zone 'Asia/Shanghai')::date;
 insert into public.life_partner_record_events(couple_space_id,source_actor,record_date,record_kind,created_at)
 values(v_space,'cat',v_day,'breakfast',now()-interval '12 minutes');
 -- The earlier lifecycle inserted confirmed breakfast, so the fact still exists.
 perform private.dispatch_life_partner_record_events(now());
 select content into v_msg from public.push_test_log where recipient='fish' limit 1;
 if v_msg is null then raise exception 'missing partner message';end if;
 if v_msg like '%小岛日记%' then raise exception 'old brand remains: %',v_msg;end if;
 if v_msg not like '%早餐已记录%' then raise exception 'confirmed fact omitted';end if;
 if (select count(*) from public.push_test_log where
   title like '%伴岛%' or title like '%Beside%')<>1 then
   raise exception 'partner title not branded';end if;
end $$;
