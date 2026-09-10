"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MealPhotoFrame } from "@/components/life/MealPhotoFrame";
import { useLifeIdentity } from "@/components/life/LifeIdentityContext";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppNutritionBar } from "@/components/ui/AppNutritionBar";
import { AppPageShell } from "@/components/ui/AppPageShell";
import { AppSelect } from "@/components/ui/AppSelect";
import { AppTextarea } from "@/components/ui/AppTextarea";
import { invalidateStaleQuery, peekStaleQuery, setStaleQueryData } from "@/lib/client/use-stale-query";
import {
  isIsoDate,
  localIsoDate,
  parseMealType,
  parseNonNegativeNumber,
  parsePartnerKey,
  parseSnackPeriod,
  summarizeDraftNutrition,
} from "@/lib/nutrition/meal-editor-model";
import { createMealRecord, deleteMealPhoto, deleteMealRecord, fetchMeals, mealPhotoUrl, MealApiError, updateMealPhotoDisplay, updateMealRecord, uploadMealPhoto } from "@/lib/nutrition/meal-client";
import type { MealItemRecord, MealPhotoRotation, MealRecord, MealType, MealWritePayload, NutritionPartnerKey, SnackPeriod } from "@/lib/nutrition/meal-service";

const MEAL_LABELS: Record<MealType, string> = { breakfast: "早餐", lunch: "午餐", dinner: "晚餐", snack: "加餐" };
const SNACK_LABELS: Record<SnackPeriod, string> = { morning: "上午加餐", afternoon: "下午加餐", night: "晚上加餐" };
const MEAL_OPTIONS = [
  { key: "breakfast", label: "早餐" },
  { key: "lunch", label: "午餐" },
  { key: "dinner", label: "晚餐" },
  { key: "snack", label: "加餐" },
];
const SNACK_OPTIONS = [
  { key: "morning", label: "上午加餐" },
  { key: "afternoon", label: "下午加餐" },
  { key: "night", label: "晚上加餐" },
];
const DEFAULT_MEAL_ART: Record<MealType, string> = { breakfast: "/illustrations/meals/breakfast.svg", lunch: "/illustrations/meals/lunch.svg", dinner: "/illustrations/meals/dinner.svg", snack: "/illustrations/meals/snack.svg" };
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

type ItemDraft = {
  key: string;
  foodId: string | null;
  rawName: string;
  displayName: string;
  portionDescription: string;
  estimatedWeightG: string;
  caloriesKcal: string;
  calorieMinKcal: number | null;
  calorieMaxKcal: number | null;
  carbsG: string;
  proteinG: string;
  fatG: string;
};

function draftKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function emptyItem(): ItemDraft {
  return { key: draftKey(), foodId: null, rawName: "", displayName: "", portionDescription: "", estimatedWeightG: "", caloriesKcal: "", calorieMinKcal: null, calorieMaxKcal: null, carbsG: "", proteinG: "", fatG: "" };
}

function fromItem(item: MealItemRecord): ItemDraft {
  return {
    key: item.id,
    foodId: item.foodId,
    rawName: item.rawName,
    displayName: item.displayName,
    portionDescription: item.portionDescription ?? "",
    estimatedWeightG: item.estimatedWeightG == null ? "" : String(item.estimatedWeightG),
    caloriesKcal: item.caloriesKcal == null ? "" : String(item.caloriesKcal),
    calorieMinKcal: item.calorieMinKcal,
    calorieMaxKcal: item.calorieMaxKcal,
    carbsG: item.carbsG == null ? "" : String(item.carbsG),
    proteinG: item.proteinG == null ? "" : String(item.proteinG),
    fatG: item.fatG == null ? "" : String(item.fatG),
  };
}

function dateTimeWithLocalOffset(mealDate: string, time: string) {
  if (!time) return null;
  const local = new Date(`${mealDate}T${time}:00`);
  return Number.isNaN(local.getTime()) ? null : local.toISOString();
}

function editorHref(meal: MealRecord) {
  const params = new URLSearchParams({ date: meal.mealDate, person: meal.partnerKey, type: meal.mealType, mealId: meal.id });
  if (meal.snackPeriod) params.set("snackPeriod", meal.snackPeriod);
  return `/food/edit?${params.toString()}`;
}

