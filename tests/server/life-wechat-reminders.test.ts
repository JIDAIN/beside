import { describe, expect, it } from "vitest";
import {
  buildWechatReminderMessage,
  harborAiName,
  parseClaimedLifeReminder,
  parseLifePushplusStatus,
  parseLifePushplusTestResult,
} from "../../lib/server/life-wechat-reminders";

const DELIVERY_ID = "123e4567-e89b-42d3-a456-426614174000";

describe("life WeChat reminders", () => {
  it("uses the same Island Life AI nickname for both fixed actors", () => {
    expect(harborAiName("cat")).toBe("团子");
    expect(harborAiName("fish")).toBe("团子");
  });

  it("builds a warm owner-style daily reminder without actor labels", () => {
    const message = buildWechatReminderMessage("cat", {
      deliveryId: DELIVERY_ID,
      kind: "daily_record",
      localDate: "2026-09-03",
      targetDate: null,
      daysUntil: null,
    });

    expect(message.title).toBe("🌙 主人～团子来看看你啦");
    expect(message.content).toContain("主人～");
    expect(message.content).toContain("随手记一点点就好");
    expect(message.content).toContain("不用补全");
    expect(message.content).toContain("——团子");
    expect(message.content).not.toContain("Cat");
    expect(message.content).not.toContain("Fish");
  });

  it("builds fish anniversary reminders with the shared Tuanzi nickname and affectionate partner wording", () => {
    const sevenDays = buildWechatReminderMessage("fish", {
      deliveryId: DELIVERY_ID,
      kind: "anniversary",
      localDate: "2026-09-03",
      targetDate: "2026-09-10",
      daysUntil: 7,
    });
    const tomorrow = buildWechatReminderMessage("fish", {
      deliveryId: DELIVERY_ID,
      kind: "anniversary",
      localDate: "2026-09-09",
      targetDate: "2026-09-10",
      daysUntil: 1,
    });
    const today = buildWechatReminderMessage("fish", {
      deliveryId: DELIVERY_ID,
      kind: "anniversary",
      localDate: "2026-09-10",
      targetDate: "2026-09-10",
      daysUntil: 0,
    });

    expect(sevenDays.title).toBe("💕 主人～纪念日还有 7 天");
    expect(sevenDays.content).toContain("主人的宝贝老婆");
    expect(sevenDays.content).toContain("——团子");
    expect(tomorrow.title).toBe("💕 主人～明天就是纪念日啦！");
    expect(tomorrow.content).toContain("主人的亲亲老婆");
    expect(today.title).toBe("💕 主人～今天是特别的日子呀！");
    expect(today.content).toContain("主人最爱的宝贝");
    for (const message of [sevenDays, tomorrow, today]) {
      expect(message.content).not.toContain("Cat");
      expect(message.content).not.toContain("Fish");
    }
  });

  it("parses valid reminder claims and rejects malformed claims", () => {
    expect(
      parseClaimedLifeReminder({
        deliveryId: DELIVERY_ID,
        kind: "anniversary",
        localDate: "2026-09-03",
        targetDate: "2026-09-10",
        daysUntil: 7,
      }),
    ).toEqual({
      deliveryId: DELIVERY_ID,
      kind: "anniversary",
      localDate: "2026-09-03",
      targetDate: "2026-09-10",
      daysUntil: 7,
    });

    expect(parseClaimedLifeReminder({ deliveryId: "bad", kind: "daily_record", localDate: "2026-09-03" })).toBeNull();
    expect(parseClaimedLifeReminder({ deliveryId: DELIVERY_ID, kind: "unknown", localDate: "2026-09-03" })).toBeNull();
    expect(parseClaimedLifeReminder({ deliveryId: DELIVERY_ID, kind: "daily_record", localDate: "09/03/2026" })).toBeNull();
  });

  it("never requires a PushPlus token to be returned to the client", () => {
    expect(parseLifePushplusStatus({ actor: "cat", configured: true, token: "must-not-be-used" })).toEqual({
      actor: "cat",
      configured: true,
    });
    expect(parseLifePushplusStatus({ actor: "other", configured: true })).toBeNull();
    expect(parseLifePushplusStatus({ actor: "fish", configured: "yes" })).toBeNull();
  });

  it("parses PushPlus test results without exposing credentials", () => {
    expect(
      parseLifePushplusTestResult({
        actor: "fish",
        ok: true,
        providerMessageId: "message-1",
        error: null,
      }),
    ).toEqual({
      actor: "fish",
      ok: true,
      providerMessageId: "message-1",
      error: null,
    });
    expect(parseLifePushplusTestResult({ actor: "cat", ok: "yes" })).toBeNull();
  });
});
