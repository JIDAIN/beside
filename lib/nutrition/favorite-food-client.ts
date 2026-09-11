import type { FavoriteFoodRecord, FavoriteFoodWritePayload } from "./favorite-food-service";

type FavoriteFoodListResponse = { ok: true; foods: FavoriteFoodRecord[] };
type FavoriteFoodWriteResponse = { ok: true; food: FavoriteFoodRecord };
type FavoriteFoodDeleteResponse = { ok: true; deletedId: string };
type FavoriteFoodErrorResponse = { ok?: false; error?: string; errorCode?: string };

export class FavoriteFoodApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errorCode = "FAVORITE_FOOD_API_ERROR",
  ) {
    super(message);
    this.name = "FavoriteFoodApiError";
  }
}

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as T | FavoriteFoodErrorResponse | null;
  if (!response.ok) {
    const errorBody = (body ?? {}) as FavoriteFoodErrorResponse;
    throw new FavoriteFoodApiError(
      errorBody.error ?? "常吃食物服务暂时不可用",
      response.status,
      errorBody.errorCode ?? "FAVORITE_FOOD_API_ERROR",
    );
  }
  return body as T;
}

export async function fetchFavoriteFoods(partnerKey: FavoriteFoodWritePayload["partnerKey"]) {
  const params = new URLSearchParams({ person: partnerKey });
  const response = await fetch(`/api/favorite-foods?${params.toString()}`, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  const body = await readJson<FavoriteFoodListResponse>(response);
  return body.foods;
}

export async function createFavoriteFood(payload: FavoriteFoodWritePayload) {
  const response = await fetch("/api/favorite-foods", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await readJson<FavoriteFoodWriteResponse>(response);
  return body.food;
}

export async function updateFavoriteFood(id: string, payload: FavoriteFoodWritePayload) {
  const response = await fetch(`/api/favorite-foods/${encodeURIComponent(id)}`, {
    method: "PUT",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await readJson<FavoriteFoodWriteResponse>(response);
  return body.food;
}

export async function deleteFavoriteFood(id: string) {
  const response = await fetch(`/api/favorite-foods/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "same-origin",
    cache: "no-store",
  });
  return readJson<FavoriteFoodDeleteResponse>(response);
}
