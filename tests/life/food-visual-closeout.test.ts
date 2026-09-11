import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("food visual closeout", () => {
  it("compacts the Food header and gives date/favorite entries explicit affordance", () => {
    const css = source("app/food-compact.css");
    const food = source("components/life/LifeFoodPage.tsx");
    expect(css).toContain('.life-page-shell:has(input[aria-label="查看日期"]) > .life-page-header');
    expect(css).toContain('> .life-surface:has(input[aria-label="查看日期"]) > label');
    expect(css).toContain('> .life-surface:has(input[aria-label="查看日期"]) > a');
    expect(food).toContain('aria-label="查看日期"');
    expect(food).toContain('href="/food/favorites"');
  });

  it("keeps meal cards intact while shrinking Food photos", () => {
    const css = source("app/food-compact.css");
    const food = source("components/life/LifeFoodPage.tsx");
    expect(food).toContain("<MealPhotoSlot");
    expect(food).toContain("<MealNutrition");
    expect(css).toContain("height: 6.55rem");
    expect(css).toContain("height: 6.15rem");
  });

  it("uses a compact meal photo preview that expands when adjustment opens", () => {
    const css = source("app/food-compact.css");
    const editor = source("components/life/LifeMealEditorPage.tsx");
    expect(editor).toContain("调整照片");
    expect(editor).toContain("更换照片");
    expect(editor).toContain("deleteMealPhoto");
    expect(css).toContain("section:first-of-type:has(details[open]) label > div");
    expect(css).toContain("height: min(13rem, 42vh)");
  });

  it("gives add-food choices icons and the same card-choice interaction as snacks", () => {
    const css = source("app/food-compact.css");
    const editor = source("components/life/LifeMealEditorPage.tsx");
    const food = source("components/life/LifeFoodPage.tsx");
    expect(editor).toContain('id="add-food-title"');
    expect(food).toContain('id="snack-picker-title"');
    expect(css).toContain('#add-food-title + div > button:first-child::before { content: "＋"; }');
    expect(css).toContain('#add-food-title + div > button:last-child::before { content: "▤";');
    expect(css).toContain("#snack-picker-title + div > a");
  });

  it("keeps food forms, notes and bottom actions compact without changing meal data behavior", () => {
    const css = source("app/food-compact.css");
    const editor = source("components/life/LifeMealEditorPage.tsx");
    expect(css).toContain(".life-food-form-sheet .app-input");
    expect(css).toContain("min-height: 2.24rem !important");
    expect(css).toContain("textarea.app-textarea");
    expect(css).toContain("field-sizing: content");
    expect(css).toContain(".life-meal-editor-actions");
    expect(editor).toContain("summarizeDraftNutrition(items)");
    expect(editor).toContain("uploadMealPhoto");
    expect(editor).toContain("updateMealRecord");
    expect(editor).toContain("createMealRecord");
    expect(editor).toContain("fetchFavoriteFoods");
  });
});
