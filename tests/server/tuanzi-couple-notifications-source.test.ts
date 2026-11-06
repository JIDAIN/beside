import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20261106090000_tuanzi_partner_record_notifications.sql",
  "utf8",
);

describe("Tuanzi couple notifications migration", () => {
  it("enqueues records at the canonical table layer for Web and MCP", () => {
    expect(migration).toContain("after insert or update on public.mood_entries");
    expect(migration).toContain("after insert or update on public.sleep_records");
    expect(migration).toContain("after insert or update on public.meals");
    expect(migration).toContain("on conflict(couple_space_id,source_actor,record_date,record_kind) do nothing");
  });

  it("ignores edits, historical dates, drafts, and snacks", () => {
    expect(migration.match(/if TG_OP = 'UPDATE' then return NEW; end if;/g)).toHaveLength(2);
    expect(migration).toContain("NEW.status <> 'confirmed'");
    expect(migration).toContain("NEW.meal_type not in ('breakfast','lunch','dinner')");
    expect(migration).toContain("(now() at time zone 'Asia/Shanghai')::date");
  });

  it("batches at least five minutes and notifies only the partner", () => {
    expect(migration).toContain("p_now - interval '5 minutes'");
    expect(migration).toContain("case when v_group.source_actor='cat' then 'fish' else 'cat' end");
    expect(migration).toContain("private.reserve_life_notification_delivery");
    expect(migration).toContain("private.life_pushplus_send(v_recipient");
  });

  it("sends the evening digest when either person's list is incomplete", () => {
    expect(migration).toContain("v_partner_completeness := private.life_daily_record_completeness");
    expect(migration).toContain("or not coalesce((v_partner_completeness->>'complete')::boolean, false)");
    expect(migration).toContain("partnerMissingItems");
    expect(migration).toContain("💛 主人：");
    expect(migration).toContain("💚 老婆：");
  });

  it("honors recipient preferences", () => {
    expect(migration).toContain("partner_record_notifications_enabled");
    expect(migration).toContain("daily_record_reminder_enabled");
    expect(migration).toContain("update_life_couple_notification_settings");
  });
});
