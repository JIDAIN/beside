"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useLifeIdentity } from "@/components/life/LifeIdentityContext";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppPageShell } from "@/components/ui/AppPageShell";
import {
  createFavoriteFood,
  deleteFavoriteFood,
  FavoriteFoodApiError,
  fetchFavoriteFoods,
  updateFavoriteFood,
} from "@/lib/nutrition/favorite-food-client";
import type { FavoriteFoodRecord, FavoriteFoodWritePayload } from "@/lib/nutrition/favorite-food-service";
import { parseNonNegativeNumber } from "@/lib/nutrition/meal-editor-model";
import { setStaleQueryData, useStaleQuery } from "@/lib/client/use-stale-query";

type Draft = {
  name: string;
  portionDescription: string;
  caloriesKcal: string;
  carbsG: string;
  proteinG: string;
  fatG: string;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  portionDescription: "",
  caloriesKcal: "",
  carbsG: "",
  proteinG: "",
  fatG: "",
};

function fromRecord(food: FavoriteFoodRecord): Draft {
  return {
    name: food.name,
    portionDescription: food.portionDescription ?? "",
    caloriesKcal: food.caloriesKcal == null ? "" : String(food.caloriesKcal),
    carbsG: food.carbsG == null ? "" : String(food.carbsG),
    proteinG: food.proteinG == null ? "" : String(food.proteinG),
    fatG: food.fatG == null ? "" : String(food.fatG),
  };
}

function summary(food: FavoriteFoodRecord) {
  const portion = food.portionDescription || "份量未填";
  return food.caloriesKcal == null ? portion : `${portion} · ${food.caloriesKcal} kcal`;
}

