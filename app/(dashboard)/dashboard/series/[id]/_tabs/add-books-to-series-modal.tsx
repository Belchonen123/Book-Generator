"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { moveBookToSeriesAction } from "@/app/(dashboard)/dashboard/series/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Loader2, Plus } from "@/lib/lucide-icons";
import {
  responsiveModalBackdrop,
  responsiveModalPanel,
  responsiveModalRoot,
} from "@/lib/ui/responsive-modal";

import type { OrphanBookRow } from "../series-detail-shell";

/**
 * Books-tab variant of the "add an existing book" picker.
 *
 * The `/dashboard/series` index uses `AddExistingBookToSeries`, which lets the
 * user pick BOTH the target series and the book. Here the series is already
 * known from the URL, so we:
 *   - drop the series `<select>` entirely,
 *   - allow multi-select so users can batch-link a backlog in one go (spec's
 *     "list users books...checkboxes...on confirm, call addBookToSeries for
 *     each selected book"),
 *   - call `moveBookToSeriesAction` per selected book because that action
 *     already handles series_order assignment, character-bible merging, and
 *     "previously in series" text generation.
 *
 * The `moveBookToSeriesAction` loop is sequential on purpose: each call
 * computes `max(series_order) + 1` at the time it runs, so running them in
 * parallel would race and assign duplicate positions.
 */
export function AddBooksToSeriesModal({
  seriesId,
  orphanBooks,
  onDone,
}: {
  seriesId: string;
  orphanBooks: OrphanBookRow[];
  /** Called after at least one book was linked, so the parent can refresh. */
  onDone?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orphanBooks;
    return orphanBooks.filter((b) => b.title.toLowerCase().includes(q));
  }, [orphanBooks, search]);

  const reset = () => {
    setSelected(new Set());
    setSearch("");
  };

  const close = () => {
    if (busy) return;
    setOpen(false);
    reset();
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirm = async () => {
    if (selected.size === 0 || busy) return;
    setBusy(true);
    const ids = Array.from(selected);
    let added = 0;
    let failed = 0;
    for (const bookId of ids) {
      const res = await moveBookToSeriesAction(bookId, seriesId);
      if (res.ok) added += 1;
      else failed += 1;
    }
    setBusy(false);
    if (added > 0) {
      toast.success(
        added === 1
          ? "Book added to series."
          : `${added} books added to series.`,
      );
      onDone?.();
      router.refresh();
    }
    if (failed > 0) {
      toast.error(
        failed === 1
          ? "Could not add one of the books."
          : `Could not add ${failed} of the books.`,
      );
    }
    if (failed === 0) {
      setOpen(false);
      reset();
    } else {
      // Leave the modal open with successful selections cleared so the user
      // can retry the failures.
      setSelected((prev) => {
        const next = new Set(prev);
        // We don't know which specific ids failed because moveBookToSeriesAction
        // doesn't echo the id back, so clear the whole set — the ones that
        // succeeded have moved out of `orphanBooks` on the next router.refresh.
        next.clear();
        return next;
      });
    }
  };

  if (orphanBooks.length === 0) {
    return (
      <Button type="button" size="sm" variant="outline" disabled title="No standalone books available to link.">
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add existing book
      </Button>
    );
  }

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add existing book
      </Button>
      {open ? (
        <div
          className={responsiveModalRoot()}
          role="dialog"
          aria-modal="true"
          aria-label="Add existing books to this series"
        >
          <button
            type="button"
            className={responsiveModalBackdrop()}
            aria-label="Close"
            onClick={close}
          />
          <div className={responsiveModalPanel("max-w-lg p-6 gap-3")}>
            <h2 className="font-serif text-xl text-editorial-cream">
              Add existing books
            </h2>
            <p className="text-xs text-editorial-muted">
              Pick one or more of your standalone books to fold into this
              series. Each book inherits the shared character bible and gets
              an automatic <em>previously in the series</em> summary for
              future chapters.
            </p>
            <Input
              className="mt-1"
              placeholder="Search your standalone books…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="max-h-80 overflow-y-auto rounded-md border border-border/60 bg-background/40">
              {filtered.length === 0 ? (
                <p className="p-4 text-center text-xs text-editorial-muted">
                  {orphanBooks.length === 0
                    ? "You don't have any standalone books to add."
                    : "No matches for your search."}
                </p>
              ) : (
                <ul className="divide-y divide-border/40">
                  {filtered.map((b) => {
                    const checked = selected.has(b.id);
                    return (
                      <li key={b.id}>
                        <label
                          className="flex cursor-pointer items-center gap-3 p-3 hover:bg-muted/20"
                          htmlFor={`add-book-${b.id}`}
                        >
                          <input
                            id={`add-book-${b.id}`}
                            type="checkbox"
                            className="h-4 w-4 accent-gold"
                            checked={checked}
                            onChange={() => toggle(b.id)}
                          />
                          <div className="relative h-12 w-8 shrink-0 overflow-hidden rounded-sm border border-border/60 bg-background">
                            {b.cover_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={b.cover_url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <BookOpen className="h-3.5 w-3.5 text-editorial-muted" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-serif text-sm text-editorial-cream">
                              {b.title}
                            </p>
                            {b.subtitle ? (
                              <p className="truncate text-[11px] italic text-editorial-muted">
                                {b.subtitle}
                              </p>
                            ) : null}
                            <p className="text-[11px] uppercase tracking-wide text-editorial-muted">
                              {b.status} · {b.word_count.toLocaleString()}w
                            </p>
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 pt-2">
              <p className="text-[11px] text-editorial-muted">
                {selected.size === 0
                  ? "Select one or more books."
                  : `${selected.size} book${selected.size === 1 ? "" : "s"} selected.`}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={close}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={busy || selected.size === 0}
                  onClick={() => void confirm()}
                >
                  {busy ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Add {selected.size > 0 ? `${selected.size} ` : ""}
                  book{selected.size === 1 ? "" : "s"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
