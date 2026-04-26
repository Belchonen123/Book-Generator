"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { BANNED_PHRASES } from "@/lib/ai/banned-phrases";
import type {
  BannedPhraseCategory,
  BannedPhraseReplacementExample,
} from "@/lib/ai/banned-phrases";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const CATEGORY_LABEL: Record<BannedPhraseCategory, string> = {
  descriptive_tics: "Descriptive tics",
  emotional_telegraphs: "Emotional telegraphs",
  pinterest_endings: "Pinterest-style endings",
  authorial_wisdom: "Authorial wisdom",
  gauzy_world_is_watching: "Gauzy “world is watching”",
  business_self_help_clichés: "Self-help / business clichés",
  bullet_point_narrative: "Bullet-point narrative",
  real_public_figures: "Real public figures",
  blurb_boilerplate: "Blurb boilerplate",
  nonfiction_banned_move: "Non-fiction banned move",
};

function teachingForOrder(order: number): {
  guidance: string;
  example: BannedPhraseReplacementExample;
} | null {
  const row = BANNED_PHRASES.find((p) => p.order === order);
  if (!row) return null;
  const g = row.replacementGuidance.trim();
  if (!g) return null;
  return { guidance: g, example: row.replacementExample };
}

export type SlopPopoverState = {
  order: number;
  pattern: string;
  category: BannedPhraseCategory;
  matchedText: string;
  from: number;
  to: number;
  rect: DOMRect;
};

type SlopHoverCardProps = {
  state: SlopPopoverState | null;
  onClose: () => void;
  onIgnore: () => void;
  onDeleteMatch: () => void;
  onRewriteParagraph: () => void;
  busy: boolean;
};

const CARD_WIDTH = 340;
const CARD_GUTTER = 12;

export function SlopHoverCard({
  state,
  onClose,
  onIgnore,
  onDeleteMatch,
  onRewriteParagraph,
  busy,
}: SlopHoverCardProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, onClose]);

  if (!mounted || !state) return null;

  const teaching = teachingForOrder(state.order);
  const preferAbove = state.rect.top > 200;
  const top = preferAbove
    ? Math.max(8, state.rect.top - 8 - 220)
    : Math.min(window.innerHeight - 240, state.rect.bottom + 8);
  const left = Math.max(
    CARD_GUTTER,
    Math.min(window.innerWidth - CARD_WIDTH - CARD_GUTTER, state.rect.left),
  );

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-[200] cursor-default bg-transparent"
        aria-label="Close slop popover"
        onClick={onClose}
      />
      <div
        className={cn(
          "fixed z-[201] max-h-[min(70vh,420px)] w-[min(100vw-24px,340px)] overflow-y-auto rounded-lg border border-amber-500/30 bg-editorial-bg/98 p-4 text-sm shadow-xl backdrop-blur-sm",
        )}
        style={{ top, left, width: CARD_WIDTH }}
        role="dialog"
        aria-label="Slop phrase actions"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-200/90">
          {CATEGORY_LABEL[state.category] ?? state.category}
        </p>
        <p className="mt-2 text-xs text-editorial-muted">Matched pattern</p>
        <p className="mt-0.5 font-mono text-[13px] text-editorial-cream/95">
          {state.pattern}
        </p>
        {state.matchedText ? (
          <>
            <p className="mt-2 text-xs text-editorial-muted">In your text</p>
            <p className="mt-0.5 italic text-amber-100/95">&ldquo;{state.matchedText}&rdquo;</p>
          </>
        ) : null}
        {teaching ? (
          <>
            <p className="mt-3 text-xs text-editorial-muted">Try instead</p>
            <p className="mt-0.5 text-editorial-cream/90">{teaching.guidance}</p>
            <p className="mt-2 text-xs text-editorial-muted">Example</p>
            <p className="mt-0.5 text-xs italic text-amber-100/90">
              Not: &ldquo;{teaching.example.instead_of}&rdquo;
            </p>
            <p className="mt-1 text-xs text-editorial-cream/90">
              Yes: &ldquo;{teaching.example.write}&rdquo;
            </p>
          </>
        ) : null}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8"
            disabled={busy}
            onClick={onIgnore}
          >
            Ignore
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8"
            disabled={busy}
            onClick={onDeleteMatch}
          >
            Delete match
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 bg-gold font-medium text-editorial-bg hover:bg-gold/90"
            disabled={busy}
            onClick={onRewriteParagraph}
          >
            {busy ? "Rewriting…" : "Rewrite this paragraph"}
          </Button>
        </div>
      </div>
    </>,
    document.body,
  );
}

export type DeepSlopItem = {
  text: string;
  reason: string;
  suggested_replacement: string;
};

type SlopDeepPanelProps = {
  items: DeepSlopItem[];
  onClose: () => void;
};

export function SlopDeepPanel({ items, onClose }: SlopDeepPanelProps) {
  if (items.length === 0) return null;
  return (
    <div className="border-t border-amber-500/25 bg-amber-950/20 px-4 py-3 text-sm sm:px-6">
      <div className="mx-auto flex max-w-4xl items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-200/80">
            Deep slop scan
          </p>
          <p className="mt-1 text-xs text-editorial-muted">
            Phrases a regex can miss. Cross-check the suggestions against your voice.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-xs text-gold hover:underline"
        >
          Dismiss
        </button>
      </div>
      <ul className="mx-auto mt-3 max-w-4xl list-inside list-disc space-y-2 text-editorial-cream/95">
        {items.map((it, i) => (
          <li key={i} className="pl-1">
            <span className="font-medium text-amber-100/95">&ldquo;{it.text}&rdquo;</span>
            {it.reason ? (
              <span className="text-editorial-muted"> — {it.reason}</span>
            ) : null}
            {it.suggested_replacement ? (
              <p className="mt-0.5 text-xs text-editorial-muted">
                Suggested: {it.suggested_replacement}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
