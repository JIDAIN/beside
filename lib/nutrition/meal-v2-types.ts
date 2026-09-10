/**
 * Beside Meal V2 domain definitions.
 *
 * This file defines the new nutrition contract without immediately replacing
 * legacy database enums. Migration is handled separately to preserve history.
 */

export const MEAL_TYPES_V2 = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
] as const;

export type MealTypeV2 = (typeof MEAL_TYPES_V2)[number];

export const SNACK_PERIODS_V2 = [
  "morning",
  "afternoon",
  "night",
] as const;

export type SnackPeriodV2 = (typeof SNACK_PERIODS_V2)[number];

export const MEAL_STATUS_V2 = [
  "estimated",
  "confirmed",
] as const;

export type MealStatusV2 = (typeof MEAL_STATUS_V2)[number];

export function isSnackMealType(type: string): type is "snack" {
  return type === "snack";
}
