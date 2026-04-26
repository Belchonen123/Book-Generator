"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  deleteSeriesAction,
  updateSeriesAction,
} from "@/app/(dashboard)/dashboard/series/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Pencil, Trash2 } from "@/lib/lucide-icons";
import {
  responsiveModalBackdrop,
  responsiveModalPanel,
  responsiveModalRoot,
} from "@/lib/ui/responsive-modal";
import type { SeriesStatusDb } from "@/types/database.types";

import type { SeriesBookRow, SeriesRow } from "../series-detail-shell";

const STATUS_OPTIONS: { value: SeriesStatusDb; label: string }[] = [
  { value: "planning", label: "Planning" },
  { value: "active", label: "Active" },
  { value: "complete", label: "Complete" },
  { value: "abandoned", label: "Abandoned" },
];

export function OverviewTab({
  series,
  books,
  totalWordCount,
}: {
  series: SeriesRow;
  books: SeriesBookRow[];
  totalWordCount: number;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState(series.name);
  const [tagline, setTagline] = useState(series.tagline ?? "");
  const [description, setDescription] = useState(series.description ?? "");
  const [genre, setGenre] = useState(series.genre ?? "");
  const [plannedCount, setPlannedCount] = useState(
    series.planned_book_count?.toString() ?? "",
  );
  const [status, setStatus] = useState<SeriesStatusDb>(series.status);
  const [worldNotes, setWorldNotes] = useState(series.shared_world_notes ?? "");

  const openEdit = () => {
    setName(series.name);
    setTagline(series.tagline ?? "");
    setDescription(series.description ?? "");
    setGenre(series.genre ?? "");
    setPlannedCount(series.planned_book_count?.toString() ?? "");
    setStatus(series.status);
    setWorldNotes(series.shared_world_notes ?? "");
    setEditOpen(true);
  };

  const save = async () => {
    const planned = plannedCount.trim() ? Number.parseInt(plannedCount, 10) : null;
    if (plannedCount.trim() && (Number.isNaN(planned) || (planned ?? -1) < 0)) {
      toast.error("Planned book count must be a non-negative whole number.");
      return;
    }
    setSaving(true);
    const res = await updateSeriesAction(series.id, {
      name: name.trim() || "Untitled series",
      tagline: tagline.trim() || null,
      description: description.trim() || null,
      genre: genre.trim() || null,
      planned_book_count: planned,
      status,
      shared_world_notes: worldNotes.trim() || null,
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error ?? "Could not save.");
      return;
    }
    toast.success("Series saved.");
    setEditOpen(false);
    router.refresh();
  };

  const confirmDelete = async () => {
    setDeleting(true);
    const res = await deleteSeriesAction(series.id);
    setDeleting(false);
    if (!res.ok) {
      toast.error(res.error ?? "Could not delete series.");
      return;
    }
    toast.success("Series deleted.");
    router.push("/dashboard/series");
  };

  const currentlyDrafting = books.find((b) =>
    ["writing", "editing", "cover"].includes(b.status),
  );
  const allComplete =
    books.length > 0 && books.every((b) => b.status === "complete");

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border/60 bg-card/40 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-serif text-lg text-editorial-cream">About</h2>
            {series.description ? (
              <p className="mt-2 whitespace-pre-wrap text-sm text-editorial-muted">
                {series.description}
              </p>
            ) : (
              <p className="mt-2 text-sm text-editorial-muted/80">
                No description yet — tell future-you what this series is about.
              </p>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="outline" size="sm" onClick={openEdit}>
              <Pencil className="mr-1 h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>
      </section>

      {series.shared_world_notes ? (
        <section className="rounded-lg border border-border/60 bg-card/40 p-5">
          <h2 className="font-serif text-lg text-editorial-cream">World notes</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-editorial-muted">
            {series.shared_world_notes}
          </p>
        </section>
      ) : null}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Books" value={books.length.toLocaleString()} />
        <Stat
          label="Total chapters"
          value={books
            .reduce((s, b) => s + (b.chapter_count ?? 0), 0)
            .toLocaleString()}
        />
        <Stat label="Total words" value={totalWordCount.toLocaleString()} />
        <Stat
          label="Avg / book"
          value={(books.length
            ? Math.round(totalWordCount / books.length)
            : 0
          ).toLocaleString()}
        />
      </section>

      <section className="rounded-lg border border-border/60 bg-card/40 p-5">
        <h2 className="font-serif text-lg text-editorial-cream">Next up</h2>
        {currentlyDrafting ? (
          <p className="mt-2 text-sm text-editorial-muted">
            <span className="text-editorial-cream">
              {currentlyDrafting.title}
            </span>{" "}
            is {currentlyDrafting.status}.{" "}
            {currentlyDrafting.chapter_count} chapters ·{" "}
            {currentlyDrafting.word_count.toLocaleString()} words.
          </p>
        ) : allComplete ? (
          <p className="mt-2 text-sm text-editorial-muted">
            Series complete — ready to bundle into a boxed set.
          </p>
        ) : books.length === 0 ? (
          <p className="mt-2 text-sm text-editorial-muted">
            No books yet. Add a book to this series from the Books tab.
          </p>
        ) : (
          <p className="mt-2 text-sm text-editorial-muted">
            No book is actively drafting. Open the Books tab to pick one up.
          </p>
        )}
      </section>

      {editOpen ? (
        <div
          className={responsiveModalRoot()}
          role="dialog"
          aria-modal="true"
          aria-label="Edit series"
        >
          <button
            type="button"
            className={responsiveModalBackdrop()}
            aria-label="Close"
            onClick={() => setEditOpen(false)}
          />
          <div className={responsiveModalPanel("max-w-lg p-6 gap-3")}>
            <h2 className="font-serif text-xl text-editorial-cream">Edit series</h2>
            <div>
              <Label htmlFor="sn">Name</Label>
              <Input
                id="sn"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="stag">Tagline</Label>
              <Input
                id="stag"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="A one-line hook for back-cover copy"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="sd">Description</Label>
              <textarea
                id="sd"
                className="mt-1 w-full min-h-[96px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="sg">Genre</Label>
                <Input
                  id="sg"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="Fantasy"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="spc">Planned books</Label>
                <Input
                  id="spc"
                  type="number"
                  min={0}
                  value={plannedCount}
                  onChange={(e) => setPlannedCount(e.target.value)}
                  placeholder="e.g. 5"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="sst">Status</Label>
                <select
                  id="sst"
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as SeriesStatusDb)}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="sw">Shared world notes</Label>
              <textarea
                id="sw"
                className="mt-1 w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={worldNotes}
                onChange={(e) => setWorldNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </Button>
              <Button type="button" disabled={saving} onClick={() => void save()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteOpen ? (
        <div
          className={responsiveModalRoot()}
          role="dialog"
          aria-modal="true"
          aria-label="Delete series"
        >
          <button
            type="button"
            className={responsiveModalBackdrop()}
            aria-label="Close"
            onClick={() => setDeleteOpen(false)}
          />
          <div className={responsiveModalPanel("max-w-md p-6 gap-3")}>
            <h2 className="font-serif text-xl text-editorial-cream">
              Delete this series?
            </h2>
            <p className="text-sm text-editorial-muted">
              The books stay in your library. Any series-scoped codex entries
              move onto the first book. Arcs and series metadata are deleted.
              This cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeleteOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={deleting}
                onClick={() => void confirmDelete()}
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Delete series"
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/30 p-4">
      <p className="text-[11px] uppercase tracking-wide text-editorial-muted">
        {label}
      </p>
      <p className="mt-1 font-serif text-xl text-editorial-cream">{value}</p>
    </div>
  );
}
