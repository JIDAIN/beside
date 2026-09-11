import { describe, expect, it } from "vitest";
import type { LifeMonthBundleDay } from "../../lib/life/month-bundle";
import type { LifePartnerKey, MoodRecord } from "../../lib/life/life-service";
import { buildWakeDateSleepTimestamps, mealCaloriesForPartner, metricBubbleRem, orderMoodsForViewer, parseCalendarMonth, parseCalendarView, sleepHoursForPartner } from "../../lib/life/monthly-review";

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

function mood(partnerKey: LifePartnerKey, createdAt: string, updatedAt = createdAt): MoodRecord {
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

describe("monthly life review", () => {
  it("keeps the three supported views and falls back to mood", () => {
    expect(parseCalendarView("food")).toBe("food");
    expect(parseCalendarView("sleep")).toBe("sleep");
    expect(parseCalendarView("unknown")).toBe("mood");
    expect(parseCalendarMonth("2026-09", "2026-01")).toBe("2026-09");
    expect(parseCalendarMonth("2026-13", "2026-01")).toBe("2026-01");
  });

  it("always orders mood records as current viewer then partner", () => {
    const fishFirst = [
      mood("fish", "2026-09-10T08:00:00.000Z"),
      mood("cat", "2026-09-10T09:00:00.000Z"),
    ];
    const catFirst = [
      mood("cat", "2026-09-10T08:00:00.000Z"),
      mood("fish", "2026-09-10T09:00:00.000Z"),
    ];

    expect(orderMoodsForViewer(fishFirst, "fish").map((item) => item.partnerKey)).toEqual(["fish", "cat"]);
    expect(orderMoodsForViewer(catFirst, "fish").map((item) => item.partnerKey)).toEqual(["fish", "cat"]);
    expect(orderMoodsForViewer(fishFirst, "cat").map((item) => item.partnerKey)).toEqual(["cat", "fish"]);
    expect(orderMoodsForViewer(catFirst, "cat").map((item) => item.partnerKey)).toEqual(["cat", "fish"]);
  });

  it("keeps single-person mood days unchanged", () => {
    const fishOnly = [mood("fish", "2026-09-10T08:00:00.000Z")];
    const catOnly = [mood("cat", "2026-09-10T08:00:00.000Z")];

    expect(orderMoodsForViewer(fishOnly, "cat")).toEqual(fishOnly);
    expect(orderMoodsForViewer(catOnly, "fish")).toEqual(catOnly);
  });

  it("ignores created and updated timestamps when ordering moods", () => {
    const records = [
      mood("cat", "2026-09-10T10:00:00.000Z", "2026-09-10T12:00:00.000Z"),
      mood("fish", "2026-09-10T07:00:00.000Z", "2026-09-10T13:00:00.000Z"),
    ];

    expect(orderMoodsForViewer(records, "fish").map((item) => item.partnerKey)).toEqual(["fish", "cat"]);
    expect(orderMoodsForViewer([...records].reverse(), "fish").map((item) => item.partnerKey)).toEqual(["fish", "cat"]);
    expect(orderMoodsForViewer(records, "cat").map((item) => item.partnerKey)).toEqual(["cat", "fish"]);
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