function syncSavedMealCaches(saved: MealRecord, previousMeal: MealRecord | null) {
  const targetKey = `meals:${saved.partnerKey}:${saved.mealDate}`;
  const targetCache = peekStaleQuery<MealRecord[]>(targetKey);
  if (targetCache) setStaleQueryData(targetKey, [...targetCache.filter((record) => record.id !== saved.id), saved]);
  else invalidateStaleQuery(targetKey);

  if (previousMeal && previousMeal.mealDate !== saved.mealDate) {
    const previousKey = `meals:${previousMeal.partnerKey}:${previousMeal.mealDate}`;
    const previousCache = peekStaleQuery<MealRecord[]>(previousKey);
    if (previousCache) setStaleQueryData(previousKey, previousCache.filter((record) => record.id !== saved.id));
    else invalidateStaleQuery(previousKey);
  }
  invalidateStaleQuery(`life-month-bundle:${saved.mealDate.slice(0, 7)}`);
  if (previousMeal && previousMeal.mealDate.slice(0, 7) !== saved.mealDate.slice(0, 7)) {
    invalidateStaleQuery(`life-month-bundle:${previousMeal.mealDate.slice(0, 7)}`);
  }
}

export function LifeMealEditorPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { mePartnerKey, loading: identityLoading } = useLifeIdentity();
  const mealId = params.get("mealId");
  const dateParam = params.get("date");
  const personParam = params.get("person");
  const typeParam = params.get("type");
  const snackPeriodParam = params.get("snackPeriod");
  const initialDate = isIsoDate(dateParam) ? dateParam : localIsoDate();
  const requestedPartner = parsePartnerKey(personParam);
  const requestedType = parseMealType(typeParam);
  const requestedSnackPeriod = parseSnackPeriod(snackPeriodParam);
  const partnerKey = (requestedPartner ?? mePartnerKey) as NutritionPartnerKey | null;
  const canEdit = Boolean(partnerKey && mePartnerKey === partnerKey);
  const invalidRequest = Boolean(
    (dateParam !== null && !isIsoDate(dateParam))
    || (personParam !== null && !requestedPartner)
    || (!mealId && (!requestedType || (requestedType === "snack" && !requestedSnackPeriod))),
  );
  const cachedMeal = mealId && partnerKey
    ? peekStaleQuery<MealRecord[]>(`meals:${partnerKey}:${initialDate}`)?.find((record) => record.id === mealId) ?? null
    : null;

  const [meal, setMeal] = useState<MealRecord | null>(cachedMeal);
  const [date, setDate] = useState(cachedMeal?.mealDate ?? initialDate);
  const [mealType, setMealType] = useState<MealType>(cachedMeal?.mealType ?? requestedType ?? "lunch");
  const [snackPeriod, setSnackPeriod] = useState<SnackPeriod | null>(cachedMeal?.mealType === "snack" ? cachedMeal.snackPeriod : requestedType === "snack" ? requestedSnackPeriod : null);
  const [time, setTime] = useState(cachedMeal?.eatenAt ? new Date(cachedMeal.eatenAt).toTimeString().slice(0, 5) : "");
  const [note, setNote] = useState(cachedMeal?.note ?? "");
  const [items, setItems] = useState<ItemDraft[]>(cachedMeal?.items.length ? cachedMeal.items.map(fromItem) : [emptyItem()]);
  const [calorieDataTouched, setCalorieDataTouched] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [photoRotationDegrees, setPhotoRotationDegrees] = useState<MealPhotoRotation>(cachedMeal?.photoRotationDegrees ?? 0);
  const [photoScale, setPhotoScale] = useState(cachedMeal?.photoScale ?? 1);
  const [photoTransformTouched, setPhotoTransformTouched] = useState(false);
  const photoTransformTouchedRef = useRef(false);
  const [loading, setLoading] = useState(Boolean(mealId && !cachedMeal));
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const [photoSaveFailed, setPhotoSaveFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalidItemKey, setInvalidItemKey] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const itemNameRefs = useRef(new Map<string, HTMLInputElement>());

  function markDirty() {
    dirtyRef.current = true;
    setDirty(true);
  }

  function clearDirty() {
    dirtyRef.current = false;
    setDirty(false);
  }

  function showError(message: string, itemKey?: string) {
    setError(message);
    setInvalidItemKey(itemKey ?? null);
    window.requestAnimationFrame(() => {
      const target = itemKey ? itemNameRefs.current.get(itemKey) : errorRef.current;
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (target instanceof HTMLInputElement) target.focus();
    });
  }

  useEffect(() => () => { if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl); }, [photoPreviewUrl]);

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    const interceptLink = (event: MouseEvent) => {
      if (!dirtyRef.current || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(target instanceof HTMLAnchorElement) || target.target === "_blank" || target.download) return;
      if (window.confirm("这餐还有未保存的修改，确定离开吗？")) {
        clearDirty();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", interceptLink, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", interceptLink, true);
    };
  }, [dirty]);

  useEffect(() => {
    if (!mealId || !partnerKey || !canEdit || invalidRequest) return;
    let cancelled = false;
    fetchMeals({ mealDate: initialDate, partnerKey }).then((records) => {
      if (cancelled) return;
      const found = records.find((record) => record.id === mealId && record.deletedAt == null) ?? null;
      if (!found) throw new Error("没有找到这餐记录");
      setMeal(found);
      setDate(found.mealDate);
      setMealType(found.mealType);
      setSnackPeriod(found.mealType === "snack" ? found.snackPeriod : null);
      setTime(found.eatenAt ? new Date(found.eatenAt).toTimeString().slice(0, 5) : "");
      setNote(found.note ?? "");
      setItems(found.items.length ? found.items.map(fromItem) : [emptyItem()]);
      setCalorieDataTouched(false);
      setPhotoRotationDegrees(found.photoRotationDegrees ?? 0);
      setPhotoScale(found.photoScale ?? 1);
      setPhotoTransformTouched(false);
      photoTransformTouchedRef.current = false;
      clearDirty();
    }).catch((cause: unknown) => showError(cause instanceof Error ? cause.message : "读取这餐失败")).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [canEdit, initialDate, invalidRequest, mealId, partnerKey]);

  const nutritionPreview = useMemo(() => summarizeDraftNutrition(items), [items]);
  const itemCaloriesComplete = nutritionPreview.caloriesKcal.completeness === "complete";
  const caloriePreview = itemCaloriesComplete ? nutritionPreview.caloriesKcal.value : !calorieDataTouched ? meal?.totalCaloriesKcal ?? null : null;
  const nutritionIsPartial = Object.values(nutritionPreview).some((field) => field.completeness === "partial");
  const photoSrc = photoPreviewUrl ?? (!removePhoto && meal?.photoPath ? mealPhotoUrl(meal) : DEFAULT_MEAL_ART[mealType]);
  const customPhotoVisible = Boolean(photoPreviewUrl || (!removePhoto && meal?.photoPath));
  const title = mealType === "snack" ? SNACK_LABELS[snackPeriod ?? "afternoon"] : MEAL_LABELS[mealType];

  function markPhotoTransformTouched() {
    photoTransformTouchedRef.current = true;
    setPhotoTransformTouched(true);
    markDirty();
  }

  function updateItem(itemKey: string, patch: Partial<ItemDraft>, affectsCalorieEstimate = false) {
    setItems((current) => current.map((item) => {
      if (item.key !== itemKey) return item;
      const next = { ...item, ...patch };
      if (patch.rawName !== undefined) { next.foodId = null; next.displayName = patch.rawName; }
      if (affectsCalorieEstimate) { next.calorieMinKcal = null; next.calorieMaxKcal = null; }
      return next;
    }));
    if (affectsCalorieEstimate) setCalorieDataTouched(true);
    setInvalidItemKey((current) => current === itemKey ? null : current);
    markDirty();
  }

  function choosePhoto(file: File | null) {
    setError(null);
    if (!file) return;
    if (!PHOTO_TYPES.has(file.type.toLowerCase())) { showError("照片仅支持 JPEG、PNG、WebP、HEIC/HEIF"); return; }
    if (file.size > MAX_PHOTO_BYTES) { showError("照片需要小于 10MB"); return; }
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    const previewUrl = URL.createObjectURL(file);
    setPhotoFile(file);
    setRemovePhoto(false);
    setPhotoPreviewUrl(previewUrl);
    setPhotoRotationDegrees(0);
    setPhotoScale(1);
    setPhotoTransformTouched(false);
    setPhotoSaveFailed(false);
    photoTransformTouchedRef.current = false;
    markDirty();
    const probe = new window.Image();
    probe.onload = () => { if (!photoTransformTouchedRef.current) setPhotoRotationDegrees(probe.naturalHeight > probe.naturalWidth ? 90 : 0); };
    probe.src = previewUrl;
  }

  function clearPhoto() {
    setPhotoFile(null);
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoPreviewUrl(null);
    setRemovePhoto(Boolean(meal?.photoPath));
    setPhotoRotationDegrees(0);
    setPhotoScale(1);
    setPhotoTransformTouched(false);
    setPhotoSaveFailed(false);
    photoTransformTouchedRef.current = false;
    markDirty();
  }

  function rotatePhoto(delta: -90 | 90) {
    setPhotoRotationDegrees((current) => ((current + delta + 360) % 360) as MealPhotoRotation);
    markPhotoTransformTouched();
  }

  function resizePhoto(percent: number) {
    setPhotoScale(Math.max(0.6, Math.min(1, percent / 100)));
    markPhotoTransformTouched();
  }

  async function save() {
    if (!canEdit || !partnerKey) return;
    setError(null);
    setInvalidItemKey(null);
    const unnamed = items.find((item) => !item.rawName.trim());
    if (!items.length || unnamed) { showError("请填写每一种食物的名称", unnamed?.key ?? items[0]?.key); return; }
    const parsedItems: MealWritePayload["items"] = [];
    for (const item of items) {
      const weight = parseNonNegativeNumber(item.estimatedWeightG);
      const calories = parseNonNegativeNumber(item.caloriesKcal);
      const carbs = parseNonNegativeNumber(item.carbsG);
      const protein = parseNonNegativeNumber(item.proteinG);
      const fat = parseNonNegativeNumber(item.fatG);
      if ([weight, calories, carbs, protein, fat].some((value) => Number.isNaN(value))) { showError("重量和营养数值只能填写 0 或更大的数字", item.key); return; }
      if (calories != null && !Number.isInteger(calories)) { showError("热量需要填写整数 kcal", item.key); return; }
      parsedItems.push({ foodId: item.foodId, rawName: item.rawName.trim(), displayName: item.displayName.trim() || item.rawName.trim(), portionDescription: item.portionDescription.trim() || null, estimatedWeightG: weight, caloriesKcal: calories, calorieMinKcal: item.calorieMinKcal, calorieMaxKcal: item.calorieMaxKcal, proteinG: protein, carbsG: carbs, fatG: fat });
    }
    const allCaloriesKnown = parsedItems.length > 0 && parsedItems.every((item) => item.caloriesKcal !== null);
    const allMinimumsKnown = parsedItems.length > 0 && parsedItems.every((item) => item.calorieMinKcal !== null);
    const allMaximumsKnown = parsedItems.length > 0 && parsedItems.every((item) => item.calorieMaxKcal !== null);
    const payload: MealWritePayload = {
      partnerKey,
      mealDate: date,
      mealType,
      eatenAt: dateTimeWithLocalOffset(date, time),
      snackPeriod: mealType === "snack" ? snackPeriod ?? "afternoon" : null,
      status: meal?.status ?? "confirmed",
      source: meal?.source ?? "manual",
      totalCaloriesKcal: allCaloriesKnown ? parsedItems.reduce((sum, item) => sum + (item.caloriesKcal ?? 0), 0) : !calorieDataTouched ? meal?.totalCaloriesKcal ?? null : null,
      calorieMinKcal: allMinimumsKnown ? parsedItems.reduce((sum, item) => sum + (item.calorieMinKcal ?? 0), 0) : !calorieDataTouched ? meal?.calorieMinKcal ?? null : null,
      calorieMaxKcal: allMaximumsKnown ? parsedItems.reduce((sum, item) => sum + (item.calorieMaxKcal ?? 0), 0) : !calorieDataTouched ? meal?.calorieMaxKcal ?? null : null,
      note: note.trim() || null,
      idempotencyKey: meal?.idempotencyKey ?? null,
      items: parsedItems,
    };
    setSaving(true);
    const previousMeal = meal;
    try {
      let saved = meal ? await updateMealRecord(meal.id, payload) : await createMealRecord(payload);
      setMeal(saved);
      syncSavedMealCaches(saved, previousMeal);
      try {
        if (photoFile) {
          saved = await uploadMealPhoto(saved.id, photoFile);
          if (photoTransformTouched) saved = await updateMealPhotoDisplay(saved.id, { rotationDegrees: photoRotationDegrees, scale: photoScale });
        } else if (removePhoto && saved.photoPath) saved = await deleteMealPhoto(saved.id);
        else if (saved.photoPath && photoTransformTouched) saved = await updateMealPhotoDisplay(saved.id, { rotationDegrees: photoRotationDegrees, scale: photoScale });
      } catch (cause) {
        setPhotoSaveFailed(true);
        markDirty();
        router.replace(editorHref(saved));
        showError(cause instanceof MealApiError ? `餐食已保存，照片未保存：${cause.message}` : "餐食已保存，照片暂时没有保存成功");
        return;
      }
      setMeal(saved);
      syncSavedMealCaches(saved, previousMeal);
      setPhotoFile(null);
      setRemovePhoto(false);
      setPhotoSaveFailed(false);
      clearDirty();
      router.push(`/food?date=${encodeURIComponent(saved.mealDate)}`);
    } catch (cause) {
      showError(cause instanceof MealApiError ? cause.message : "这餐暂时没有保存成功");
    } finally {
      setSaving(false);
    }
  }

  async function removeMeal() {
    if (!meal || !canEdit || !window.confirm(`删除这条${title}记录吗？`)) return;
    setSaving(true);
    try {
      await deleteMealRecord(meal.id);
      const key = `meals:${meal.partnerKey}:${meal.mealDate}`;
      const cached = peekStaleQuery<MealRecord[]>(key);
      if (cached) setStaleQueryData(key, cached.filter((record) => record.id !== meal.id));
      else invalidateStaleQuery(key);
      invalidateStaleQuery(`life-month-bundle:${meal.mealDate.slice(0, 7)}`);
      clearDirty();
      router.push(`/food?date=${encodeURIComponent(meal.mealDate)}`);
    } catch (cause) {
      showError(cause instanceof MealApiError ? cause.message : "删除失败");
    } finally {
      setSaving(false);
    }
  }

  if (identityLoading) return <AppPageShell title="编辑饮食"><section className="life-surface life-section-card min-h-28" aria-label="正在读取餐食" /></AppPageShell>;
  if (invalidRequest) return <AppPageShell title="这个饮食链接不完整"><section className="life-surface life-section-card"><p className="text-sm text-[var(--life-text-body)]">请返回饮食页重新选择日期和餐次。</p><Link href="/food" className="mt-4 inline-flex rounded-full bg-[var(--life-teal)] px-4 py-2.5 text-sm font-black text-white">返回饮食</Link></section></AppPageShell>;
  if (!canEdit) return <AppPageShell title="不能编辑 Ta 的饮食"><section className="life-surface life-section-card"><p className="text-sm text-[var(--life-text-body)]">饮食可以互相查看，但只能维护自己的记录。</p><Link href="/food" className="mt-4 inline-flex rounded-full bg-[var(--life-teal)] px-4 py-2.5 text-sm font-black text-white">返回饮食</Link></section></AppPageShell>;
  if (loading) return <AppPageShell title="编辑饮食"><section className="life-surface life-section-card min-h-40" aria-label="正在读取餐食" /></AppPageShell>;

  return (
    <AppPageShell title={meal ? `编辑${title}` : `添加${title}`}>
      <div className="grid gap-3 pb-3">
        <section className="life-surface life-section-card life-editor-meta grid gap-3">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-bold text-[var(--life-text-body)]">日期<AppInput type="date" value={date} onChange={(event) => { setDate(event.target.value); markDirty(); }} /></label>
            <label className="grid gap-1 text-xs font-bold text-[var(--life-text-body)]">时间（可选）<AppInput type="time" value={time} onChange={(event) => { setTime(event.target.value); markDirty(); }} /></label>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-bold text-[var(--life-text-body)]">餐次<AppSelect value={mealType} options={MEAL_OPTIONS} onChange={(key) => { const next = key as MealType; setMealType(next); setSnackPeriod(next === "snack" ? snackPeriod ?? "afternoon" : null); markDirty(); }} /></label>
            {mealType === "snack" ? <label className="grid gap-1 text-xs font-bold text-[var(--life-text-body)]">加餐时段<AppSelect value={snackPeriod ?? "afternoon"} options={SNACK_OPTIONS} onChange={(key) => { setSnackPeriod(key as SnackPeriod); markDirty(); }} /></label> : null}
          </div>
        </section>

        {error ? <div ref={errorRef} role="alert" aria-live="assertive" className="rounded-[var(--life-radius-control)] bg-[color:color-mix(in_srgb,var(--life-coral)_16%,white)] px-3 py-2.5 text-sm font-bold text-[var(--life-danger)]">{error}</div> : null}

        <section className="life-surface life-section-card">
          <div className="mb-3 flex items-center justify-between gap-3"><p className="text-sm font-extrabold text-[var(--life-text)]">餐食照片</p>{customPhotoVisible ? <button type="button" onClick={clearPhoto} className="text-xs font-bold text-[var(--life-danger)]">移除照片</button> : null}</div>
          <label className="relative block cursor-pointer">
            {customPhotoVisible ? <MealPhotoFrame src={photoSrc} alt="当前餐食照片" rotationDegrees={photoRotationDegrees} scale={photoScale}><span className="life-meal-photo-action">更换照片</span></MealPhotoFrame> : <div className="life-meal-editor-photo relative aspect-[4/3] overflow-hidden rounded-[var(--life-radius-control)] bg-[var(--life-surface-warm)]"><Image unoptimized src={photoSrc} alt="默认餐食卡通图" fill sizes="(max-width: 480px) 100vw, 440px" className="object-cover" /><span className="life-meal-photo-action">＋ 上传照片</span></div>}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="sr-only" disabled={saving} onChange={(event) => choosePhoto(event.target.files?.[0] ?? null)} />
          </label>
          {customPhotoVisible ? <details className="mt-2.5 rounded-xl bg-[var(--life-surface-soft)] px-3 py-2"><summary className="cursor-pointer text-xs font-extrabold text-[var(--life-teal-strong)]">调整照片</summary><div className="mt-2.5"><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => rotatePhoto(-90)} className="rounded-lg bg-[var(--life-surface)] px-2 py-2 text-xs font-bold text-[var(--life-text-body)]">↶ 左转 90°</button><button type="button" onClick={() => rotatePhoto(90)} className="rounded-lg bg-[var(--life-surface)] px-2 py-2 text-xs font-bold text-[var(--life-text-body)]">右转 90° ↷</button></div><label className="mt-2 grid gap-1 text-[10px] font-bold text-[var(--life-text-muted)]"><span className="flex justify-between"><span>照片大小</span><span>{Math.round(photoScale * 100)}%</span></span><input type="range" min="60" max="100" step="5" value={Math.round(photoScale * 100)} onChange={(event) => resizePhoto(Number(event.target.value))} /></label></div></details> : null}
        </section>

        <section className="life-surface life-section-card">
          <div className="mb-3 flex items-center justify-between gap-3"><p className="text-sm font-extrabold text-[var(--life-text)]">营养合计</p><strong className="text-base tabular-nums text-[var(--life-text)]">{caloriePreview == null ? "未完整估算" : `${Math.round(caloriePreview)} kcal`}</strong></div>
          <div className="grid gap-2"><AppNutritionBar label="碳水" value={nutritionPreview.carbsG.value == null ? null : Number(nutritionPreview.carbsG.value.toFixed(1))} unit="g" max={100} /><AppNutritionBar label="蛋白质" value={nutritionPreview.proteinG.value == null ? null : Number(nutritionPreview.proteinG.value.toFixed(1))} unit="g" max={60} /><AppNutritionBar label="脂肪" value={nutritionPreview.fatG.value == null ? null : Number(nutritionPreview.fatG.value.toFixed(1))} unit="g" max={50} /></div>
          {nutritionIsPartial ? <p className="mt-2 rounded-lg bg-[color:color-mix(in_srgb,var(--life-yellow)_22%,white)] px-2.5 py-2 text-[11px] font-bold text-[var(--life-text-body)]">部分食物未填写营养，暂不显示不完整的合计。</p> : null}
        </section>

        {items.map((item, index) => {
          const nameId = `meal-food-name-${item.key}`;
          return <section key={item.key} className="life-surface life-section-card life-food-item-editor"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-extrabold text-[var(--life-text)]">食物 {index + 1}</p>{items.length > 1 ? <button type="button" onClick={() => { setItems((current) => current.filter((entry) => entry.key !== item.key)); setCalorieDataTouched(true); markDirty(); }} className="text-xs font-bold text-[var(--life-danger)]">移除</button> : null}</div><div className="grid gap-2.5"><label htmlFor={nameId} className="grid gap-1 text-xs font-bold text-[var(--life-text-body)]">食物名称<AppInput ref={(node) => { if (node) itemNameRefs.current.set(item.key, node); else itemNameRefs.current.delete(item.key); }} id={nameId} aria-invalid={invalidItemKey === item.key} placeholder="例如：米饭、鸡胸肉" value={item.rawName} onChange={(event) => updateItem(item.key, { rawName: event.target.value }, true)} /></label><label className="grid gap-1 text-xs font-bold text-[var(--life-text-body)]">实际份量<AppInput placeholder="例如：半碗、1 杯（可选）" value={item.portionDescription} onChange={(event) => updateItem(item.key, { portionDescription: event.target.value }, true)} /></label><label className="grid gap-1 text-xs font-bold text-[var(--life-text-body)]">热量（kcal）<AppInput inputMode="numeric" placeholder="例如：320（可选）" value={item.caloriesKcal} onChange={(event) => updateItem(item.key, { caloriesKcal: event.target.value }, true)} /></label><details className="rounded-xl bg-[var(--life-surface-soft)] px-3 py-2"><summary className="cursor-pointer text-xs font-extrabold text-[var(--life-teal-strong)]">重量与三大营养素</summary><div className="mt-2.5 grid grid-cols-2 gap-2"><label className="grid gap-1 text-[11px] font-bold text-[var(--life-text-body)]">重量（g）<AppInput inputMode="decimal" placeholder="可选" value={item.estimatedWeightG} onChange={(event) => updateItem(item.key, { estimatedWeightG: event.target.value }, true)} /></label><label className="grid gap-1 text-[11px] font-bold text-[var(--life-text-body)]">碳水（g）<AppInput inputMode="decimal" placeholder="可选" value={item.carbsG} onChange={(event) => updateItem(item.key, { carbsG: event.target.value })} /></label><label className="grid gap-1 text-[11px] font-bold text-[var(--life-text-body)]">蛋白质（g）<AppInput inputMode="decimal" placeholder="可选" value={item.proteinG} onChange={(event) => updateItem(item.key, { proteinG: event.target.value })} /></label><label className="grid gap-1 text-[11px] font-bold text-[var(--life-text-body)]">脂肪（g）<AppInput inputMode="decimal" placeholder="可选" value={item.fatG} onChange={(event) => updateItem(item.key, { fatG: event.target.value })} /></label></div></details></div></section>;
        })}

        <button type="button" onClick={() => { setItems((current) => [...current, emptyItem()]); setCalorieDataTouched(true); markDirty(); }} className="rounded-[var(--life-radius-control)] border border-dashed border-[var(--life-mint-strong)] bg-[var(--life-surface-soft)] px-4 py-3 text-sm font-extrabold text-[var(--life-teal-strong)]">＋ 添加食物</button>
        <section className="life-surface life-section-card"><p className="mb-2 text-sm font-extrabold text-[var(--life-text)]">补充说明</p><AppTextarea rows={3} value={note} onChange={(event) => { setNote(event.target.value); markDirty(); }} placeholder="地点、口味、份量等（可选）" /></section>

        <div className="life-meal-editor-actions sticky bottom-2 z-20 grid gap-2 rounded-[var(--life-radius-card)] border border-[var(--life-border-soft)] bg-[color:rgb(255_253_248/0.94)] p-2.5 shadow-[var(--life-shadow-float)] backdrop-blur-md">
          <AppButton variant="primary" disabled={saving || loading} onClick={() => void save()}>{saving ? "保存中…" : photoSaveFailed ? "重试保存照片" : `保存${title}`}</AppButton>
          <div className={`grid gap-2 ${meal ? "grid-cols-2" : "grid-cols-1"}`}><Link href={`/food?date=${encodeURIComponent(date)}`} className="flex min-h-10 items-center justify-center rounded-full text-sm font-bold text-[var(--life-text-body)]">取消</Link>{meal ? <button type="button" disabled={saving} onClick={() => void removeMeal()} className="rounded-full px-4 py-2.5 text-sm font-bold text-[var(--life-danger)]">删除这条记录</button> : null}</div>
        </div>
      </div>
    </AppPageShell>
  );
}
