import { describe, expect, it } from "vitest";
import type { LifeMonthBundleDay } from "../../lib/life/month-bundle";
import type { LifePartnerKey, MoodRecord } from "../../lib/life/life-service";
import { buildWakeDateSleepTimestamps, mealCaloriesForPartner, metricBubbleRem, moodCalendarSlots, parseCalendarMonth, parseCalendarView, sleepHoursForPartner } from "../../lib/life/monthly-review";

function bundleDay(): LifeMonthBundleDay {
  return {
    date: "2026-09-10",
    day: {
      date: "2026-09-10",
      moods: [],
      activities: [],
      sleeps: [
        { partnerKey: "cat", fellAsleepAt: "2026-09-09T15:30:00.000Z", wokeAt: "2026-09-09T23:00:00.000Z" },
        { partnerKey: "fish", fellAsleepAt: "2026-09-09T16:00:00.000Z", wokeAt: "2026-09-09T22:00:00.000Z" },
      ],
    },
    meals: [
      { partnerKey: "cat", totalCaloriesKcal: 500, deletedAt: null },
      { partnerKey: "cat", totalCaloriesKcal: 820, deletedAt: null },
      { partnerKey: "cat", totalCaloriesKcal: 900, deletedAt: "2026-09-10T12:00:00.000Z" },
      { partnerKey: "fish", totalCaloriesKcal: 760, deletedAt: null },
    ],
  } as LifeMonthBundleDay;
}

function mood(partnerKey: LifePartnerKey, createdAt = "2026-09-10T08:00:00.000Z", updatedAt = createdAt): MoodRecord {
  return {
    id: `${partnerKey}-${createdAt}`,
    partnerKey,
    moodDate: "2026-09-10",
    moodKey: partnerKey === "fish" ? "happy" : "calm",
    source: "manual",
    createdAt,
    updatedAt,
  };
}

function slotKeys(moods: MoodRecord[], me: LifePartnerKey, partner: LifePartnerKey) {
  const slots = moodCalendarSlots(moods, me, partner);
  return [slots.currentUserMood?.partnerKey ?? null, slots.partnerMood?.partnerKey ?? null];
}

describe("monthly life review", () => {
  it("keeps the three supported views and falls back to mood", () => {
    expect(parseCalendarView("food")).toBe("food");
    expect(parseCalendarView("sleep")).toBe("sleep");
    expect(parseCalendarView("unknown")).toBe("mood");
    expect(parseCalendarMonth("2026-09", "2026-01")).toBe("2026-09");
    expect(parseCalendarMonth("2026-13", "2026-01")).toBe("2026-01");
  });

  it("keeps Fish in slot 1 and Cat in slot 2 for all Fish-login record combinations", () => {
    const fish = mood("fish");
    const cat = mood("cat");
    expect(slotKeys([fish, cat], "fish", "cat")).toEqual(["fish", "cat"]);
    expect(slotKeys([fish], "fish", "cat")).toEqual(["fish", null]);
    expect(slotKeys([cat], "fish", "cat")).toEqual([null, "cat"]);
    expect(slotKeys([], "fish", "cat")).toEqual([null, null]);
  });

  it("keeps Cat in slot 1 and Fish in slot 2 for all Cat-login record combinations", () => {
    const fish = mood("fish");
    const cat = mood("cat");
    expect(slotKeys([fish, cat], "cat", "fish")).toEqual(["cat", "fish"]);
    expect(slotKeys([cat], "cat", "fish")).toEqual(["cat", null]);
    expect(slotKeys([fish], "cat", "fish")).toEqual([null, "fish"]);
    expect(slotKeys([], "cat", "fish")).toEqual([null, null]);
  });

  it("ignores API array order and created/updated timestamps when assigning fixed slots", () => {
    const fish = mood("fish", "2026-09-10T11:00:00.000Z", "2026-09-10T13:00:00.000Z");
    const cat = mood("cat", "2026-09-10T06:00:00.000Z", "2026-09-10T15:00:00.000Z");
    expect(slotKeys([cat, fish], "fish", "cat")).toEqual(["fish", "cat"]);
    expect(slotKeys([fish, cat], "fish", "cat")).toEqual(["fish", "cat"]);
    expect(slotKeys([fish, cat], "cat", "fish")).toEqual(["cat", "fish"]);
    expect(slotKeys([cat, fish], "cat", "fish")).toEqual(["cat", "fish"]);
  });

  it("keeps slot identity stable across fresh arrays and mood edits", () => {
    const initial = [mood("cat"), mood("fish")];
    const refreshed = initial.map((item) => ({ ...item }));
    const edited = refreshed.map((item) => item.partnerKey === "fish"
      ? { ...item, moodKey: "excited" as const, updatedAt: "2026-09-10T20:00:00.000Z" }
      : item);

    expect(slotKeys(initial, "fish", "cat")).toEqual(["fish", "cat"]);
    expect(slotKeys(refreshed, "fish", "cat")).toEqual(["fish", "cat"]);
    expect(slotKeys(edited, "fish", "cat")).toEqual(["fish", "cat"]);
    expect(moodCalendarSlots(edited, "fish", "cat").currentUserMood?.moodKey).toBe("excited");
  });

  it("aggregates only the selected person's active meals", () => {
    expect(mealCaloriesForPartner(bundleDay(), "cat")).toBe(1320);
    expect(mealCaloriesForPartner(bundleDay(), "fish")).toBe(760);
  });

  it("calculates sleep duration for only the selected person", () => {
    expect(sleepHoursForPartner(bundleDay(), "cat")).toBe(7.5);
    expect(sleepHoursForPartner(bundleDay(), "fish")).toBe(6);
  });

  it("uses bounded bubble sizes for both metrics", () => {
    expect(metricBubbleRem("food", 0)).toBe(1.55);
    expect(metricBubbleRem("food", 3000)).toBe(3);
    expect(metricBubbleRem("sleep", 4)).toBe(1.55);
    expect(metricBubbleRem("sleep", 9)).toBe(3);
  });
});

describe("wake-date sleep semantics", () => {
  it("archives an evening bedtime under the following wake date", () => {
    const value = buildWakeDateSleepTimestamps("2026-09-10", "23:15", "07:45");
    expect(new Date(value.wokeAt).getTime() - new Date(value.fellAsleepAt).getTime()).toBe(8.5 * 3_600_000);
  });

  it("keeps an after-midnight bedtime on the wake date", () => {
    const value = buildWakeDateSleepTimestamps("2026-09-10", "01:00", "08:00");
    expect(new Date(value.wokeAt).getTime() - new Date(value.fellAsleepAt).getTime()).toBe(7 * 3_600_000);
  });
});
