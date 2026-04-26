"use client";

import Link from "next/link";

import { cn } from "@/lib/utils/cn";
import type { ChapterStatusDb } from "@/types/database.types";

import type { ChapterListItem } from "./chapter-editor/types";

export type ChapterMiniRailProps = {
  chapters: ChapterListItem[];
  activeChapterId: string;
  bookId: string;
};

/**
 * Status → Tailwind class map for the rail dot. Mirrors the ChapterEditor
 * sidebar StatusDot palette. The `generating` variant pulses in gold so the
 * rail matches the Loader2 spinner shown elsewhere; `motion-reduce` swaps the
 * animation for a static ring so users with reduced-motion preferences still
 * get a visual cue.
 */
const STATUS_DOT_CLASS: Record<ChapterStatusDb, string> = {
  pending: "bg-editorial-muted/50",
  generating:
    "bg-gold animate-pulse motion-reduce:animate-none motion-reduce:ring-1 motion-reduce:ring-gold/60",
  draft: "bg-sky-400",
  edited: "bg-purple-400",
  approved: "bg-emerald-400",
};

/**
 * Floating vertical rail of chapter status dots anchored to the left gutter
 * of the ChapterEditor on md+ viewports. Hovering a dot expands a textual
 * label; clicking navigates to that chapter. Hidden when there is only a
 * single chapter (nothing to navigate to).
 */
export function ChapterMiniRail({
  chapters,
  activeChapterId,
  bookId,
}: ChapterMiniRailProps) {
  if (chapters.length <= 1) return null;

  return (
    <nav
      aria-label="Chapter rail"
      className="fixed left-3 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-1.5 animate-in fade-in slide-in-from-left-2 duration-300 motion-reduce:animate-none md:flex"
    >
      {chapters.map((c) => {
        const isActive = c.id === activeChapterId;
        const label = `Ch ${c.chapter_number} · ${c.title}`;
        return (
          <Link
            key={c.id}
            href={`/projects/${bookId}/chapters/${c.id}`}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
            className="group relative flex h-[10px] w-[10px] items-center justify-start"
          >
            <span
              className={cn(
                "block rounded-full transition-all duration-200",
                isActive
                  ? "h-5 w-5 ring-2 ring-gold ring-offset-2 ring-offset-editorial-bg"
                  : "h-[10px] w-[10px]",
                STATUS_DOT_CLASS[c.status],
              )}
              aria-hidden
            />
            <span
              role="tooltip"
              className="pointer-events-none absolute left-full ml-3 hidden whitespace-nowrap rounded-md border border-border bg-card px-3 py-1.5 font-serif text-sm text-editorial-cream shadow-lg group-hover:block group-focus-visible:block"
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
