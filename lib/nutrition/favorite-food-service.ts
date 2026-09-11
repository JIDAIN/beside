import type { NutritionPartnerKey } from "./meal-service";

export type FavoriteFoodWritePayload = {
  partnerKey: NutritionPartnerKey;
  name: string;
  portionDescription: string | null;
  caloriesKcal: number | null;
  carbsG: number | null;
  proteinG: number | null;
  fatG: number | null;
};

export type FavoriteFoodRecord = FavoriteFoodWritePayload & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalText(value: unknown, maxLength: number) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text && text.length <= maxLength ? text : null;
}

function optionalNonNegativeNumber(value: unknown): ParseResult<number | null> {
  if (value === null || value === undefined || value === "") return { ok: true, value: null };
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return { ok: false, reason: "营养数值必须是 0 或更大的数字" };
  }
  return { ok: true, value };
}

function optionalNonNegativeInteger(value: unknown): ParseResult<number | null> {
  if (value === null || value === undefined || value === "") return { ok: true, value: null };
  if (!Number.isInteger(value) || Number(value) < 0) {
    return { ok: false, reason: "热量必须是 0 或更大的整数" };
  }
  return { ok: true, value: Number(value) };
}

export function parseFavoriteFoodWritePayload(value: unknown): ParseResult<FavoriteFoodWritePayload> {
  if (!isRecord(value)) return { ok: false, reason: "常吃食物数据格式不正确" };
  if (value.partnerKey !== "fish" && value.partnerKey !== "cat") {
    return { ok: false, reason: "partnerKey 只能是 fish 或 cat" };
  }
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name || name.length > 200) return { ok: false, reason: "名称不能为空且不能超过 200 个字符" };
  if (typeof value.portionDescription === "string" && value.portionDescription.trim().length > 300) {
    return { ok: false, reason: "份量不能超过 300 个字符" };
  }
  const calories = optionalNonNegativeInteger(value.caloriesKcal);
  if (!calories.ok) return calories;
  const carbs = optionalNonNegativeNumber(value.carbsG);
  if (!carbs.ok) return carbs;
  const protein = optionalNonNegativeNumber(value.proteinG);
  if (!protein.ok) return protein;
  const fat = optionalNonNegativeNumber(value.fatG);
  if (!fat.ok) return fat;
  return {
    ok: true,
    value: {
      partnerKey: value.partnerKey,
      name,
      portionDescription: optionalText(value.portionDescription, 300),
      caloriesKcal: calories.value,
      carbsG: carbs.value,
      proteinG: protein.value,
      fatG: fat.value,
    },
  };
}
