"use client";

import { useEffect } from "react";

export function LifeServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let disposed = false;
    let registration: ServiceWorkerRegistration | null = null;

    const checkForUpdate = () => {
      if (disposed || !registration) return;
      void registration.update().catch(() => {
        // Offline support is progressive enhancement; update checks must never block the app.
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") checkForUpdate();
    };

    const register = async () => {
      try {
        const next = await navigator.serviceWorker.register("/life-sw.js", { scope: "/", updateViaCache: "none" });
        if (disposed) return;
        registration = next;
        await next.update();
      } catch {
        // Offline support is progressive enhancement; never block the app if registration is unavailable.
      }
    };

    void register();
    window.addEventListener("focus", checkForUpdate);
    window.addEventListener("online", checkForUpdate);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      disposed = true;
      window.removeEventListener("focus", checkForUpdate);
      window.removeEventListener("online", checkForUpdate);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}