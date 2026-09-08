-- Future anniversary instances may contain manually completed test rows from the old schedule.
-- Remove all future anniversary instances regardless of status, then rebuild from the current rules.

delete from public.life_reminder_instances i
using public.couple_spaces c
where i.couple_space_id = c.id
  and c.slug = 'couple-better-game'
  and i.source_kind = 'anniversary'
  and i.due_at > now();

select private.materialize_anniversary_reminders('couple-better-game', now());
