import { describe, expect, it } from "vitest";
import { validateWishInput, wishIntent } from "../../lib/life/wish-list-model";

describe("wish-list model", () => {
  it("does not treat a completed visit as an irreversible completion", () => {
    const visits = [{ id: "v1", visitedOn: "2026-11-02", note: null, completedItemIds: ["spot1"] }];
    expect(wishIntent({ visits: [], wantToRepeat: false, archivedAt: null })).toBe("want");
    expect(wishIntent({ visits, wantToRepeat: true, archivedAt: null })).toBe("again");
    expect(wishIntent({ visits, wantToRepeat: false, archivedAt: null })).toBe("done");
  });
  it("archive hides a repeatable item from the active queue", () => {
    expect(wishIntent({ visits: [], wantToRepeat: true, archivedAt: "2026-11-02" })).toBe("done");
  });
  it("rejects empty titles, unknown categories, and unsafe URL schemes", () => {
    expect(validateWishInput({ title: " ", category: "go" })).toContain("标题需为 1～120 字");
    expect(validateWishInput({ title: "公园", category: "invalid" })).toContain("心愿分类无效");
    expect(validateWishInput({ title: "公园", category: "go", referenceUrls: ["javascript:alert(1)"] })).toContain("参考链接只能使用 HTTP 或 HTTPS");
    expect(validateWishInput({ title: "公园", category: "go", referenceUrls: ["https://example.com"], checklist: [{ title: "日落点位" }] })).toEqual([]);
  });
});
