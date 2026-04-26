"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ArrowLeft, History, Loader2, X } from "@/lib/lucide-icons";
import { cn } from "@/lib/utils/cn";
import type { ChapterRevisionSource } from "@/types/database.types";

import { restoreRevisionAction } from "../actions";

export type RevisionListItem = {
  id: string;
  source: ChapterRevisionSource;
  title_snapshot: string;
  word_count: number;
  preview: string;
  content: string;
  created_at: string;
  /** Positive if this revision is larger than the previous row in time-sorted order; negative if smaller. */
  wordDelta: number;
};

export type RevisionsListProps = {
  bookId: string;
  chapterId: string;
  chapterTitle: string;
  revisions: RevisionListItem[];
  totalStored: number;
  viewLimit: number;
  tierIsFree: boolean;
};

const SOURCE_LABEL: Record<ChapterRevisionSource, string> = {
  generation: "First generation",
  regenerate: "Regenerate",
  manual_save: "Manual edit",
  assist_expand: "Expand",
  assist_tone: "Tone",
  restore: "Restore",
  rewrite_transition: "Transition rewrite",
  regenerate_for_outline: "Outline sync rewrite",
  find_replace: "Find & replace",
};

const SOURCE_BADGE_CLASS: Record<ChapterRevisionSource, string> = {
  generation: "bg-emerald-500/15 text-emerald-300",
  regenerate: "bg-amber-500/15 text-amber-300",
  manual_save: "bg-sky-500/15 text-sky-300",
  assist_expand: "bg-violet-500/15 text-violet-300",
  assist_tone: "bg-fuchsia-500/15 text-fuchsia-300",
  restore: "bg-gold/15 text-gold",
  rewrite_transition: "bg-teal-500/15 text-teal-200",
  regenerate_for_outline: "bg-cyan-500/15 text-cyan-200",
  find_replace: "bg-amber-500/10 text-amber-100/90",
};

/** Lightweight "3 hours ago" formatter — avoids pulling in date-fns for one use. */
function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return "just now";
  const sec = Math.floor(diffMs / 1000);
  if (sec < 45) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} day${day === 1 ? "" : "s"} ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? "" : "s"} ago`;
  const yr = Math.floor(mo / 12);
  return `${yr} year${yr === 1 ? "" : "s"} ago`;
}

function formatDelta(delta: number): { label: string; tone: "up" | "down" | "zero" } {
  if (delta > 0) return { label: `+${delta.toLocaleString()} words`, tone: "up" };
  if (delta < 0)
    return { label: `${delta.toLocaleString()} words`, tone: "down" };
  return { label: "no word change", tone: "zero" };
}

export function RevisionsList({
  bookId,
  chapterId,
  chapterTitle,
  revisions,
  totalStored,
  viewLimit,
  tierIsFree,
}: RevisionsListProps) {
  const router = useRouter();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const preview = useMemo(
    () => revisions.find((r) => r.id === previewId) ?? null,
    [previewId, revisions],
  );

  const onRestore = async (id: string) => {
    if (restoringId) return;
    if (
      !confirm(
        "Restore this version? Your current chapter text is snapshotted first, so you can undo the restore if needed.",
      )
    ) {
      return;
    }
    setRestoringId(id);
    try {
      const r = await restoreRevisionAction(id);
      if (!r.ok) {
        toast.error(r.error ?? "Could not restore this version.");
        return;
      }
      toast.success("Version restored.");
      router.refresh();
      router.push(`/projects/${bookId}/chapters/${chapterId}`);
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="gap-1 text-editorial-muted hover:text-gold"
          >
            <Link href={`/projects/${bookId}/chapters/${chapterId}`}>
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to chapter
            </Link>
          </Button>
          <h1 className="mt-3 font-serif text-2xl text-editorial-cream md:text-3xl">
            Version history
          </h1>
          <p className="mt-1 text-sm text-editorial-muted">
            Chapter: <span className="text-editorial-cream">{chapterTitle}</span>
          </p>
        </div>
        <div className="hidden rounded-md border border-border/60 bg-card/30 px-3 py-2 text-xs text-editorial-muted sm:block">
          <p>
            Showing {revisions.length} of {totalStored} stored.
          </p>
          {tierIsFree && totalStored > viewLimit ? (
            <p className="mt-1">
              <Link
                href="/dashboard/settings"
                className="font-medium text-gold hover:underline"
              >
                Upgrade to Pro
              </Link>{" "}
              to view up to 50 per chapter.
            </p>
          ) : null}
        </div>
      </div>

      {revisions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border/60 bg-card/40 py-16 text-center">
          <History className="h-8 w-8 text-editorial-muted" aria-hidden />
          <p className="font-serif text-lg text-editorial-cream">No revisions yet</p>
          <p className="max-w-sm text-sm text-editorial-muted">
            Generations and saves older than a few minutes will appear here so you can
            preview and restore them.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {revisions.map((rev) => {
            const badgeClass = SOURCE_BADGE_CLASS[rev.source];
            const label = SOURCE_LABEL[rev.source];
            const delta = formatDelta(rev.wordDelta);
            const isRestoring = restoringId === rev.id;
            return (
              <li
                key={rev.id}
                className="rounded-lg border border-border/60 bg-card/30 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                      badgeClass,
                    )}
                  >
                    {label}
                  </span>
                  <span className="text-xs text-editorial-muted">
                    {timeAgo(rev.created_at)}
                  </span>
                  <span
                    className={cn(
                      "text-xs",
                      delta.tone === "up" && "text-emerald-300",
                      delta.tone === "down" && "text-amber-300",
                      delta.tone === "zero" && "text-editorial-muted",
                    )}
                  >
                    · {rev.word_count.toLocaleString()} words ({delta.label})
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-editorial-muted">
                  {rev.preview}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewId(rev.id)}
                  >
                    Preview
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-gold text-editorial-bg hover:bg-gold/90"
                    disabled={isRestoring || Boolean(restoringId)}
                    onClick={() => void onRestore(rev.id)}
                  >
                    {isRestoring ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
                        Restoring…
                      </>
                    ) : (
                      "Restore this version"
                    )}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {preview ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6"
          onClick={() => setPreviewId(null)}
          role="presentation"
        >
          <div
            className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-editorial-bg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="revision-preview-title"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-3">
              <div>
                <p
                  id="revision-preview-title"
                  className="font-serif text-lg text-editorial-cream"
                >
                  {preview.title_snapshot}
                </p>
                <p className="text-xs text-editorial-muted">
                  <span className={cn("font-medium", SOURCE_BADGE_CLASS[preview.source])}>
                    {SOURCE_LABEL[preview.source]}
                  </span>
                  {" · "}
                  {timeAgo(preview.created_at)} ·{" "}
                  {preview.word_count.toLocaleString()} words
                </p>
              </div>
              <button
                type="button"
                className="rounded p-1 text-editorial-muted hover:bg-muted/40 hover:text-editorial-cream"
                onClick={() => setPreviewId(null)}
                aria-label="Close preview"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-editorial-cream">
                {preview.content}
              </pre>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 px-5 py-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreviewId(null)}
              >
                Close
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-gold text-editorial-bg hover:bg-gold/90"
                disabled={restoringId === preview.id || Boolean(restoringId)}
                onClick={() => {
                  const id = preview.id;
                  setPreviewId(null);
                  void onRestore(id);
                }}
              >
                Restore this version
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
