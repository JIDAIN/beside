import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260910120000_meal_v2_lifecycle.sql"),
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
});
