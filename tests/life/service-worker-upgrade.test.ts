import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

const workerSource = readFileSync(resolve(process.cwd(), "public/life-sw.js"), "utf8");
const CURRENT_CACHE = "couple-better-life-shell-r9-v1";

type Handler = (event: Record<string, unknown>) => void;

type WorkerHarness = {
  handlers: Map<string, Handler>;
  deleted: string[];
  navigated: string[];
  claims: { count: number };
  currentEntries: Map<string, Response>;
  setFetch: (next: (request: { url: string }, init?: RequestInit) => Promise<Response>) => void;
};

function requestKey(request: string | { url: string }) {
  return typeof request === "string" ? request : request.url;
}

function createWorkerHarness(cacheKeys: string[] = [CURRENT_CACHE]): WorkerHarness {
  const handlers = new Map<string, Handler>();
  const deleted: string[] = [];
  const navigated: string[] = [];
  const claims = { count: 0 };
  const currentEntries = new Map<string, Response>();
  let fetchImpl: (request: { url: string }, init?: RequestInit) => Promise<Response> = async () => new Response("network", { status: 200 });

  const currentCache = {
    match: async (request: string | { url: string }) => currentEntries.get(requestKey(request)),
    put: async (request: string | { url: string }, response: Response) => {
      currentEntries.set(requestKey(request), response.clone());
    },
  };

  const caches = {
    keys: async () => [...cacheKeys],
    delete: async (key: string) => {
      deleted.push(key);
      return true;
    },
    open: async (_key: string) => currentCache,
  };

  const self = {
    location: { origin: "https://beside.test" },
    skipWaiting: async () => undefined,
    clients: {
      claim: async () => { claims.count += 1; },
      matchAll: async () => [{
        url: "https://beside.test/",
        navigate: async (url: string) => {
          navigated.push(url);
          return undefined;
        },
      }],
    },
    addEventListener: (type: string, handler: Handler) => {
      handlers.set(type, handler);
    },
  };

  vm.runInNewContext(workerSource, {
    self,
    caches,
    fetch: (request: { url: string }, init?: RequestInit) => fetchImpl(request, init),
    URL,
    Response,
    Promise,
    setTimeout,
    clearTimeout,
  });

  return {
    handlers,
    deleted,
    navigated,
    claims,
    currentEntries,
    setFetch: (next) => { fetchImpl = next; },
  };
}

async function dispatchLifecycle(handler: Handler | undefined) {
  expect(handler).toBeTypeOf("function");
  let pending: Promise<unknown> | undefined;
  handler?.({ waitUntil: (promise: Promise<unknown>) => { pending = promise; } });
  await pending;
}

async function dispatchFetch(handler: Handler | undefined, request: { method: string; url: string; mode: string }) {
  expect(handler).toBeTypeOf("function");
  let responsePromise: Promise<Response> | undefined;
  handler?.({ request, respondWith: (promise: Promise<Response>) => { responsePromise = promise; } });
  return responsePromise;
}

describe("life service-worker upgrade", () => {
  it("cleans old life-shell caches and reloads an already controlled window once", async () => {
    const harness = createWorkerHarness([
      "couple-better-life-shell-r8-4-v1",
      CURRENT_CACHE,
      "unrelated-cache",
    ]);

    await dispatchLifecycle(harness.handlers.get("activate"));

    expect(harness.deleted).toEqual(["couple-better-life-shell-r8-4-v1"]);
    expect(harness.claims.count).toBe(1);
    expect(harness.navigated).toEqual(["https://beside.test/"]);
  });

  it("waits for the current network HTML even when a cached page exists", async () => {
    const harness = createWorkerHarness();
    harness.currentEntries.set("https://beside.test/", new Response("cached-old", { status: 200 }));
    let initSeen: RequestInit | undefined;
    harness.setFetch(async (_request, init) => {
      initSeen = init;
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 25));
      return new Response("network-current", { status: 200 });
    });

    const responsePromise = await dispatchFetch(harness.handlers.get("fetch"), {
      method: "GET",
      url: "https://beside.test/",
      mode: "navigate",
    });
    expect(responsePromise).toBeDefined();
    const response = await responsePromise;

    expect(await response?.text()).toBe("network-current");
    expect(initSeen?.cache).toBe("no-store");
  });

  it("uses the current-version HTML cache only after the navigation network request really fails", async () => {
    const harness = createWorkerHarness();
    harness.currentEntries.set("https://beside.test/food", new Response("offline-shell", { status: 200 }));
    harness.setFetch(async () => { throw new Error("offline"); });

    const responsePromise = await dispatchFetch(harness.handlers.get("fetch"), {
      method: "GET",
      url: "https://beside.test/food",
      mode: "navigate",
    });
    const response = await responsePromise;

    expect(await response?.text()).toBe("offline-shell");
  });

  it("never intercepts API GET requests", async () => {
    const harness = createWorkerHarness();
    const responsePromise = await dispatchFetch(harness.handlers.get("fetch"), {
      method: "GET",
      url: "https://beside.test/api/life/day",
      mode: "cors",
    });
    expect(responsePromise).toBeUndefined();
  });
});