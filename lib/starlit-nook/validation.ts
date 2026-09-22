import type {
  StarlitNookActivityDetailWrite,
  StarlitNookBaseItemWrite,
  StarlitNookFoodDetailWrite,
  StarlitNookFoodKind,
  StarlitNookFoodMode,
  StarlitNookItemType,
  StarlitNookItemWrite,
  StarlitNookParticipantScope,
  StarlitNookPlaceDetailWrite,
  StarlitNookPlaceKind,
  StarlitNookTripWrite,
  StarlitNookWatchDetailWrite,
  StarlitNookWatchMediaKind,
  StarlitNookWatchStatus,
} from "./types";

export type StarlitNookParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };

const ITEM_TYPES = new Set<StarlitNookItemType>(["watch", "place", "food", "activity"]);
const PARTICIPANT_SCOPES = new Set<StarlitNookParticipantScope>(["fish", "cat", "both"]);
const WATCH_MEDIA_KINDS = new Set<StarlitNookWatchMediaKind>(["movie", "series", "anime", "variety", "documentary"]);
const WATCH_STATUSES = new Set<StarlitNookWatchStatus>(["watching", "completed", "dropped"]);
const PLACE_KINDS = new Set<StarlitNookPlaceKind>(["city", "attraction", "restaurant", "cafe", "park", "venue", "hotel", "mall", "other"]);
const FOOD_MODES = new Set<StarlitNookFoodMode>(["dine_out", "homemade"]);
const FOOD_KINDS = new Set<StarlitNookFoodKind>(["meal", "dish", "dessert", "drink", "snack", "other"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isStarlitNookUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function isStarlitNookIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function nullableDate(value: unknown, label: string): StarlitNookParseResult<string | null> {
  if (value == null || value === "") return { ok: true, value: null };
  if (!isStarlitNookIsoDate(value)) return { ok: false, reason: label + " 必须是 YYYY-MM-DD" };
  return { ok: true, value };
}

function nullableTimestamp(value: unknown): StarlitNookParseResult<string | null> {
  if (value == null || value === "") return { ok: true, value: null };
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    return { ok: false, reason: "occurredAt 必须是有效时间" };
  }
  return { ok: true, value: new Date(value).toISOString() };
}

function text(value: unknown, label: string, max: number, nullable = false): StarlitNookParseResult<string | null> {
  if (value == null || value === "") {
    return nullable ? { ok: true, value: null } : { ok: false, reason: label + " 不能为空" };
  }
  if (typeof value !== "string") return { ok: false, reason: label + " 必须是文字" };
  const normalized = value.trim();
  if (!normalized) return nullable ? { ok: true, value: null } : { ok: false, reason: label + " 不能为空" };
  if (normalized.length > max) return { ok: false, reason: label + " 不能超过 " + max + " 个字符" };
  return { ok: true, value: normalized };
}

function rating(value: unknown, label: string): StarlitNookParseResult<number | null> {
  if (value == null || value === "") return { ok: true, value: null };
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 5) {
    return { ok: false, reason: label + " 必须是 1 到 5 的整数" };
  }
  return { ok: true, value: Number(value) };
}

function parseBase(v: Record<string, unknown>): StarlitNookParseResult<StarlitNookBaseItemWrite> {
  const title = text(v.title, "标题", 200);
  if (!title.ok || title.value == null) return { ok: false, reason: title.ok ? "标题不能为空" : title.reason };

  const occurredOn = nullableDate(v.occurredOn, "occurredOn");
  if (!occurredOn.ok) return occurredOn;
  const occurredAt = nullableTimestamp(v.occurredAt);
  if (!occurredAt.ok) return occurredAt;

  const participantScope = (v.participantScope ?? "both") as StarlitNookParticipantScope;
  if (!PARTICIPANT_SCOPES.has(participantScope)) return { ok: false, reason: "participantScope 只能是 fish、cat 或 both" };

  const fishRating = rating(v.fishRating, "fishRating");
  if (!fishRating.ok) return fishRating;
  const catRating = rating(v.catRating, "catRating");
  if (!catRating.ok) return catRating;
  const note = text(v.note, "note", 2000, true);
  if (!note.ok) return note;

  return {
    ok: true,
    value: {
      title: title.value,
      occurredOn: occurredOn.value,
      occurredAt: occurredAt.value,
      participantScope,
      fishRating: fishRating.value,
      catRating: catRating.value,
      note: note.value,
    },
  };
}

