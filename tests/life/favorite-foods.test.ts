import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseFavoriteFoodWritePayload } from "@/lib/nutrition/favorite-food-service";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("frequent food templates", () => {
  it("validates compact personal template nutrition", () => {
    const parsed = parseFavoriteFoodWritePayload({
      partnerKey: "cat",
      name: "拿铁",
      portionDescription: "中杯",
      caloriesKcal: 135,
      carbsG: 12,
      proteinG: 6.5,
      fatG: 5,
    });
    expect(parsed.ok).toBe(true);
    expect(parseFavoriteFoodWritePayload({ partnerKey: "other", name: "拿铁" }).ok).toBe(false);
    expect(parseFavoriteFoodWritePayload({ partnerKey: "fish", name: "", caloriesKcal: 1 }).ok).toBe(false);
    expect(parseFavoriteFoodWritePayload({ partnerKey: "fish", name: "酸奶", caloriesKcal: -1 }).ok).toBe(false);
  });

  it("keeps favorite templates personal at API and storage boundaries", () => {
    const collection = source("app/api/favorite-foods/route.ts");
    const item = source("app/api/favorite-foods/[id]/route.ts");
    const cloud = source("lib/server/supabase-favorite-foods.ts");
    expect(collection).toContain("authorizePersonalPartnerWrite(request, partnerKey)");
    expect(collection).toContain("authorizePersonalPartnerWrite(request, parsed.value.partnerKey)");
    expect(item).toContain("getFavoriteFoodOwner");
    expect(item).toContain("authorizePersonalPartnerWrite(request, owner)");
    expect(cloud).toContain("partner_key=eq.${partnerKey}");
    expect(cloud).toContain("partner_key=eq.${payload.partnerKey}");
  });

  it("copies a template into an independent meal item", () => {
    const editor = source("components/life/LifeMealEditorPage.tsx");
    expect(editor).toContain("function fromFavoriteFood");
    expect(editor).toContain("key: draftKey()");
    expect(editor).toContain("foodId: null");
    expect(editor).toContain("rawName: food.name");
    expect(editor).toContain("displayName: food.name");
    expect(editor).not.toContain("favoriteFoodId");
    expect(source("lib/nutrition/meal-service.ts")).not.toContain("favoriteFoodId");
  });

  it("supports search, add, edit and delete without adding history/catalog layers", () => {
    const editor = source("components/life/LifeMealEditorPage.tsx");
    const manager = source("components/life/LifeFavoriteFoodsPage.tsx");
    expect(editor).toContain("搜索常吃食物");
    expect(editor).toContain("选择常吃食物");
    expect(editor).not.toContain("最近食物");
    expect(editor).not.toContain("食品数据库");
    expect(manager).toContain("＋ 新增常吃食物");
    expect(manager).toContain("createFavoriteFood");
    expect(manager).toContain("updateFavoriteFood");
    expect(manager).toContain("deleteFavoriteFood");
  });

  it("adds a minimal RLS-protected schema and backup coverage", () => {
    const migration = source("supabase/migrations/20260911150000_add_favorite_food_templates.sql");
    expect(migration).toContain("create table if not exists public.favorite_food_templates");
    expect(migration).toContain("alter table public.favorite_food_templates enable row level security");
    expect(migration).toContain("revoke all on table public.favorite_food_templates from public, anon, authenticated");
    expect(migration).toContain("foreign key (couple_space_id, partner_key)");
    expect(migration).toContain("'favorite_food_templates'");
    expect(source("lib/server/life-data-domains.ts")).toContain('"favorite_food_templates"');
  });

  it("keeps canonical meal and snack storage unchanged", () => {
    const lifecycle = source("supabase/migrations/20260910120000_meal_v2_lifecycle.sql");
    expect(lifecycle).toContain("meal_type in ('breakfast', 'lunch', 'dinner', 'snack')");
    expect(lifecycle).toContain("snack_period is null or snack_period in ('morning', 'afternoon', 'night')");
    const editor = source("components/life/LifeMealEditorPage.tsx");
    for (const label of ["早餐", "上午加餐", "午餐", "下午加餐", "晚餐", "晚上加餐"]) {
      expect(editor).toContain(label);
    }
  });
});
