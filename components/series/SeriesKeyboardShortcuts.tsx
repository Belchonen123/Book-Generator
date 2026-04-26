"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { useSeriesKeyboardStore } from "@/stores/series-keyboard-store";

/**
 * Global keyboard shortcuts for series navigation (Prompt 16 lines 339-345):
 *
 *   Cmd/Ctrl+Shift+S → open the series dashboard from anywhere in a series book
 *   Cmd/Ctrl+Shift+A → open the arcs view
 *   Cmd/Ctrl+Shift+P → open the progressions timeline for the selected codex
 *                       character (requires a codex entry to be active)
 *
 * Mount once per page surface that owns a series context:
 *  - inside the project layout (pass the book's parent `seriesId`)
 *  - inside the series detail shell (pass the current series id)
 *
 * We deliberately keep the handler lightweight — navigation only. Tab
 * switching on the series detail page is handled by `?tab=…` query-param
 * routing so shortcuts work equally well from outside the series surface.
 */
type Props = {
  /**
   * Active series id, or null when the surrounding book has no series
   * parent. The handler is a no-op for the S / A shortcuts in that case;
   * letting the key combo fall through to default browser behavior (or
   * other app handlers) avoids stealing keystrokes silently.
   */
  seriesId: string | null;
  /**
   * When true, the handler assumes the user is already inside the series
   * detail shell: `Cmd/Ctrl+Shift+S` becomes a no-op (no navigation needed)
   * and the A/P shortcuts append query params to the current path instead
   * of pushing a new URL. Defaults to false (book-editor surface).
   */
  insideSeriesShell?: boolean;
};

function hasModifier(e: KeyboardEvent): boolean {
  return (e.metaKey || e.ctrlKey) && e.shiftKey && !e.altKey;
}

function isTypingInFormField(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (el.isContentEditable) return true;
  return false;
}

export function SeriesKeyboardShortcuts({ seriesId, insideSeriesShell = false }: Props) {
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!hasModifier(e)) return;
      // Some keyboards report `e.key` in upper-case when Shift is held.
      const key = e.key.toLowerCase();

      if (key !== "s" && key !== "a" && key !== "p") return;

      // When the user is actively typing we yield the chord back. The only
      // exception is Cmd+Shift+S on a non-series book, which should stay
      // untouched anyway (TipTap uses it for strikethrough).
      if (isTypingInFormField()) return;

      if (key === "s") {
        if (!seriesId) return; // Let the editor's strikethrough shortcut win.
        e.preventDefault();
        if (insideSeriesShell) {
          // Already here — bounce to the overview tab.
          router.push(`/dashboard/series/${seriesId}?tab=overview`);
        } else {
          router.push(`/dashboard/series/${seriesId}`);
        }
        return;
      }

      if (key === "a") {
        if (!seriesId) return;
        e.preventDefault();
        router.push(`/dashboard/series/${seriesId}?tab=arcs`);
        return;
      }

      if (key === "p") {
        if (!seriesId) return;
        const entryId = useSeriesKeyboardStore.getState().selectedCodexEntryId;
        if (!entryId) {
          // Non-blocking nudge rather than a silent no-op: users frequently
          // forget the "select a character first" precondition.
          e.preventDefault();
          toast.info(
            "Select a codex character first to jump to its progressions timeline.",
          );
          return;
        }
        e.preventDefault();
        router.push(
          `/dashboard/series/${seriesId}?tab=codex&entry=${encodeURIComponent(entryId)}`,
        );
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, seriesId, insideSeriesShell]);

  return null;
}
