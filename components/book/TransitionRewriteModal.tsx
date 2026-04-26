"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Loader2, X } from "@/lib/lucide-icons";
import { cn } from "@/lib/utils/cn";

export type TransitionRewriteResultRow = {
  chapterId: string;
  title: string;
  ok: boolean;
  error?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** True while the API request is in flight. */
  busy: boolean;
  /** Set after the API returns. */
  results: TransitionRewriteResultRow[] | null;
  summary: { updated: number; total: number } | null;
  bookId: string;
  requestError: string | null;
};

/**
 * Shown after the user choses to rewrite handoffs for reordered chapters.
 * One network round-trip rewrites all supplied chapter ids on the server.
 */
export function TransitionRewriteModal({
  open,
  onClose,
  busy,
  results,
  summary,
  bookId,
  requestError,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Transition rewrite"
    >
      <button
        type="button"
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        aria-label="Close"
        onClick={busy ? undefined : onClose}
      />
      <div
        className={cn(
          "relative z-[61] w-full max-w-lg overflow-hidden rounded-t-xl border border-border/60 bg-card shadow-2xl sm:rounded-xl",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <h2 className="font-serif text-lg text-gold">Rewrite transitions</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={busy}
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="max-h-[min(70vh,480px)] space-y-4 overflow-y-auto px-4 py-4">
          {busy ? (
            <p className="flex items-center gap-2 text-sm text-editorial-muted">
              <Loader2 className="h-4 w-4 animate-spin text-gold" aria-hidden />
              Rewriting opening and closing paragraphs for the selected chapters…
            </p>
          ) : null}
          {requestError && !busy ? (
            <p className="text-sm text-destructive-foreground">{requestError}</p>
          ) : null}
          {!busy && !requestError && summary && results ? (
            <>
              <p className="text-sm text-editorial-cream">
                {summary.updated} of {summary.total} chapter{summary.total === 1 ? "" : "s"} updated.
              </p>
              <ul className="space-y-2 text-sm">
                {results.map((r) => (
                  <li
                    key={r.chapterId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/50 bg-editorial-bg/50 px-3 py-2"
                  >
                    <span className="text-editorial-muted">
                      {r.title}
                      {r.ok ? null : <span className="ml-2 text-rose-400">— {r.error}</span>}
                    </span>
                    {r.ok ? (
                      <Link
                        className="text-xs text-gold underline hover:text-gold/90"
                        href={`/projects/${bookId}/chapters/${r.chapterId}/revisions`}
                      >
                        Compare
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
        <div className="border-t border-border/60 px-4 py-3">
          <Button
            type="button"
            className="w-full"
            onClick={onClose}
            disabled={busy}
          >
            {busy ? "Working…" : "Done"}
          </Button>
        </div>
      </div>
    </div>
  );
}
