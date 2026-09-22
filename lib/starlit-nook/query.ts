import type { StarlitNookItemQuery, StarlitNookItemType } from "./types";
import { isStarlitNookIsoDate, isStarlitNookUuid } from "./validation";

type ParseResult<T> = { ok: true; value: T } | { ok: false; reason: string };

const ITEM_TYPES = new Set<StarlitNookItemType>(["watch", "place", "food", "activity"]);

function optionalTrimmed(value: unknown, max: number) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.length <= max ? normalized : undefined;
}

export function parseStarlitNookItemQuery(value: unknown): ParseResult<StarlitNookItemQuery> {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  let itemType: StarlitNookItemType | undefined;
  if (raw.itemType != null && raw.itemType !== "") {
    if (!ITEM_TYPES.has(raw.itemType as StarlitNookItemType)) {
      return { ok: false, reason: "itemType 不支持" };
    }
    itemType = raw.itemType as StarlitNookItemType;
  }

  for (const key of ["date", "dateFrom", "dateTo"] as const) {
    if (raw[key] != null && raw[key] !== "" && !isStarlitNookIsoDate(raw[key])) {
      return { ok: false, reason: key + " 必须是 YYYY-MM-DD" };
    }
  }

  const date = typeof raw.date === "string" && raw.date ? raw.date : undefined;
  const dateFrom = typeof raw.dateFrom === "string" && raw.dateFrom ? raw.dateFrom : undefined;
  const dateTo = typeof raw.dateTo === "string" && raw.dateTo ? raw.dateTo : undefined;
  if (dateFrom && dateTo && dateTo < dateFrom) {
    return { ok: false, reason: "dateTo 不能早于 dateFrom" };
  }

  const city = optionalTrimmed(raw.city, 120);
  if (city === undefined) return { ok: false, reason: "city 不能超过 120 个字符" };

  const activityKind = optionalTrimmed(raw.activityKind, 80);
  if (activityKind === undefined) return { ok: false, reason: "activityKind 不能超过 80 个字符" };

  let tripId: string | undefined;
  if (raw.tripId != null && raw.tripId !== "") {
    if (!isStarlitNookUuid(raw.tripId)) {
      return { ok: false, reason: "tripId 必须是有效 UUID" };
    }
    tripId = raw.tripId;
  }

  const requestedLimit = raw.limit == null || raw.limit === "" ? 100 : Number(raw.limit);
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 500) {
    return { ok: false, reason: "limit 必须是 1 到 500 的整数" };
  }

  return {
    ok: true,
    value: {
      ...(itemType ? { itemType } : {}),
      ...(date ? { date } : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
      ...(city ? { city } : {}),
      ...(activityKind ? { activityKind } : {}),
      ...(tripId ? { tripId } : {}),
      limit: requestedLimit,
    },
  };
}
