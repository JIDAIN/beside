/** Bound read lifetimes, including response-body downloads. Never retry writes. */
export function readFetch(input: RequestInfo | URL, init?: RequestInit) {
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  return fetch(input, {
    ...init,
    ...(method === "GET" && !init?.signal ? { signal: AbortSignal.timeout(12_000) } : {}),
  });
}
