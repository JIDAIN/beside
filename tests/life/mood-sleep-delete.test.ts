import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) { return readFileSync(resolve(process.cwd(), path), "utf8"); }

describe("mood and sleep deletion", () => {
  it("exposes both delete actions in the client and owner-only cards", () => {
    const client = source("lib/life/life-client.ts");
    const mood = source("components/life/today/TodayMoodCard.tsx");
    const sleep = source("components/life/today/TodaySleepCard.tsx");
    expect(client).toContain("export async function deleteMood");
    expect(client).toContain("export async function deleteSleep");
    expect(mood).toContain("删除这条心情");
    expect(sleep).toContain("确定删除这条睡眠记录吗？");
    expect(mood).toContain("mePartnerKey");
    expect(sleep).toContain("mePartnerKey");
  });

  it("authorizes sleep deletion server-side and keeps the RPC service-only", () => {
    const route = source("app/api/life/sleep/route.ts");
    const migration = source("supabase/migrations/20260910100837_add_sleep_delete.sql");
    expect(route).toContain("export async function DELETE");
    expect(route).toContain("authorizePersonalPartnerWrite(request, partnerKey)");
    expect(migration).toContain("and s.partner_key = p_partner_key");
    expect(migration).toContain("revoke all on function public.delete_sleep_record");
    expect(migration).toContain("grant execute on function public.delete_sleep_record(uuid,text,text) to service_role");
  });

  it("labels sleep input by wake date and keeps monthly navigation in the calendar tab", () => {
    const sleep = source("components/life/today/TodaySleepCard.tsx");
    const food = source("components/life/LifeFoodPage.tsx");
    expect(sleep).toContain("昨晚入睡");
    expect(sleep).toContain("今天起床");
    expect(sleep).not.toContain('/calendar?view=sleep&month=');
    expect(food).not.toContain('/calendar?view=food&month=');
    expect(food).toContain('actions={<div className="life-header-role-switch"><AppRoleSwitch');
  });
});
