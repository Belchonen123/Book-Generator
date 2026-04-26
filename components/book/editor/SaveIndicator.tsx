"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { useEffect, useRef, useState } from "react";

import { Loader2 } from "@/lib/lucide-icons";
import { cn } from "@/lib/utils/cn";

import type { SaveState } from "../chapter-editor/types";

/**
 * Re-compute the relative time string this often. 15s is a sensible tradeoff
 * between "Saved 5s ago" being accurate enough to feel live and not wasting a
 * render every second during a long editing session.
 */
const REL_TIME_REFRESH_MS = 15_000;
/** Under this threshold, show the friendlier "just now" in place of "0 seconds ago". */
const JUST_NOW_THRESHOLD_MS = 10_000;
/** Duration of the Cmd/Ctrl+S one-shot flash; kept in lockstep with the CSS keyframe. */
const FLASH_DURATION_MS = 300;

export type SaveIndicatorProps = {
  state: SaveState;
  /** Epoch-ms timestamp of the last successful save, or null if never saved. */
  lastSavedAt: number | null;
  onRetry?: () => void;
  /**
   * Incrementing counter that triggers a brief gold flash. The parent bumps
   * this on Cmd/Ctrl+S so the user gets visual confirmation that the save
   * shortcut fired, without opening a toast.
   */
  flashKey?: number;
};

function relativeLabel(lastSavedAt: number, nowMs: number): string {
  const deltaMs = Math.max(0, nowMs - lastSavedAt);
  if (deltaMs < JUST_NOW_THRESHOLD_MS) return "just now";
  return `${formatDistanceToNowStrict(lastSavedAt, { addSuffix: false })} ago`;
}

/**
 * Live autosave indicator for the chapter editor header. Renders nothing
 * when the save state is `idle`/`saved` with no prior successful save, so
 * it doesn't clutter the header before the user has typed anything.
 */
export function SaveIndicator({
  state,
  lastSavedAt,
  onRetry,
  flashKey,
}: SaveIndicatorProps) {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(
      () => setNowMs(Date.now()),
      REL_TIME_REFRESH_MS,
    );
    return () => window.clearInterval(id);
  }, []);

  const [flashing, setFlashing] = useState(false);
  /**
   * Track the latest flash-trigger key so a second Cmd+S during the first
   * flash restarts the animation cleanly instead of extending it.
   */
  const prevFlashKeyRef = useRef<number | undefined>(flashKey);
  useEffect(() => {
    if (flashKey === undefined) return;
    if (flashKey === prevFlashKeyRef.current) return;
    prevFlashKeyRef.current = flashKey;
    setFlashing(false);
    const raf = requestAnimationFrame(() => setFlashing(true));
    const timeout = window.setTimeout(
      () => setFlashing(false),
      FLASH_DURATION_MS,
    );
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
    };
  }, [flashKey]);

  const flashClass = flashing ? "chapterai-save-indicator-flash" : undefined;

  if (state === "saving") {
    return (
      <span
        role="status"
        aria-live="polite"
        className={cn(
          "inline-flex items-center gap-1.5 text-xs text-editorial-muted",
          flashClass,
        )}
      >
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        Saving…
      </span>
    );
  }

  if (state === "dirty") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs text-editorial-muted",
          flashClass,
        )}
      >
        <span
          className="h-1.5 w-1.5 rounded-full bg-amber-400"
          aria-hidden
        />
        Unsaved changes
      </span>
    );
  }

  if (state === "error") {
    return (
      <button
        type="button"
        onClick={onRetry}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full text-xs text-editorial-muted transition hover:text-editorial-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40",
          flashClass,
        )}
        title="Retry save"
      >
        <span
          className="h-1.5 w-1.5 rounded-full bg-red-500"
          aria-hidden
        />
        Save failed — click to retry
      </button>
    );
  }

  /* `idle` or `saved` with no prior save: render nothing. The header stays
   * quiet until the user has something worth reporting. */
  if (lastSavedAt == null) return null;
  if (state !== "saved") return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-editorial-muted",
        flashClass,
      )}
    >
      <span
        className="h-1.5 w-1.5 rounded-full bg-emerald-400"
        aria-hidden
      />
      Saved {relativeLabel(lastSavedAt, nowMs)}
    </span>
  );
}
