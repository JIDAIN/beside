"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

type CacheEntry<T> = {
  data?: T;
  updatedAt: number;
  revision: number;
  promise?: Promise<T>;
  requestId?: symbol;
};

type PersistedEntry = {
  data: unknown;
  updatedAt: number;
};

type PersistedCache = {
  version: 2;
  entries: Record<string, PersistedEntry>;
};

type CacheEvent = "update" | "invalidate" | "scope";
const subscribers = new Map<string, Set<(event: CacheEvent) => void>>();
export function subscribeStaleQuery(key: string, listener: (event: CacheEvent) => void) {
  const listeners = subscribers.get(key) ?? new Set();
  listeners.add(listener);
  subscribers.set(key, listeners);
  return () => { listeners.delete(listener); if (!listeners.size) subscribers.delete(key); };
}
function notifyQuery(key: string, event: CacheEvent) {
  for (const listener of subscribers.get(key) ?? []) listener(event);
}

export const STALE_QUERY_TIMEOUT_MS = 15_000;
const queryCache = new Map<string, CacheEntry<unknown>>();
const CACHE_PREFIX = "couple-better-game:life-query:v2:";
const MUTATION_SIGNAL_KEY = "couple-better-game:life-query-change";
const SCOPE_HINT_KEY = "couple-better-game:life-scope";
const MAX_PERSISTED_ENTRIES = 220;
const MAX_PERSISTED_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

let activeScope: string | null = null;
let hydratedScope: string | null = null;
let revisionClock = 0;
let scopeSerial = 0;
let browserEventsInstalled = false;
let persistTimer: ReturnType<typeof setTimeout> | undefined;

class StaleQueryScopeChangedError extends Error {
  constructor() {
    super("STALE_QUERY_SCOPE_CHANGED");
    this.name = "StaleQueryScopeChangedError";
  }
}

function browserReady() {
  return typeof window !== "undefined";
}

function validScope(value: string | null): value is "cat" | "fish" {
  return value === "cat" || value === "fish";
}

function storageKey(scope: string) {
  return `${CACHE_PREFIX}${scope}`;
}

function nextRevision() {
  revisionClock += 1;
  return revisionClock;
}

function shouldPersistKey(key: string) {
  return key.startsWith("life-month-bundle:")
    || key.startsWith("life-day:")
    || key.startsWith("life-month:")
    || key.startsWith("meals:")
    || key.startsWith("weights:")
    || key === "medicines"
    || key === "mailbox"
    || key === "life-settings";
}

export function readStaleQueryScopeHint() {
  if (!browserReady()) return null;
  try {
    // This is only a non-authoritative cache scope hint. The signed server cookie
    // still decides access, but localStorage lets an installed app reopen without
    // briefly losing the last confirmed cat/fish UI and its cached data.
    const value = window.localStorage.getItem(SCOPE_HINT_KEY);
    return validScope(value) ? value : null;
  } catch {
    return null;
  }
}

function hydrateScope(scope: string) {
  if (!browserReady() || hydratedScope === scope) return;
  hydratedScope = scope;
  try {
    const raw = window.localStorage.getItem(storageKey(scope));
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<PersistedCache> | null;
    if (!parsed || parsed.version !== 2 || !parsed.entries || typeof parsed.entries !== "object") return;
    const cutoff = Date.now() - MAX_PERSISTED_AGE_MS;
    for (const [key, entry] of Object.entries(parsed.entries)) {
      if (!shouldPersistKey(key) || !entry || typeof entry !== "object") continue;
      const candidate = entry as PersistedEntry;
      if (typeof candidate.updatedAt !== "number") continue;
      if (candidate.updatedAt > 0 && candidate.updatedAt < cutoff) continue;
      queryCache.set(key, { data: candidate.data, updatedAt: candidate.updatedAt, revision: 0 });
    }
  } catch {
    // A corrupt or quota-constrained browser cache must never block the app.
  }
}

function ensureScopeFromHint() {
  if (activeScope || !browserReady()) return;
  const hint = readStaleQueryScopeHint();
  if (!hint) return;
  activeScope = hint;
  hydrateScope(hint);
}

