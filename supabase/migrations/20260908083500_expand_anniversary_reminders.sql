-- Anniversary reminder schedule:
-- - yearly anniversary: 7 days before, 3 days before, and the day itself
-- - every 100th day together: same-day reminder only

alter table public.life_notification_preferences
  alter column anniversary_offsets set default array[7, 3, 0];

update public.life_notification_preferences
set anniversary_reminder_enabled = true,
    anniversary_offsets = array[7, 3, 0],
    updated_at = now()
where actor in ('cat', 'fish');

create or replace function private.materialize_anniversary_reminders(
  p_space_slug text default 'couple-better-game',
  p_now timestamptz default now()
) returns integer
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_space_id uuid;
  v_anniversary date;
  v_pref public.life_notification_preferences%rowtype;
  v_today date;
  v_horizon date;
  v_target_date date;
  v_due_date date;
  v_offset integer;
  v_count integer := 0;
  v_key text;
  v_title text;
  v_content text;
  v_current_day integer;
  v_hundred integer;
  v_hundred_date date;
begin
  select id into v_space_id
  from public.couple_spaces
  where slug = p_space_slug and archived_at is null;
  if v_space_id is null then return 0; end if;

  select anniversary_date into v_anniversary
  from public.app_configs
  where couple_space_id = v_space_id;
  if v_anniversary is null then return 0; end if;

  for v_pref in
    select *
    from public.life_notification_preferences
    where couple_space_id = v_space_id
      and enabled
      and anniversary_reminder_enabled
  loop
    v_today := (p_now at time zone v_pref.timezone)::date;
    v_horizon := v_today + 370;

    -- Yearly anniversary reminders.
    v_target_date := private.life_anniversary_for_year(
      v_anniversary,
      extract(year from v_today)::integer
    );
    if v_target_date < v_today then
      v_target_date := private.life_anniversary_for_year(
        v_anniversary,
        extract(year from v_today)::integer + 1
      );
    end if;

    foreach v_offset in array v_pref.anniversary_offsets loop
      if v_offset < 0 or v_offset > 365 then continue; end if;
      v_due_date := v_target_date - v_offset;
      if v_due_date < v_today or v_due_date > v_horizon then continue; end if;

      if v_offset = 0 then
        v_title := '💛 今天是你们的纪念日啦！';
        v_content := '今天是你们的纪念日 💛 给彼此留一点开心的时间吧。';
      elsif v_offset = 3 then
        v_title := '💛 纪念日还有 3 天';
        v_content := '再过 3 天就是你们的纪念日啦 💛';
      elsif v_offset = 7 then
        v_title := '💛 纪念日还有 1 周';
        v_content := '再过一周就是你们的纪念日啦 💛';
      else
        v_title := '💛 纪念日还有 ' || v_offset || ' 天';
        v_content := '还有 ' || v_offset || ' 天就是你们的纪念日啦 💛';
      end if;

      v_key := 'anniversary:' || v_pref.actor || ':' || v_target_date::text || ':' || v_offset::text;
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
        v_space_id,
        v_pref.actor,
        'anniversary',
        v_target_date::text,
        v_title,
        v_content,
        (v_due_date::timestamp + v_pref.anniversary_reminder_time) at time zone v_pref.timezone,
        v_key,
        jsonb_build_object(
          'kind', 'yearly_anniversary',
          'targetDate', v_target_date,
          'daysUntil', v_offset
        )
      )
      on conflict (couple_space_id, recipient, dedupe_key) do nothing;
      if found then v_count := v_count + 1; end if;
    end loop;

    -- Every 100th day together. The anniversary date is day 1,
    -- matching the app's daysTogether() calculation.
    if v_today >= v_anniversary then
      v_current_day := (v_today - v_anniversary) + 1;
      v_hundred := greatest(100, ((v_current_day + 99) / 100) * 100);

      loop
        v_hundred_date := v_anniversary + (v_hundred - 1);
        exit when v_hundred_date > v_horizon;

        if v_hundred_date >= v_today then
          v_title := '💛 在一起第 ' || v_hundred || ' 天啦！';
          v_content := '今天是你们在一起的第 ' || v_hundred || ' 天 💛 又攒下了一个整百日的小里程碑。';
          v_key := 'anniversary-hundred:' || v_pref.actor || ':' || v_hundred::text;

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
            v_space_id,
            v_pref.actor,
            'anniversary',
            v_hundred::text,
            v_title,
            v_content,
            (v_hundred_date::timestamp + v_pref.anniversary_reminder_time) at time zone v_pref.timezone,
            v_key,
            jsonb_build_object(
              'kind', 'hundred_day',
              'dayNumber', v_hundred,
              'targetDate', v_hundred_date
            )
          )
          on conflict (couple_space_id, recipient, dedupe_key) do nothing;
          if found then v_count := v_count + 1; end if;
        end if;

        v_hundred := v_hundred + 100;
      end loop;
    end if;
  end loop;

  return v_count;
end;
$$;

revoke all on function private.materialize_anniversary_reminders(text, timestamptz)
  from public, anon, authenticated;
grant execute on function private.materialize_anniversary_reminders(text, timestamptz)
  to service_role;

-- Replace only active future anniversary instances so the new schedule takes effect immediately.
delete from public.life_reminder_instances i
using public.couple_spaces c
where i.couple_space_id = c.id
  and c.slug = 'couple-better-game'
  and i.source_kind = 'anniversary'
  and i.status in ('pending', 'snoozed');

select private.materialize_anniversary_reminders('couple-better-game', now());
