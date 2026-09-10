export type MealSlotHint = {
  mealType: "snack";
  snackPeriod?: "morning" | "afternoon" | "evening" | "late_night";
};

export function inferMealSlotHint(userText: string): MealSlotHint | null {
  const value = userText.trim();
  if (!/(加餐|零食|夜宵|宵夜|snack)/i.test(value)) return null;

  if (/(夜宵|宵夜|夜间|late[ -]?night)/i.test(value)) {
    return { mealType: "snack", snackPeriod: "late_night" };
  }
  if (/(上午|早上|早晨|morning)/i.test(value)) {
    return { mealType: "snack", snackPeriod: "morning" };
  }
  if (/(下午|午后|afternoon)/i.test(value)) {
    return { mealType: "snack", snackPeriod: "afternoon" };
  }
  if (/(晚上|晚间|evening)/i.test(value)) {
    return { mealType: "snack", snackPeriod: "evening" };
  }

  return { mealType: "snack" };
}
