import { describe, expect, it } from "vitest";
import { parseStarlitNookItemQuery } from "../../lib/starlit-nook/query";
import {
  parseStarlitNookItemWrite,
  parseStarlitNookTripWrite,
} from "../../lib/starlit-nook/validation";

describe("Starlit Nook domain contract", () => {
  it("accepts a completed watch memory", () => {
    const result = parseStarlitNookItemWrite({
      itemType: "watch",
      title: "花束般的恋爱",
      occurredOn: "2026-09-20",
      participantScope: "both",
      fishRating: 5,
      catRating: 4,
      note: "一起看完。",
      detail: {
        mediaKind: "movie",
        watchStatus: "completed",
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.itemType).toBe("watch");
      expect(result.value.participantScope).toBe("both");
    }
  });

  it("keeps activityKind extensible", () => {
    const result = parseStarlitNookItemWrite({
      itemType: "activity",
      title: "第一次一起跳 Jazz",
      occurredOn: "2026-09-21",
      detail: {
        activityKind: "dance",
        durationMinutes: 60,
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok && result.value.itemType === "activity") {
      expect(result.value.detail.activityKind).toBe("dance");
    }
  });

  it("rejects invalid ratings", () => {
    expect(
      parseStarlitNookItemWrite({
        itemType: "food",
        title: "番茄牛腩",
        fishRating: 6,
        detail: { foodMode: "homemade" },
      }).ok,
    ).toBe(false);
  });

  it("allows historical memories without an exact date", () => {
    const result = parseStarlitNookItemWrite({
      itemType: "place",
      title: "某个老地方",
      detail: { placeKind: "other" },
    });
    expect(result.ok).toBe(true);
  });

  it("rejects reversed trip dates", () => {
    expect(
      parseStarlitNookTripWrite({
        title: "旅行",
        startDate: "2026-09-10",
        endDate: "2026-09-01",
      }).ok,
    ).toBe(false);
  });

  it("parses bounded item queries", () => {
    const result = parseStarlitNookItemQuery({
      itemType: "activity",
      activityKind: "boardgame",
      dateFrom: "2026-01-01",
      dateTo: "2026-12-31",
      limit: 50,
    });
    expect(result.ok).toBe(true);
  });
});
