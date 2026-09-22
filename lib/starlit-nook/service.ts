import { parseStarlitNookItemQuery } from "./query";
import type { StarlitNookRepository } from "./repository";
import type {
  StarlitNookItemRecord,
  StarlitNookMutationContext,
  StarlitNookTripRecord,
} from "./types";
import {
  isStarlitNookUuid,
  parseStarlitNookItemWrite,
  parseStarlitNookTripWrite,
} from "./validation";

export class StarlitNookDomainError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INVALID_INPUT"
      | "INVALID_ID"
      | "ITEM_NOT_FOUND"
      | "TRIP_NOT_FOUND",
  ) {
    super(message);
  }
}

export class StarlitNookService {
  constructor(private readonly repository: StarlitNookRepository) {}

  async listItems(rawQuery: unknown = {}): Promise<StarlitNookItemRecord[]> {
    const query = parseStarlitNookItemQuery(rawQuery);
    if (!query.ok) throw new StarlitNookDomainError(query.reason, "INVALID_INPUT");
    return this.repository.listItems(query.value);
  }

  async getItem(id: string): Promise<StarlitNookItemRecord> {
    this.requireId(id);
    const item = await this.repository.getItem(id);
    if (!item) throw new StarlitNookDomainError("没有找到这条回忆", "ITEM_NOT_FOUND");
    return item;
  }

  async createItem(rawPayload: unknown, context: StarlitNookMutationContext) {
    const parsed = parseStarlitNookItemWrite(rawPayload);
    if (!parsed.ok) throw new StarlitNookDomainError(parsed.reason, "INVALID_INPUT");
    return this.repository.createItem(parsed.value, this.normalizeContext(context));
  }

  async updateItem(id: string, rawPayload: unknown, context: StarlitNookMutationContext) {
    this.requireId(id);
    const parsed = parseStarlitNookItemWrite(rawPayload);
    if (!parsed.ok) throw new StarlitNookDomainError(parsed.reason, "INVALID_INPUT");
    return this.repository.updateItem(id, parsed.value, this.normalizeContext(context));
  }

  async softDeleteItem(id: string, context: StarlitNookMutationContext) {
    this.requireId(id);
    return this.repository.softDeleteItem(id, this.normalizeContext(context));
  }

  async listTrips(limit = 100): Promise<StarlitNookTripRecord[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
      throw new StarlitNookDomainError("limit 必须是 1 到 500 的整数", "INVALID_INPUT");
    }
    return this.repository.listTrips(limit);
  }

  async getTrip(id: string): Promise<StarlitNookTripRecord> {
    this.requireId(id);
    const trip = await this.repository.getTrip(id);
    if (!trip) throw new StarlitNookDomainError("没有找到这次旅行", "TRIP_NOT_FOUND");
    return trip;
  }

  async createTrip(rawPayload: unknown, context: StarlitNookMutationContext) {
    const parsed = parseStarlitNookTripWrite(rawPayload);
    if (!parsed.ok) throw new StarlitNookDomainError(parsed.reason, "INVALID_INPUT");
    return this.repository.createTrip(parsed.value, this.normalizeContext(context));
  }

  async updateTrip(id: string, rawPayload: unknown, context: StarlitNookMutationContext) {
    this.requireId(id);
    const parsed = parseStarlitNookTripWrite(rawPayload);
    if (!parsed.ok) throw new StarlitNookDomainError(parsed.reason, "INVALID_INPUT");
    return this.repository.updateTrip(id, parsed.value, this.normalizeContext(context));
  }

  async softDeleteTrip(id: string, context: StarlitNookMutationContext) {
    this.requireId(id);
    return this.repository.softDeleteTrip(id, this.normalizeContext(context));
  }

  async linkTripItem(
    tripId: string,
    itemId: string,
    sortOrder: number | null,
    context: StarlitNookMutationContext,
  ) {
    this.requireId(tripId);
    this.requireId(itemId);
    if (sortOrder != null && (!Number.isInteger(sortOrder) || sortOrder < 0)) {
      throw new StarlitNookDomainError("sortOrder 必须是非负整数或 null", "INVALID_INPUT");
    }
    return this.repository.linkTripItem(
      tripId,
      itemId,
      sortOrder,
      this.normalizeContext(context),
    );
  }

  async unlinkTripItem(
    tripId: string,
    itemId: string,
    context: StarlitNookMutationContext,
  ) {
    this.requireId(tripId);
    this.requireId(itemId);
    return this.repository.unlinkTripItem(
      tripId,
      itemId,
      this.normalizeContext(context),
    );
  }

  private requireId(id: string) {
    if (!isStarlitNookUuid(id)) {
      throw new StarlitNookDomainError("记录 ID 格式不正确", "INVALID_ID");
    }
  }

  private normalizeContext(context: StarlitNookMutationContext): StarlitNookMutationContext {
    if (context.actor !== "fish" && context.actor !== "cat") {
      throw new StarlitNookDomainError("actor 必须来自可信 fish/cat 身份", "INVALID_INPUT");
    }
    const source = context.source.trim();
    if (!source || source.length > 64) {
      throw new StarlitNookDomainError("source 必须是 1 到 64 个字符", "INVALID_INPUT");
    }
    const sourceRef = context.sourceRef?.trim() || null;
    if (sourceRef && sourceRef.length > 1000) {
      throw new StarlitNookDomainError("sourceRef 不能超过 1000 个字符", "INVALID_INPUT");
    }
    return { actor: context.actor, source, sourceRef };
  }
}
