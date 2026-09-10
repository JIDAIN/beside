import { describe, expect, it } from "vitest";
import {
  isIsoDate,
  localIsoDate,
  parseMealType,
  parsePartnerKey,
  parseSnackPeriod,
  summarizeDraftNutrition,
} from "../../lib/nutrition/meal-editor-model";

describe("meal editor model", () => {
  it("uses the browser-local business date instead of a UTC date slice", () => {
    const date = new Date(2026, 8, 10, 0, 5);
    expect(localIsoDate(date)).toBe("2026-09-10");
    expect(isIsoDate("2026-09-10")).toBe(true);
    expect(isIsoDate("2026-09-31")).toBe(false);
  });

  it("rejects unknown route identity and meal classification values", () => {
    expect(parsePartnerKey("fish")).toBe("fish");
    expect(parsePartnerKey("someone-else")).toBeNull();
    expect(parseMealType("snack")).toBe("snack");
    expect(parseMealType("other")).toBeNull();
    expect(parseSnackPeriod("night")).toBe("night");
    expect(parseSnackPeriod("late_night")).toBeNull();
  });

  it("does not present a partial nutrition sum as the complete total", () => {
    const summary = summarizeDraftNutrition([
      { caloriesKcal: "120", proteinG: "6", fatG: "", carbsG: "18" },
      { caloriesKcal: "", proteinG: "4", fatG: "", carbsG: "12" },
    ]);
    expect(summary.caloriesKcal).toEqual({ value: null, completeness: "partial" });
    expect(summary.proteinG).toEqual({ value: 10, completeness: "complete" });
    expect(summary.fatG).toEqual({ value: null, completeness: "empty" });
  });
});
