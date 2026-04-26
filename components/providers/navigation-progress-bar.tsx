"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useGlobalProgressStore } from "@/stores/global-progress-store";

/**
 * Site-wide NProgress-style top bar.
 *
 * Starts as soon as the user initiates navigation (anchor click, form
 * submit, `router.push/replace` via history patching, `popstate`, or a full
 * page `beforeunload`) so the app never feels frozen while the next screen
 * compiles/fetches. Completes when the pathname changes or when the
 * `inFlight` counter from {@link useGlobalProgressStore} drops to zero.
 *
 * Also exposes a hard safety timer so a missed "done" event can never leave
 * the bar stuck.
 */
export function NavigationProgressBar() {
  const pathname = usePathname();
  const inFlight = useGlobalProgressStore((s) => s.inFlight);

  const [progress, setProgress] = useState(0);
  const [hiding, setHiding] = useState(false);

  const activeRef = useRef(false);
  const tickRef = useRef<number | null>(null);
  const finishRef = useRef<number | null>(null);
  const hideRef = useRef<number | null>(null);
  const safetyRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (finishRef.current !== null) {
      window.clearTimeout(finishRef.current);
      finishRef.current = null;
    }
    if (hideRef.current !== null) {
      window.clearTimeout(hideRef.current);
      hideRef.current = null;
    }
    if (safetyRef.current !== null) {
      window.clearTimeout(safetyRef.current);
      safetyRef.current = null;
    }
  };

  const startInternal = () => {
    if (activeRef.current) return;
    activeRef.current = true;
    setHiding(false);
    clearTimers();
    setProgress((p) => (p > 0 && p < 90 ? p : 8));
    tickRef.current = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        const step = Math.max(0.6, (92 - p) / 20);
        return Math.min(90, p + step);
      });
    }, 220);
    safetyRef.current = window.setTimeout(() => {
      doneInternal();
    }, 15000);
  };

  const doneInternal = () => {
    if (!activeRef.current) return;
    activeRef.current = false;
    clearTimers();
    setProgress(100);
    finishRef.current = window.setTimeout(() => {
      setHiding(true);
      hideRef.current = window.setTimeout(() => {
        setProgress(0);
        setHiding(false);
      }, 240);
    }, 140);
  };

  // React to store-driven work (API calls flagged via useGlobalProgressStore).
  useEffect(() => {
    if (inFlight > 0) startInternal();
    else doneInternal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inFlight]);

  // Complete the bar on every route change.
  useEffect(() => {
    doneInternal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Global navigation intent listeners — the critical UX piece.
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as Element | null;
      const anchor = target?.closest?.("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href) return;
      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:")
      )
        return;

      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search &&
          url.hash !== ""
        )
          return;
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search
        )
          return;
        startInternal();
      } catch {
        // Malformed href — ignore.
      }
    };

    const handleSubmit = (_e: Event) => {
      startInternal();
    };

    const handlePopState = () => {
      startInternal();
    };

    const handleBeforeUnload = () => {
      startInternal();
    };

    // Patch history so programmatic `router.push/replace` also shows progress.
    const originalPush = window.history.pushState.bind(window.history);
    const originalReplace = window.history.replaceState.bind(window.history);

    const patchedPush: typeof window.history.pushState = (...args) => {
      startInternal();
      return originalPush(...args);
    };
    const patchedReplace: typeof window.history.replaceState = (...args) => {
      startInternal();
      return originalReplace(...args);
    };
    window.history.pushState = patchedPush;
    window.history.replaceState = patchedReplace;

    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", handleSubmit, true);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.history.pushState = originalPush;
      window.history.replaceState = originalReplace;
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSubmit, true);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      clearTimers();
    };
  }, []);

  if (progress <= 0) return null;

  return (
    <div
      aria-hidden
      role="presentation"
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[3px] overflow-visible"
    >
      <div
        className="relative h-full bg-gradient-to-r from-gold/40 via-gold to-gold/95 shadow-[0_0_12px_rgba(201,168,76,0.75),0_0_4px_rgba(201,168,76,0.55)]"
        style={{
          width: `${progress}%`,
          opacity: hiding ? 0 : 1,
          transition:
            progress === 100
              ? "width 220ms ease-out, opacity 260ms ease-out"
              : "width 220ms linear, opacity 200ms linear",
        }}
      >
        <span
          aria-hidden
          className="absolute right-0 top-1/2 block h-[14px] w-24 -translate-y-1/2 rounded-full bg-gold/70 opacity-80 blur-[10px]"
          style={{ opacity: hiding ? 0 : 0.75 }}
        />
      </div>
    </div>
  );
}
