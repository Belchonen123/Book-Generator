"use client";

/**
 * Mention picker — the `@` dropdown in the chat panel.
 *
 * The panel owns textarea focus + caret state; this component only
 * renders the floating list and emits a `onPick` callback when the
 * author confirms a candidate. Keyboard navigation (↑/↓/Enter/Esc) is
 * driven by the parent via the `activeIndex` / `onActiveIndexChange`
 * props so multiple mentions in one message stay in sync with the
 * textarea caret.
 *
 * Matching strategy: subsequence fuzzy match on the needle against
 * `name` first and each alias second (codex entries only). The result
 * is grouped by type — codex entries first (since they're what authors
 * most commonly mean by "@"), chapters second.
 */

import { useMemo } from "react";

import { BookOpen, Library } from "@/lib/lucide-icons";
import { cn } from "@/lib/utils/cn";

import type { MentionCandidate } from "@/app/(dashboard)/projects/[id]/chapters/[chapterId]/_actions/chat-threads-actions";

export type { MentionCandidate };

/** Max rows rendered. Keeps the popover from overwhelming the panel. */
const MAX_ROWS = 12;

export type MentionPickerProps = {
  candidates: MentionCandidate[];
  /** Needle typed by the author (text after the `@`, sans the `@`). */
  query: string;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onPick: (candidate: MentionCandidate) => void;
  /** Called when the author clicks the backdrop or hits Esc. */
  onCancel: () => void;
};

export function MentionPicker({
  candidates,
  query,
  activeIndex,
  onActiveIndexChange,
  onPick,
  onCancel,
}: MentionPickerProps) {
  const filtered = useMemo(
    () => filterAndSort(candidates, query).slice(0, MAX_ROWS),
    [candidates, query],
  );

  if (filtered.length === 0) {
    return (
      <div
        className="absolute bottom-full left-0 z-30 mb-2 w-72 rounded-lg border border-border/70 bg-editorial-bg shadow-lg"
        role="dialog"
        aria-label="Mentions"
      >
        <p className="px-3 py-3 text-xs text-editorial-muted">
          No matches for
          <span className="ml-1 font-mono text-editorial-cream">
            @{query || "…"}
          </span>
          .
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="mt-1 w-full border-t border-border/40 px-3 py-2 text-left text-[11px] text-editorial-muted hover:bg-muted/40"
        >
          Press Esc to dismiss
        </button>
      </div>
    );
  }

  const groups: Record<"codex" | "chapter", MentionCandidate[]> = {
    codex: [],
    chapter: [],
  };
  for (const c of filtered) {
    groups[c.type].push(c);
  }

  let flatIndex = 0;

  return (
    <div
      className="absolute bottom-full left-0 z-30 mb-2 w-80 overflow-hidden rounded-lg border border-border/70 bg-editorial-bg shadow-lg"
      role="listbox"
      aria-label="Mention picker"
    >
      {(["codex", "chapter"] as const).map((group) => {
        const items = groups[group];
        if (items.length === 0) return null;
        return (
          <div key={group} className="border-b border-border/40 last:border-b-0">
            <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-editorial-muted">
              {group === "codex" ? "Codex entries" : "Chapters"}
            </div>
            <ul>
              {items.map((item) => {
                const selfIndex = flatIndex;
                flatIndex += 1;
                const active = activeIndex === selfIndex;
                return (
                  <li key={`${item.type}-${item.id}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onMouseEnter={() => onActiveIndexChange(selfIndex)}
                      onMouseDown={(e) => {
                        /* preventDefault keeps the textarea focused so
                         * the caret stays put during the inject. */
                        e.preventDefault();
                        onPick(item);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                        active
                          ? "bg-gold/20 text-editorial-cream"
                          : "text-editorial-muted hover:bg-muted/40 hover:text-editorial-cream",
                      )}
                    >
                      {item.type === "codex" ? (
                        <Library
                          className="h-4 w-4 shrink-0 text-editorial-muted"
                          aria-hidden
                        />
                      ) : (
                        <BookOpen
                          className="h-4 w-4 shrink-0 text-editorial-muted"
                          aria-hidden
                        />
                      )}
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {item.type === "chapter" ? (
                          <>
                            <span className="text-editorial-muted">
                              Ch.
                              {item.chapterNumber}
                              <span className="mx-1 opacity-60">·</span>
                            </span>
                            {item.name}
                          </>
                        ) : (
                          item.name
                        )}
                      </span>
                      {item.type === "codex" ? (
                        <span className="shrink-0 text-[10px] uppercase tracking-wider text-editorial-muted">
                          {item.entryType}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Fuzzy matching                                                     *
 * ------------------------------------------------------------------ */

/** Case-insensitive subsequence match. `ama` matches `marcus abigail`. */
function subsequenceMatch(haystack: string, needle: string): boolean {
  if (!needle) return true;
  let hi = 0;
  let ni = 0;
  const hl = haystack.length;
  const nl = needle.length;
  while (hi < hl && ni < nl) {
    if (haystack.charCodeAt(hi) === needle.charCodeAt(ni)) {
      ni += 1;
    }
    hi += 1;
  }
  return ni === nl;
}

/** Rough quality score (0..1) — higher is better. */
function scoreMatch(haystack: string, needle: string): number {
  if (!needle) return 1;
  if (haystack.startsWith(needle)) return 1;
  const idx = haystack.indexOf(needle);
  if (idx !== -1) return 0.9 - Math.min(idx / haystack.length, 0.5);
  /* Subsequence fallback: density of matches, capped. */
  let hits = 0;
  let hi = 0;
  for (let ni = 0; ni < needle.length && hi < haystack.length; hi++) {
    if (haystack.charCodeAt(hi) === needle.charCodeAt(ni)) {
      hits += 1;
      ni += 1;
    }
  }
  return hits === needle.length ? 0.4 + 0.4 * (hits / haystack.length) : 0;
}

export function filterAndSort(
  candidates: MentionCandidate[],
  query: string,
): MentionCandidate[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    /* No query: show chapters then codex alphabetically — the most
     * common reach is "what happens in chapter 3" in a fresh thread. */
    return [...candidates].sort((a, b) => {
      if (a.type !== b.type) return a.type === "chapter" ? -1 : 1;
      if (a.type === "chapter" && b.type === "chapter") {
        return a.chapterNumber - b.chapterNumber;
      }
      return a.name.localeCompare(b.name);
    });
  }

  const scored = candidates
    .map((c) => {
      const haystacks = [c.name.toLowerCase()];
      if (c.type === "codex") {
        for (const a of c.aliases) haystacks.push(a.toLowerCase());
      }
      let best = 0;
      for (const h of haystacks) {
        if (!subsequenceMatch(h, needle)) continue;
        const s = scoreMatch(h, needle);
        if (s > best) best = s;
      }
      return { item: c, score: best };
    })
    .filter((r) => r.score > 0);

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    /* Tie break: codex first (authors usually mean a character), then
     * alphabetical for stability. */
    if (a.item.type !== b.item.type) {
      return a.item.type === "codex" ? -1 : 1;
    }
    return a.item.name.localeCompare(b.item.name);
  });

  return scored.map((r) => r.item);
}
