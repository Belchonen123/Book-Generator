"use client";

import { useEffect, useRef, useState } from "react";

function registerServiceWorker(): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      /* non-blocking */
    });
  });
}

/** Tiny same-origin fetch — if this succeeds, we treat the app as reachable even if `navigator.onLine` lies. */
async function canReachAppOrigin(): Promise<boolean> {
  const origin = window.location.origin;
  const ctrl = new AbortController();
  const id = window.setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      method: "GET",
      cache: "no-store",
      signal: ctrl.signal,
      credentials: "same-origin",
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(id);
  }
}

export function OfflineServiceWorkerAndBanner() {
  const [offline, setOffline] = useState(false);
  /** Increment to invalidate pending offline debounce callbacks (avoids timer handle typing issues). */
  const offlineDebounceGen = useRef(0);

  useEffect(() => {
    registerServiceWorker();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const reconcile = async () => {
      if (typeof navigator === "undefined" || cancelled) {
        return;
      }
      if (navigator.onLine) {
        setOffline(false);
        return;
      }
      const reachable = await canReachAppOrigin();
      if (!cancelled) {
        setOffline(!reachable);
      }
    };

    const invalidateOfflineDebounce = () => {
      offlineDebounceGen.current += 1;
    };

    const onOnline = () => {
      invalidateOfflineDebounce();
      setOffline(false);
    };

    const onOffline = () => {
      invalidateOfflineDebounce();
      const generation = offlineDebounceGen.current;
      window.setTimeout(() => {
        if (offlineDebounceGen.current !== generation) {
          return;
        }
        void reconcile();
      }, 500);
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void reconcile();
      }
    };

    void reconcile();

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      invalidateOfflineDebounce();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!offline) {
    return null;
  }

  return (
    <div
      role="status"
      className="pointer-events-none fixed bottom-4 left-1/2 z-[100] max-w-md -translate-x-1/2 rounded-lg border border-amber-500/40 bg-amber-950/90 px-4 py-2 text-center text-sm text-amber-100 shadow-lg"
    >
      You appear to be offline. Changes will save when reconnected.
    </div>
  );
}
