import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const nutritionPath = new URL("../../lib/server/supabase-nutrition.ts", import.meta.url);
const foodPagePath = new URL("../../components/life/LifeFoodPage.tsx", import.meta.url);
const executorPath = new URL("../../lib/server/life-agent-executor.ts", import.meta.url);

describe("meal regression source contracts", () => {
  it("preserves the original meal idempotency key during updates", async () => {
    const source = await readFile(nutritionPath, "utf8");
    expect(source).toContain("select=partner_key,idempotency_key,deleted_at");
    expect(source).toContain("idempotencyKey: existing.idempotencyKey");
  });

  it("shows every same-slot fixed meal instead of hiding historical rows", async () => {
    const source = await readFile(foodPagePath, "utf8");
    expect(source).toContain("const extraRecords = records.slice(1)");
    expect(source).toContain("extraRecords.map((meal, index)");
    expect(source).toContain("均完整保留并显示");
  });

  it("applies explicit snack wording before partial-update hydration", async () => {
    const source = await readFile(executorPath, "utf8");
    expect(source).toContain("applyExplicitMealSlotHint");
    expect(source).toContain("hydratePartialUpdateArgs(hinted, context)");
  });
});
