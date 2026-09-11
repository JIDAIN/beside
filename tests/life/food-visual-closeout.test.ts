import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("food visual closeout", () => {
  it("keeps the approved Food-home header and date/favorite affordance unchanged", () => {
    const css = source("app/food-compact.css");
    const food = source("components/life/LifeFoodPage.tsx");
    expect(css).toContain('.life-page-shell:has(input[aria-label="查看日期"]) > .life-page-header');
    expect(css).toContain('> .life-surface:has(input[aria-label="查看日期"]) > label');
    expect(css).toContain('> .life-surface:has(input[aria-label="查看日期"]) > a');
    expect(css).toContain("min-height: 2.9rem");
    expect(food).toContain('aria-label="查看日期"');
    expect(food).toContain('href="/food/favorites"');
  });

  it("keeps meal cards intact while retaining the approved Food-home photo density", () => {
    const css = source("app/food-compact.css");
    const food = source("components/life/LifeFoodPage.tsx");
    expect(food).toContain("<MealPhotoSlot");
    expect(food).toContain("<MealNutrition");
    expect(css).toContain("height: 6.55rem");
    expect(css).toContain("height: 6.15rem");
  });

  it("uses an explicit compact meal-editor page variant for every meal slot", () => {
    const shell = source("components/ui/AppPageShell.tsx");
    const editor = source("components/life/LifeMealEditorPage.tsx");
    const css = source("app/food-editor-closeout.css");
    expect(shell).toContain('"default" | "meal-editor"');
    expect(shell).toContain("life-page-shell--meal-editor");
    expect(editor).toContain('variant="meal-editor"');
    expect(editor).toContain("life-meal-editor-meta");
    for (const label of ["早餐", "午餐", "晚餐", "上午加餐", "下午加餐", "晚上加餐"]) {
      expect(editor).toContain(label);
    }
    expect(css).toContain(".life-page-shell--meal-editor > .life-page-header");
    expect(css).toContain("min-height: 2.9rem");
    expect(css).toContain("margin-bottom: .42rem");
  });

  it("renders meal photos as a left thumbnail with explicit right-side actions", () => {
    const editor = source("components/life/LifeMealEditorPage.tsx");
    const photo = source("components/life/MealPhotoEditorCard.tsx");
    const css = source("app/food-editor-closeout.css");
    expect(editor).toContain("<MealPhotoEditorCard");
    expect(editor).toContain("deleteMealPhoto");
    expect(photo).toContain("life-meal-photo-row");
    expect(photo).toContain("life-meal-photo-controls");
    expect(photo).toContain('visible ? "更换照片" : "上传照片"');
    expect(photo).toContain("调整照片");
    expect(photo).toContain("删除照片");
    expect(photo).toContain("暂无照片");
    expect(css).toContain("grid-template-columns: minmax(0, 45%) minmax(0, 1fr)");
    expect(css).toContain("aspect-ratio: 4 / 3 !important");
    expect(photo).not.toContain("life-meal-photo-action");
  });

  it("adjusts rotation and scale in a bottom sheet instead of expanding the main page", () => {
    const photo = source("components/life/MealPhotoEditorCard.tsx");
    const css = source("app/food-editor-closeout.css");
    expect(photo).toContain("life-sheet-backdrop");
    expect(photo).toContain("life-photo-adjust-sheet");
    expect(photo).toContain("onRotatePhoto(-90)");
    expect(photo).toContain("onRotatePhoto(90)");
    expect(photo).toContain("onResizePhoto(Number(event.target.value))");
    expect(photo).not.toContain("<details");
    expect(css).toContain("height: min(15rem, 42vh) !important");
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
    const compactCss = source("app/food-compact.css");
    const editorCss = source("app/food-editor-closeout.css");
    const editor = source("components/life/LifeMealEditorPage.tsx");
    expect(compactCss).toContain(".life-food-form-sheet .app-input");
    expect(compactCss).toContain("min-height: 2.24rem !important");
    expect(editorCss).toContain(".life-meal-note-card textarea.app-textarea");
    expect(editorCss).toContain("field-sizing: content");
    expect(compactCss).toContain(".life-meal-editor-actions");
    expect(editor).toContain("summarizeDraftNutrition(items)");
    expect(editor).toContain("uploadMealPhoto");
    expect(editor).toContain("updateMealPhotoDisplay");
    expect(editor).toContain("updateMealRecord");
    expect(editor).toContain("createMealRecord");
    expect(editor).toContain("fetchFavoriteFoods");
  });
});