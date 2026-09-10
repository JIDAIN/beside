/**
 * Meal V2 action semantics.
 *
 * The purpose of this layer is to distinguish creating a meal from updating
 * an existing meal. It prevents cases such as "add egg to breakfast" creating
 * a second breakfast record.
 */

export const MEAL_ACTIONS_V2 = [
  "create_meal",
  "append_meal_item",
  "update_meal",
  "confirm_estimated_meal",
] as const;

export type MealActionV2 = (typeof MEAL_ACTIONS_V2)[number];

export function isMealAppendAction(
  action: string,
): action is "append_meal_item" {
  return action === "append_meal_item";
}

export function isMealConfirmAction(
  action: string,
): action is "confirm_estimated_meal" {
  return action === "confirm_estimated_meal";
}
