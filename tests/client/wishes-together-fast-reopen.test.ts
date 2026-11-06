import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(process.cwd() + "/" + path, "utf8");

describe("Wishes and Together fast reopen", () => {
  it("uses one scoped shared query cache rather than loading a blank page every navigation", () => {
    const wish = read("components/life/LifeWishesPage.tsx");
    const together = read("components/life/LifeTogetherPage.tsx");
    const cache = read("lib/client/use-stale-query.ts");
    expect(wish).toContain('key: "wishes"');
    expect(wish).toContain("wishesQuery.data ?? EMPTY_WISHES");
    expect(wish).toContain("enabled: Boolean(mePartnerKey)");
    expect(together).toContain('key: "together-proposals"');
    expect(together).toContain("proposalsQuery.data ?? EMPTY_PROPOSALS");
    expect(together).toContain("enabled: Boolean(me)");
    expect(cache).toContain('key === "wishes"');
    expect(cache).toContain('key === "together-proposals"');
    expect(cache).toContain("setStaleQueryScope(scope:");
    expect(cache).toContain("queryCache.clear()");
  });
  it("lets the shared stale query handle focus/refresh without redundant Together polling", () => {
    const together = read("components/life/LifeTogetherPage.tsx");
    expect(together).toContain("proposalsQuery.refresh(true)");
    expect(together).not.toContain("void reload(); }, 0");
    expect(together).not.toContain("onFocus");
    expect(together).toContain("setNow(Date.now())");
  });
  it("does not overload focused wishes/Together with invisible Today/Food warmup", () => {
    const provider = read("components/life/LifeIdentityContext.tsx");
    expect(provider).toContain("/^\\/nest\\/(?:wishes|together)");
    expect(provider.indexOf("(?:wishes|together)")).toBeLessThan(provider.indexOf("const essentialTasks"));
  });
  it("preserves authoritative server reads and local mutation cache synchronization", () => {
    const wishes = read("components/life/LifeWishesPage.tsx");
    const together = read("components/life/LifeTogetherPage.tsx");
    expect(wishes).toContain('"/api/life/wishes"');
    expect(wishes).toContain("const setEntries = wishesQuery.update");
    expect(wishes).toContain("wishesQuery.refresh(true)");
    expect(together).toContain("proposalsQuery.refresh(true)");
    expect(wishes).toContain("visibleError");
    expect(together).toContain("visibleError");
  });
});
