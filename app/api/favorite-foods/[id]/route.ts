import { NextResponse } from "next/server";
import { parseFavoriteFoodWritePayload } from "../../../../lib/nutrition/favorite-food-service";
import { isUuid } from "../../../../lib/nutrition/meal-service";
import { authorizePersonalPartnerWrite } from "../../../../lib/server/life-api";
import {
  deleteFavoriteFood,
  FavoriteFoodCloudError,
  getFavoriteFoodOwner,
  updateFavoriteFood,
} from "../../../../lib/server/supabase-favorite-foods";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function jsonError(message: string, status: number, errorCode: string) {
  return NextResponse.json({ ok: false, error: message, errorCode }, { status });
}

function cloudError(error: FavoriteFoodCloudError) {
  return jsonError(error.message, error.errorCode === "SERVER_CONFIG" ? 500 : 502, error.errorCode);
}

async function readId(context: RouteContext) {
  const { id } = await context.params;
  return isUuid(id) ? id : null;
}

async function authorizeExisting(request: Request, id: string) {
  const owner = await getFavoriteFoodOwner(id);
  if (!owner) return { owner: null, response: jsonError("常吃食物不存在", 404, "NOT_FOUND") };
  return { owner, response: await authorizePersonalPartnerWrite(request, owner) };
}

export async function PUT(request: Request, context: RouteContext) {
  const id = await readId(context);
  if (!id) return jsonError("常吃食物 ID 格式不正确", 400, "BAD_REQUEST");
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("请求格式不正确", 400, "BAD_REQUEST");
  }
  const parsed = parseFavoriteFoodWritePayload(body);
  if (!parsed.ok) return jsonError(parsed.reason, 400, "INVALID_FAVORITE_FOOD");
  try {
    const existing = await authorizeExisting(request, id);
    if (existing.response) return existing.response;
    if (existing.owner !== parsed.value.partnerKey) {
      return jsonError("不能把常吃食物改到另一方名下", 403, "OWN_RECORD_ONLY");
    }
    const food = await updateFavoriteFood(id, parsed.value);
    return NextResponse.json(
      { ok: true, food },
      { headers: { "Cache-Control": "no-store, max-age=0", "X-Couple-Data-Source": "supabase" } },
    );
  } catch (error) {
    if (error instanceof FavoriteFoodCloudError) return cloudError(error);
    return jsonError("保存常吃食物失败", 502, "FAVORITE_FOOD_WRITE_FAILED");
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const id = await readId(context);
  if (!id) return jsonError("常吃食物 ID 格式不正确", 400, "BAD_REQUEST");
  try {
    const existing = await authorizeExisting(request, id);
    if (existing.response) return existing.response;
    if (!existing.owner) return jsonError("常吃食物不存在", 404, "NOT_FOUND");
    await deleteFavoriteFood(id, existing.owner);
    return NextResponse.json(
      { ok: true, deletedId: id },
      { headers: { "Cache-Control": "no-store, max-age=0", "X-Couple-Data-Source": "supabase" } },
    );
  } catch (error) {
    if (error instanceof FavoriteFoodCloudError) return cloudError(error);
    return jsonError("删除常吃食物失败", 502, "FAVORITE_FOOD_WRITE_FAILED");
  }
}