function installBrowserEvents() {
  if (!browserReady() || browserEventsInstalled) return;
  browserEventsInstalled = true;
  window.addEventListener("pagehide", flushCurrentScope);
  window.addEventListener("storage", (event) => {
    if (event.key !== MUTATION_SIGNAL_KEY || !event.newValue) return;
    try {
      const message = JSON.parse(event.newValue) as { scope?: string };
      if (message.scope === activeScope) invalidateStaleQuery("", false);
    } catch { /* Ignore malformed hints. All facts still come from the API. */ }
  });
}

function broadcastMutation() {
  if (!browserReady() || !activeScope) return;
  installBrowserEvents();
  try {
    window.localStorage.setItem(MUTATION_SIGNAL_KEY, JSON.stringify({ scope: activeScope, nonce: `${Date.now()}:${nextRevision()}` }));
  } catch { /* Periodic and foreground revalidation remain available. */ }
}

function persistCurrentScope() {
  installBrowserEvents();
  if (!browserReady() || persistTimer) return;
  persistTimer = setTimeout(() => { persistTimer = undefined; flushCurrentScope(); }, 100);
}

function flushCurrentScope() {
  if (!browserReady() || !activeScope) return;
  try {
    const cutoff = Date.now() - MAX_PERSISTED_AGE_MS;
    const entries = Array.from(queryCache.entries())
      .filter(([key, entry]) => shouldPersistKey(key)
        && entry.data !== undefined
        && (entry.updatedAt === 0 || entry.updatedAt >= cutoff))
      .sort(([, left], [, right]) => right.updatedAt - left.updatedAt)
      .slice(0, MAX_PERSISTED_ENTRIES);
    const payload: PersistedCache = {
      version: 2,
      entries: Object.fromEntries(entries.map(([key, entry]) => [key, {
        data: entry.data,
        updatedAt: entry.updatedAt,
      }])),
    };
    window.localStorage.setItem(storageKey(activeScope), JSON.stringify(payload));
  } catch {
    // localStorage is an acceleration/fallback layer only; Supabase remains the source of truth.
  }
}

export function setStaleQueryScope(scope: "cat" | "fish" | null) {
  if (activeScope === scope && hydratedScope === scope) return;
  flushCurrentScope();
  scopeSerial += 1;
  activeScope = scope;
  hydratedScope = null;
  queryCache.clear();
  if (scope) hydrateScope(scope);
  for (const key of subscribers.keys()) notifyQuery(key, "scope");
}

export function rememberStaleQueryScope(scope: "cat" | "fish") {
  if (browserReady()) {
    try {
      window.localStorage.setItem(SCOPE_HINT_KEY, scope);
    } catch {
      // Ignore storage restrictions.
    }
  }
  setStaleQueryScope(scope);
}

export function forgetStaleQueryScope() {
  if (browserReady()) {
    try {
      window.localStorage.removeItem(SCOPE_HINT_KEY);
    } catch {
      // Ignore storage restrictions.
    }
  }
  setStaleQueryScope(null);
}

function entryFor<T>(key: string) {
  ensureScopeFromHint();
  return queryCache.get(key) as CacheEntry<T> | undefined;
}

export function peekStaleQuery<T>(key: string) {
  return entryFor<T>(key)?.data;
}

export function setStaleQueryData<T>(key: string, data: T) {
  queryCache.set(key, { data, updatedAt: Date.now(), revision: nextRevision() });
  persistCurrentScope();
  notifyQuery(key, "update");
  broadcastMutation();
}

export function setStaleQueryDataMany(entries: Array<{ key: string; data: unknown }>) {
  const updatedAt = Date.now();
  const revision = nextRevision();
  for (const entry of entries) {
    queryCache.set(entry.key, { data: entry.data, updatedAt, revision });
  }
  persistCurrentScope();
  for (const entry of entries) notifyQuery(entry.key, "update");
  broadcastMutation();
}

