import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { invalidateStaleQuery, peekStaleQuery, prefetchStaleQuery, setStaleQueryData } from "../../lib/client/use-stale-query";
import { syncLifeDayCaches } from "../../lib/life/month-bundle";
import type { LifeDayRecord } from "../../lib/life/life-service";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("life seamless synchronization", () => {
  it("keeps cached data available while marking it stale", () => {
    const key = `test:${crypto.randomUUID()}`;
    setStaleQueryData(key, { value: 1 });
    invalidateStaleQuery(key);
    expect(peekStaleQuery(key)).toEqual({ value: 1 });
  });

  it("never lets an older in-flight response overwrite a newer local write", async () => {
    const key = `test:race:${crypto.randomUUID()}`;
    let release!: (value: { value: number }) => void;
    const pending = prefetchStaleQuery({
      key,
      fetcher: () => new Promise<{ value: number }>((resolvePromise) => { release = resolvePromise; }),
      staleMs: 0,
    });

    setStaleQueryData(key, { value: 2 });
    release({ value: 1 });

    await expect(pending).resolves.toEqual({ value: 2 });
    expect(peekStaleQuery<{ value: number }>(key)).toEqual({ value: 2 });
  });

  it("retries an invalidated in-flight request after the mutation barrier", async () => {
    const key = `test:retry:${crypto.randomUUID()}`;
    let calls = 0;
    let release!: (value: { value: number }) => void;
    const fetcher = () => {
      calls += 1;
      if (calls === 1) return new Promise<{ value: number }>((resolvePromise) => { release = resolvePromise; });
      return Promise.resolve({ value: 3 });
    };
    const pending = prefetchStaleQuery({ key, fetcher, staleMs: 0 });

    invalidateStaleQuery(key);
    release({ value: 1 });

    await expect(pending).resolves.toEqual({ value: 3 });
    expect(calls).toBe(2);
    expect(peekStaleQuery<{ value: number }>(key)).toEqual({ value: 3 });
  });

  it("uses stale-while-revalidate across every data-backed life screen", () => {
    for (const path of [
      "components/life/TodayLifePage.tsx",
      "components/life/LifeFoodPage.tsx",
      "components/life/LifeCalendarPage.tsx",
      "components/life/LifeCalendarDayPage.tsx",
      "components/life/LifeWeightPage.tsx",
      "components/life/LifeMailboxPage.tsx",
      "components/life/LifeMedicinePage.tsx",
    ]) {
      expect(source(path), path).toContain("useStaleQuery");
    }
  });

  it("persists safe read caches per cat/fish browser scope", () => {
    const cache = source("lib/client/use-stale-query.ts");
    expect(cache).toContain("window.localStorage");
    expect(cache).toContain("window.localStorage.getItem(SCOPE_HINT_KEY)");
    expect(cache).toContain("rememberStaleQueryScope");
    expect(cache).toContain("MAX_PERSISTED_AGE_MS");
    expect(cache).toContain('key === "medicines"');
    expect(cache).toContain('key === "mailbox"');
    expect(cache).toContain('key === "life-settings"');
    expect(cache).toContain("useBrowserLayoutEffect");
  });

  it("revalidates cached data on mount and whenever the app returns to foreground", () => {
    const cache = source("lib/client/use-stale-query.ts");
    expect(cache).toContain("void refresh(true)");
    expect(cache).toContain('window.addEventListener("focus", revalidate)');
    expect(cache).toContain('document.addEventListener("visibilitychange", handleVisibilityChange)');
    expect(cache).toContain('document.visibilityState === "visible"');
  });

  it("updates the visible month cache immediately after a mood write", () => {
    const date = "2098-11-03";
    const monthKey = "life-month:2098-11";
    setStaleQueryData(monthKey, { month: "2098-11", days: [{ date, moods: [] }] });
    const day: LifeDayRecord = {
      date,
      moods: [{
        id: crypto.randomUUID(), partnerKey: "cat", moodDate: date, moodKey: "happy",
        source: "manual", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      }],
      sleeps: [],
      activities: [],
    };
    syncLifeDayCaches(date, day);
    expect(peekStaleQuery<{ days: Array<{ moods: Array<{ moodKey: string }> }> }>(monthKey)?.days[0].moods[0].moodKey).toBe("happy");
  });

  it("invalidates an in-flight month bundle when a day write has no bundle snapshot yet", () => {
    const monthBundle = source("lib/life/month-bundle.ts");
    expect(monthBundle).toContain("invalidateStaleQuery(bundleKey)");
  });

  it("does not treat a temporary session fetch failure as logout", () => {
    const identity = source("components/life/LifeIdentityContext.tsx");
    expect(identity).toContain("const fallback = partnerRef.current ?? readStaleQueryScopeHint()");
    expect(identity).toContain("next = fallback");
    expect(identity).toContain("rememberStaleQueryScope");
    expect(identity).toContain("useBrowserLayoutEffect");
    expect(identity).toContain("window.addEventListener(\"online\"");
    expect(identity).toContain('key: "life-settings"');
  });

  it("keeps the bottom navigation in root chrome instead of remounting it per page", () => {
    const layout = source("app/layout.tsx");
    const shell = source("components/life/LifeAppShell.tsx");
    const chrome = source("components/life/PersistentLifeChrome.tsx");
    expect(layout).toContain("PersistentLifeChrome");
    expect(shell).not.toContain("AppLifeBottomNav");
    expect(chrome).toContain("<AppLifeBottomNav />");
    expect(chrome).toContain("router.prefetch(route)");
  });

  it("updates the service worker proactively and never caches API responses", () => {
    const register = source("components/life/LifeServiceWorker.tsx");
    const worker = source("public/life-sw.js");
    expect(register).toContain('navigator.serviceWorker.register("/life-sw.js"');
    expect(register).toContain("await next.update()");
    expect(register).toContain('window.addEventListener("focus", checkForUpdate)');
    expect(register).toContain('window.addEventListener("online", checkForUpdate)');
    expect(register).toContain('document.addEventListener("visibilitychange", handleVisibilityChange)');
    expect(worker).toContain('url.pathname.startsWith("/api/")');
    expect(worker).toContain('CACHE_NAME = "couple-better-life-shell-r9-v1"');
    expect(worker).not.toContain("NETWORK_TIMEOUT_MS");
    expect(worker).not.toContain("Promise.race");
    expect(worker).not.toContain("CORE_ROUTES");
    expect(worker).toContain('fetch(request, { cache: "no-store" })');
    expect(worker).toContain('request.mode === "navigate"');
    expect(worker).toContain('url.pathname.startsWith("/_next/static/")');
  });

  it("migrates old service-worker caches and refreshes controlled windows once on activation", () => {
    const worker = source("public/life-sw.js");
    expect(worker).toContain('const CACHE_PREFIX = "couple-better-life-shell-"');
    expect(worker).toContain("obsoleteLifeCaches");
    expect(worker).toContain("caches.delete(key)");
    expect(worker).toContain("self.clients.claim()");
    expect(worker).toContain('self.clients.matchAll({ type: "window", includeUncontrolled: true })');
    expect(worker).toContain("await client.navigate(client.url)");
    expect(worker).toContain("if (obsoleteLifeCaches.length > 0)");
  });

  it("does not insert visible background-refresh banners", () => {
    for (const path of [
      "components/life/TodayLifePage.tsx",
      "components/life/LifeFoodPage.tsx",
      "components/life/LifeCalendarPage.tsx",
    ]) {
      expect(source(path), path).not.toContain("life-sync-pill");
    }
  });

  it("does not render visible startup/loading copy on the three primary screens", () => {
    expect(source("components/life/TodayLifePage.tsx")).not.toContain("第一次读取今天的记录");
    expect(source("components/life/LifeFoodPage.tsx")).not.toContain("正在确认当前账号");
    expect(source("components/life/LifeCalendarPage.tsx")).not.toContain("正在确认当前账号");
    expect(source("components/life/LifeCalendarPage.tsx")).not.toContain('subtitle="正在确认当前账号');
  });

  it("keeps versioned meal photos in the private browser cache", () => {
    const photoRoute = source("app/api/meals/[id]/photo/route.ts");
    const client = source("lib/nutrition/meal-client.ts");
    expect(client).toContain("?v=${encodeURIComponent(meal.updatedAt)}");
    expect(photoRoute).toContain('private, max-age=31536000, immutable');
  });

  it("keeps meal-photo placeholders neutral until meal records are ready", () => {
    const food = source("components/life/LifeFoodPage.tsx");
    expect(food).toContain("pending={mealsPending}");
    expect(food).toContain("if (pending)");
  });

  it("hydrates meal editing from the list cache", () => {
    const editor = source("components/life/LifeMealEditorPage.tsx");
    expect(editor).toContain("peekStaleQuery");
    expect(editor).toContain("cachedMeal");
  });
});