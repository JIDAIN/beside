import type { MealAction } from "./meal-action";

/**
 * Meal V2 mutation semantic adapter.
 *
 * This layer only describes the intent of a meal mutation.
 * The actual database operation remains handled by the existing life mutation pipeline.
 */
export type MealMutationIntent =
  | {
      action: "create_meal";
      data: Record<string, unknown>;
    }
  | {
      action: "append_meal_item";
      mealId: string;
      item: Record<string, unknown>;
    }
  | {
      action: "update_meal";
      mealId: string;
      data: Record<string, unknown>;
    }
  | {
      action: "confirm_estimated_meal";
      mealId: string;
      data: Record<string, unknown>;
    };

export function isAppendMealItemAction(action: MealAction | string) {
  return action === "append_meal_item";
}

export function isConfirmEstimatedMealAction(action: MealAction | string) {
  return action === "confirm_estimated_meal";
}

export function shouldPreserveMealTime(action: MealAction | string) {
  return action === "append_meal_item" || action === "confirm_estimated_meal";
}
