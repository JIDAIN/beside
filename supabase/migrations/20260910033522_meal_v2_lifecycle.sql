-- Meal V2 lifecycle and canonical classification cleanup.
-- Historical values are converted before the stricter constraints are added.

begin;

alter table public.meals
  drop constraint if exists meals_meal_type_check,
  drop constraint if exists meals_snack_period_check,
  drop constraint if exists meals_status_check;

update public.meals
set status = 'estimated'
where status = 'draft';

update public.meals
set snack_period = 'night'
where snack_period in ('evening', 'late_night');

-- `other` represented an uncategorized eating event. Keep the facts and move
-- it into the only non-main-meal category; a missing snack period stays null.
update public.meals
set meal_type = 'snack'
where meal_type = 'other';

alter table public.meals
  add constraint meals_meal_type_check
    check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  add constraint meals_snack_period_check
    check (snack_period is null or snack_period in ('morning', 'afternoon', 'night')),
  add constraint meals_status_check
    check (status in ('estimated', 'confirmed'));

comment on column public.meals.meal_type is
  'Meal V2 category: breakfast, lunch, dinner, or snack.';
comment on column public.meals.snack_period is
  'Optional Meal V2 snack slot: morning, afternoon, or night.';
comment on column public.meals.status is
  'Meal V2 lifecycle: estimated before eating, confirmed after actual intake is known.';

commit;
