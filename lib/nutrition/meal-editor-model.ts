import type { MealType, NutritionPartnerKey, SnackPeriod } from "./meal-service";

export type MealEditorNutritionField = "caloriesKcal" | "proteinG" | "fatG" | "carbsG";

export type MealEditorNutritionInput = Record<MealEditorNutritionField, string>;

export type MealEditorNutritionSummary = Record<
  MealEditorNutritionField,
  { value: number | null; completeness: "empty" | "partial" | "complete" }
>;

export function localIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isIsoDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

export function parseMealType(value: string | null): MealType | null {
  return value === "breakfast" || value === "lunch" || value === "dinner" || value === "snack" ? value : null;
}

export function parseSnackPeriod(value: string | null): SnackPeriod | null {
  return value === "morning" || value === "afternoon" || value === "night" ? value : null;
}

export function parsePartnerKey(value: string | null): NutritionPartnerKey | null {
  return value === "cat" || value === "fish" ? value : null;
}

export function parseNonNegativeNumber(value: string) {
  const text = value.trim();
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) && number >= 0 ? number : Number.NaN;
}

export function summarizeDraftNutrition(items: MealEditorNutritionInput[]): MealEditorNutritionSummary {
  const fields: MealEditorNutritionField[] = ["caloriesKcal", "proteinG", "fatG", "carbsG"];
  return Object.fromEntries(fields.map((field) => {
    const values = items.map((item) => parseNonNegativeNumber(item[field]));
    const validValues = values.filter((value): value is number => value !== null && !Number.isNaN(value));
    const completeness = validValues.length === 0
      ? "empty"
      : validValues.length === items.length
        ? "complete"
        : "partial";
    return [field, {
      value: completeness === "complete" ? validValues.reduce((sum, value) => sum + value, 0) : null,
      completeness,
    }];
  })) as MealEditorNutritionSummary;
}
