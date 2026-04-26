"use client";

/**
 * Lightweight hover card for codex-highlighted spans in the editor.
 *
 * shadcn/ui's Radix HoverCard isn't installed in this project, and wiring
 * up Radix for a single tooltip isn't worth 20kB of runtime. We build a
 * pinned-to-rect popover using a portal — the ChapterEditor's host hook
 * tracks `mouseover` / `mouseout` on the editor root and feeds us the
 * decoration element's bounding rect.
 *
 * Click on the underlined span navigates to the codex page scoped to that
 * entry type; we let the host own that behavior because the hover card
 * itself is presentational.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import {
  BookOpen,
  GitBranch,
  MapPin,
  Package,
  User,
  Users,
} from "@/lib/lucide-icons";
import type { CodexEntry } from "@/lib/codex/types";
import { CODEX_TYPE_META, type CodexEntryType } from "@/lib/codex/types";
import { cn } from "@/lib/utils/cn";
import type { CodexEntryTypeDb } from "@/types/database.types";

export type CodexHoverCardProps = {
  entry: CodexEntry | null;
  anchorRect: DOMRect | null;
  bookId: string;
  /**
   * Called when the user moves into the card; host uses it to suppress the
   * "mouseleave → close" timer.
   */
  onEnter?: () => void;
  onLeave?: () => void;
  /** When the hovered entry is series-scoped, display a "Series: {name}"
   * badge in the header so the author knows this match is shared across
   * every book in the series. Null for project-scoped entries (or when we
   * don't know the series name). */
  seriesName?: string | null;
};

const TYPE_ICON: Record<CodexEntryType, (props: { className?: string }) => JSX.Element> = {
  character: (p) => <User {...p} />,
  location: (p) => <MapPin {...p} />,
  object: (p) => <Package {...p} />,
  lore: (p) => <BookOpen {...p} />,
  faction: (p) => <Users {...p} />,
  subplot: (p) => <GitBranch {...p} />,
};

function iconForType(type: CodexEntryTypeDb): (props: { className?: string }) => JSX.Element {
  return TYPE_ICON[type as CodexEntryType] ?? ((p) => <BookOpen {...p} />);
}

const DESCRIPTION_CHAR_CAP = 200;

function truncateDescription(raw: string): string {
  if (!raw) return "";
  const flat = raw.replace(/\s+/g, " ").trim();
  if (flat.length <= DESCRIPTION_CHAR_CAP) return flat;
  return `${flat.slice(0, DESCRIPTION_CHAR_CAP)}…`;
}

export function CodexHoverCard({
  entry,
  anchorRect,
  bookId,
  onEnter,
  onLeave,
  seriesName = null,
}: CodexHoverCardProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !entry || !anchorRect) return null;

  const meta = CODEX_TYPE_META[entry.entry_type as CodexEntryType] ?? null;
  const Icon = iconForType(entry.entry_type);
  const summary = entry.summary?.trim() ?? "";
  const description = truncateDescription(
    summary || entry.description_md || "",
  );

  /* Pin above the span by default, flip below if the rect is near the
   * viewport top. Horizontally snap to the left edge of the span, clamped
   * to a small gutter so narrow spans near the right edge don't produce
   * an overflow-clipped card. */
  const CARD_WIDTH = 320;
  const CARD_GUTTER = 12;
  const preferAbove = anchorRect.top > 160;
  const top = preferAbove
    ? Math.max(8, anchorRect.top - 8 - 180)
    : Math.min(window.innerHeight - 200, anchorRect.bottom + 8);
  const left = Math.max(
    CARD_GUTTER,
    Math.min(window.innerWidth - CARD_WIDTH - CARD_GUTTER, anchorRect.left),
  );

  const codexHref = `/projects/${bookId}/codex?entry=${entry.id}`;

  return createPortal(
    <div
      className="pointer-events-auto fixed z-50 w-[320px] rounded-xl border border-border/70 bg-card/95 p-3 shadow-2xl backdrop-blur-md"
      style={{ top, left }}
      role="tooltip"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/70 bg-editorial-bg/60",
            meta?.iconClass,
          )}
          aria-hidden
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-editorial-cream">
            {entry.name}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] uppercase tracking-wide text-editorial-muted">
            <span>{meta?.label ?? entry.entry_type}</span>
            {(entry.scope === "series" || entry.scope === "shared") && seriesName ? (
              <span
                className="inline-flex items-center rounded-full border border-gold/40 bg-gold/10 px-1.5 py-0 normal-case text-gold"
                title="This entry is shared across every book in this series."
              >
                Series: {seriesName}
              </span>
            ) : null}
            {entry.aliases.length > 0 ? (
              <span className="normal-case text-editorial-muted/80">
                · also: {entry.aliases.slice(0, 3).join(", ")}
                {entry.aliases.length > 3 ? "…" : ""}
              </span>
            ) : null}
          </p>
        </div>
      </div>
      {description ? (
        <p className="mt-2 line-clamp-5 text-xs leading-relaxed text-editorial-cream/80">
          {description}
        </p>
      ) : (
        <p className="mt-2 text-xs italic text-editorial-muted">
          No description yet.
        </p>
      )}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/50 pt-2">
        <span className="text-[11px] text-editorial-muted">
          {entry.ai_scope === "always"
            ? "AI: always included"
            : entry.ai_scope === "on_match"
              ? "AI: when mentioned"
              : "AI: never"}
        </span>
        <Link
          href={codexHref}
          className="text-[11px] font-medium text-gold hover:underline"
          prefetch={false}
        >
          Open in codex →
        </Link>
      </div>
    </div>,
    document.body,
  );
}
