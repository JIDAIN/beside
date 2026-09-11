import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const nutritionPath = new URL("../../lib/server/supabase-nutrition.ts", import.meta.url);
const foodPagePath = new URL("../../components/life/LifeFoodPage.tsx", import.meta.url);
const executorPath = new URL("../../lib/server/life-agent-executor.ts", import.meta.url);
const calendarPath = new URL("../../components/life/LifeCalendarPage.tsx", import.meta.url);
const cssPath = new URL("../../app/island-life-refactor.css", import.meta.url);
const migrationPath = new URL("../../supabase/migrations/20260910132221_enforce_unique_main_meal_slots.sql", import.meta.url);

describe("meal regression source contracts", () => {
  it("preserves the original meal idempotency key during updates", async () => {
    const source = await readFile(nutritionPath, "utf8");
    expect(source).toContain("select=partner_key,idempotency_key,deleted_at");
    expect(source).toContain("idempotencyKey: existing.idempotencyKey");
  });

  it("shows every same-slot fixed meal instead of hiding historical rows", async () => {
    const source = await readFile(foodPagePath, "utf8");
    expect(source).toContain("const extraRecords = records.slice(1)");
    expect(source).toContain("extraRecords.map((record, index)");
    expect(source).toContain("记录 {index + 2}");
    expect(source).toContain("key={record.id}");
  });

  it("applies explicit snack wording before partial-update hydration", async () => {
    const source = await readFile(executorPath, "utf8");
    expect(source).toContain("applyExplicitMealSlotHint");
    expect(source).toContain("hydratePartialUpdateArgs(hinted, context)");
  });

  it("enforces one active fixed meal while keeping snacks repeatable", async () => {
    const migration = await readFile(migrationPath, "utf8");
    expect(migration).toContain("meals_main_slot_active_unique");
    expect(migration).toContain("meal_type in ('breakfast', 'lunch', 'dinner')");
    expect(migration).not.toContain("meal_type = 'snack'");
  });

  it("keeps every snack event as an independent photo and nutrition card", async () => {
    const source = await readFile(foodPagePath, "utf8");
    expect(source).toContain("snacks.map((snack)");
    expect(source).toContain('<MealPhotoSlot meal={snack}');
    expect(source).toContain('<MealNutrition meal={snack}');
  });

  it("places the role switch in the monthly header only for food and sleep", async () => {
    const source = await readFile(calendarPath, "utf8");
    expect(source).toContain('actions={view !== "mood" ? <div className="life-header-role-switch">');
    expect(source).not.toContain('className="mt-3 flex justify-end"><AppRoleSwitch');
  });

  it("uses the mood paper background for all monthly views while preserving metric palettes", async () => {
    const css = await readFile(cssPath, "utf8");
    expect(css).not.toContain(".life-review-calendar.is-food {");
    expect(css).not.toContain(".life-review-calendar.is-sleep {");
    expect(css).toContain(".is-food .life-calendar-metric-bubble");
    expect(css).toContain(".is-sleep .life-calendar-metric-bubble");
  });
});
