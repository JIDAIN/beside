"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MealPhotoEditorCard } from "@/components/life/MealPhotoEditorCard";
import { useLifeIdentity } from "@/components/life/LifeIdentityContext";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppPageShell } from "@/components/ui/AppPageShell";
import { AppSelect } from "@/components/ui/AppSelect";
import { AppTextarea } from "@/components/ui/AppTextarea";
import { invalidateStaleQuery, peekStaleQuery, setStaleQueryData, useStaleQuery } from "@/lib/client/use-stale-query";
import { fetchFavoriteFoods } from "@/lib/nutrition/favorite-food-client";
import type { FavoriteFoodRecord } from "@/lib/nutrition/favorite-food-service";
import {
  isIsoDate,
  localIsoDate,
  parseMealType,
  parseNonNegativeNumber,
  parsePartnerKey,
  parseSnackPeriod,
  summarizeDraftNutrition,
} from "@/lib/nutrition/meal-editor-model";
import {
  createMealRecord,
  deleteMealPhoto,
  deleteMealRecord,
  fetchMeals,
  mealPhotoUrl,
  MealApiError,
  updateMealPhotoDisplay,
  updateMealRecord,
  uploadMealPhoto,
} from "@/lib/nutrition/meal-client";
import type {
  MealItemRecord,
  MealPhotoRotation,
  MealRecord,
  MealType,
  MealWritePayload,
  NutritionPartnerKey,
  SnackPeriod,
} from "@/lib/nutrition/meal-service";

const MEAL_LABELS: Record<MealType, string> = { breakfast: "早餐", lunch: "午餐", dinner: "晚餐", snack: "加餐" };
const SNACK_LABELS: Record<SnackPeriod, string> = { morning: "上午加餐", afternoon: "下午加餐", night: "晚上加餐" };

type MealSlotKey = "breakfast" | "snack:morning" | "lunch" | "snack:afternoon" | "dinner" | "snack:night";
const MEAL_SLOT_OPTIONS: Array<{ key: MealSlotKey; label: string }> = [
  { key: "breakfast", label: "早餐" },
  { key: "snack:morning", label: "上午加餐" },
  { key: "lunch", label: "午餐" },
  { key: "snack:afternoon", label: "下午加餐" },
  { key: "dinner", label: "晚餐" },
  { key: "snack:night", label: "晚上加餐" },
];

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

type ItemEditorState = {
  mode: "new" | "edit";
  item: ItemDraft;
};

function draftKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function emptyItem(): ItemDraft {
  return {
    key: draftKey(),
    foodId: null,
    rawName: "",
    displayName: "",
    portionDescription: "",
    estimatedWeightG: "",
    caloriesKcal: "",
    calorieMinKcal: null,
    calorieMaxKcal: null,
    carbsG: "",
    proteinG: "",
    fatG: "",
  };
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

function fromFavoriteFood(food: FavoriteFoodRecord): ItemDraft {
  return {
    key: draftKey(),
    foodId: null,
    rawName: food.name,
    displayName: food.name,
    portionDescription: food.portionDescription ?? "",
    estimatedWeightG: "",
    caloriesKcal: food.caloriesKcal == null ? "" : String(food.caloriesKcal),
    calorieMinKcal: null,
    calorieMaxKcal: null,
    carbsG: food.carbsG == null ? "" : String(food.carbsG),
    proteinG: food.proteinG == null ? "" : String(food.proteinG),
    fatG: food.fatG == null ? "" : String(food.fatG),
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

function slotKey(mealType: MealType, snackPeriod: SnackPeriod | null): MealSlotKey {
  if (mealType !== "snack") return mealType;
  return `snack:${snackPeriod ?? "afternoon"}` as MealSlotKey;
}

function compactDate(value: string) {
  const [, month, day] = value.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

function itemSummary(item: ItemDraft) {
  const portion = item.portionDescription.trim() || (item.estimatedWeightG ? `约${item.estimatedWeightG}g` : "份量未填");
  return item.caloriesKcal ? `${portion} · ${item.caloriesKcal} kcal` : portion;
}

function displayNutrition(value: number | null, unit: string) {
  return value == null ? "—" : `${Number(value.toFixed(1))}${unit}`;
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
  const [items, setItems] = useState<ItemDraft[]>(cachedMeal?.items.length ? cachedMeal.items.map(fromItem) : []);
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
  const errorRef = useRef<HTMLDivElement>(null);

  const [metaOpen, setMetaOpen] = useState(false);
  const [addChooserOpen, setAddChooserOpen] = useState(false);
  const [itemEditor, setItemEditor] = useState<ItemEditorState | null>(null);
  const [itemError, setItemError] = useState<string | null>(null);
  const [favoritePickerOpen, setFavoritePickerOpen] = useState(false);
  const [favoriteSearch, setFavoriteSearch] = useState("");

  const favoriteKey = mePartnerKey ? `favorite-foods:${mePartnerKey}` : "favorite-foods:pending";
  const favoriteFetcher = useMemo(() => async () => mePartnerKey ? fetchFavoriteFoods(mePartnerKey) : [], [mePartnerKey]);
  const favoriteQuery = useStaleQuery<FavoriteFoodRecord[]>({ key: favoriteKey, fetcher: favoriteFetcher, staleMs: 20_000 });
  const favoriteFoods = favoriteQuery.data ?? [];
  const filteredFavorites = useMemo(() => {
    const needle = favoriteSearch.trim().toLocaleLowerCase("zh-CN");
    if (!needle) return favoriteFoods;
    return favoriteFoods.filter((food) => `${food.name} ${food.portionDescription ?? ""}`.toLocaleLowerCase("zh-CN").includes(needle));
  }, [favoriteFoods, favoriteSearch]);

  function markDirty() {
    dirtyRef.current = true;
    setDirty(true);
  }

  function clearDirty() {
    dirtyRef.current = false;
    setDirty(false);
  }

  function showError(message: string) {
    setError(message);
    window.requestAnimationFrame(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
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
      setItems(found.items.length ? found.items.map(fromItem) : []);
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
  const customPhotoVisible = Boolean(photoPreviewUrl || (!removePhoto && meal?.photoPath));
  const photoSrc = photoPreviewUrl ?? (!removePhoto && meal?.photoPath ? mealPhotoUrl(meal) : "");
  const title = mealType === "snack" ? SNACK_LABELS[snackPeriod ?? "afternoon"] : MEAL_LABELS[mealType];
  const currentSlot = slotKey(mealType, snackPeriod);

  function applyMealSlot(key: string) {
    if (key.startsWith("snack:")) {
      setMealType("snack");
      setSnackPeriod(key.slice("snack:".length) as SnackPeriod);
    } else {
      setMealType(key as MealType);
      setSnackPeriod(null);
    }
    markDirty();
  }

  function markPhotoTransformTouched() {
    photoTransformTouchedRef.current = true;
    setPhotoTransformTouched(true);
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

  function openNewItem() {
    setAddChooserOpen(false);
    setItemError(null);
    setItemEditor({ mode: "new", item: emptyItem() });
  }

  function openEditItem(item: ItemDraft) {
    setItemError(null);
    setItemEditor({ mode: "edit", item: { ...item } });
  }

  function patchItemEditor(patch: Partial<ItemDraft>, affectsEstimate = false) {
    setItemEditor((current) => {
      if (!current) return current;
      const next = { ...current.item, ...patch };
      if (patch.rawName !== undefined) {
        next.foodId = null;
        next.displayName = patch.rawName;
      }
      if (affectsEstimate) {
        next.calorieMinKcal = null;
        next.calorieMaxKcal = null;
      }
      return { ...current, item: next };
    });
    setItemError(null);
  }

  function commitItemEditor() {
    if (!itemEditor) return;
    const rawName = itemEditor.item.rawName.trim();
    if (!rawName) { setItemError("请填写名称"); return; }
    const calories = parseNonNegativeNumber(itemEditor.item.caloriesKcal);
    const carbs = parseNonNegativeNumber(itemEditor.item.carbsG);
    const protein = parseNonNegativeNumber(itemEditor.item.proteinG);
    const fat = parseNonNegativeNumber(itemEditor.item.fatG);
    if ([calories, carbs, protein, fat].some((value) => Number.isNaN(value))) {
      setItemError("营养数值只能填写 0 或更大的数字");
      return;
    }
    if (calories != null && !Number.isInteger(calories)) {
      setItemError("热量需要填写整数 kcal");
      return;
    }
    const saved = {
      ...itemEditor.item,
      rawName,
      displayName: itemEditor.item.displayName.trim() || rawName,
      portionDescription: itemEditor.item.portionDescription.trim(),
    };
    setItems((current) => itemEditor.mode === "new"
      ? [...current, saved]
      : current.map((item) => item.key === saved.key ? saved : item));
    setCalorieDataTouched(true);
    markDirty();
    setItemEditor(null);
  }

  function deleteEditedItem() {
    if (!itemEditor || itemEditor.mode !== "edit") return;
    setItems((current) => current.filter((item) => item.key !== itemEditor.item.key));
    setCalorieDataTouched(true);
    markDirty();
    setItemEditor(null);
  }

  function addFavoriteToMeal(food: FavoriteFoodRecord) {
    setItems((current) => [...current, fromFavoriteFood(food)]);
    setCalorieDataTouched(true);
    markDirty();
    setFavoritePickerOpen(false);
    setFavoriteSearch("");
  }

  async function save() {
    if (!canEdit || !partnerKey) return;
    setError(null);
    if (!items.length) { showError("请至少添加一种食物"); return; }
    const unnamed = items.find((item) => !item.rawName.trim());
    if (unnamed) { showError("请填写每一种食物的名称"); return; }
    const parsedItems: MealWritePayload["items"] = [];
    for (const item of items) {
      const weight = parseNonNegativeNumber(item.estimatedWeightG);
      const calories = parseNonNegativeNumber(item.caloriesKcal);
      const carbs = parseNonNegativeNumber(item.carbsG);
      const protein = parseNonNegativeNumber(item.proteinG);
      const fat = parseNonNegativeNumber(item.fatG);
      if ([weight, calories, carbs, protein, fat].some((value) => Number.isNaN(value))) { showError("重量和营养数值只能填写 0 或更大的数字"); return; }
      if (calories != null && !Number.isInteger(calories)) { showError("热量需要填写整数 kcal"); return; }
      parsedItems.push({
        foodId: item.foodId,
        rawName: item.rawName.trim(),
        displayName: item.displayName.trim() || item.rawName.trim(),
        portionDescription: item.portionDescription.trim() || null,
        estimatedWeightG: weight,
        caloriesKcal: calories,
        calorieMinKcal: item.calorieMinKcal,
        calorieMaxKcal: item.calorieMaxKcal,
        proteinG: protein,
        carbsG: carbs,
        fatG: fat,
      });
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
  if (invalidRequest) return <AppPageShell title="这个饮食链接不完整"><section className="life-surface life-section-card"><Link href="/food" className="inline-flex rounded-full bg-[var(--life-teal)] px-4 py-2.5 text-sm font-black text-white">返回饮食</Link></section></AppPageShell>;
  if (!canEdit) return <AppPageShell title="不能编辑 Ta 的饮食"><section className="life-surface life-section-card"><Link href="/food" className="inline-flex rounded-full bg-[var(--life-teal)] px-4 py-2.5 text-sm font-black text-white">返回饮食</Link></section></AppPageShell>;
  if (loading) return <AppPageShell title="编辑饮食"><section className="life-surface life-section-card min-h-40" aria-label="正在读取餐食" /></AppPageShell>;

  return <>
    <AppPageShell variant="meal-editor" title={meal ? `编辑${title}` : `添加${title}`}>
      <div className="life-meal-editor grid gap-3 pb-3">
        <button type="button" onClick={() => setMetaOpen(true)} className="life-meal-editor-meta life-surface flex min-h-12 items-center justify-between gap-3 rounded-[var(--life-radius-card)] px-4 py-3 text-left">
          <span className="min-w-0 truncate text-sm font-extrabold text-[var(--life-text)]">{compactDate(date)} · {time || "--:--"}</span>
          <span className="shrink-0 text-sm font-extrabold text-[var(--life-teal-strong)]">{title} ›</span>
        </button>

        {error ? <div ref={errorRef} role="alert" aria-live="assertive" className="rounded-[var(--life-radius-control)] bg-[color:color-mix(in_srgb,var(--life-coral)_16%,white)] px-3 py-2.5 text-sm font-bold text-[var(--life-danger)]">{error}</div> : null}

        <MealPhotoEditorCard
          visible={customPhotoVisible}
          src={photoSrc}
          rotationDegrees={photoRotationDegrees}
          scale={photoScale}
          disabled={saving}
          onChoosePhoto={choosePhoto}
          onClearPhoto={clearPhoto}
          onRotatePhoto={rotatePhoto}
          onResizePhoto={resizePhoto}
        />

        <section className="life-surface life-section-card life-meal-nutrition-card">
          <div className="mb-2 flex items-center justify-between gap-3"><p className="text-sm font-extrabold text-[var(--life-text)]">营养合计</p><strong className="text-base tabular-nums text-[var(--life-text)]">{caloriePreview == null ? "—" : `${Math.round(caloriePreview)} kcal`}</strong></div>
          <div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-[var(--life-surface-soft)] px-2 py-2"><span className="block text-[10px] font-bold text-[var(--life-text-muted)]">碳水</span><strong className="mt-0.5 block text-xs text-[var(--life-text)]">{displayNutrition(nutritionPreview.carbsG.value, "g")}</strong></div><div className="rounded-xl bg-[var(--life-surface-soft)] px-2 py-2"><span className="block text-[10px] font-bold text-[var(--life-text-muted)]">蛋白质</span><strong className="mt-0.5 block text-xs text-[var(--life-text)]">{displayNutrition(nutritionPreview.proteinG.value, "g")}</strong></div><div className="rounded-xl bg-[var(--life-surface-soft)] px-2 py-2"><span className="block text-[10px] font-bold text-[var(--life-text-muted)]">脂肪</span><strong className="mt-0.5 block text-xs text-[var(--life-text)]">{displayNutrition(nutritionPreview.fatG.value, "g")}</strong></div></div>
        </section>

        <section className="life-meal-food-list life-surface overflow-hidden rounded-[var(--life-radius-card)]">
          <div className="px-4 pb-2 pt-3"><p className="text-sm font-extrabold text-[var(--life-text)]">食物</p></div>
          {items.map((item) => <button key={item.key} type="button" onClick={() => openEditItem(item)} className="flex w-full items-center gap-3 border-t border-[var(--life-border-soft)] px-4 py-3 text-left"><span className="min-w-0 flex-1"><strong className="block truncate text-sm font-extrabold text-[var(--life-text)]">{item.displayName || item.rawName}</strong><span className="mt-0.5 block truncate text-xs text-[var(--life-text-muted)]">{itemSummary(item)}</span></span><span className="text-xl text-[var(--life-text-muted)]">›</span></button>)}
          <button type="button" onClick={() => setAddChooserOpen(true)} className="flex w-full items-center border-t border-[var(--life-border-soft)] px-4 py-3 text-sm font-extrabold text-[var(--life-teal-strong)]">＋ 添加食物</button>
        </section>

        <section className="life-meal-note-card life-surface life-section-card"><p className="mb-2 text-sm font-extrabold text-[var(--life-text)]">备注</p><AppTextarea rows={2} value={note} onChange={(event) => { setNote(event.target.value); markDirty(); }} /></section>

        <div className="life-meal-editor-actions sticky bottom-2 z-20 grid gap-2 rounded-[var(--life-radius-card)] border border-[var(--life-border-soft)] bg-[color:rgb(255_253_248/0.94)] p-2.5 shadow-[var(--life-shadow-float)] backdrop-blur-md">
          <AppButton variant="primary" disabled={saving || loading} onClick={() => void save()}>{saving ? "保存中…" : photoSaveFailed ? "重试保存照片" : "保存"}</AppButton>
          <div className={`grid gap-2 ${meal ? "grid-cols-2" : "grid-cols-1"}`}><Link href={`/food?date=${encodeURIComponent(date)}`} className="flex min-h-10 items-center justify-center rounded-full text-sm font-bold text-[var(--life-text-body)]">取消</Link>{meal ? <button type="button" disabled={saving} onClick={() => void removeMeal()} className="rounded-full px-4 py-2.5 text-sm font-bold text-[var(--life-danger)]">删除这餐</button> : null}</div>
        </div>
      </div>
    </AppPageShell>

    {metaOpen ? <div className="life-sheet-backdrop" role="presentation" onMouseDown={() => setMetaOpen(false)}><section className="life-mood-sheet life-food-form-sheet" role="dialog" aria-modal="true" aria-labelledby="meal-meta-title" onMouseDown={(event) => event.stopPropagation()}><div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[var(--life-border)]" /><h2 id="meal-meta-title" className="text-center text-lg font-black text-[var(--life-text)]">日期与餐次</h2><div className="mt-4 grid gap-3"><label className="grid gap-1 text-xs font-bold text-[var(--life-text-body)]">日期<AppInput type="date" value={date} onChange={(event) => { setDate(event.target.value); markDirty(); }} /></label><label className="grid gap-1 text-xs font-bold text-[var(--life-text-body)]">时间<AppInput type="time" value={time} onChange={(event) => { setTime(event.target.value); markDirty(); }} /></label><label className="grid gap-1 text-xs font-bold text-[var(--life-text-body)]">餐次<AppSelect value={currentSlot} options={MEAL_SLOT_OPTIONS} onChange={applyMealSlot} /></label></div><AppButton variant="primary" className="mt-4 w-full" onClick={() => setMetaOpen(false)}>完成</AppButton></section></div> : null}

    {addChooserOpen ? <div className="life-sheet-backdrop" role="presentation" onMouseDown={() => setAddChooserOpen(false)}><section className="life-mood-sheet" role="dialog" aria-modal="true" aria-labelledby="add-food-title" onMouseDown={(event) => event.stopPropagation()}><div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[var(--life-border)]" /><h2 id="add-food-title" className="text-center text-lg font-black text-[var(--life-text)]">添加食物</h2><div className="mt-4 grid gap-2"><button type="button" onClick={openNewItem} className="rounded-[var(--life-radius-control)] bg-[var(--life-surface-soft)] px-4 py-3 text-left text-sm font-extrabold text-[var(--life-text)]">新的食物 <span className="float-right text-[var(--life-text-muted)]">›</span></button><button type="button" onClick={() => { setAddChooserOpen(false); setFavoritePickerOpen(true); }} className="rounded-[var(--life-radius-control)] bg-[var(--life-surface-soft)] px-4 py-3 text-left text-sm font-extrabold text-[var(--life-text)]">常吃食物 <span className="float-right text-[var(--life-text-muted)]">›</span></button></div><button type="button" onClick={() => setAddChooserOpen(false)} className="mt-4 w-full rounded-full px-4 py-3 text-sm font-bold text-[var(--life-text-body)]">取消</button></section></div> : null}

    {itemEditor ? <div className="life-sheet-backdrop" role="presentation" onMouseDown={() => setItemEditor(null)}><section className="life-mood-sheet life-food-form-sheet" role="dialog" aria-modal="true" aria-labelledby="food-editor-title" onMouseDown={(event) => event.stopPropagation()}><div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[var(--life-border)]" /><h2 id="food-editor-title" className="text-center text-lg font-black text-[var(--life-text)]">{itemEditor.mode === "new" ? "新增食物" : "编辑食物"}</h2><div className="mt-4 grid gap-3"><label className="grid gap-1 text-xs font-bold text-[var(--life-text-body)]">名称<AppInput value={itemEditor.item.rawName} onChange={(event) => patchItemEditor({ rawName: event.target.value }, true)} /></label><label className="grid gap-1 text-xs font-bold text-[var(--life-text-body)]">份量<AppInput value={itemEditor.item.portionDescription} onChange={(event) => patchItemEditor({ portionDescription: event.target.value }, true)} /></label><label className="grid gap-1 text-xs font-bold text-[var(--life-text-body)]">热量<AppInput inputMode="numeric" value={itemEditor.item.caloriesKcal} onChange={(event) => patchItemEditor({ caloriesKcal: event.target.value }, true)} /></label><details className="rounded-xl bg-[var(--life-surface-soft)] px-3 py-2"><summary className="cursor-pointer text-xs font-extrabold text-[var(--life-teal-strong)]">三大营养素</summary><div className="mt-2.5 grid grid-cols-3 gap-2"><label className="grid gap-1 text-[11px] font-bold text-[var(--life-text-body)]">碳水（g）<AppInput inputMode="decimal" value={itemEditor.item.carbsG} onChange={(event) => patchItemEditor({ carbsG: event.target.value })} /></label><label className="grid gap-1 text-[11px] font-bold text-[var(--life-text-body)]">蛋白质（g）<AppInput inputMode="decimal" value={itemEditor.item.proteinG} onChange={(event) => patchItemEditor({ proteinG: event.target.value })} /></label><label className="grid gap-1 text-[11px] font-bold text-[var(--life-text-body)]">脂肪（g）<AppInput inputMode="decimal" value={itemEditor.item.fatG} onChange={(event) => patchItemEditor({ fatG: event.target.value })} /></label></div></details>{itemError ? <p role="alert" className="text-sm font-bold text-[var(--life-danger)]">{itemError}</p> : null}</div>{itemEditor.mode === "edit" ? <button type="button" onClick={deleteEditedItem} className="mt-4 text-sm font-bold text-[var(--life-danger)]">删除</button> : null}<div className="mt-4 grid grid-cols-2 gap-2"><AppButton variant="secondary" onClick={() => setItemEditor(null)}>取消</AppButton><AppButton variant="primary" onClick={commitItemEditor}>{itemEditor.mode === "new" ? "添加" : "保存"}</AppButton></div></section></div> : null}

    {favoritePickerOpen ? <div className="life-sheet-backdrop" role="presentation" onMouseDown={() => setFavoritePickerOpen(false)}><section className="life-mood-sheet life-favorite-food-picker-sheet" role="dialog" aria-modal="true" aria-labelledby="favorite-food-picker-title" onMouseDown={(event) => event.stopPropagation()}><div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[var(--life-border)]" /><h2 id="favorite-food-picker-title" className="text-center text-lg font-black text-[var(--life-text)]">选择常吃食物</h2><div className="mt-4"><AppInput aria-label="搜索常吃食物" placeholder="搜索常吃食物" value={favoriteSearch} onChange={(event) => setFavoriteSearch(event.target.value)} /></div><div className="mt-3 overflow-hidden rounded-[var(--life-radius-control)] bg-[var(--life-surface-soft)]">{favoriteQuery.loading && favoriteQuery.data === undefined ? <div className="min-h-20" aria-label="正在读取常吃食物" /> : null}{favoriteQuery.error ? <p className="px-3 py-4 text-sm font-bold text-[var(--life-danger)]">{favoriteQuery.error.message}</p> : null}{!favoriteQuery.loading && !favoriteQuery.error && filteredFavorites.length === 0 ? <p className="px-3 py-5 text-center text-sm font-bold text-[var(--life-text-muted)]">没有找到常吃食物</p> : null}{filteredFavorites.map((food) => <button key={food.id} type="button" onClick={() => addFavoriteToMeal(food)} className="flex w-full items-center gap-3 border-b border-[var(--life-border-soft)] px-3 py-3 text-left last:border-b-0"><span className="min-w-0 flex-1"><strong className="block truncate text-sm font-extrabold text-[var(--life-text)]">{food.name}</strong><span className="mt-0.5 block truncate text-xs text-[var(--life-text-muted)]">{food.portionDescription || "份量未填"}{food.caloriesKcal == null ? "" : ` · ${food.caloriesKcal} kcal`}</span></span><span className="text-xl font-bold text-[var(--life-teal-strong)]">＋</span></button>)}</div><button type="button" onClick={() => setFavoritePickerOpen(false)} className="mt-4 w-full rounded-full px-4 py-3 text-sm font-bold text-[var(--life-text-body)]">取消</button></section></div> : null}
  </>;
}