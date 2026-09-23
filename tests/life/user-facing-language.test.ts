import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("user-facing identity and product language", () => {
  it("keeps relative identity labels in the shared role switch", () => {
    const roleSwitch = source("components/ui/AppRoleSwitch.tsx");
    expect(roleSwitch).toContain('meLabel = "我"');
    expect(roleSwitch).toContain('partnerLabel = "Ta"');
  });

  it("uses 我 / Ta / 我们 instead of fixed backend-derived nicknames in current Life UI", () => {
    const paths = [
      "components/life/LifeMePage.tsx",
      "components/life/LifeWechatReminderCard.tsx",
      "components/life/LifeDataManagementPage.tsx",
      "components/life/LifeReminderCenterPage.tsx",
      "components/life/LifeNestPage.tsx",
      "components/life/LifeAiPage.tsx",
    ];
    const combined = paths.map(source).join("\n");

    expect(combined).not.toContain("小鱼");
    expect(combined).not.toContain("小猫");
    expect(combined).not.toContain("鱼鱼");
    expect(combined).not.toContain("猫猫");

    const reminders = source("components/life/LifeReminderCenterPage.tsx");
    expect(reminders).toContain('value === "both" ? "我们" : value === currentPartnerKey ? "我" : "Ta"');

    const backups = source("components/life/LifeDataManagementPage.tsx");
    expect(backups).toContain('return actor === currentPartnerKey ? "我" : "Ta"');
  });

  it("keeps current Life product branding on 伴岛 rather than 岛屿生活", () => {
    const paths = [
      "components/life/LifeLoginPage.tsx",
      "components/life/TodayLifePage.tsx",
      "components/life/LifeAiPage.tsx",
    ];
    const combined = paths.map(source).join("\n");

    expect(combined).not.toContain("岛屿生活");
    expect(source("components/life/LifeLoginPage.tsx")).toContain(">伴岛</h1>");
  });
});
