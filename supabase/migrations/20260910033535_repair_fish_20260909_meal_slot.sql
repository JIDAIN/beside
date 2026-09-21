-- Repair the 2026-09-09 Fish meal that was stored as a second breakfast.
-- Match by stable business facts rather than a generated row ID so the
-- migration remains portable and idempotent across environments.

update public.meals as m
set
  meal_type = 'snack',
  snack_period = 'morning',
  updated_at = timezone('utc', now())
where m.partner_key = 'fish'
  and m.meal_date = date '2026-09-09'
  and m.meal_type = 'breakfast'
  and m.total_calories_kcal = 55
  and m.deleted_at is null
  and exists (
    select 1
    from public.meal_items as mi
    where mi.meal_id = m.id
      and mi.raw_name = 'Venchi 60% 黑巧克力'
      and mi.calories_kcal = 55
  );
