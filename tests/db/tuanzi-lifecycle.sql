-- Execute only against the disposable GitHub Actions PostgreSQL database.
\set ON_ERROR_STOP on
do $$
declare v_space uuid; v_day date; v_count int; v_claim jsonb; v_msg jsonb; v_now timestamptz;
begin
 select id into v_space from public.couple_spaces where slug='couple-better-game';
 v_day := (now() at time zone 'Asia/Shanghai')::date;
 insert into public.mood_entries(couple_space_id,partner_key,mood_date,mood_key)
 values(v_space,'cat',v_day,'happy');
 update public.mood_entries set mood_key='calm' where partner_key='cat';
 insert into public.meals(couple_space_id,partner_key,meal_date,meal_type,status)
 values(v_space,'cat',v_day,'breakfast','confirmed'),
       (v_space,'cat',v_day,'lunch','confirmed'),
       (v_space,'cat',v_day,'dinner','estimated'),
       (v_space,'cat',v_day-1,'dinner','confirmed'),
       (v_space,'cat',v_day,'snack','confirmed');
 insert into public.sleep_records(couple_space_id,partner_key,sleep_date)
 values(v_space,'fish',v_day);
 select count(*) into v_count from public.life_partner_record_events;
 if v_count<>4 then raise exception 'expected 4 distinct events, got %',v_count;end if;
 v_now := now()+ interval '11 minutes';
 perform private.dispatch_life_partner_record_events(v_now);
 select count(*) into v_count from public.push_test_log;
 if v_count<>2 then raise exception 'expected two grouped notifications, got %',v_count;end if;
 if not exists(select 1 from public.push_test_log
   where recipient='fish' and content like '%早餐已记录%' and content like '%午餐已记录%' and content like '%心情已记录%')
 then raise exception 'Cat entries not grouped for Fish';end if;
 if not exists(select 1 from public.push_test_log
   where recipient='cat' and content like '%睡眠已记录%')
 then raise exception 'Fish sleep was not delivered to Cat';end if;
 perform private.dispatch_life_partner_record_events(v_now + interval '5 minutes');
 select count(*) into v_count from public.push_test_log;
 if v_count<>2 then raise exception 'duplicate delivery';end if;
 v_now := (v_day + time '21:05') at time zone 'Asia/Shanghai';
 v_claim := public.claim_life_notification_reminders('cat',v_now);
 if jsonb_array_length(v_claim->'reminders')<>1 then raise exception 'no Cat digest';end if;
 v_msg := private.life_pushplus_message('cat',v_claim->'reminders'->0);
 if (v_msg->>'content') not like '%主人的今日记录%' or (v_msg->>'content') not like '%老婆的今日记录%'
 then raise exception 'no two-person relative digest';end if;
 if not(v_msg->>'content' like '%晚餐%' and v_msg->>'content' like '%早餐%') then
   raise exception 'missing items omitted';end if;
 if has_table_privilege('anon','public.life_partner_record_events','SELECT') or
   has_function_privilege('anon','public.update_life_couple_notification_settings(text,boolean,boolean,text)','EXECUTE') then
   raise exception 'unauthorized grants';end if;
end $$;

-- Exercise the new setting RPC and per-recipient opt-out.
do $$
declare v_space uuid; v_day date; v_count int;
begin
 select id into v_space from public.couple_spaces where slug='couple-better-game';
 v_day := (now() at time zone 'Asia/Shanghai')::date;
 perform public.update_life_couple_notification_settings('fish',false,true);
 if (public.get_life_reminder_settings('fish')->>'partnerRecordNotificationsEnabled')::boolean then
   raise exception 'preference mutation failed';end if;
 insert into public.sleep_records(couple_space_id,partner_key,sleep_date) values(v_space,'cat',v_day);
 perform private.dispatch_life_partner_record_events(now()+ interval '11 minutes');
 select count(*) into v_count from public.push_test_log;
 if v_count<>2 then raise exception 'disabled partner still received push';end if;
end $$;
