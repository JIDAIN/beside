export type StarlitNookPartnerKey = "fish" | "cat";
export type StarlitNookParticipantScope = StarlitNookPartnerKey | "both";
export type StarlitNookItemType = "watch" | "place" | "food" | "activity";

export type StarlitNookWatchMediaKind =
  | "movie"
  | "series"
  | "anime"
  | "variety"
  | "documentary";

export type StarlitNookWatchStatus = "watching" | "completed" | "dropped";

export type StarlitNookPlaceKind =
  | "city"
  | "attraction"
  | "restaurant"
  | "cafe"
  | "park"
  | "venue"
  | "hotel"
  | "mall"
  | "other";

export type StarlitNookFoodMode = "dine_out" | "homemade";
export type StarlitNookFoodKind =
  | "meal"
  | "dish"
  | "dessert"
  | "drink"
  | "snack"
  | "other";

export type StarlitNookMediaType = "image" | "video";

export type StarlitNookWatchDetailWrite = {
  mediaKind: StarlitNookWatchMediaKind;
  watchStatus: StarlitNookWatchStatus;
  startedOn: string | null;
  finishedOn: string | null;
};

export type StarlitNookPlaceDetailWrite = {
  placeKind: StarlitNookPlaceKind;
  address: string | null;
  cityName: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type StarlitNookFoodDetailWrite = {
  foodMode: StarlitNookFoodMode;
  foodKind: StarlitNookFoodKind | null;
  linkedPlaceItemId: string | null;
  recipeRef: string | null;
};

export type StarlitNookActivityDetailWrite = {
  activityKind: string;
  durationMinutes: number | null;
  linkedPlaceItemId: string | null;
};

export type StarlitNookBaseItemWrite = {
  title: string;
  occurredOn: string | null;
  occurredAt: string | null;
  participantScope: StarlitNookParticipantScope;
  fishRating: number | null;
  catRating: number | null;
  note: string | null;
};

export type StarlitNookItemWrite =
  | (StarlitNookBaseItemWrite & {
      itemType: "watch";
      detail: StarlitNookWatchDetailWrite;
    })
  | (StarlitNookBaseItemWrite & {
      itemType: "place";
      detail: StarlitNookPlaceDetailWrite;
    })
  | (StarlitNookBaseItemWrite & {
      itemType: "food";
      detail: StarlitNookFoodDetailWrite;
    })
  | (StarlitNookBaseItemWrite & {
      itemType: "activity";
      detail: StarlitNookActivityDetailWrite;
    });

export type StarlitNookItemRecord = StarlitNookItemWrite & {
  id: string;
  source: string;
  sourceRef: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type StarlitNookTripWrite = {
  title: string;
  startDate: string | null;
  endDate: string | null;
  regionText: string | null;
  note: string | null;
  participantScope: StarlitNookParticipantScope;
};

export type StarlitNookTripRecord = StarlitNookTripWrite & {
  id: string;
  source: string;
  sourceRef: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type StarlitNookMediaRecord = {
  id: string;
  mediaType: StarlitNookMediaType;
  displayProvider: string | null;
  displayPath: string | null;
  displayUrl: string | null;
  sourceProvider: string | null;
  sourceRef: string | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type StarlitNookMutationContext = {
  actor: StarlitNookPartnerKey;
  source: string;
  sourceRef?: string | null;
};

export type StarlitNookItemQuery = {
  itemType?: StarlitNookItemType;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  city?: string;
  activityKind?: string;
  tripId?: string;
  limit: number;
};
