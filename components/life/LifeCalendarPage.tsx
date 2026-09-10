"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { AppPageShell } from "@/components/ui/AppPageShell";
import { AppRoleSwitch, type AppRoleSwitchValue } from "@/components/ui/AppRoleSwitch";
import { MoodIcon } from "@/components/ui/MoodIcon";
import { useLifeIdentity } from "@/components/life/LifeIdentityContext";
import { peekStaleQuery, prefetchStaleQuery, useStaleQuery } from "@/lib/client/use-stale-query";
import { fetchLifeDay, fetchLifeMonthBundle, LifeApiError } from "@/lib/life/life-client";
import { hydrateLifeMonthBundle, type LifeMonthBundle, type LifeMonthBundleDay } from "@/lib/life/month-bundle";
import { mealCaloriesForPartner, metricBubbleRem, sleepHoursForPartner, type CalendarView } from "@/lib/life/monthly-review";
import { fetchMeals } from "@/lib/nutrition/meal-client";
import { preloadMealPhotos } from "@/lib/nutrition/meal-photo-cache";
import type { MealRecord, NutritionPartnerKey } from "@/lib/nutrition/meal-service";
import type { MoodKey } from "@/lib/life/life-service";
import { moodVisual } from "@/components/life/today/today-life-model";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
const VIEW_OPTIONS: Array<{ value: CalendarView; label: string }> = [
  { value: "mood", label: "心情" },
  { value: "food", label: "饮食" },
  { value: "sleep", label: "睡眠" },
];

