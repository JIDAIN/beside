// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LifeCalendarPage } from "../../components/life/LifeCalendarPage";
import { clearStaleQueries, invalidateStaleQuery, rememberStaleQueryScope } from "../../lib/client/use-stale-query";

vi.mock("../../components/life/LifeIdentityContext", () => ({
  useLifeIdentity: () => ({ mePartnerKey: "cat", taPartnerKey: "fish" }),
}));

let root: Root;
let container: HTMLDivElement;
let updated: boolean;
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  rememberStaleQueryScope("cat");
  updated = false;
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    json: async () => ({ ok: true, bundle: { month: "2026-09", days: updated ? [{
      date: "2026-09-15",
      day: { date: "2026-09-15", activities: [],
        moods: [{ partnerKey: "cat", moodKey: "happy" }],
        sleeps: [{ partnerKey: "cat", fellAsleepAt: "2026-09-14T23:00:00+08:00", wokeAt: "2026-09-15T07:00:00+08:00" }],
      },
      meals: [{ partnerKey: "cat", totalCaloriesKcal: 1234, deletedAt: null }],
    }] : [] } }),
  })));
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  clearStaleQueries({ persisted: true });
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it.each([
  ["mood", "我：开心"], ["food", "1234 千卡"], ["sleep", "8.0 小时"],
] as const)("refreshes the actual %s calendar after invalidation without a page reload", async (view, label) => {
  await act(async () => root.render(<LifeCalendarPage initialMonth="2026-09" initialView={view} />));
  const cell = container.querySelector('a[href="/calendar/2026-09-15"]')!;
  expect(cell.querySelector(`[aria-label="${label}"]`)).toBeNull();
  updated = true;
  await act(async () => invalidateStaleQuery("life-month-bundle:2026-09"));
  expect(cell.querySelector(`[aria-label="${label}"]`)).not.toBeNull();
  updated = false;
  await act(async () => invalidateStaleQuery("life-month-bundle:2026-09"));
  expect(cell.querySelector(`[aria-label="${label}"]`)).toBeNull();
});