export function invalidateStaleQuery(prefix: string, broadcast = true) {
  const revision = nextRevision();
  for (const [key, entry] of queryCache.entries()) {
    if (!key.startsWith(prefix)) continue;
    queryCache.set(key, { ...entry, updatedAt: 0, revision });
  }
  persistCurrentScope();
  for (const key of subscribers.keys()) {
    if (key.startsWith(prefix)) notifyQuery(key, "invalidate");
  }
  if (broadcast) broadcastMutation();
}

export function clearStaleQueries({ persisted = false }: { persisted?: boolean } = {}) {
  ensureScopeFromHint();
  clearTimeout(persistTimer);
  persistTimer = undefined;
  scopeSerial += 1;
  queryCache.clear();
  for (const key of subscribers.keys()) notifyQuery(key, "scope");
  broadcastMutation();
  if (persisted && browserReady() && activeScope) {
    try {
      window.localStorage.removeItem(storageKey(activeScope));
    } catch {
      // Ignore storage restrictions.
    }
  }
}

function runStaleQueryFetch<T>({
  key,
  fetcher,
  cached,
  retriesLeft,
}: {
  key: string;
  fetcher: () => Promise<T>;
  cached?: CacheEntry<T>;
  retriesLeft: number;
}): Promise<T> {
  const requestRevision = cached?.revision ?? 0;
  const requestScopeSerial = scopeSerial;
  const requestId = Symbol(key);
  let timeout: ReturnType<typeof setTimeout>;
  const rawPromise = new Promise<T>((resolve, reject) => {
    timeout = setTimeout(() => reject(new Error("读取超时，正在自动重试")), STALE_QUERY_TIMEOUT_MS);
    try { Promise.resolve(fetcher()).then(resolve, reject); } catch (cause) { reject(cause); }
  }).finally(() => clearTimeout(timeout));

  const guardedPromise: Promise<T> = (async () => {
    try {
      const data = await rawPromise;
      if (requestScopeSerial !== scopeSerial) throw new StaleQueryScopeChangedError();

      const latest = entryFor<T>(key);
      if (latest && latest.revision !== requestRevision) {
        // A local/read-back write happened after this request started. Never let the
        // older response roll the UI back. If the key was invalidated, do one fresh
        // read that necessarily starts after the mutation instead.
        if (latest.data !== undefined && latest.updatedAt > 0) {
          return latest.data;
        }
        if (retriesLeft > 0) {
          const retryBase: CacheEntry<T> = {
            data: latest.data,
            updatedAt: latest.updatedAt,
            revision: latest.revision,
          };
          queryCache.set(key, retryBase);
          return runStaleQueryFetch({ key, fetcher, cached: retryBase, retriesLeft: retriesLeft - 1 });
        }
        return latest.data !== undefined ? latest.data : data;
      }

      queryCache.set(key, { data, updatedAt: Date.now(), revision: requestRevision });
      persistCurrentScope();
      notifyQuery(key, "update");
      return data;
    } catch (cause) {
      if (!(cause instanceof StaleQueryScopeChangedError)) {
        const latest = entryFor<T>(key);
        if (requestScopeSerial === scopeSerial && latest?.requestId === requestId) {
          queryCache.set(key, {
            data: latest.data,
            updatedAt: latest.updatedAt,
            revision: latest.revision,
          });
        }
      }
      throw cause;
    }
  })();

  queryCache.set(key, {
    data: cached?.data,
    updatedAt: cached?.updatedAt ?? 0,
    revision: requestRevision,
    promise: guardedPromise,
    requestId,
  });
  return guardedPromise;
}

export async function prefetchStaleQuery<T>({
  key,
  fetcher,
  staleMs = 30_000,
  force = false,
}: {
  key: string;
  fetcher: () => Promise<T>;
  staleMs?: number;
  force?: boolean;
}): Promise<T> {
  const cached = entryFor<T>(key);
  const fresh = !force && cached?.data !== undefined && Date.now() - cached.updatedAt < staleMs;
  if (fresh) return cached.data as T;
  if (cached?.promise) return cached.promise;
  return runStaleQueryFetch({ key, fetcher, cached, retriesLeft: 2 });
}

