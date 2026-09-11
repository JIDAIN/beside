const CACHE_PREFIX = "couple-better-life-shell-";
const CACHE_NAME = "couple-better-life-shell-r9-v1";

function shouldIgnore(url) {
  return url.pathname.startsWith("/api/")
    || url.pathname === "/mcp"
    || url.pathname.startsWith("/oauth/")
    || url.pathname.startsWith("/.well-known/");
}

function isVersionedStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/");
}

async function safeCachePut(request, response) {
  if (!response || !response.ok || response.type === "opaqueredirect") return;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  } catch {
    // Cache storage is best-effort only.
  }
}

async function cacheFirstVersionedStatic(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  void safeCachePut(request, response);
  return response;
}

async function networkNavigation(request) {
  try {
    // Online navigation always waits for the current network response. There is intentionally
    // no short timeout that can swap in an old HTML shell while the network is merely slow.
    const response = await fetch(request, { cache: "no-store" });
    void safeCachePut(request, response);
    return response;
  } catch (error) {
    // HTML cache is an offline-only fallback and is scoped to this worker version.
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const obsoleteLifeCaches = keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME);
    await Promise.all(obsoleteLifeCaches.map((key) => caches.delete(key)));
    await self.clients.claim();

    // Existing phones can still be displaying HTML served by the previous worker. Once this
    // worker takes control, reload those open windows exactly once for this activation so the
    // next navigation is fetched from Production by the new network-first policy.
    if (obsoleteLifeCaches.length > 0) {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      await Promise.allSettled(windows.map(async (client) => {
        if (typeof client.navigate !== "function") return;
        const url = new URL(client.url);
        if (url.origin !== self.location.origin) return;
        await client.navigate(client.url);
      }));
    }
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || shouldIgnore(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkNavigation(request));
    return;
  }

  // Only content-hashed Next.js build assets use cache-first. Public images, the service
  // worker itself and route/RSC responses stay on the browser/network path so UI updates
  // cannot be pinned by an old runtime cache.
  if (isVersionedStaticAsset(url)) {
    event.respondWith(cacheFirstVersionedStatic(request));
  }
});