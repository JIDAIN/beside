"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { MealPhotoFrame } from "@/components/life/MealPhotoFrame";
import { AppPageShell } from "@/components/ui/AppPageShell";
import { AppRoleSwitch, type AppRoleSwitchValue } from "@/components/ui/AppRoleSwitch";
import { AppNutritionBar } from "@/components/ui/AppNutritionBar";
import { DailyNutritionSummary } from "@/components/life/DailyNutritionSummary";
import { useLifeIdentity } from "@/components/life/LifeIdentityContext";
import { useStaleQuery } from "@/lib/client/use-stale-query";
import { fetchMeals, mealPhotoUrl, MealApiError } from "@/lib/nutrition/meal-client";
import type { MealRecord, MealType, NutritionPartnerKey, SnackPeriod } from "@/lib/nutrition/meal-service";

const FIXED_MEALS: Array<{ type: MealType; label: string; icon: string }> = [
  { type: "breakfast", label: "早餐", icon: "☀️" },
  { type: "lunch", label: "午餐", icon: "🍚" },
  { type: "dinner", label: "晚餐", icon: "🌙" },
];
const SNACK_OPTIONS: Array<{ period: SnackPeriod; label: string; icon: string }> = [
  { period: "morning", label: "上午加餐", icon: "🌤️" },
  { period: "afternoon", label: "下午加餐", icon: "🍓" },
  { period: "night", label: "晚上加餐", icon: "🌙" },
];
const SNACK_LABELS: Record<SnackPeriod, string> = {
  morning: "上午加餐",
  afternoon: "下午加餐",
  night: "晚上加餐",
};
const DEFAULT_MEAL_ART: Record<string, string> = {
  breakfast: "/illustrations/meals/breakfast.svg",
  lunch: "/illustrations/meals/lunch.svg",
  dinner: "/illustrations/meals/dinner.svg",
  snack: "/illustrations/meals/snack.svg",
};
const EMPTY_MEALS: MealRecord[] = [];

function localIsoDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function compactDateLabel(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return value;
  const weekday = new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(date);
  return `${month}月${day}日 ${weekday}`;
}

function mealNames(meal: MealRecord) {
  return meal.items.map((item) => item.displayName || item.rawName).filter(Boolean).join("、") || "已记录一餐";
}

function nutritionTotals(meals: MealRecord[]) {
  return meals.reduce(
    (acc, meal) => {
      meal.items.forEach((item) => {
        if (item.carbsG != null) { acc.carbs += item.carbsG; acc.hasCarbs = true; }
        if (item.proteinG != null) { acc.protein += item.proteinG; acc.hasProtein = true; }
        if (item.fatG != null) { acc.fat += item.fatG; acc.hasFat = true; }
      });
      if (meal.totalCaloriesKcal != null) acc.calories += meal.totalCaloriesKcal;
      return acc;
    },
    { carbs: 0, protein: 0, fat: 0, calories: 0, hasCarbs: false, hasProtein: false, hasFat: false },
  );
}

function mealHref(date: string, partnerKey: NutritionPartnerKey, mealType: MealType, mealId?: string, snackPeriod?: SnackPeriod | null) {
  const params = new URLSearchParams({ date, person: partnerKey, type: mealType });
  if (mealId) params.set("mealId", mealId);
  if (snackPeriod) params.set("snackPeriod", snackPeriod);
  return `/food/edit?${params.toString()}`;
}

