-- Breakfast, lunch and dinner are canonical daily slots. Snacks remain repeatable events.

do $$
begin
  if exists (
    select 1
    from public.meals
    where deleted_at is null
      and meal_type in ('breakfast', 'lunch', 'dinner')
    group by couple_space_id, partner_key, meal_date, meal_type
    having count(*) > 1
  ) then
    raise exception 'Cannot enforce unique main meal slots while duplicate active rows exist';
  end if;
end
$$;

create unique index if not exists meals_main_slot_active_unique
  on public.meals (couple_space_id, partner_key, meal_date, meal_type)
  where deleted_at is null
    and meal_type in ('breakfast', 'lunch', 'dinner');

comment on index public.meals_main_slot_active_unique is
  'One active breakfast/lunch/dinner per person and date; snack events remain repeatable.';