function parseWatchDetail(value: unknown): StarlitNookParseResult<StarlitNookWatchDetailWrite> {
  if (!isRecord(value)) return { ok: false, reason: "星影 detail 格式不正确" };
  const mediaKind = value.mediaKind as StarlitNookWatchMediaKind;
  const watchStatus = value.watchStatus as StarlitNookWatchStatus;
  if (!WATCH_MEDIA_KINDS.has(mediaKind)) return { ok: false, reason: "mediaKind 不支持" };
  if (!WATCH_STATUSES.has(watchStatus)) return { ok: false, reason: "watchStatus 不支持" };
  const startedOn = nullableDate(value.startedOn, "startedOn");
  if (!startedOn.ok) return startedOn;
  const finishedOn = nullableDate(value.finishedOn, "finishedOn");
  if (!finishedOn.ok) return finishedOn;
  if (startedOn.value && finishedOn.value && finishedOn.value < startedOn.value) {
    return { ok: false, reason: "finishedOn 不能早于 startedOn" };
  }
  return { ok: true, value: { mediaKind, watchStatus, startedOn: startedOn.value, finishedOn: finishedOn.value } };
}

function parsePlaceDetail(value: unknown): StarlitNookParseResult<StarlitNookPlaceDetailWrite> {
  if (!isRecord(value)) return { ok: false, reason: "足迹 detail 格式不正确" };
  const placeKind = value.placeKind as StarlitNookPlaceKind;
  if (!PLACE_KINDS.has(placeKind)) return { ok: false, reason: "placeKind 不支持" };
  const address = text(value.address, "address", 500, true);
  if (!address.ok) return address;
  const cityName = text(value.cityName, "cityName", 120, true);
  if (!cityName.ok) return cityName;
  const latitude = value.latitude == null || value.latitude === "" ? null : Number(value.latitude);
  const longitude = value.longitude == null || value.longitude === "" ? null : Number(value.longitude);
  if (latitude != null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) return { ok: false, reason: "latitude 必须在 -90 到 90 之间" };
  if (longitude != null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) return { ok: false, reason: "longitude 必须在 -180 到 180 之间" };
  return { ok: true, value: { placeKind, address: address.value, cityName: cityName.value, latitude, longitude } };
}

function parseFoodDetail(value: unknown): StarlitNookParseResult<StarlitNookFoodDetailWrite> {
  if (!isRecord(value)) return { ok: false, reason: "烟火 detail 格式不正确" };
  const foodMode = value.foodMode as StarlitNookFoodMode;
  if (!FOOD_MODES.has(foodMode)) return { ok: false, reason: "foodMode 不支持" };
  let foodKind: StarlitNookFoodKind | null = null;
  if (value.foodKind != null && value.foodKind !== "") {
    if (!FOOD_KINDS.has(value.foodKind as StarlitNookFoodKind)) return { ok: false, reason: "foodKind 不支持" };
    foodKind = value.foodKind as StarlitNookFoodKind;
  }
  const linkedPlaceItemId = value.linkedPlaceItemId == null || value.linkedPlaceItemId === "" ? null : value.linkedPlaceItemId;
  if (linkedPlaceItemId != null && !isStarlitNookUuid(linkedPlaceItemId)) return { ok: false, reason: "linkedPlaceItemId 必须是有效 UUID" };
  const recipeRef = text(value.recipeRef, "recipeRef", 1000, true);
  if (!recipeRef.ok) return recipeRef;
  return { ok: true, value: { foodMode, foodKind, linkedPlaceItemId, recipeRef: recipeRef.value } };
}

