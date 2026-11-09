import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const base = readFileSync("supabase/migrations/20261106090000_tuanzi_partner_record_notifications.sql", "utf8");
const migration = readFileSync("supabase/migrations/20261109190000_partner_record_detail_notifications.sql", "utf8");

describe("Tuanzi factual partner notifications", () => {
  it("extends the original event pipeline without introducing a new transport or cron", () => {
    expect(base).toContain("private.dispatch_life_partner_record_events(p_now,p_space_slug)");
    expect(migration).toContain("create or replace function private.dispatch_life_partner_record_events(");
    expect(migration).toContain("private.life_pushplus_send(v_recipient");
    expect(migration).toContain("private.reserve_life_notification_delivery(");
    expect(migration).toContain("private.life_pushplus_token(v_recipient)");
    expect(migration).toContain("v_pref.partner_record_notifications_enabled");
    expect(migration).toContain("p_now - interval '5 minutes'");
    expect(migration).not.toMatch(/cron\.schedule|create extension.*cron/);
  });

  it("captures one event per confirmed snack and does not send edits or historical data", () => {
    expect(migration).toContain("record_kind in ('mood','sleep','breakfast','lunch','dinner','snack')");
    expect(migration).toContain("where record_kind <> 'snack'");
    expect(migration).toContain("where record_kind = 'snack' and meal_id is not null");
    expect(migration).toContain("if NEW.meal_type = 'snack' then");
    expect(migration).toContain("OLD.status = 'confirmed' and OLD.deleted_at is null");
    expect(migration).toContain("NEW.status <> 'confirmed'");
    expect(migration).toContain("(now() at time zone 'Asia/Shanghai')::date");
    expect(migration).toContain("on conflict do nothing");
  });

  it("derives current values from canonical Life sources and escapes food names", () => {
    expect(migration).toContain("from public.mood_entries");
    expect(migration).toContain("from public.sleep_records");
    expect(migration).toContain("from public.meals m");
    expect(migration).toContain("from public.meal_items");
    expect(migration).toContain("m.status='confirmed' and m.deleted_at is null");
    expect(migration).toContain("m.id=p_meal_id");
    expect(migration).toContain("when 'afternoon' then '下午'");
    expect(migration).toContain("when 'neutral' then '心动'");
    expect(migration).toContain("when v_meal.total_calories_kcal is null then '热量未知'");
    expect(migration).toContain("left(btrim(");
    expect(migration).toContain(",'&amp;'");
    expect(migration).toContain(",'&lt;'");
    expect(migration).toContain(",'&gt;'");
    expect(migration).not.toContain("m.note");
    expect(migration).not.toContain("m.photo_path");
  });

  it("notifies only the other actor and retains delivery reservations and deletion checks", () => {
    expect(migration).toContain("case when v_group.source_actor='cat' then 'fish' else 'cat' end");
    expect(migration).toContain("private.life_partner_record_detail(v_space,e.source_actor,e.record_date,");
    expect(migration).toContain("if v_items is null then");
    expect(migration).toContain("where e.id=any(v_group.ids) and e.delivered_at is null");
    expect(migration).toContain("public.complete_life_notification_delivery(");
    expect(migration).toContain("if coalesce((v_send->>'ok')::boolean,false) then");
  });
});
