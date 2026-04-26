"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { moveBookToSeriesAction } from "@/app/(dashboard)/dashboard/series/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, Loader2, Plus } from "@/lib/lucide-icons";
import {
  responsiveModalBackdrop,
  responsiveModalPanel,
  responsiveModalRoot,
} from "@/lib/ui/responsive-modal";
import type { BookStatusDb } from "@/types/database.types";

type OrphanBookRow = {
  id: string;
  title: string;
  subtitle: string | null;
  cover_url: string | null;
  status: BookStatusDb;
  word_count: number;
};

type SeriesOption = { id: string; name: string };

/**
 * Lightweight modal that lets a Pro user fold one of their existing standalone
 * books into a series. Uses the same `moveBookToSeriesAction` that the book
 * editor calls, so all the side-effects (series_order assignment, character
 * bible merge, previously-in-series text generation) run identically.
 */
export function AddExistingBookToSeries({
  orphanBooks,
  seriesOptions,
  isPro,
}: {
  orphanBooks: OrphanBookRow[];
  seriesOptions: SeriesOption[];
  isPro: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [targetSeriesId, setTargetSeriesId] = useState(seriesOptions[0]?.id ?? "");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orphanBooks;
    return orphanBooks.filter((b) => b.title.toLowerCase().includes(q));
  }, [orphanBooks, search]);

  const onOpen = () => {
    if (!isPro) {
      toast.error("Series is a Pro feature.");
      return;
    }
    if (!seriesOptions.length) {
      toast.error("Create a series first.");
      return;
    }
    setOpen(true);
  };

  const addBook = async (bookId: string) => {
    if (!targetSeriesId) return;
    setBusyId(bookId);
    const res = await moveBookToSeriesAction(bookId, targetSeriesId);
    setBusyId(null);
    if (!res.ok) {
      toast.error(res.error ?? "Could not move book.");
      return;
    }
    toast.success("Book added to series.");
    router.refresh();
  };

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={onOpen}>
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add existing book
      </Button>
      {open ? (
        <div
          className={responsiveModalRoot()}
          role="dialog"
          aria-modal="true"
          aria-label="Add an existing book to a series"
        >
          <button
            type="button"
            className={responsiveModalBackdrop()}
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div className={responsiveModalPanel("max-w-lg p-6 gap-3")}>
            <h2 className="font-serif text-xl text-editorial-cream">
              Add an existing book
            </h2>
            <p className="text-xs text-editorial-muted">
              Moves one of your standalone books into the selected series. The
              book inherits the shared character bible and gets an automatic
              <em> previously in the series </em>summary for future chapters.
            </p>
            <div>
              <Label htmlFor="ses">Series</Label>
              <select
                id="ses"
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={targetSeriesId}
                onChange={(e) => setTargetSeriesId(e.target.value)}
              >
                {seriesOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="bks">Book to add</Label>
              <Input
                id="bks"
                className="mt-1"
                placeholder="Search your standalone books…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="max-h-80 overflow-y-auto rounded-md border border-border/60 bg-background/40">
              {filtered.length === 0 ? (
                <p className="p-4 text-center text-xs text-editorial-muted">
                  No matching standalone books.
                </p>
              ) : (
                <ul className="divide-y divide-border/40">
                  {filtered.map((b) => (
                    <li key={b.id} className="flex items-center gap-3 p-3">
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
                        <p className="text-[11px] uppercase tracking-wide text-editorial-muted">
                          {b.status} · {b.word_count.toLocaleString()}w
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busyId === b.id}
                        onClick={() => void addBook(b.id)}
                      >
                        {busyId === b.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Add"
                        )}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