export function useStaleQuery<T>({
  key,
  fetcher,
  staleMs = 30_000,
  enabled = true,
}: {
  key: string;
  fetcher: () => Promise<T>;
  staleMs?: number;
  enabled?: boolean;
}) {
  // Keep the server HTML and the first hydration render identical. Persisted
  // browser data is restored in a layout effect, which runs before paint, so a
  // returning user gets cached content without a hydration mismatch or flash.
  const generation = useRef(0);
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async (force = false) => {
    if (!enabled) return undefined;
    const requestGeneration = generation.current;
    const requestScope = scopeSerial;
    const isCurrent = () => generation.current === requestGeneration && scopeSerial === requestScope;
    const cached = entryFor<T>(key);
    const fresh = !force && cached?.data !== undefined && Date.now() - cached.updatedAt < staleMs;
    if (fresh) {
      setData(cached.data);
      setLoading(false);
      return cached.data;
    }

    setRefreshing(cached?.data !== undefined);
    if (cached?.data === undefined) setLoading(true);

    try {
      const next = await prefetchStaleQuery({ key, fetcher, staleMs, force });
      if (!isCurrent()) return undefined;
      const current = peekStaleQuery<T>(key) ?? next;
      setData(current);
      setError(null);
      return current;
    } catch (cause) {
      if (!isCurrent()) return undefined;
      if (cause instanceof StaleQueryScopeChangedError) {
        setError(null);
        return undefined;
      }
      const fallback = entryFor<T>(key)?.data;
      if (fallback !== undefined) {
        setData(fallback);
      }
      setError(cause instanceof Error ? cause : new Error("数据暂时没有加载出来"));
      throw cause;
    } finally {
      if (isCurrent()) { setLoading(false); setRefreshing(false); }
    }
  }, [enabled, fetcher, key, staleMs]);

  useBrowserLayoutEffect(() => {
    generation.current += 1;
    let scopeTimer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribeStaleQuery(key, (event) => {
      if (event === "scope") generation.current += 1;
      const next = peekStaleQuery<T>(key);
      setData(next);
      setLoading(next === undefined);
      if (event === "update") setError(null);
      else if (event === "scope") {
        scopeTimer = setTimeout(() => { if (activeScope) void refresh(true).catch(() => undefined); }, 0);
      } else void refresh(true).catch(() => undefined);
    });
    const cached = peekStaleQuery<T>(key);
    setData(cached);
    setLoading(cached === undefined);
    // Always verify persisted/in-memory data after a screen mounts. Cached content
    // stays visible while this forced read runs, preserving the no-flash UX.
    void refresh(true).catch(() => undefined);
    return () => { generation.current += 1; clearTimeout(scopeTimer); unsubscribe(); };
  }, [key, refresh]);

  useEffect(() => {
    if (!browserReady()) return;
    const revalidate = () => {
      if (document.visibilityState !== "visible" || !navigator.onLine) return;
      void refresh(true).catch(() => undefined);
    };
    // External MCP / partner writes cannot emit a browser event. Reconcile while visible.
    const interval = window.setInterval(revalidate, 30_000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") revalidate();
    };

    window.addEventListener("online", revalidate);
    window.addEventListener("focus", revalidate);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", revalidate);
      window.removeEventListener("focus", revalidate);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refresh]);

  const failures = useRef(0);
  useEffect(() => {
    if (!error) { failures.current = 0; return; }
    if (failures.current >= 2) return;
    const timer = setTimeout(() => {
      failures.current += 1;
      if (typeof navigator === "undefined" || navigator.onLine) void refresh(true).catch(() => undefined);
    }, 2_000 * (failures.current + 1));
    return () => clearTimeout(timer);
  }, [error, refresh]);

  const update = useCallback((next: T | ((current: T | undefined) => T)) => {
    const current = peekStaleQuery<T>(key);
    const resolved = typeof next === "function"
      ? (next as (current: T | undefined) => T)(current)
      : next;
    setStaleQueryData(key, resolved);
    setData(resolved);
  }, [key]);

  return { data, loading, refreshing, error, refresh, update };
}
