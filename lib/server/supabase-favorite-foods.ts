import type {
  FavoriteFoodRecord,
  FavoriteFoodWritePayload,
} from "@/lib/nutrition/favorite-food-service";
import type { NutritionPartnerKey } from "@/lib/nutrition/meal-service";
import { coupleSpaceSlug } from "./supabase-nutrition";

const DEFAULT_SUPABASE_URL = "https://bfhntnzngozdqsmgfvjk.supabase.co";

type DbFavoriteFood = {
  id: string;
  partner_key: NutritionPartnerKey;
  name: string;
  portion_description: string | null;
  calories_kcal: number | null;
  carbs_g: number | string | null;
  protein_g: number | string | null;
  fat_g: number | string | null;
  created_at: string;
  updated_at: string;
};

type ErrorBody = { message?: string; details?: string };

export class FavoriteFoodCloudError extends Error {
  constructor(
    message: string,
    public readonly errorCode: "SERVER_CONFIG" | "FAVORITE_FOOD_READ_FAILED" | "FAVORITE_FOOD_WRITE_FAILED" | "CLOUD_NETWORK_ERROR",
  ) {
    super(message);
  }
}

function env(name: string) {
  return process.env[name]?.trim() ?? "";
}

function supabaseUrl() {
  return env("SUPABASE_URL") || DEFAULT_SUPABASE_URL;
}

function secretKey() {
  return env("SUPABASE_SECRET_KEY") || env("SUPABASE_SERVICE_ROLE_KEY");
}

function headers(extra?: HeadersInit) {
  const secret = secretKey();
  if (!secret) throw new FavoriteFoodCloudError("Supabase 服务端环境变量未配置完整", "SERVER_CONFIG");
  return { apikey: secret, Authorization: `Bearer ${secret}`, ...extra };
}

function numberOrNull(value: number | string | null) {
  if (value === null) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toRecord(row: DbFavoriteFood): FavoriteFoodRecord {
  return {
    id: row.id,
    partnerKey: row.partner_key,
    name: row.name,
    portionDescription: row.portion_description,
    caloriesKcal: row.calories_kcal,
    carbsG: numberOrNull(row.carbs_g),
    proteinG: numberOrNull(row.protein_g),
    fatG: numberOrNull(row.fat_g),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchJson<T>(url: string, init: RequestInit, operation: "read" | "write") {
  let response: Response;
  try {
    response = await fetch(url, { ...init, cache: "no-store" });
  } catch {
    throw new FavoriteFoodCloudError("连接 Supabase 失败", "CLOUD_NETWORK_ERROR");
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ErrorBody | null;
    throw new FavoriteFoodCloudError(
      body?.message ?? (operation === "read" ? "读取常吃食物失败" : "保存常吃食物失败"),
      operation === "read" ? "FAVORITE_FOOD_READ_FAILED" : "FAVORITE_FOOD_WRITE_FAILED",
    );
  }
  if (response.status === 204) return null as T;
  return response.json() as Promise<T>;
}

let cachedSpace: { slug: string; id: string } | null = null;
async function spaceId() {
  const slug = coupleSpaceSlug();
  if (cachedSpace?.slug === slug) return cachedSpace.id;
  const url = `${supabaseUrl()}/rest/v1/couple_spaces?slug=eq.${encodeURIComponent(slug)}&archived_at=is.null&select=id&limit=1`;
  const rows = await fetchJson<Array<{ id: string }>>(url, { headers: headers() }, "read");
  if (!rows[0]?.id) throw new FavoriteFoodCloudError("没有找到伴岛空间", "FAVORITE_FOOD_READ_FAILED");
  cachedSpace = { slug, id: rows[0].id };
  return rows[0].id;
}

const SELECT_FIELDS = "id,partner_key,name,portion_description,calories_kcal,carbs_g,protein_g,fat_g,created_at,updated_at";

export async function listFavoriteFoods(partnerKey: NutritionPartnerKey) {
  const space = await spaceId();
  const url = `${supabaseUrl()}/rest/v1/favorite_food_templates?couple_space_id=eq.${encodeURIComponent(space)}&partner_key=eq.${partnerKey}&select=${SELECT_FIELDS}&order=updated_at.desc,created_at.desc`;
  const rows = await fetchJson<DbFavoriteFood[]>(url, { headers: headers() }, "read");
  return rows.map(toRecord);
}

export async function getFavoriteFoodOwner(id: string): Promise<NutritionPartnerKey | null> {
  const space = await spaceId();
  const url = `${supabaseUrl()}/rest/v1/favorite_food_templates?id=eq.${encodeURIComponent(id)}&couple_space_id=eq.${encodeURIComponent(space)}&select=partner_key&limit=1`;
  const rows = await fetchJson<Array<{ partner_key?: string }>>(url, { headers: headers() }, "read");
  const owner = rows[0]?.partner_key;
  return owner === "fish" || owner === "cat" ? owner : null;
}

function dbPayload(space: string, payload: FavoriteFoodWritePayload) {
  return {
    couple_space_id: space,
    partner_key: payload.partnerKey,
    name: payload.name,
    portion_description: payload.portionDescription,
    calories_kcal: payload.caloriesKcal,
    carbs_g: payload.carbsG,
    protein_g: payload.proteinG,
    fat_g: payload.fatG,
  };
}

export async function createFavoriteFood(payload: FavoriteFoodWritePayload) {
  const space = await spaceId();
  const rows = await fetchJson<DbFavoriteFood[]>(
    `${supabaseUrl()}/rest/v1/favorite_food_templates?select=${SELECT_FIELDS}`,
    {
      method: "POST",
      headers: headers({ "Content-Type": "application/json", Prefer: "return=representation" }),
      body: JSON.stringify(dbPayload(space, payload)),
    },
    "write",
  );
  if (!rows[0]) throw new FavoriteFoodCloudError("常吃食物没有保存成功", "FAVORITE_FOOD_WRITE_FAILED");
  return toRecord(rows[0]);
}

export async function updateFavoriteFood(id: string, payload: FavoriteFoodWritePayload) {
  const space = await spaceId();
  const rows = await fetchJson<DbFavoriteFood[]>(
    `${supabaseUrl()}/rest/v1/favorite_food_templates?id=eq.${encodeURIComponent(id)}&couple_space_id=eq.${encodeURIComponent(space)}&partner_key=eq.${payload.partnerKey}&select=${SELECT_FIELDS}`,
    {
      method: "PATCH",
      headers: headers({ "Content-Type": "application/json", Prefer: "return=representation" }),
      body: JSON.stringify({
        name: payload.name,
        portion_description: payload.portionDescription,
        calories_kcal: payload.caloriesKcal,
        carbs_g: payload.carbsG,
        protein_g: payload.proteinG,
        fat_g: payload.fatG,
      }),
    },
    "write",
  );
  if (!rows[0]) throw new FavoriteFoodCloudError("常吃食物不存在", "FAVORITE_FOOD_WRITE_FAILED");
  return toRecord(rows[0]);
}

export async function deleteFavoriteFood(id: string, partnerKey: NutritionPartnerKey) {
  const space = await spaceId();
  await fetchJson<null>(
    `${supabaseUrl()}/rest/v1/favorite_food_templates?id=eq.${encodeURIComponent(id)}&couple_space_id=eq.${encodeURIComponent(space)}&partner_key=eq.${partnerKey}`,
    { method: "DELETE", headers: headers({ Prefer: "return=minimal" }) },
    "write",
  );
}
