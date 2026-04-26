"use client";

import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  createBookInSeriesAction,
  removeBookFromSeriesAction,
  reorderSeriesBooksAction,
} from "@/app/(dashboard)/dashboard/series/actions";
import { summarizeBookForSeriesAction } from "@/app/(dashboard)/dashboard/series/summarize/actions";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  GripVertical,
  Link2Off,
  Loader2,
  Plus,
  Sparkles,
} from "@/lib/lucide-icons";
import { cn } from "@/lib/utils/cn";

import type { OrphanBookRow, SeriesBookRow } from "../series-detail-shell";

import { AddBooksToSeriesModal } from "./add-books-to-series-modal";

/**
 * Short relative-time formatter for the "series summary generated" badge.
 * Falls back to an ISO date if Intl.RelativeTimeFormat is unavailable.
 */
function formatRelativeTime(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const deltaSec = Math.round((Date.now() - then.getTime()) / 1000);
  try {
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
    if (deltaSec < 60) return rtf.format(-deltaSec, "second");
    if (deltaSec < 3_600) return rtf.format(-Math.round(deltaSec / 60), "minute");
    if (deltaSec < 86_400) return rtf.format(-Math.round(deltaSec / 3_600), "hour");
    if (deltaSec < 2_592_000) return rtf.format(-Math.round(deltaSec / 86_400), "day");
    if (deltaSec < 31_536_000) return rtf.format(-Math.round(deltaSec / 2_592_000), "month");
    return rtf.format(-Math.round(deltaSec / 31_536_000), "year");
  } catch {
    return then.toISOString().slice(0, 10);
  }
}

function SortableBookCard({
  book,
  onRemove,
  removing,
  onSummarize,
  summarizing,
}: {
  book: SeriesBookRow;
  onRemove: (bookId: string) => void;
  removing: boolean;
  onSummarize: (bookId: string) => void;
  summarizing: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: book.id });

  return (
    <li
      ref={setNodeRef}
      className={cn(
        "flex items-start gap-3 rounded-lg border border-border/60 bg-card/50 p-3",
        isDragging && "z-20 opacity-90 shadow-lg",
      )}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        type="button"
        className="mt-1 touch-none rounded p-1 text-editorial-muted hover:text-gold"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-sm border border-border/60 bg-background">
        {book.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.cover_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BookOpen className="h-5 w-5 text-editorial-muted" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] uppercase tracking-wide text-editorial-muted">
            #{book.series_order ?? "?"}
          </span>
          <Link
            href={`/projects/${book.id}`}
            className="min-w-0 truncate font-serif text-base text-editorial-cream hover:text-gold"
          >
            {book.title}
          </Link>
        </div>
        {book.subtitle ? (
          <p className="truncate text-xs italic text-editorial-muted">
            {book.subtitle}
          </p>
        ) : null}
        <p className="mt-1 text-[11px] text-editorial-muted">
          <span className="uppercase tracking-wide">{book.status}</span> ·{" "}
          {book.word_count.toLocaleString()}w · {book.chapter_count} ch
        </p>
        {book.series_summary_generated_at ? (
          <p className="mt-0.5 text-[11px] text-gold/80">
            Series summary · {formatRelativeTime(book.series_summary_generated_at)}
          </p>
        ) : null}
        {book.series_plot_summary?.trim() || book.series_end_state_dossier?.trim() ? (
          <details className="mt-2 rounded-md border border-border/50 bg-background/50 px-2 py-1.5">
            <summary className="cursor-pointer list-none text-[11px] font-medium text-gold/85 outline-none hover:text-gold [&::-webkit-details-marker]:hidden">
              View plot summary &amp; end-state dossier
            </summary>
            <div className="mt-2 space-y-3 border-t border-border/40 pt-2">
              {book.series_plot_summary?.trim() ? (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-editorial-muted">
                    Plot summary
                  </p>
                  <div className="mt-1 max-h-56 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-editorial-cream/90">
                    {book.series_plot_summary.trim()}
                  </div>
                </div>
              ) : null}
              {book.series_end_state_dossier?.trim() ? (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-editorial-muted">
                    End-state dossier
                  </p>
                  <div className="mt-1 max-h-56 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-editorial-cream/90">
                    {book.series_end_state_dossier.trim()}
                  </div>
                </div>
              ) : null}
            </div>
          </details>
        ) : book.series_summary_generated_at ? (
          <p className="mt-1 text-[11px] text-editorial-muted">
            Summary timestamp is set but text is missing — try{" "}
            <span className="text-gold/80">Regenerate summary</span>.
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <div className="flex gap-2">
          <Link
            href={`/projects/${book.id}`}
            className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-xs text-editorial-cream hover:border-gold/60"
          >
            Open
          </Link>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={removing}
            onClick={() => onRemove(book.id)}
            title="Remove from series (the book stays in your library)"
          >
            <Link2Off className="mr-1 h-3.5 w-3.5" />
            Remove
          </Button>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={summarizing}
          onClick={() => onSummarize(book.id)}
          title={
            book.series_summary_generated_at
              ? "Regenerate the series summary, end-state dossier, and per-character end-states for this book"
              : "Generate a series summary, end-state dossier, and per-character end-states for this book"
          }
        >
          {summarizing ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="mr-1 h-3.5 w-3.5" />
          )}
          {book.series_summary_generated_at ? "Regenerate summary" : "Summarize for series"}
        </Button>
      </div>
    </li>
  );
}

