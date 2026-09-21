-- Keep reminders as a WeChat delivery concern, not an in-app task feed.
-- Reduce noisy automatic schedules while preserving mailbox/custom reminder delivery.

update public.life_notification_preferences
set daily_record_reminder_enabled = false,
    medicine_reminder_enabled = true,
    medicine_offsets = array[7, 0],
    anniversary_reminder_enabled = true,
    anniversary_offsets = array[1, 0],
    updated_at = now()
where actor in ('cat', 'fish');

-- Remove future automatic reminder instances that no longer belong to the slimmer schedule.
delete from public.life_reminder_instances
where source_kind = 'medicine'
  and status in ('pending', 'snoozed')
  and coalesce((metadata->>'daysUntil')::integer, -1) not in (7, 0);

delete from public.life_reminder_instances
where source_kind = 'anniversary'
  and status in ('pending', 'snoozed')
  and coalesce((metadata->>'daysUntil')::integer, -1) not in (1, 0);

-- Mailbox arrival reminders are one-shot pushes. Once delivered to WeChat, they should not
-- remain as pending in-app tasks.
update public.life_reminder_instances
set status = 'completed',
    completed_at = coalesce(completed_at, notified_at),
    updated_at = now()
where source_kind = 'mailbox'
  and status in ('pending', 'snoozed')
  and notified_at is not null;
