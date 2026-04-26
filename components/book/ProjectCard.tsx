"use client";

import { useRouter } from "next/navigation";
import { memo, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MoreVertical, Pencil, Trash2, Library } from "@/lib/lucide-icons";
import { toast } from "sonner";

import {
  deleteBookAction,
  renameBookAction,
} from "@/app/(dashboard)/dashboard/actions";
import { moveBookToSeriesAction } from "@/app/(dashboard)/dashboard/series/actions";
import { bookWorkflowProgressPercent } from "@/lib/book/workflow";
import {
  responsiveModalBackdrop,
  responsiveModalPanel,
  responsiveModalRoot,
} from "@/lib/ui/responsive-modal";
import type { BookStatusDb } from "@/types/database.types";
import { formatDate, formatWordCount } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

import type { DashboardBook } from "@/types/book.types";

const STATUS_BADGE: Record<
  BookStatusDb,
  { label: string; className: string }
> = {
  idea: {
    label: "Idea",
    className:
      "border-violet-500/40 bg-violet-500/15 text-violet-200",
  },
  refining: {
    label: "Refining",
    className: "border-sky-500/40 bg-sky-500/15 text-sky-200",
  },
  outlining: {
    label: "Outlining",
    className: "border-cyan-500/40 bg-cyan-500/15 text-cyan-100",
  },
  writing: {
    label: "Writing",
    className: "border-amber-500/40 bg-amber-500/15 text-amber-100",
  },
  editing: {
    label: "Editing",
    className: "border-orange-500/40 bg-orange-500/15 text-orange-100",
  },
  cover: {
    label: "Cover",
    className: "border-pink-500/40 bg-pink-500/15 text-pink-100",
  },
  complete: {
    label: "Complete",
    className: "border-gold/50 bg-gold/15 text-gold",
  },
};

type ProjectCardProps = {
  book: DashboardBook;
  seriesOptions: { id: string; name: string }[];
  isPro: boolean;
};

