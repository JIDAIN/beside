import type { MealActionV2 } from "./meal-action";

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

export function isAppendMealItemAction(action: MealActionV2 | string) {
  return action === "append_meal_item";
}

export function isConfirmEstimatedMealAction(action: MealActionV2 | string) {
  return action === "confirm_estimated_meal";
}

export function shouldPreserveMealTime(action: MealActionV2 | string) {
  return action === "append_meal_item" || action === "confirm_estimated_meal";
}
