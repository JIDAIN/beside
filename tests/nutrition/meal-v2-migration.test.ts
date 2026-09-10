import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260910120000_meal_v2_lifecycle.sql"),
  "utf8",
);
const repairMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260910133000_repair_fish_20260909_meal_slot.sql"),
  "utf8",
);

describe("Meal V2 migration", () => {
  it("converts every legacy value before enforcing the new constraints", () => {
    expect(migration).toContain("set status = 'estimated'");
    expect(migration).toContain("where status = 'draft'");
    expect(migration).toContain("where snack_period in ('evening', 'late_night')");
    expect(migration).toContain("set meal_type = 'snack'");
    expect(migration).toContain("where meal_type = 'other'");
  });

  it("allows only the canonical Meal V2 values", () => {
    expect(migration).toContain("meal_type in ('breakfast', 'lunch', 'dinner', 'snack')");
    expect(migration).toContain("snack_period in ('morning', 'afternoon', 'night')");
    expect(migration).toContain("status in ('estimated', 'confirmed')");
  });

  it("repairs the misclassified Fish chocolate as a morning snack without a generated id", () => {
    expect(repairMigration).toContain("m.partner_key = 'fish'");
    expect(repairMigration).toContain("m.meal_date = date '2026-09-09'");
    expect(repairMigration).toContain("mi.raw_name = 'Venchi 60% 黑巧克力'");
    expect(repairMigration).toContain("meal_type = 'snack'");
    expect(repairMigration).toContain("snack_period = 'morning'");
    expect(repairMigration).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
  });
});
