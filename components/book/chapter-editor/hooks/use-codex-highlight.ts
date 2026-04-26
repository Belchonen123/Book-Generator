"use client";

/**
 * useCodexHighlight — host-side bindings for the CodexHighlight TipTap
 * extension. Wires:
 *   - `editor.commands.setCodexEntries(entries)` whenever the entry list
 *     changes (handles create/rename/delete replication across tabs).
 *   - `mouseover` / `mouseout` listeners on the editor DOM root so we can
 *     render the hover card at the right decoration rect.
 *   - A short close-debounce so moving the cursor FROM the span TO the card
 *     doesn't dismiss it (classic tooltip usability glitch).
 *
 * Does NOT own the hover card JSX — it returns the state needed for the
 * host to render `<CodexHoverCard ... />` alongside the editor.
 */
import type { Editor } from "@tiptap/core";
import { useCallback, useEffect, useRef, useState } from "react";

import type { CodexHighlightEntry } from "@/components/book/chapter-editor/codex-highlight";
import { codexDecorationFromEvent } from "@/components/book/chapter-editor/codex-highlight";
import type { CodexEntry } from "@/lib/codex/types";

type HoverState = {
  entryId: string;
  rect: DOMRect;
};

const CLOSE_DELAY_MS = 140;

export function useCodexHighlight({
  editor,
  entries,
  enabled = true,
  seriesName = null,
}: {
  editor: Editor | null;
  entries: CodexEntry[];
  enabled?: boolean;
  /** When the host book belongs to a series, pass its display name here so
   * series-scoped highlights can surface "Series: {name}" in the hover
   * card without a second DB round-trip. */
  seriesName?: string | null;
}): {
  hoveredEntry: CodexEntry | null;
  hoveredRect: DOMRect | null;
  handleCardEnter: () => void;
  handleCardLeave: () => void;
} {
  const [hover, setHover] = useState<HoverState | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Push entries into the plugin whenever they change. The extension does
   * its own cheap trie rebuild; we don't memoize further because the entry
   * list is typically small and identity stability is uncertain coming out
   * of Supabase. */
  useEffect(() => {
    if (!editor || !enabled) return;
    const payload: CodexHighlightEntry[] = entries.map((e) => ({
      id: e.id,
      name: e.name,
      aliases: e.aliases,
      entry_type: e.entry_type,
      // Propagate scope + series name so the plugin can stamp the
      // decoration's data-attrs (drives both the CSS variant and the
      // hover-card "Series: {name}" label).
      scope: (e.scope ?? "project") as "project" | "series" | "shared",
      series_name:
        e.scope === "series" || e.scope === "shared" ? seriesName : null,
    }));
    editor.commands.setCodexEntries(payload);
  }, [editor, entries, enabled, seriesName]);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setHover(null);
      closeTimerRef.current = null;
    }, CLOSE_DELAY_MS);
  }, [clearCloseTimer]);

  useEffect(() => {
    if (!editor || !enabled) return;
    const root = editor.view.dom;

    const handleOver = (evt: MouseEvent) => {
      const info = codexDecorationFromEvent(evt);
      if (!info) {
        scheduleClose();
        return;
      }
      clearCloseTimer();
      setHover((prev) => {
        if (prev && prev.entryId === info.entryId) {
          /* Same span — only update rect if the span moved (resize). */
          return prev;
        }
        return { entryId: info.entryId, rect: info.rect };
      });
    };

    const handleOut = (evt: MouseEvent) => {
      /* Only schedule close when leaving the editor entirely; bubble-up
       * events from child spans are filtered on re-entry by handleOver. */
      const related = evt.relatedTarget;
      if (related instanceof Node && root.contains(related)) return;
      scheduleClose();
    };

    root.addEventListener("mouseover", handleOver);
    root.addEventListener("mouseout", handleOut);
    return () => {
      root.removeEventListener("mouseover", handleOver);
      root.removeEventListener("mouseout", handleOut);
      clearCloseTimer();
    };
  }, [editor, enabled, clearCloseTimer, scheduleClose]);

  const hoveredEntry = hover ? entries.find((e) => e.id === hover.entryId) ?? null : null;

  return {
    hoveredEntry,
    hoveredRect: hover?.rect ?? null,
    handleCardEnter: clearCloseTimer,
    handleCardLeave: scheduleClose,
  };
}
