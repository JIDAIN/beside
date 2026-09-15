// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  clearStaleQueries, invalidateStaleQuery, peekStaleQuery, prefetchStaleQuery,
  rememberStaleQueryScope, setStaleQueryData, setStaleQueryScope,
  STALE_QUERY_TIMEOUT_MS, useStaleQuery,
} from "../../lib/client/use-stale-query";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
let root: Root;
let container: HTMLDivElement;
function Probe({ name, fetcher, enabled = true }: { name: string; fetcher: () => Promise<string>; enabled?: boolean }) {
  const query = useStaleQuery({ key: name, fetcher, enabled });
  return createElement("output", null, `${query.data ?? "empty"}|${query.loading}|${query.error?.message ?? "ok"}`);
}
async function render(name: string, fetcher: () => Promise<string>, enabled = true) {
  await act(async () => { root.render(createElement(Probe, { name, fetcher, enabled })); });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  setStaleQueryScope(null);
  rememberStaleQueryScope("cat");
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

describe("mounted query synchronization", () => {
  it("updates every observer immediately after a cache write", async () => {
    const fetcher = vi.fn(async () => "before");
    await act(async () => root.render(createElement("div", null,
      createElement(Probe, { name: "shared", fetcher }),
      createElement(Probe, { name: "shared", fetcher }))));
    expect(fetcher).toHaveBeenCalledTimes(1);
    await act(async () => setStaleQueryData("shared", "saved"));
    expect([...container.querySelectorAll("output")].map(node => node.textContent)).toEqual(["saved|false|ok", "saved|false|ok"]);
  });
  it("refetches an invalidated visible calendar without remounting", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce("before").mockResolvedValue("after");
    await render("month", fetcher);
    await act(async () => invalidateStaleQuery("month"));
    expect(container.textContent).toBe("after|false|ok");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("keeps stale content and retries a failed read automatically", async () => {
    setStaleQueryData("meals", "cached");
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue("fresh");
    await render("meals", fetcher);
    expect(container.textContent).toContain("cached|false|offline");
    await act(async () => vi.advanceTimersByTimeAsync(2000));
    expect(container.textContent).toBe("fresh|false|ok");
  });
  it("releases a hung promise and ignores its late response", async () => {
    const old = deferred<string>();
    const fetcher = vi.fn().mockImplementationOnce(() => old.promise).mockResolvedValue("recovered");
    await render("sleep", fetcher);
    await act(async () => vi.advanceTimersByTimeAsync(STALE_QUERY_TIMEOUT_MS));
    await act(async () => vi.advanceTimersByTimeAsync(2000));
    expect(container.textContent).toBe("recovered|false|ok");
    await act(async () => old.resolve("obsolete"));
    expect(peekStaleQuery("sleep")).toBe("recovered");
    expect(container.textContent).toBe("recovered|false|ok");
  });
  it("does not put an earlier month's response into the newly selected month", async () => {
    const old = deferred<string>();
    await render("august", () => old.promise);
    await render("september", async () => "September");
    await act(async () => old.resolve("August"));
    expect(container.textContent).toBe("September|false|ok");
  });
  it("does not cache a synthetic empty response while identity is pending", async () => {
    const fetcher = vi.fn(async () => "facts");
    await render("month", fetcher, false);
    expect(fetcher).not.toHaveBeenCalled();
    expect(peekStaleQuery("month")).toBeUndefined();
    await render("month", fetcher, true);
    expect(container.textContent).toBe("facts|false|ok");
  });
  it("picks up external writes while visible and pauses polling while hidden", async () => {
    let server = "before";
    const fetcher = vi.fn(async () => server);
    await render("month", fetcher);
    server = "MCP write";
    await act(async () => vi.advanceTimersByTimeAsync(30_000));
    expect(container.textContent).toBe("MCP write|false|ok");
    const calls = fetcher.mock.calls.length;
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    await act(async () => vi.advanceTimersByTimeAsync(60_000));
    expect(fetcher).toHaveBeenCalledTimes(calls);
    vi.restoreAllMocks();
  });
  it("persists the actual month-bundle key used by all three calendar views", async () => {
    setStaleQueryData("life-month-bundle:2026-09", { month: "2026-09", days: [] });
    await vi.advanceTimersByTimeAsync(100);
    const cache = JSON.parse(localStorage.getItem("couple-better-game:life-query:v2:cat")!);
    expect(cache.entries["life-month-bundle:2026-09"].data.month).toBe("2026-09");
  });
  it("releases an invalidated request even when it fails", async () => {
    const old = deferred<string>();
    const pending = prefetchStaleQuery({ key: "race", fetcher: () => old.promise });
    invalidateStaleQuery("race");
    old.reject(new Error("network"));
    await expect(pending).rejects.toThrow("network");
    await expect(prefetchStaleQuery({ key: "race", fetcher: async () => "new" })).resolves.toBe("new");
  });
  it("does not let a response from a previous login refill the new scope", async () => {
    const old = deferred<string>();
    const pending = prefetchStaleQuery({ key: "mailbox", fetcher: () => old.promise });
    rememberStaleQueryScope("fish");
    setStaleQueryData("mailbox", "fish mail");
    old.resolve("cat mail");
    await expect(pending).rejects.toThrow("STALE_QUERY_SCOPE_CHANGED");
    expect(peekStaleQuery("mailbox")).toBe("fish mail");
  });
});

describe("cross-tab refresh", () => {
  it("revalidates same-scope mutation signals without rebroadcast loops", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce("old").mockResolvedValue("other tab saved");
    await render("life-day:2026-09-15", fetcher);
    const before = localStorage.getItem("couple-better-game:life-query-change");
    await act(async () => window.dispatchEvent(new StorageEvent("storage", {
      key: "couple-better-game:life-query-change",
      newValue: JSON.stringify({ scope: "cat", nonce: "external" }),
    })));
    expect(container.textContent).toBe("other tab saved|false|ok");
    expect(localStorage.getItem("couple-better-game:life-query-change")).toBe(before);
  });
  it("clears mounted snapshots and reloads after restore", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce("before restore").mockResolvedValue("restored");
    await render("life-day:2026-09-15", fetcher);
    await act(async () => clearStaleQueries({ persisted: true }));
    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(container.textContent).toBe("restored|false|ok");
  });
});
