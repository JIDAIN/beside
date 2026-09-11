import type { LifeMonthBundleDay } from "./month-bundle";
import type { LifePartnerKey, MoodRecord } from "./life-service";

export const CALENDAR_VIEWS = ["mood", "food", "sleep"] as const;
export type CalendarView = (typeof CALENDAR_VIEWS)[number];

export function parseCalendarView(value: unknown): CalendarView {
  return CALENDAR_VIEWS.includes(value as CalendarView) ? value as CalendarView : "mood";
}

export function parseCalendarMonth(value: unknown, fallback: string) {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : fallback;
}

export function moodCalendarSlots(
  moods: readonly MoodRecord[],
  currentPartnerKey: LifePartnerKey,
  partnerKey: LifePartnerKey,
) {
  return {
    currentUserMood: moods.find((item) => item.partnerKey === currentPartnerKey) ?? null,
    partnerMood: moods.find((item) => item.partnerKey === partnerKey) ?? null,
  };
}

export function mealCaloriesForPartner(day: LifeMonthBundleDay | undefined, partnerKey: LifePartnerKey) {
  if (!day) return null;
  const values = day.meals
    .filter((meal) => meal.partnerKey === partnerKey && !meal.deletedAt && meal.totalCaloriesKcal != null)
    .map((meal) => meal.totalCaloriesKcal as number);
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
}

export function sleepHoursForPartner(day: LifeMonthBundleDay | undefined, partnerKey: LifePartnerKey) {
  const record = day?.day.sleeps.find((sleep) => sleep.partnerKey === partnerKey);
  if (!record) return null;
  const hours = (new Date(record.wokeAt).getTime() - new Date(record.fellAsleepAt).getTime()) / 3_600_000;
  return Number.isFinite(hours) && hours >= 0 ? hours : null;
}

export function metricBubbleRem(view: Exclude<CalendarView, "mood">, value: number) {
  const [low, high] = view === "food" ? [800, 2400] : [4, 9];
  const ratio = Math.min(1, Math.max(0, (value - low) / (high - low)));
  return Number((1.55 + ratio * 1.45).toFixed(2));
}

export function buildWakeDateSleepTimestamps(date: string, sleepAt: string, wakeAt: string) {
  const sleep = new Date(`${date}T${sleepAt}:00`);
  const wake = new Date(`${date}T${wakeAt}:00`);
  if (sleep.getTime() >= wake.getTime()) sleep.setDate(sleep.getDate() - 1);
  return { fellAsleepAt: sleep.toISOString(), wokeAt: wake.toISOString() };
}