function timeLabel(meal: MealRecord) {
  if (!meal.eatenAt) return "时间未记录";
  return new Date(meal.eatenAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function mealSortKey(meal: MealRecord) {
  return meal.eatenAt ?? meal.createdAt;
}

function PencilIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 16.8-.8 3 3-.8L18 8.2 15.8 6 5 16.8Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="m14.8 7 2.2 2.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}

function FoodInitialShell() {
  return (
    <div className="grid gap-3" aria-hidden>
      <div className="life-surface life-section-card min-h-14" />
      <div className="life-surface life-section-card min-h-60" />
      <div className="life-surface life-section-card min-h-60" />
      <div className="life-surface life-section-card min-h-60" />
    </div>
  );
}

function MealPhotoSlot({ meal, label, mealType, pending = false }: { meal?: MealRecord; label: string; mealType: MealType; pending?: boolean }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  if (pending) {
    return <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[var(--life-radius-control)] bg-[var(--life-surface-warm)]" aria-hidden />;
  }
  const customPhoto = Boolean(meal?.photoPath) && !photoFailed;
  const src = customPhoto && meal ? mealPhotoUrl(meal) : (DEFAULT_MEAL_ART[mealType] ?? DEFAULT_MEAL_ART.lunch);

  if (customPhoto && meal) {
    return (
      <MealPhotoFrame
        src={src}
        alt={`${label}实物照片：${mealNames(meal)}`}
        rotationDegrees={meal.photoRotationDegrees ?? 0}
        scale={meal.photoScale ?? 1}
        priority
        onError={() => setPhotoFailed(true)}
      />
    );
  }

  return <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[var(--life-radius-control)] bg-[var(--life-surface-warm)]"><Image unoptimized src={src} alt={`${label}默认卡通插图`} fill sizes="(max-width: 480px) 42vw, 190px" className="object-cover" /><div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(transparent,rgba(74,65,57,0.5))] px-2.5 pb-2 pt-7 text-white"><p className="line-clamp-1 text-[10px] font-bold">{meal ? mealNames(meal) : `${label}还没有记录`}</p></div></div>;
}

function MealNutrition({ meal }: { meal?: MealRecord }) {
  const totals = nutritionTotals(meal ? [meal] : []);
  return <div className="grid gap-2"><AppNutritionBar label="碳水" value={!meal || !totals.hasCarbs ? null : Number(totals.carbs.toFixed(1))} unit="g" max={100} /><AppNutritionBar label="蛋白质" value={!meal || !totals.hasProtein ? null : Number(totals.protein.toFixed(1))} unit="g" max={60} /><AppNutritionBar label="脂肪" value={!meal || !totals.hasFat ? null : Number(totals.fat.toFixed(1))} unit="g" max={50} /><div className="flex items-baseline justify-between border-t border-[var(--life-border-soft)] pt-2"><span className="text-xs font-bold text-[var(--life-text-body)]">总热量</span><span className="text-base font-extrabold tabular-nums text-[var(--life-text)]">{meal?.totalCaloriesKcal == null ? "未估算" : `${meal.totalCaloriesKcal} kcal`}</span></div></div>;
}

export function LifeFoodPage({ initialDate }: { initialDate?: string }) {
  const { mePartnerKey, taPartnerKey } = useLifeIdentity();
  const [role, setRole] = useState<AppRoleSwitchValue>("me");
  const [date, setDate] = useState(() => initialDate || localIsoDate());
  const [snackChooserOpen, setSnackChooserOpen] = useState(false);
  const partnerKey = (role === "me" ? mePartnerKey : taPartnerKey) as NutritionPartnerKey | null;
  const canEdit = role === "me";
  const fetcher = useCallback(async () => {
    if (!partnerKey) return [] as MealRecord[];
    const records = await fetchMeals({ mealDate: date, partnerKey });
    return records.filter((meal) => meal.deletedAt == null);
  }, [date, partnerKey]);
  const query = useStaleQuery<MealRecord[]>({ key: partnerKey ? `meals:${partnerKey}:${date}` : `meals:pending:${date}`, fetcher, staleMs: 20_000 });
  const meals = query.data ?? EMPTY_MEALS;
  const mealsPending = query.loading && query.data === undefined;
  const error = query.error instanceof MealApiError ? query.error.message : query.error?.message ?? null;
  const fixed = useMemo(() => new Map(FIXED_MEALS.map(({ type }) => [type, meals.filter((meal) => meal.mealType === type).sort((a, b) => mealSortKey(a).localeCompare(mealSortKey(b)))])), [meals]);
  const snacks = useMemo(() => meals.filter((meal) => meal.mealType === "snack").sort((a, b) => mealSortKey(a).localeCompare(mealSortKey(b))), [meals]);

  if (!partnerKey) return <AppPageShell title="饮食"><FoodInitialShell /></AppPageShell>;

  return <>
    <AppPageShell title="饮食" actions={<div className="life-header-role-switch"><AppRoleSwitch value={role} onChange={setRole} /></div>}>
      <div className="life-surface mb-4 flex items-center justify-between gap-3 rounded-[var(--life-radius-card)] px-3 py-2.5">
        <label className="relative cursor-pointer text-sm font-extrabold text-[var(--life-text)]">
          <span>{compactDateLabel(date)}</span>
          <input aria-label="查看日期" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
        </label>
        <Link href="/food/favorites" className="shrink-0 text-sm font-extrabold text-[var(--life-teal-strong)]">常吃食物 ›</Link>
      </div>
      {error ? <div className="mb-3 rounded-[var(--life-radius-control)] bg-[color:color-mix(in_srgb,var(--life-coral)_16%,white)] px-3 py-2 text-sm text-[var(--life-danger)]">{error}</div> : null}
      <div className="grid gap-3">
        {FIXED_MEALS.map(({ type, label, icon }) => {
          const records = fixed.get(type) ?? [];
          const primary = records[0];
          const extraRecords = records.slice(1);
          return <section key={type} className="life-surface life-section-card life-meal-card"><div className="mb-3 flex items-center justify-between gap-3"><p className="text-sm font-extrabold text-[var(--life-text)]">{icon} {label}</p>{canEdit ? primary ? <Link href={mealHref(date, partnerKey, type, primary.id)} className="life-meal-edit-icon" aria-label={`编辑${label}`} title={`编辑${label}`}><PencilIcon /></Link> : <Link href={mealHref(date, partnerKey, type)} className="life-meal-add-link">+ 添加{label}</Link> : <span className="rounded-full bg-[var(--life-surface-soft)] px-3 py-1.5 text-[10px] font-bold text-[var(--life-text-muted)]">只读</span>}</div><div className="grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)] gap-3"><MealPhotoSlot meal={primary} label={label} mealType={type} pending={mealsPending} /><MealNutrition meal={primary} /></div>{extraRecords.length ? <div className="mt-3 grid gap-3 rounded-[var(--life-radius-control)] bg-[var(--life-surface-warm)] p-3">{extraRecords.map((record, index) => <article key={record.id} className="rounded-[var(--life-radius-card)] border border-[var(--life-border-soft)] bg-[var(--life-surface)] p-3"><div className="mb-2.5 flex items-center justify-between gap-3"><div><p className="text-xs font-extrabold text-[var(--life-text)]">{label}记录 {index + 2} · {timeLabel(record)}</p><p className="mt-0.5 line-clamp-1 text-[10px] text-[var(--life-text-muted)]">{mealNames(record)}</p></div>{canEdit ? <Link href={mealHref(date, partnerKey, type, record.id)} className="life-meal-edit-icon" aria-label={`编辑${label}记录${index + 2}`} title={`编辑${label}记录${index + 2}`}><PencilIcon /></Link> : null}</div><div className="grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)] gap-3"><MealPhotoSlot meal={record} label={`${label}记录${index + 2}`} mealType={type} /><MealNutrition meal={record} /></div></article>)}</div> : null}</section>;
        })}
        <section className="life-surface life-section-card life-meal-card"><div className="flex items-center justify-between gap-3"><p className="text-sm font-extrabold text-[var(--life-text)]">🍓 加餐</p>{canEdit ? <button type="button" onClick={() => setSnackChooserOpen(true)} className="life-meal-add-link">+ 新增加餐</button> : <span className="rounded-full bg-[var(--life-surface-soft)] px-3 py-1.5 text-[10px] font-bold text-[var(--life-text-muted)]">只读</span>}</div><div className="mt-3 grid gap-3">{snacks.length === 0 && !mealsPending ? <div className="rounded-[var(--life-radius-control)] bg-[var(--life-surface-soft)] px-3 py-4 text-center text-xs font-bold text-[var(--life-text-muted)]">这一天还没有加餐</div> : null}{snacks.map((snack) => { const label = snack.snackPeriod ? SNACK_LABELS[snack.snackPeriod] : "加餐"; return <article key={snack.id} className="rounded-[var(--life-radius-card)] border border-[var(--life-border-soft)] bg-[var(--life-surface-soft)] p-3"><div className="mb-2.5 flex items-center justify-between gap-3"><div><p className="text-xs font-extrabold text-[var(--life-text)]">{label} · {timeLabel(snack)}</p><p className="mt-0.5 line-clamp-1 text-[10px] text-[var(--life-text-muted)]">{mealNames(snack)}</p></div>{canEdit ? <Link href={mealHref(date, partnerKey, "snack", snack.id, snack.snackPeriod)} className="life-meal-edit-icon" aria-label={`编辑${label}`} title={`编辑${label}`}><PencilIcon /></Link> : null}</div><div className="grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)] gap-3"><MealPhotoSlot meal={snack} label={label} mealType="snack" /><MealNutrition meal={snack} /></div></article>; })}</div></section>
        <DailyNutritionSummary meals={meals} />
      </div>
    </AppPageShell>
    {snackChooserOpen ? <div className="life-sheet-backdrop" role="presentation" onMouseDown={() => setSnackChooserOpen(false)}><section className="life-mood-sheet" role="dialog" aria-modal="true" aria-labelledby="snack-picker-title" onMouseDown={(event) => event.stopPropagation()}><div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[var(--life-border)]" /><p id="snack-picker-title" className="text-center text-lg font-black text-[var(--life-text)]">新增加餐</p><div className="mt-5 grid gap-2">{SNACK_OPTIONS.map((option) => <Link key={option.period} href={mealHref(date, partnerKey, "snack", undefined, option.period)} className="flex items-center gap-3 rounded-[var(--life-radius-control)] bg-[var(--life-surface-soft)] px-4 py-3 text-sm font-extrabold text-[var(--life-text)]"><span className="text-xl">{option.icon}</span><span>{option.label}</span><span className="ml-auto text-[var(--life-text-muted)]">›</span></Link>)}</div><button type="button" onClick={() => setSnackChooserOpen(false)} className="mt-4 w-full rounded-full bg-[var(--life-surface-warm)] px-4 py-3 text-sm font-extrabold text-[var(--life-text-body)]">取消</button></section></div> : null}
  </>;
}
