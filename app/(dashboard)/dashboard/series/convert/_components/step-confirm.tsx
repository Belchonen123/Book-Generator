"use client";

import { useMemo } from "react";

import { BookOpen, Sparkles } from "@/lib/lucide-icons";

import type { ConversionPreview } from "../actions";

import type { StandaloneBookRow } from "./convert-wizard";
import type { MergeDecision } from "./step-review-codex";

/**
 * Step 3: final review. Shows the exact shape of what will be created
 * so the user can spot any surprises before committing. Nothing on this
 * screen is editable — the user can always click "Back" to revise.
 */
export function ConfirmStep({
  selectedBooks,
  preview,
  decisions,
  seriesName,
  seriesDescription,
}: {
  selectedBooks: StandaloneBookRow[];
  preview: ConversionPreview;
  decisions: Map<string, MergeDecision>;
  seriesName: string;
  seriesDescription: string;
}) {
  const totals = useMemo(() => {
    let mergeGroups = 0;
    let mergedEntries = 0;
    for (const g of preview.mergeGroups) {
      const d = decisions.get(g.groupKey);
      if ((d?.action ?? "merge") === "merge") {
        mergeGroups += 1;
        // Every non-canonical instance in a merge group turns into either
        // an overlay (if it differs) or a clean deletion (if identical).
        mergedEntries += g.instances.length - 1;
      }
    }
    return { mergeGroups, mergedEntries };
  }, [preview, decisions]);

  const effectiveName = seriesName.trim() || "Untitled series";

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-border/60 bg-card/30 p-4">
        <h2 className="font-serif text-lg text-editorial-cream">Series</h2>
        <p className="mt-1 text-sm text-editorial-cream">{effectiveName}</p>
        {seriesDescription.trim() ? (
          <p className="mt-1 text-xs text-editorial-muted">
            {seriesDescription.trim()}
          </p>
        ) : null}
      </section>

      <section className="rounded-md border border-border/60 bg-card/30 p-4">
        <div className="flex items-end justify-between gap-2">
          <div>
            <h2 className="font-serif text-lg text-editorial-cream">
              Books & reading order
            </h2>
            <p className="mt-1 text-xs text-editorial-muted">
              These books will be linked to the new series in this order.
            </p>
          </div>
          <span className="text-xs text-editorial-muted">
            {selectedBooks.length} book{selectedBooks.length === 1 ? "" : "s"}
          </span>
        </div>
        <ol className="mt-3 divide-y divide-border/40 rounded-md border border-border/40">
          {selectedBooks.map((b, idx) => (
            <li key={b.id} className="flex items-center gap-3 p-3">
              <span className="w-6 shrink-0 text-center text-xs font-semibold text-gold">
                {idx + 1}
              </span>
              {b.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={b.cover_url}
                  alt=""
                  className="h-10 w-7 shrink-0 rounded-sm object-cover"
                />
              ) : (
                <div
                  className="flex h-10 w-7 shrink-0 items-center justify-center rounded-sm border border-border/60 bg-background/40"
                  aria-hidden
                >
                  <BookOpen className="h-3 w-3 text-editorial-muted" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="line-clamp-1 text-sm text-editorial-cream">
                  {b.title}
                </div>
                <div className="mt-0.5 text-[11px] text-editorial-muted">
                  {b.chapterCount} chapter{b.chapterCount === 1 ? "" : "s"} ·{" "}
                  {b.word_count.toLocaleString()} words
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-md border border-border/60 bg-card/30 p-4">
        <h2 className="font-serif text-lg text-editorial-cream">
          Codex migration plan
        </h2>
        <ul className="mt-2 space-y-1 text-sm text-editorial-muted">
          <li>
            <span className="text-editorial-cream">
              {preview.totalCodexEntries}
            </span>{" "}
            existing codex entr
            {preview.totalCodexEntries === 1 ? "y" : "ies"} will be preserved.
          </li>
          <li>
            <span className="text-editorial-cream">{totals.mergeGroups}</span>{" "}
            entry name{totals.mergeGroups === 1 ? "" : "s"} will be unified
            across books ({totals.mergedEntries} duplicate row
            {totals.mergedEntries === 1 ? "" : "s"} resolved).
          </li>
          <li>
            Books whose entry differs from the canonical version will get a
            per-book overlay so local details aren&apos;t lost.
          </li>
          <li className="flex items-start gap-2 pt-1 text-editorial-muted">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
            Chapter-by-chapter summaries will re-run under the new series
            context so later books inherit canon from earlier ones. This runs
            in the background after the conversion completes.
          </li>
        </ul>
      </section>

      <p className="text-xs text-editorial-muted">
        This operation is non-destructive for your manuscripts — only codex
        metadata is reshaped. You can remove a book from the series at any
        time from the series dashboard.
      </p>
    </div>
  );
}
