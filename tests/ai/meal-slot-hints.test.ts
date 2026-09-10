import { describe, expect, it } from "vitest";
import { inferMealSlotHint } from "../../lib/ai/meal-slot-hints";

describe("meal slot hints", () => {
  it("treats explicit morning snack wording as snack even if a model might call it breakfast", () => {
    expect(inferMealSlotHint("上午加餐吃了 10g 黑巧克力")).toEqual({
      mealType: "snack",
      snackPeriod: "morning",
    });
  });

  it("recognizes an explicit afternoon snack", () => {
    expect(inferMealSlotHint("下午加餐 16:10 吃了两根薄饼")).toEqual({
      mealType: "snack",
      snackPeriod: "afternoon",
    });
  });

  it("does not override an ordinary breakfast", () => {
    expect(inferMealSlotHint("早餐吃了半个面包和一杯咖啡")).toBeNull();
  });
});