export function LifeFavoriteFoodsPage() {
  const { mePartnerKey } = useLifeIdentity();
  const fetcher = useCallback(async () => mePartnerKey ? fetchFavoriteFoods(mePartnerKey) : [], [mePartnerKey]);
  const cacheKey = mePartnerKey ? `favorite-foods:${mePartnerKey}` : "favorite-foods:pending";
  const query = useStaleQuery<FavoriteFoodRecord[]>({ key: cacheKey, fetcher, staleMs: 20_000 });
  const foods = query.data ?? [];
  const [editing, setEditing] = useState<FavoriteFoodRecord | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openNew() {
    setEditing(null);
    setDraft(EMPTY_DRAFT);
    setError(null);
    setSheetOpen(true);
  }

  function openEdit(food: FavoriteFoodRecord) {
    setEditing(food);
    setDraft(fromRecord(food));
    setError(null);
    setSheetOpen(true);
  }

  function closeSheet() {
    if (saving) return;
    setSheetOpen(false);
    setError(null);
  }

  function buildPayload(): FavoriteFoodWritePayload | null {
    if (!mePartnerKey) return null;
    const name = draft.name.trim();
    if (!name) { setError("请填写名称"); return null; }
    const calories = parseNonNegativeNumber(draft.caloriesKcal);
    const carbs = parseNonNegativeNumber(draft.carbsG);
    const protein = parseNonNegativeNumber(draft.proteinG);
    const fat = parseNonNegativeNumber(draft.fatG);
    if ([calories, carbs, protein, fat].some((value) => Number.isNaN(value))) {
      setError("营养数值只能填写 0 或更大的数字");
      return null;
    }
    if (calories != null && !Number.isInteger(calories)) {
      setError("热量需要填写整数 kcal");
      return null;
    }
    return {
      partnerKey: mePartnerKey,
      name,
      portionDescription: draft.portionDescription.trim() || null,
      caloriesKcal: calories,
      carbsG: carbs,
      proteinG: protein,
      fatG: fat,
    };
  }

  async function saveTemplate() {
    const payload = buildPayload();
    if (!payload) return;
    setSaving(true);
    setError(null);
    try {
      const saved = editing
        ? await updateFavoriteFood(editing.id, payload)
        : await createFavoriteFood(payload);
      const next = editing
        ? foods.map((food) => food.id === saved.id ? saved : food)
        : [saved, ...foods];
      setStaleQueryData(cacheKey, next);
      setSheetOpen(false);
    } catch (cause) {
      setError(cause instanceof FavoriteFoodApiError ? cause.message : "常吃食物没有保存成功");
    } finally {
      setSaving(false);
    }
  }

  async function removeTemplate() {
    if (!editing || !window.confirm(`删除常吃食物“${editing.name}”吗？`)) return;
    setSaving(true);
    setError(null);
    try {
      await deleteFavoriteFood(editing.id);
      setStaleQueryData(cacheKey, foods.filter((food) => food.id !== editing.id));
      setSheetOpen(false);
    } catch (cause) {
      setError(cause instanceof FavoriteFoodApiError ? cause.message : "删除失败");
    } finally {
      setSaving(false);
    }
  }

  return <>
    <AppPageShell
      title="常吃食物"
      actions={<Link href="/food" className="life-inline-link is-strong">返回饮食</Link>}
    >
      <div className="grid gap-3">
        <button type="button" onClick={openNew} className="life-surface flex min-h-12 items-center justify-center rounded-[var(--life-radius-card)] border border-dashed border-[var(--life-mint-strong)] px-4 text-sm font-extrabold text-[var(--life-teal-strong)]">＋ 新增常吃食物</button>
        {query.error ? <div className="rounded-[var(--life-radius-control)] bg-[color:color-mix(in_srgb,var(--life-coral)_16%,white)] px-3 py-2.5 text-sm font-bold text-[var(--life-danger)]">{query.error.message}</div> : null}
        <section className="life-surface overflow-hidden rounded-[var(--life-radius-card)]">
          {query.loading && query.data === undefined ? <div className="min-h-24" aria-label="正在读取常吃食物" /> : null}
          {!query.loading && foods.length === 0 ? <div className="px-4 py-8 text-center text-sm font-bold text-[var(--life-text-muted)]">还没有常吃食物</div> : null}
          {foods.map((food) => <button key={food.id} type="button" onClick={() => openEdit(food)} className="flex w-full items-center gap-3 border-b border-[var(--life-border-soft)] px-4 py-3 text-left last:border-b-0"><span className="min-w-0 flex-1"><strong className="block truncate text-sm font-extrabold text-[var(--life-text)]">{food.name}</strong><span className="mt-0.5 block truncate text-xs text-[var(--life-text-muted)]">{summary(food)}</span></span><span className="text-xl text-[var(--life-text-muted)]">›</span></button>)}
        </section>
      </div>
    </AppPageShell>

    {sheetOpen ? <div className="life-sheet-backdrop" role="presentation" onMouseDown={closeSheet}><section className="life-mood-sheet life-food-form-sheet" role="dialog" aria-modal="true" aria-labelledby="favorite-food-editor-title" onMouseDown={(event) => event.stopPropagation()}><div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[var(--life-border)]" /><h2 id="favorite-food-editor-title" className="text-center text-lg font-black text-[var(--life-text)]">{editing ? "编辑常吃食物" : "新增常吃食物"}</h2><div className="mt-4 grid gap-3"><label className="grid gap-1 text-xs font-bold text-[var(--life-text-body)]">名称<AppInput value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></label><label className="grid gap-1 text-xs font-bold text-[var(--life-text-body)]">份量<AppInput value={draft.portionDescription} onChange={(event) => setDraft((current) => ({ ...current, portionDescription: event.target.value }))} /></label><label className="grid gap-1 text-xs font-bold text-[var(--life-text-body)]">热量<AppInput inputMode="numeric" value={draft.caloriesKcal} onChange={(event) => setDraft((current) => ({ ...current, caloriesKcal: event.target.value }))} /></label><details className="rounded-xl bg-[var(--life-surface-soft)] px-3 py-2"><summary className="cursor-pointer text-xs font-extrabold text-[var(--life-teal-strong)]">三大营养素</summary><div className="mt-2.5 grid grid-cols-3 gap-2"><label className="grid gap-1 text-[11px] font-bold text-[var(--life-text-body)]">碳水（g）<AppInput inputMode="decimal" value={draft.carbsG} onChange={(event) => setDraft((current) => ({ ...current, carbsG: event.target.value }))} /></label><label className="grid gap-1 text-[11px] font-bold text-[var(--life-text-body)]">蛋白质（g）<AppInput inputMode="decimal" value={draft.proteinG} onChange={(event) => setDraft((current) => ({ ...current, proteinG: event.target.value }))} /></label><label className="grid gap-1 text-[11px] font-bold text-[var(--life-text-body)]">脂肪（g）<AppInput inputMode="decimal" value={draft.fatG} onChange={(event) => setDraft((current) => ({ ...current, fatG: event.target.value }))} /></label></div></details>{error ? <p role="alert" className="text-sm font-bold text-[var(--life-danger)]">{error}</p> : null}</div>{editing ? <button type="button" disabled={saving} onClick={() => void removeTemplate()} className="mt-4 text-sm font-bold text-[var(--life-danger)]">删除</button> : null}<div className="mt-4 grid grid-cols-2 gap-2"><AppButton variant="secondary" disabled={saving} onClick={closeSheet}>取消</AppButton><AppButton variant="primary" disabled={saving} onClick={() => void saveTemplate()}>{saving ? "保存中…" : "保存"}</AppButton></div></section></div> : null}
  </>;
}