function localMonth(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; }
function localDate(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function monthTitle(month: string) { const [year, value] = month.split("-").map(Number); return `${year}年 ${value}月`; }
function shiftMonth(month: string, amount: number) { const [year, value] = month.split("-").map(Number); const date = new Date(year, value - 1 + amount, 1); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; }
function monthCells(month: string) {
  const [year, value] = month.split("-").map(Number);
  const days = new Date(year, value, 0).getDate();
  const firstMondayIndex = (new Date(year, value - 1, 1).getDay() + 6) % 7;
  const cells: Array<string | null> = Array(firstMondayIndex).fill(null);
  for (let day = 1; day <= days; day += 1) cells.push(`${month}-${String(day).padStart(2, "0")}`);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function MoodStamp({ moodKey, label, offset = false }: { moodKey?: MoodKey; label: "我" | "Ta"; offset?: boolean }) {
  const visual = moodVisual(moodKey);
  if (!visual) return null;
  return <span title={`${label} · ${visual.label}`} className={`life-calendar-mood ${offset ? "is-offset" : ""}`} aria-label={`${label}：${visual.label}`}><MoodIcon moodKey={visual.key} label="" /></span>;
}

function MetricMark({ view, value }: { view: "food" | "sleep"; value: number | null }) {
  if (value == null) return <span className="life-calendar-metric-empty" aria-hidden />;
  const display = view === "food" ? Math.round(value).toString() : `${value.toFixed(1)}h`;
  const aria = view === "food" ? `${Math.round(value)} 千卡` : `${value.toFixed(1)} 小时`;
  const size = metricBubbleRem(view, value);
  return <span className="life-calendar-metric" aria-label={aria}><span className="life-calendar-metric-bubble" style={{ width: `${size}rem`, height: `${size}rem` }} aria-hidden /><span className="life-calendar-metric-value">{display}{view === "food" ? <small>kcal</small> : null}</span></span>;
}

export function LifeCalendarPage({ initialView = "mood", initialMonth }: { initialView?: CalendarView; initialMonth?: string }) {
  const { mePartnerKey, taPartnerKey } = useLifeIdentity();
  const [view, setView] = useState<CalendarView>(initialView);
  const [role, setRole] = useState<AppRoleSwitchValue>("me");
  const [month, setMonth] = useState(() => initialMonth ?? localMonth());
  const today = useMemo(() => localDate(), []);
  const fetcher = useCallback(async () => {
    if (!mePartnerKey || !taPartnerKey) return { month, days: [] } as LifeMonthBundle;
    const bundle = await fetchLifeMonthBundle(month);
    hydrateLifeMonthBundle(bundle, mePartnerKey, taPartnerKey);
    return bundle;
  }, [mePartnerKey, month, taPartnerKey]);
  const query = useStaleQuery<LifeMonthBundle>({ key: `life-month-bundle:${month}`, fetcher, staleMs: 60_000 });
  const byDate = useMemo(() => new Map((query.data?.days ?? []).map((day) => [day.date, day])), [query.data]);
  const cells = useMemo(() => monthCells(month), [month]);
  const selectedPartner = role === "me" ? mePartnerKey : taPartnerKey;
  const error = query.error instanceof LifeApiError ? query.error.message : query.error?.message ?? null;

  const warmDay = useCallback((date: string) => {
    if (!mePartnerKey || !taPartnerKey) return;
    const me = mePartnerKey as NutritionPartnerKey;
    const ta = taPartnerKey as NutritionPartnerKey;
    const cachedMeals = [...(peekStaleQuery<MealRecord[]>(`meals:${me}:${date}`) ?? []), ...(peekStaleQuery<MealRecord[]>(`meals:${ta}:${date}`) ?? [])];
    if (cachedMeals.length) void preloadMealPhotos(cachedMeals);
    void Promise.allSettled([
      prefetchStaleQuery({ key: `life-day:${date}`, fetcher: () => fetchLifeDay(date), staleMs: 60_000 }),
      prefetchStaleQuery({ key: `meals:${me}:${date}`, fetcher: async () => (await fetchMeals({ mealDate: date, partnerKey: me })).filter((meal) => !meal.deletedAt), staleMs: 60_000 }).then(preloadMealPhotos),
      prefetchStaleQuery({ key: `meals:${ta}:${date}`, fetcher: async () => (await fetchMeals({ mealDate: date, partnerKey: ta })).filter((meal) => !meal.deletedAt), staleMs: 60_000 }).then(preloadMealPhotos),
    ]);
  }, [mePartnerKey, taPartnerKey]);

  function dayContent(day: LifeMonthBundleDay | undefined) {
    if (view === "mood") {
      const moods = day?.day.moods ?? [];
      const meMood = mePartnerKey ? moods.find((item) => item.partnerKey === mePartnerKey)?.moodKey : undefined;
      const taMood = taPartnerKey ? moods.find((item) => item.partnerKey === taPartnerKey)?.moodKey : undefined;
      return <span className="life-calendar-moods"><MoodStamp moodKey={meMood} label="我" /><MoodStamp moodKey={taMood} label="Ta" offset={Boolean(meMood && taMood)} /></span>;
    }
    if (!selectedPartner) return null;
    const value = view === "food" ? mealCaloriesForPartner(day, selectedPartner) : sleepHoursForPartner(day, selectedPartner);
    return <MetricMark view={view} value={value} />;
  }

  const legend = view === "mood" ? "没有记录就留白；今天用小太阳标记。" : view === "food" ? "圆块大小表示当日总热量，数字为具体 kcal。" : "圆块大小表示睡眠时长，数字为具体小时数。";
  return (
    <AppPageShell title="月度回顾" subtitle="从一个月里，慢慢看见生活的变化。">
      <section className={`life-calendar-paper life-calendar-page life-review-calendar is-${view}`}>
        <div className="life-calendar-view-switch" role="tablist" aria-label="选择月度回顾类型">
          {VIEW_OPTIONS.map((option) => <button key={option.value} type="button" role="tab" aria-selected={view === option.value} onClick={() => setView(option.value)}>{option.label}</button>)}
        </div>
        {view !== "mood" ? <div className="mt-3 flex justify-end"><AppRoleSwitch value={role} onChange={setRole} /></div> : null}
        <div className="mt-4 flex items-center justify-between gap-3 px-2">
          <button type="button" aria-label="上个月" onClick={() => setMonth((value) => shiftMonth(value, -1))} className="life-round-button">‹</button>
          <div className="text-center"><p className="text-lg font-black tracking-tight text-[var(--life-text)]">{monthTitle(month)}</p><p className="mt-1 text-[10px] font-bold text-[var(--life-text-muted)]">{view === "mood" ? "我 · Ta" : role === "me" ? "我" : "Ta"}</p></div>
          <button type="button" aria-label="下个月" onClick={() => setMonth((value) => shiftMonth(value, 1))} className="life-round-button">›</button>
        </div>
        <div className="mt-4 grid grid-cols-7 text-center text-[10px] font-extrabold text-[var(--life-text-muted)]">{WEEKDAYS.map((day) => <div key={day} className="py-1">{day}</div>)}</div>
        <div className="mt-2 grid grid-cols-7 gap-y-1">
          {cells.map((date, index) => {
            if (!date) return <div key={`empty-${index}`} className="h-[5.2rem]" />;
            const isToday = date === today;
            return <Link key={date} href={`/calendar/${date}`} className="life-calendar-day" aria-label={`${date}${isToday ? "，今天" : ""}`} onPointerEnter={() => warmDay(date)} onPointerDown={() => warmDay(date)} onFocus={() => warmDay(date)}><span className={`life-calendar-date ${isToday ? "is-today" : ""}`}>{isToday ? <span className="life-today-sun" aria-hidden>☀️</span> : null}<span>{Number(date.slice(-2))}</span></span>{dayContent(byDate.get(date))}</Link>;
          })}
        </div>
      </section>
      {error ? <div className="mt-3 rounded-[var(--life-radius-control)] bg-[color:color-mix(in_srgb,var(--life-coral)_14%,white)] px-3 py-2.5 text-sm text-[var(--life-danger)]">{error}</div> : null}
      <p className="mt-3 px-2 text-center text-[10px] leading-5 text-[var(--life-text-muted)]">{legend}</p>
    </AppPageShell>
  );
}