export function BooksTab({
  seriesId,
  initialBooks,
  orphanBooks,
}: {
  seriesId: string;
  initialBooks: SeriesBookRow[];
  orphanBooks: OrphanBookRow[];
}) {
  const router = useRouter();
  const [books, setBooks] = useState<SeriesBookRow[]>(initialBooks);
  const [reorderBusy, setReorderBusy] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [summarizingId, setSummarizingId] = useState<string | null>(null);

  useEffect(() => setBooks(initialBooks), [initialBooks]);

  const ids = useMemo(() => books.map((b) => b.id), [books]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = books.findIndex((b) => b.id === String(active.id));
    const newIndex = books.findIndex((b) => b.id === String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(books, oldIndex, newIndex);
    setBooks(next.map((b, i) => ({ ...b, series_order: i + 1 })));
    setReorderBusy(true);
    const res = await reorderSeriesBooksAction(
      seriesId,
      next.map((b) => b.id),
    );
    setReorderBusy(false);
    if (!res.ok) {
      toast.error(res.error ?? "Could not save order.");
      setBooks(initialBooks);
    } else {
      router.refresh();
    }
  };

  const addBook = async () => {
    setAddBusy(true);
    const res = await createBookInSeriesAction(seriesId);
    setAddBusy(false);
    if (!res.ok) {
      toast.error(res.error ?? "Could not add book.");
      return;
    }
    router.push(`/projects/${res.bookId}`);
  };

  const remove = async (bookId: string) => {
    setRemovingId(bookId);
    const res = await removeBookFromSeriesAction(bookId);
    setRemovingId(null);
    if (!res.ok) {
      toast.error(res.error ?? "Could not remove book.");
      return;
    }
    toast.success("Book removed from series.");
    router.refresh();
  };

  const summarize = async (bookId: string) => {
    setSummarizingId(bookId);
    const pending = toast.loading("Summarizing book for the series…");
    const res = await summarizeBookForSeriesAction(bookId);
    toast.dismiss(pending);
    setSummarizingId(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    const parts: string[] = [`Plot summary: ${res.plotSummaryWords.toLocaleString()} words`];
    if (res.characterStatesPersisted > 0) {
      parts.push(`${res.characterStatesPersisted} character end-states`);
    }
    if (res.openArcsCount > 0) parts.push(`${res.openArcsCount} open arcs`);
    toast.success(parts.join(" · "));
    router.refresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-lg text-editorial-cream">
            Reading order
          </h2>
          <p className="text-xs text-editorial-muted">
            Drag to reorder. Positions feed "previously in series" context for
            later books in the series.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AddBooksToSeriesModal
            seriesId={seriesId}
            orphanBooks={orphanBooks}
          />
          <Button type="button" size="sm" disabled={addBusy} onClick={() => void addBook()}>
            {addBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="mr-1 h-3.5 w-3.5" />
                New book in this series
              </>
            )}
          </Button>
        </div>
      </div>
      {reorderBusy ? (
        <p className="mt-2 text-xs text-editorial-muted">Saving order…</p>
      ) : null}
      {books.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-editorial-muted">
          No books in this series yet. Create one to kick things off.
        </p>
      ) : (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <ol className="mt-4 space-y-3">
              {books.map((b) => (
                <SortableBookCard
                  key={b.id}
                  book={b}
                  onRemove={(id) => void remove(id)}
                  removing={removingId === b.id}
                  onSummarize={(id) => void summarize(id)}
                  summarizing={summarizingId === b.id}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
