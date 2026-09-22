import type {
  StarlitNookItemQuery,
  StarlitNookItemRecord,
  StarlitNookItemWrite,
  StarlitNookMediaRecord,
  StarlitNookMutationContext,
  StarlitNookTripRecord,
  StarlitNookTripWrite,
} from "./types";

export interface StarlitNookRepository {
  listItems(query: StarlitNookItemQuery): Promise<StarlitNookItemRecord[]>;
  getItem(id: string): Promise<StarlitNookItemRecord | null>;
  createItem(
    payload: StarlitNookItemWrite,
    context: StarlitNookMutationContext,
  ): Promise<StarlitNookItemRecord>;
  updateItem(
    id: string,
    payload: StarlitNookItemWrite,
    context: StarlitNookMutationContext,
  ): Promise<StarlitNookItemRecord>;
  softDeleteItem(
    id: string,
    context: StarlitNookMutationContext,
  ): Promise<StarlitNookItemRecord>;

  listTrips(limit: number): Promise<StarlitNookTripRecord[]>;
  getTrip(id: string): Promise<StarlitNookTripRecord | null>;
  createTrip(
    payload: StarlitNookTripWrite,
    context: StarlitNookMutationContext,
  ): Promise<StarlitNookTripRecord>;
  updateTrip(
    id: string,
    payload: StarlitNookTripWrite,
    context: StarlitNookMutationContext,
  ): Promise<StarlitNookTripRecord>;
  softDeleteTrip(
    id: string,
    context: StarlitNookMutationContext,
  ): Promise<StarlitNookTripRecord>;

  linkTripItem(
    tripId: string,
    itemId: string,
    sortOrder: number | null,
    context: StarlitNookMutationContext,
  ): Promise<void>;
  unlinkTripItem(
    tripId: string,
    itemId: string,
    context: StarlitNookMutationContext,
  ): Promise<void>;

  getMedia(id: string): Promise<StarlitNookMediaRecord | null>;
}