function ProjectCardComponent({ book, seriesOptions, isPro }: ProjectCardProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState(book.title);
  const [saving, setSaving] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<string | "">(book.seriesId ?? "");
  const [moveBusy, setMoveBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTitleDraft(book.title);
  }, [book.title]);

  useEffect(() => {
    setMoveTarget(book.seriesId ?? "");
  }, [book.seriesId]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onDoc = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (!menuRef.current?.contains(target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const statusMeta = STATUS_BADGE[book.status] ?? STATUS_BADGE.idea;
  const progress = bookWorkflowProgressPercent(book.status);

  const onRenameSave = async () => {
    setSaving(true);
    const res = await renameBookAction(book.id, titleDraft);
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error ?? "Could not rename.");
      return;
    }
    toast.success("Title updated.");
    setRenameOpen(false);
    setMenuOpen(false);
    router.refresh();
  };

  const onMoveSeries = async () => {
    if (!isPro) {
      setMoveOpen(false);
      toast.error("Move to a series is a Pro feature.");
      return;
    }
    setMoveBusy(true);
    const toId = moveTarget === "" ? null : moveTarget;
    const res = await moveBookToSeriesAction(book.id, toId);
    setMoveBusy(false);
    if (!res.ok) {
      toast.error(res.error ?? "Could not move book.");
      return;
    }
    toast.success("Book updated.");
    setMoveOpen(false);
    setMenuOpen(false);
    router.refresh();
  };

  const onDelete = async () => {
    const ok = window.confirm(
      `Delete "${book.title}"? This removes the outline and all chapters. This cannot be undone.`,
    );
    if (!ok) {
      return;
    }
    const res = await deleteBookAction(book.id);
    if (!res.ok) {
      toast.error(res.error ?? "Could not delete.");
      return;
    }
    toast.success("Book deleted.");
    setMenuOpen(false);
    router.refresh();
  };

  return (
    <>
      <div
        className={cn(
          "group relative flex h-full flex-col rounded-xl border border-border/80 bg-card/60 p-5 shadow-sm",
          "transition-[transform,box-shadow,border-color] duration-300 ease-out will-change-transform",
          "hover:scale-[1.02] hover:border-gold/55 hover:shadow-[0_0_28px_rgba(201,168,76,0.28)]",
          "motion-reduce:transition-none motion-reduce:hover:scale-100",
        )}
      >
        <div className="absolute right-3 top-3" ref={menuRef}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-editorial-muted hover:bg-secondary hover:text-editorial-cream"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="Book actions"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen((o) => !o);
            }}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
          {menuOpen ? (
            <ul
              role="menu"
              className="absolute right-0 z-20 mt-1 min-w-[160px] rounded-lg border border-border bg-editorial-card py-1 text-sm shadow-lg"
            >
              <li>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-editorial-cream hover:bg-secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    setTitleDraft(book.title);
                    setRenameOpen(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                  Rename
                </button>
              </li>
              <li>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-editorial-cream hover:bg-secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMoveTarget(book.seriesId ?? "");
                    setMoveOpen(true);
                    setMenuOpen(false);
                  }}
                >
                  <Library className="h-3.5 w-3.5" aria-hidden />
                  Move to series
                </button>
              </li>
              <li>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    void onDelete();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  Delete
                </button>
              </li>
            </ul>
          ) : null}
        </div>

        <Link prefetch href={`/projects/${book.id}`} className="flex flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-2 pr-8">
            <h2 className="line-clamp-2 font-serif text-lg font-semibold text-editorial-cream transition-colors group-hover:text-gold">
              {book.title}
            </h2>
          </div>
          {book.seriesId && book.seriesName ? (
            <p className="mt-1 text-xs text-gold/90">
              <span className="text-editorial-muted">Series: </span>
              <Link
                href={`/dashboard/series/${book.seriesId}`}
                onClick={(e) => e.stopPropagation()}
                className="font-medium text-gold hover:underline"
              >
                {book.seriesName}
              </Link>
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {book.genre ? (
              <span className="rounded-full border border-border bg-editorial-bg/80 px-2.5 py-0.5 text-xs font-medium text-editorial-muted">
                {book.genre}
              </span>
            ) : (
              <span className="rounded-full border border-border/60 bg-editorial-bg/50 px-2.5 py-0.5 text-xs text-editorial-muted">
                Genre TBD
              </span>
            )}
            <span
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                statusMeta.className,
              )}
            >
              {statusMeta.label}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-editorial-muted">
            <div>
              <p className="font-medium uppercase tracking-wide text-editorial-muted/90">
                Words
              </p>
              <p className="mt-0.5 text-sm text-editorial-cream">
                {formatWordCount(book.word_count)}
              </p>
            </div>
            <div>
              <p className="font-medium uppercase tracking-wide text-editorial-muted/90">
                Chapters
              </p>
              <p className="mt-0.5 text-sm text-editorial-cream">
                {book.chapter_count}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-editorial-muted">
            Updated {formatDate(book.updated_at, "MMM d, yyyy")}
          </p>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-[10px] font-medium uppercase tracking-wide text-editorial-muted">
              <span>Progress</span>
              <span className="text-gold/90">{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold/80 to-gold transition-[width] duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </Link>
      </div>

      {moveOpen ? (
        <div
          className={responsiveModalRoot("z-50")}
          role="dialog"
          aria-modal="true"
          aria-labelledby="move-series-title"
        >
          <button
            type="button"
            className={cn(responsiveModalBackdrop(), "backdrop-blur-sm")}
            aria-label="Close"
            onClick={() => setMoveOpen(false)}
          />
          <div
            className={responsiveModalPanel("max-w-md p-6")}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="move-series-title"
              className="font-serif text-xl font-semibold text-editorial-cream"
            >
              Move to series
            </h3>
            <p className="mt-1 text-sm text-editorial-muted">Pro only. Standalone books are not in any series.</p>
            <div className="mt-4 max-h-64 space-y-1 overflow-y-auto">
              <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 hover:bg-muted/40">
                <input
                  type="radio"
                  name={`series-${book.id}`}
                  checked={moveTarget === ""}
                  onChange={() => setMoveTarget("")}
                />
                <span className="text-sm text-editorial-cream">Standalone (not in a series)</span>
              </label>
              {seriesOptions.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 hover:bg-muted/40"
                >
                  <input
                    type="radio"
                    name={`series-${book.id}`}
                    checked={moveTarget === s.id}
                    onChange={() => setMoveTarget(s.id)}
                  />
                  <span className="text-sm text-editorial-cream">{s.name}</span>
                </label>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setMoveOpen(false)} disabled={moveBusy}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-gold text-editorial-bg hover:bg-gold/90"
                disabled={moveBusy}
                onClick={() => void onMoveSeries()}
              >
                {moveBusy ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {renameOpen ? (
        <div
          className={responsiveModalRoot("z-50")}
          role="dialog"
          aria-modal="true"
          aria-labelledby="rename-book-title"
        >
          <button
            type="button"
            className={cn(responsiveModalBackdrop(), "backdrop-blur-sm")}
            aria-label="Close dialog"
            onClick={() => setRenameOpen(false)}
          />
          <div
            className={responsiveModalPanel("max-w-md p-6")}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="rename-book-title"
              className="font-serif text-xl font-semibold text-editorial-cream"
            >
              Rename book
            </h3>
            <div className="mt-4 space-y-2">
              <Label htmlFor={`rename-${book.id}`}>Title</Label>
              <Input
                id={`rename-${book.id}`}
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                autoFocus
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                className="border-border text-editorial-cream"
                onClick={() => setRenameOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-gold text-editorial-bg hover:bg-gold/90"
                disabled={saving}
                onClick={() => void onRenameSave()}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export const ProjectCard = memo(ProjectCardComponent);
