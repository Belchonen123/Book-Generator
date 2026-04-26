"use client";

import Link from "next/link";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowDown, ArrowUp, BookOpen } from "@/lib/lucide-icons";
import { cn } from "@/lib/utils/cn";

import type { StandaloneBookRow } from "./convert-wizard";

/**
 * Step 1: pick the books that will form the new series.
 *
 * The list is split into two panels:
 *   - "Your standalone books" on the left — every book not currently in a
 *     series. Clicking adds it to the selection.
 *   - "Books in this series" on the right — the ordered selection. The
 *     order here *is* the reading order, and the user can nudge rows up /
 *     down. Minimum two books to advance.
 *
 * We avoid drag-and-drop here because the codebase doesn't ship a shared
 * sortable primitive for simple lists; ↑ / ↓ buttons are both accessible
 * and do not require an extra dependency.
 */
export function SelectBooksStep({
  books,
  orderedBookIds,
  onChange,
  totalWords,
  totalChapters,
}: {
  books: StandaloneBookRow[];
  orderedBookIds: string[];
  onChange: (next: string[]) => void;
  totalWords: number;
  totalChapters: number;
}) {
  const byId = useMemo(() => new Map(books.map((b) => [b.id, b])), [books]);
  const selectedSet = useMemo(() => new Set(orderedBookIds), [orderedBookIds]);
  const available = useMemo(
    () => books.filter((b) => !selectedSet.has(b.id)),
    [books, selectedSet],
  );
  const selectedRows = orderedBookIds
    .map((id) => byId.get(id))
    .filter((b): b is StandaloneBookRow => Boolean(b));

  const add = (id: string) => onChange([...orderedBookIds, id]);
  const remove = (id: string) =>
    onChange(orderedBookIds.filter((bid) => bid !== id));
  const move = (id: string, dir: -1 | 1) => {
    const idx = orderedBookIds.indexOf(id);
    if (idx < 0) return;
    const next = [...orderedBookIds];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap]!, next[idx]!];
    onChange(next);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section>
        <h2 className="font-serif text-lg text-editorial-cream">
          Your standalone books
        </h2>
        <p className="mt-1 text-xs text-editorial-muted">
          {available.length} book{available.length === 1 ? "" : "s"} not yet
          assigned to a series.
        </p>
        <ul className="mt-3 divide-y divide-border/60 rounded-md border border-border/60 bg-card/30">
          {available.length === 0 ? (
            <li className="p-4 text-center text-xs text-editorial-muted">
              Everything is already queued for this series.
            </li>
          ) : (
            available.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => add(b.id)}
                  className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-card/70"
                >
                  <BookCover book={b} />
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 text-sm text-editorial-cream">
                      {b.title}
                    </div>
                    <div className="mt-0.5 text-[11px] text-editorial-muted">
                      {b.status} · {b.chapterCount} chapter
                      {b.chapterCount === 1 ? "" : "s"} ·{" "}
                      {b.word_count.toLocaleString()} words ·{" "}
                      {b.codexCount} codex
                    </div>
                  </div>
                  <span className="text-xs text-gold">Add →</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </section>

      <section>
        <div className="flex items-end justify-between gap-2">
          <div>
            <h2 className="font-serif text-lg text-editorial-cream">
              Books in this series
            </h2>
            <p className="mt-1 text-xs text-editorial-muted">
              {selectedRows.length === 0
                ? "Pick at least two — add books from the left."
                : `${selectedRows.length} book${selectedRows.length === 1 ? "" : "s"} · ${totalChapters} chapter${totalChapters === 1 ? "" : "s"} · ${totalWords.toLocaleString()} words`}
            </p>
          </div>
          {selectedRows.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange([])}
            >
              Clear
            </Button>
          ) : null}
        </div>

        {selectedRows.length > 0 && selectedRows.length < 2 ? (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold">
                A series needs at least two books.
              </p>
              <p className="text-amber-100/90">
                Add one more book from the left to continue, or{" "}
                <Link
                  href="/dashboard/series"
                  className="underline underline-offset-2 hover:text-amber-50"
                >
                  add this book to an existing series instead
                </Link>
                . You don&apos;t need any codex entries — the review step just
                lets you merge duplicates when they exist.
              </p>
            </div>
          </div>
        ) : null}

        <ol
          className={cn(
            "mt-3 divide-y divide-border/60 rounded-md border bg-card/30",
            selectedRows.length < 2 ? "border-amber-500/40" : "border-border/60",
          )}
        >
          {selectedRows.length === 0 ? (
            <li className="p-6 text-center text-xs text-editorial-muted">
              No books selected yet.
            </li>
          ) : (
            selectedRows.map((b, idx) => (
              <li key={b.id} className="flex items-center gap-3 p-3">
                <span className="w-6 shrink-0 text-center text-xs font-semibold text-gold">
                  {idx + 1}
                </span>
                <BookCover book={b} />
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-1 text-sm text-editorial-cream">
                    {b.title}
                  </div>
                  <div className="mt-0.5 text-[11px] text-editorial-muted">
                    {b.chapterCount} chapter{b.chapterCount === 1 ? "" : "s"} ·{" "}
                    {b.word_count.toLocaleString()} words · {b.codexCount}{" "}
                    codex
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    className="rounded border border-border/60 p-1 text-editorial-muted hover:text-editorial-cream disabled:opacity-40"
                    onClick={() => move(b.id, -1)}
                    disabled={idx === 0}
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    className="rounded border border-border/60 p-1 text-editorial-muted hover:text-editorial-cream disabled:opacity-40"
                    onClick={() => move(b.id, 1)}
                    disabled={idx === selectedRows.length - 1}
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    className="rounded px-2 py-1 text-[11px] text-editorial-muted hover:text-red-400"
                    onClick={() => remove(b.id)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))
          )}
        </ol>
      </section>
    </div>
  );
}

function BookCover({ book }: { book: StandaloneBookRow }) {
  if (book.cover_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={book.cover_url}
        alt=""
        className="h-12 w-8 shrink-0 rounded-sm object-cover"
      />
    );
  }
  return (
    <div
      className="flex h-12 w-8 shrink-0 items-center justify-center rounded-sm border border-border/60 bg-background/40"
      aria-hidden
    >
      <BookOpen className="h-3 w-3 text-editorial-muted" />
    </div>
  );
}
