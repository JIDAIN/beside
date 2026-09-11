import { NextResponse } from "next/server";
import { parseFavoriteFoodWritePayload } from "../../../lib/nutrition/favorite-food-service";
import type { NutritionPartnerKey } from "../../../lib/nutrition/meal-service";
import { authorizePersonalPartnerWrite } from "../../../lib/server/life-api";
import {
  createFavoriteFood,
  FavoriteFoodCloudError,
  listFavoriteFoods,
} from "../../../lib/server/supabase-favorite-foods";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number, errorCode: string) {
  return NextResponse.json({ ok: false, error: message, errorCode }, { status });
}

function cloudError(error: FavoriteFoodCloudError) {
  return jsonError(error.message, error.errorCode === "SERVER_CONFIG" ? 500 : 502, error.errorCode);
}

function parsePartner(value: string | null): NutritionPartnerKey | null {
  return value === "fish" || value === "cat" ? value : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const partnerKey = parsePartner(url.searchParams.get("person"));
  if (!partnerKey) return jsonError("person 只能是 fish 或 cat", 400, "BAD_REQUEST");
  const authError = await authorizePersonalPartnerWrite(request, partnerKey);
  if (authError) return authError;
  try {
    const foods = await listFavoriteFoods(partnerKey);
    return NextResponse.json(
      { ok: true, foods },
      { headers: { "Cache-Control": "no-store, max-age=0", "X-Couple-Data-Source": "supabase" } },
    );
  } catch (error) {
    if (error instanceof FavoriteFoodCloudError) return cloudError(error);
    return jsonError("读取常吃食物失败", 502, "FAVORITE_FOOD_READ_FAILED");
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("请求格式不正确", 400, "BAD_REQUEST");
  }
  const parsed = parseFavoriteFoodWritePayload(body);
  if (!parsed.ok) return jsonError(parsed.reason, 400, "INVALID_FAVORITE_FOOD");
  const authError = await authorizePersonalPartnerWrite(request, parsed.value.partnerKey);
  if (authError) return authError;
  try {
    const food = await createFavoriteFood(parsed.value);
    return NextResponse.json(
      { ok: true, food },
      { status: 201, headers: { "Cache-Control": "no-store, max-age=0", "X-Couple-Data-Source": "supabase" } },
    );
  } catch (error) {
    if (error instanceof FavoriteFoodCloudError) return cloudError(error);
    return jsonError("保存常吃食物失败", 502, "FAVORITE_FOOD_WRITE_FAILED");
  }
}