function parseActivityDetail(value: unknown): StarlitNookParseResult<StarlitNookActivityDetailWrite> {
  if (!isRecord(value)) return { ok: false, reason: "拾趣 detail 格式不正确" };
  const activityKind = text(value.activityKind, "activityKind", 80);
  if (!activityKind.ok || activityKind.value == null) return { ok: false, reason: activityKind.ok ? "activityKind 不能为空" : activityKind.reason };
  const durationMinutes = value.durationMinutes == null || value.durationMinutes === "" ? null : Number(value.durationMinutes);
  if (durationMinutes != null && (!Number.isInteger(durationMinutes) || durationMinutes <= 0 || durationMinutes > 10080)) {
    return { ok: false, reason: "durationMinutes 必须是 1 到 10080 的整数" };
  }
  const linkedPlaceItemId = value.linkedPlaceItemId == null || value.linkedPlaceItemId === "" ? null : value.linkedPlaceItemId;
  if (linkedPlaceItemId != null && !isStarlitNookUuid(linkedPlaceItemId)) return { ok: false, reason: "linkedPlaceItemId 必须是有效 UUID" };
  return { ok: true, value: { activityKind: activityKind.value, durationMinutes, linkedPlaceItemId } };
}

export function parseStarlitNookItemWrite(value: unknown): StarlitNookParseResult<StarlitNookItemWrite> {
  if (!isRecord(value)) return { ok: false, reason: "回忆记录格式不正确" };
  const itemType = value.itemType as StarlitNookItemType;
  if (!ITEM_TYPES.has(itemType)) return { ok: false, reason: "itemType 不支持" };
  const base = parseBase(value);
  if (!base.ok) return base;

  if (itemType === "watch") {
    const detail = parseWatchDetail(value.detail);
    return detail.ok ? { ok: true, value: { ...base.value, itemType, detail: detail.value } } : detail;
  }
  if (itemType === "place") {
    const detail = parsePlaceDetail(value.detail);
    return detail.ok ? { ok: true, value: { ...base.value, itemType, detail: detail.value } } : detail;
  }
  if (itemType === "food") {
    const detail = parseFoodDetail(value.detail);
    return detail.ok ? { ok: true, value: { ...base.value, itemType, detail: detail.value } } : detail;
  }
  const detail = parseActivityDetail(value.detail);
  return detail.ok ? { ok: true, value: { ...base.value, itemType, detail: detail.value } } : detail;
}

export function parseStarlitNookTripWrite(value: unknown): StarlitNookParseResult<StarlitNookTripWrite> {
  if (!isRecord(value)) return { ok: false, reason: "旅行记录格式不正确" };
  const title = text(value.title, "标题", 200);
  if (!title.ok || title.value == null) return { ok: false, reason: title.ok ? "标题不能为空" : title.reason };
  const startDate = nullableDate(value.startDate, "startDate");
  if (!startDate.ok) return startDate;
  const endDate = nullableDate(value.endDate, "endDate");
  if (!endDate.ok) return endDate;
  if (startDate.value && endDate.value && endDate.value < startDate.value) return { ok: false, reason: "endDate 不能早于 startDate" };
  const regionText = text(value.regionText, "regionText", 300, true);
  if (!regionText.ok) return regionText;
  const note = text(value.note, "note", 3000, true);
  if (!note.ok) return note;
  const participantScope = (value.participantScope ?? "both") as StarlitNookParticipantScope;
  if (!PARTICIPANT_SCOPES.has(participantScope)) return { ok: false, reason: "participantScope 只能是 fish、cat 或 both" };
  return { ok: true, value: { title: title.value, startDate: startDate.value, endDate: endDate.value, regionText: regionText.value, note: note.value, participantScope } };
}
