import { afterEach, describe, expect, it, vi } from "vitest";
import { readFetch } from "../../lib/client/read-fetch";
afterEach(() => vi.unstubAllGlobals());
describe("read request boundaries", () => {
  it("adds a deadline to GET requests", async () => {
    const fetcher = vi.fn(async () => new Response("ok"));
    vi.stubGlobal("fetch", fetcher);
    await readFetch("/api/life/day");
    expect(fetcher.mock.calls[0]).toEqual(["/api/life/day", { signal: expect.any(AbortSignal) }]);
  });
  it("preserves an explicit abort signal", async () => {
    const fetcher = vi.fn(async () => new Response("ok"));
    vi.stubGlobal("fetch", fetcher);
    const signal = new AbortController().signal;
    await readFetch("/api/meals", { signal });
    expect(fetcher.mock.calls[0]).toEqual(["/api/meals", { signal }]);
  });
  it("does not timeout or replay writes with an ambiguous completion", async () => {
    const fetcher = vi.fn(async () => { throw new Error("network"); });
    vi.stubGlobal("fetch", fetcher);
    await expect(readFetch("/api/meals", { method: "POST" })).rejects.toThrow("network");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]).toEqual(["/api/meals", { method: "POST" }]);
  });
});
