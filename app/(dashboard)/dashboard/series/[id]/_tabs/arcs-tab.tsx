"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  type ForeshadowReport,
  createArcAction,
  createBeatAction,
  deleteArcAction,
  deleteBeatAction,
  getForeshadowingReport,
  linkForeshadowingPair,
  unlinkForeshadowingPair,
  updateArcAction,
  updateBeatAction,
} from "@/app/(dashboard)/dashboard/series/arcs/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  Download,
  Link2 as LinkIcon,
  Link2Off as UnlinkIcon,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from "@/lib/lucide-icons";
import {
  responsiveModalBackdrop,
  responsiveModalPanel,
  responsiveModalRoot,
} from "@/lib/ui/responsive-modal";
import { cn } from "@/lib/utils/cn";
import type {
  SeriesArcBeatStatusDb,
  SeriesArcBeatTypeDb,
  SeriesArcStatusDb,
  SeriesArcTypeDb,
} from "@/types/database.types";

import type {
  ArcRow,
  BeatRow,
  CodexRow,
  ForeshadowPairRow,
  SeriesBookRow,
  SeriesChapterRow,
} from "../series-detail-shell";

/* -------------------------------------------------------------------------- */
/*  Constants                                                                  */
/* -------------------------------------------------------------------------- */

const ARC_STATUSES: { value: SeriesArcStatusDb; label: string; tone: string }[] = [
  { value: "setup",      label: "Setup",       tone: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  { value: "developing", label: "Developing",  tone: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
  { value: "climax",     label: "Climax",      tone: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
  { value: "resolved",   label: "Resolved",    tone: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  { value: "abandoned",  label: "Abandoned",   tone: "bg-neutral-500/15 text-neutral-300 border-neutral-500/30" },
];

const ARC_TYPES: { value: SeriesArcTypeDb; label: string }[] = [
  { value: "character", label: "Character" },
  { value: "plot",      label: "Plot" },
  { value: "thematic",  label: "Thematic" },
  { value: "romance",   label: "Romance" },
  { value: "mystery",   label: "Mystery" },
  { value: "world",     label: "World" },
  { value: "custom",    label: "Custom" },
];

const BEAT_TYPES: { value: SeriesArcBeatTypeDb; label: string; chipClass: string }[] = [
  { value: "setup",        label: "Setup",        chipClass: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  { value: "foreshadow",   label: "Foreshadow",   chipClass: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
  { value: "development",  label: "Development",  chipClass: "bg-neutral-500/20 text-neutral-300 border-neutral-500/30" },
  { value: "complication", label: "Complication", chipClass: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
  { value: "payoff",       label: "Payoff",       chipClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  { value: "resolution",   label: "Resolution",   chipClass: "bg-teal-500/20 text-teal-300 border-teal-500/30" },
];

const BEAT_STATUSES: { value: SeriesArcBeatStatusDb; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "drafted", label: "Drafted" },
  { value: "complete", label: "Complete" },
];

const arcStatusTone = (s: SeriesArcStatusDb) =>
  ARC_STATUSES.find((x) => x.value === s)?.tone ??
  "border-border/60 text-editorial-muted";

const beatMeta = (t: SeriesArcBeatTypeDb | null) =>
  BEAT_TYPES.find((x) => x.value === t) ?? null;

/* -------------------------------------------------------------------------- */
/*  Root                                                                       */
/* -------------------------------------------------------------------------- */

type ArcListFilters = {
  status: SeriesArcStatusDb | "active" | "all";
  type: SeriesArcTypeDb | "all";
  bookId: string | "all";
};

export function ArcsTab({
  seriesId,
  books,
  arcs,
  beats,
  foreshadowPairs,
  codex,
  chapters,
}: {
  seriesId: string;
  books: SeriesBookRow[];
  arcs: ArcRow[];
  beats: BeatRow[];
  foreshadowPairs: ForeshadowPairRow[];
  codex: CodexRow[];
  chapters: SeriesChapterRow[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(arcs[0]?.id ?? null);
  const [createOpen, setCreateOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  // Default "active" hides resolved + abandoned, matching the spec's
  // "most useful during active planning" behaviour.
  const [filters, setFilters] = useState<ArcListFilters>({
    status: "active",
    type: "all",
    bookId: "all",
  });

  useEffect(() => {
    if (!selectedId && arcs[0]) setSelectedId(arcs[0].id);
  }, [arcs, selectedId]);

  /* Prompt 16.5 § ARC LIST: derive book range + beat counts + linked
   * codex counts per arc once so each arc card doesn't re-scan beats. */
  const arcStats = useMemo(() => {
    const stats = new Map<
      string,
      {
        beatCount: number;
        draftedCount: number;
        earliestOrder: number | null;
        latestOrder: number | null;
        bookIds: Set<string>;
      }
    >();
    const orderById = new Map(books.map((b) => [b.id, b.series_order ?? Number.POSITIVE_INFINITY] as const));
    for (const a of arcs) {
      stats.set(a.id, {
        beatCount: 0,
        draftedCount: 0,
        earliestOrder: null,
        latestOrder: null,
        bookIds: new Set(),
      });
    }
    for (const b of beats) {
      const s = stats.get(b.arc_id);
      if (!s) continue;
      s.beatCount += 1;
      if (b.status !== "planned") s.draftedCount += 1;
      if (b.book_id) {
        s.bookIds.add(b.book_id);
        const ord = orderById.get(b.book_id);
        if (ord !== undefined && Number.isFinite(ord)) {
          if (s.earliestOrder === null || ord < s.earliestOrder) s.earliestOrder = ord;
          if (s.latestOrder === null || ord > s.latestOrder) s.latestOrder = ord;
        }
      }
    }
    return stats;
  }, [arcs, beats, books]);

  const filteredArcs = useMemo(() => {
    return arcs.filter((a) => {
      if (filters.status === "active") {
        if (a.status === "resolved" || a.status === "abandoned") return false;
      } else if (filters.status !== "all") {
        if (a.status !== filters.status) return false;
      }
      if (filters.type !== "all" && a.arc_type !== filters.type) return false;
      if (filters.bookId !== "all") {
        const s = arcStats.get(a.id);
        if (!s?.bookIds.has(filters.bookId)) {
          const spans = a.starts_book_id === filters.bookId || a.ends_book_id === filters.bookId;
          if (!spans) return false;
        }
      }
      return true;
    });
  }, [arcs, arcStats, filters]);

  const selected = arcs.find((a) => a.id === selectedId) ?? null;
  const selectedBeats = useMemo(
    () => beats.filter((b) => b.arc_id === selectedId).sort((a, b) => a.position - b.position),
    [beats, selectedId],
  );
  const selectedPairs = useMemo(() => {
    const selectedBeatIds = new Set(selectedBeats.map((b) => b.id));
    return foreshadowPairs.filter((p) => selectedBeatIds.has(p.foreshadow_beat_id));
  }, [foreshadowPairs, selectedBeats]);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
      <aside className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg text-editorial-cream">Arcs</h2>
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setReportOpen(true)}
              title="Foreshadowing audit report"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              New
            </Button>
          </div>
        </div>

        <ArcFilters
          books={books}
          value={filters}
          onChange={setFilters}
          totalArcs={arcs.length}
          shownArcs={filteredArcs.length}
        />

        {arcs.length === 0 ? (
          <p className="rounded-md border border-dashed border-border/60 p-4 text-xs text-editorial-muted">
            No arcs yet. Create one to start tracking a through-line across
            books.
          </p>
        ) : filteredArcs.length === 0 ? (
          <p className="rounded-md border border-dashed border-border/60 p-4 text-xs text-editorial-muted">
            No arcs match the current filter.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {filteredArcs.map((a) => {
              const stats = arcStats.get(a.id);
              const linkedCount = a.linked_codex_entry_ids.length;
              const active = selectedId === a.id;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(a.id)}
                    className={cn(
                      "block w-full rounded-md border px-3 py-2 text-left",
                      active
                        ? "border-gold/60 bg-card text-editorial-cream"
                        : "border-border/60 bg-card/30 text-editorial-muted hover:border-gold/30 hover:text-editorial-cream",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{a.name}</span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-wide",
                          arcStatusTone(a.status),
                        )}
                      >
                        {a.status}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] uppercase tracking-wide text-editorial-muted">
                      <span>{a.arc_type ?? "custom"}</span>
                      <span>·</span>
                      <span>{formatBookRange(stats?.earliestOrder ?? null, stats?.latestOrder ?? null)}</span>
                      <span>·</span>
                      <span>
                        {stats?.beatCount ?? 0} beat{(stats?.beatCount ?? 0) === 1 ? "" : "s"}
                        {stats?.draftedCount ? ` (${stats.draftedCount} drafted)` : ""}
                      </span>
                      {linkedCount > 0 ? (
                        <>
                          <span>·</span>
                          <span>
                            {linkedCount} linked
                          </span>
                        </>
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      <section>
        {selected ? (
          <ArcDetail
            arc={selected}
            books={books}
            beats={selectedBeats}
            allBeats={beats}
            codex={codex}
            chapters={chapters}
            foreshadowPairs={foreshadowPairs}
            pairsForSelected={selectedPairs}
            seriesId={seriesId}
          />
        ) : (
          <div className="rounded-lg border border-dashed border-border/60 bg-card/30 p-8 text-center">
            <p className="text-sm text-editorial-muted">
              Select or create an arc to see beats.
            </p>
          </div>
        )}
      </section>

      {createOpen ? (
        <ArcEditor
          seriesId={seriesId}
          books={books}
          codex={codex}
          mode="create"
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => setSelectedId(id)}
        />
      ) : null}

      {reportOpen ? (
        <ForeshadowAuditReport
          seriesId={seriesId}
          books={books}
          arcs={arcs}
          beats={beats}
          onClose={() => setReportOpen(false)}
          onAddPayoffFor={(foreshadowBeatId) => {
            // Jump to the arc that owns the foreshadow; the user can
            // then click a book column to add a payoff.
            const f = beats.find((b) => b.id === foreshadowBeatId);
            if (f) setSelectedId(f.arc_id);
            setReportOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function formatBookRange(start: number | null, end: number | null): string {
  if (start === null || end === null) return "No book pin";
  if (start === end) return `Book ${start}`;
  return `Books ${start}–${end}`;
}

/* -------------------------------------------------------------------------- */
/*  Arc list filters                                                           */
/* -------------------------------------------------------------------------- */

function ArcFilters({
  books,
  value,
  onChange,
  totalArcs,
  shownArcs,
}: {
  books: SeriesBookRow[];
  value: ArcListFilters;
  onChange: (v: ArcListFilters) => void;
  totalArcs: number;
  shownArcs: number;
}) {
  return (
    <div className="rounded-md border border-border/60 bg-card/30 p-2 text-xs">
      <div className="grid grid-cols-3 gap-2">
        <select
          aria-label="Filter by status"
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          value={value.status}
          onChange={(e) =>
            onChange({ ...value, status: e.target.value as ArcListFilters["status"] })
          }
        >
          <option value="active">Active</option>
          <option value="all">All statuses</option>
          {ARC_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by type"
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          value={value.type}
          onChange={(e) =>
            onChange({ ...value, type: e.target.value as ArcListFilters["type"] })
          }
        >
          <option value="all">All types</option>
          {ARC_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by book"
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          value={value.bookId}
          onChange={(e) => onChange({ ...value, bookId: e.target.value })}
        >
          <option value="all">All books</option>
          {books.map((b) => (
            <option key={b.id} value={b.id}>
              #{b.series_order ?? "?"} {b.title}
            </option>
          ))}
        </select>
      </div>
      <p className="mt-2 text-[10px] text-editorial-muted">
        Showing {shownArcs} of {totalArcs}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Arc detail + horizontal timeline                                           */
/* -------------------------------------------------------------------------- */

function ArcDetail({
  arc,
  books,
  beats,
  allBeats,
  codex,
  chapters,
  foreshadowPairs,
  pairsForSelected,
  seriesId,
}: {
  arc: ArcRow;
  books: SeriesBookRow[];
  beats: BeatRow[];
  allBeats: BeatRow[];
  codex: CodexRow[];
  chapters: SeriesChapterRow[];
  foreshadowPairs: ForeshadowPairRow[];
  pairsForSelected: ForeshadowPairRow[];
  seriesId: string;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [beatEditorFor, setBeatEditorFor] = useState<{ bookId: string | null; beat?: BeatRow } | null>(null);
  const [linkPayoffFor, setLinkPayoffFor] = useState<BeatRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragBeatId, setDragBeatId] = useState<string | null>(null);
  const [hoverBookId, setHoverBookId] = useState<string | null>(null);

  // Map every beat in the arc by book id for quick column rendering.
  const beatsByBook = useMemo(() => {
    const map = new Map<string | null, BeatRow[]>();
    for (const b of beats) {
      const key = b.book_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    for (const arr of Array.from(map.values())) {
      arr.sort((a, b) => a.position - b.position);
    }
    return map;
  }, [beats]);

  // Pair lookup by foreshadow beat id, and the reverse mapping from
  // payoff beat id → list of foreshadow beat ids that point at it. The
  // reverse map is what lets a payoff show its "paid off from" badges
  // even though the pair table only keys on the foreshadow side.
  const pairByForeshadow = useMemo(() => {
    const m = new Map<string, ForeshadowPairRow>();
    for (const p of pairsForSelected) m.set(p.foreshadow_beat_id, p);
    return m;
  }, [pairsForSelected]);

  const pairsByPayoff = useMemo(() => {
    const m = new Map<string, ForeshadowPairRow[]>();
    for (const p of foreshadowPairs) {
      if (!p.payoff_beat_id) continue;
      if (!m.has(p.payoff_beat_id)) m.set(p.payoff_beat_id, []);
      m.get(p.payoff_beat_id)!.push(p);
    }
    return m;
  }, [foreshadowPairs]);

  const linkedCodex = useMemo(
    () => codex.filter((c) => arc.linked_codex_entry_ids.includes(c.id)),
    [codex, arc.linked_codex_entry_ids],
  );

  const del = async () => {
    if (!confirm("Delete this arc and all its beats?")) return;
    setBusy(true);
    const res = await deleteArcAction(arc.id);
    setBusy(false);
    if (!res.ok) return toast.error(res.error ?? "Could not delete arc.");
    toast.success("Arc deleted.");
    router.refresh();
  };

  /* Prompt 16.5 § Interactions — drag a beat between book columns.
   * We update book_id + clear chapter_id (which would now dangle in a
   * different book). Position inside the new column defaults to the
   * next available slot; the user can reorder later via the beat
   * editor. */
  const handleDrop = useCallback(
    async (bookId: string) => {
      if (!dragBeatId) return;
      const beat = allBeats.find((b) => b.id === dragBeatId);
      setDragBeatId(null);
      setHoverBookId(null);
      if (!beat || beat.book_id === bookId) return;
      const res = await updateBeatAction(beat.id, {
        book_id: bookId,
        chapter_id: null,
      });
      if (!res.ok) {
        toast.error(res.error ?? "Could not move beat.");
        return;
      }
      toast.success("Beat moved.");
      router.refresh();
    },
    [allBeats, dragBeatId, router],
  );

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate font-serif text-xl text-editorial-cream">{arc.name}</h2>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide",
                arcStatusTone(arc.status),
              )}
            >
              {arc.status}
            </span>
            <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-editorial-muted">
              {arc.arc_type ?? "custom"}
            </span>
          </div>
          {linkedCodex.length > 0 ? (
            <p className="mt-2 text-xs text-editorial-muted">
              Linked:{" "}
              {linkedCodex.map((c, i) => (
                <span key={c.id}>
                  <span className="text-editorial-cream/90">{c.name}</span>
                  {i < linkedCodex.length - 1 ? ", " : ""}
                </span>
              ))}
            </p>
          ) : null}
          {arc.description_md ? (
            <p className="mt-2 max-w-prose text-sm text-editorial-muted">
              {arc.description_md}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            Edit arc
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void del()}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="mt-6 -mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
        <div className="flex min-w-max gap-3">
          {books.length === 0 ? (
            <p className="text-xs text-editorial-muted">
              Add at least one book to the series first.
            </p>
          ) : (
            books.map((b) => (
              <BookColumn
                key={b.id}
                book={b}
                beats={beatsByBook.get(b.id) ?? []}
                chapters={chapters.filter((c) => c.book_id === b.id)}
                pairByForeshadow={pairByForeshadow}
                pairsByPayoff={pairsByPayoff}
                allBeats={allBeats}
                books={books}
                onAdd={() => setBeatEditorFor({ bookId: b.id })}
                onEdit={(beat) => setBeatEditorFor({ bookId: b.id, beat })}
                onLinkPayoff={(beat) => setLinkPayoffFor(beat)}
                onUnlink={async (pairId) => {
                  const res = await unlinkForeshadowingPair(pairId);
                  if (!res.ok) return toast.error(res.error ?? "Could not unlink.");
                  toast.success("Link removed.");
                  router.refresh();
                }}
                dragBeatId={dragBeatId}
                onDragStart={setDragBeatId}
                onDragEnd={() => {
                  setDragBeatId(null);
                  setHoverBookId(null);
                }}
                isHovered={hoverBookId === b.id}
                onDragEnter={() => setHoverBookId(b.id)}
                onDragLeave={() => {
                  if (hoverBookId === b.id) setHoverBookId(null);
                }}
                onDrop={() => void handleDrop(b.id)}
              />
            ))
          )}
        </div>
      </div>

      {editOpen ? (
        <ArcEditor
          seriesId={seriesId}
          books={books}
          codex={codex}
          mode="edit"
          initial={arc}
          onClose={() => setEditOpen(false)}
        />
      ) : null}

      {beatEditorFor ? (
        <BeatEditor
          arcId={arc.id}
          books={books}
          chapters={chapters}
          initialBookId={beatEditorFor.bookId}
          initialBeat={beatEditorFor.beat}
          onClose={() => setBeatEditorFor(null)}
        />
      ) : null}

      {linkPayoffFor ? (
        <LinkPayoffModal
          foreshadowBeat={linkPayoffFor}
          allBeats={allBeats}
          books={books}
          existingPair={pairByForeshadow.get(linkPayoffFor.id) ?? null}
          onClose={() => setLinkPayoffFor(null)}
        />
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Book column (with drag targets + drop effects)                             */
/* -------------------------------------------------------------------------- */

function BookColumn({
  book,
  beats,
  chapters,
  pairByForeshadow,
  pairsByPayoff,
  allBeats,
  books,
  onAdd,
  onEdit,
  onLinkPayoff,
  onUnlink,
  dragBeatId,
  onDragStart,
  onDragEnd,
  isHovered,
  onDragEnter,
  onDragLeave,
  onDrop,
}: {
  book: SeriesBookRow;
  beats: BeatRow[];
  chapters: SeriesChapterRow[];
  pairByForeshadow: Map<string, ForeshadowPairRow>;
  pairsByPayoff: Map<string, ForeshadowPairRow[]>;
  allBeats: BeatRow[];
  books: SeriesBookRow[];
  onAdd: () => void;
  onEdit: (beat: BeatRow) => void;
  onLinkPayoff: (beat: BeatRow) => void;
  onUnlink: (pairId: string) => void;
  dragBeatId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  isHovered: boolean;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
}) {
  const chapterById = new Map(chapters.map((c) => [c.id, c] as const));
  const beatById = new Map(allBeats.map((b) => [b.id, b] as const));
  const bookByBeatId = (beatId: string): SeriesBookRow | null => {
    const b = beatById.get(beatId);
    return b?.book_id ? books.find((x) => x.id === b.book_id) ?? null : null;
  };
  const isDropTarget = !!dragBeatId;

  return (
    <div
      className={cn(
        "w-64 shrink-0 rounded-lg border p-3 transition-colors",
        isHovered
          ? "border-gold/70 bg-gold/10"
          : isDropTarget
            ? "border-dashed border-border/80 bg-card/50"
            : "border-border/60 bg-card/30",
      )}
      onDragOver={(e) => {
        if (!isDropTarget) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDragEnter={(e) => {
        if (!isDropTarget) return;
        e.preventDefault();
        onDragEnter();
      }}
      onDragLeave={(e) => {
        if (!isDropTarget) return;
        // Don't fire when entering a child — only when leaving the column.
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        onDragLeave();
      }}
      onDrop={(e) => {
        if (!isDropTarget) return;
        e.preventDefault();
        onDrop();
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wide text-editorial-muted">
          #{book.series_order ?? "?"} {book.title}
        </span>
        <button
          type="button"
          onClick={onAdd}
          className="rounded p-1 text-editorial-muted hover:text-gold"
          aria-label={`Add beat to ${book.title}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {beats.length === 0 ? (
        <p className="rounded-md border border-dashed border-border/60 p-3 text-center text-[11px] text-editorial-muted">
          {isHovered ? "Drop here" : "No beats"}
        </p>
      ) : (
        <ol className="space-y-2">
          {beats.map((b) => {
            const meta = beatMeta(b.beat_type);
            const ch = b.chapter_id ? chapterById.get(b.chapter_id) : null;
            const pair = pairByForeshadow.get(b.id);
            const payoffBeat = pair?.payoff_beat_id ? beatById.get(pair.payoff_beat_id) : null;
            const payoffBook = pair?.payoff_beat_id ? bookByBeatId(pair.payoff_beat_id) : null;
            const paysOffFrom = pairsByPayoff.get(b.id) ?? [];

            return (
              <li key={b.id}>
                <div
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", b.id);
                    onDragStart(b.id);
                  }}
                  onDragEnd={onDragEnd}
                  className={cn(
                    "group relative rounded-md border bg-background/80 p-2 text-xs transition-opacity",
                    dragBeatId === b.id ? "border-gold/50 opacity-50" : "border-border/50 hover:border-gold/40",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onEdit(b)}
                    className="block w-full text-left"
                  >
                    <div className="mb-1 flex items-center gap-1.5">
                      {meta ? (
                        <span
                          className={cn(
                            "rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-wide",
                            meta.chipClass,
                          )}
                        >
                          {meta.label}
                        </span>
                      ) : null}
                      <span className="ml-auto rounded-full border border-border/60 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-editorial-muted">
                        {b.status}
                      </span>
                    </div>
                    <p className="line-clamp-3 text-editorial-cream/90">{b.description}</p>
                    {ch ? (
                      <p className="mt-1 truncate text-[10px] text-gold/80">
                        Ch {ch.chapter_number}: {ch.title}
                      </p>
                    ) : null}
                  </button>

                  {/* Foreshadow → payoff link hint */}
                  {b.beat_type === "foreshadow" ? (
                    <div className="mt-1.5 flex items-center justify-between gap-1 border-t border-border/40 pt-1.5">
                      {pair && payoffBeat ? (
                        <span
                          className="flex items-center gap-1 truncate text-[10px] text-emerald-400"
                          title={`Paid off in ${payoffBook ? `Book ${payoffBook.series_order ?? "?"}` : "missing book"}: ${payoffBeat.description}`}
                        >
                          <LinkIcon className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            Payoff in Book {payoffBook?.series_order ?? "?"}
                          </span>
                        </span>
                      ) : pair ? (
                        <span className="flex items-center gap-1 text-[10px] text-red-400">
                          <UnlinkIcon className="h-3 w-3" />
                          Payoff deleted
                        </span>
                      ) : (
                        <span className="text-[10px] text-editorial-muted">
                          No payoff linked
                        </span>
                      )}
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onLinkPayoff(b);
                          }}
                          className="rounded p-0.5 text-editorial-muted hover:text-gold"
                          aria-label="Link or change payoff"
                        >
                          <LinkIcon className="h-3 w-3" />
                        </button>
                        {pair ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Remove this foreshadow→payoff link?")) {
                                onUnlink(pair.id);
                              }
                            }}
                            className="rounded p-0.5 text-editorial-muted hover:text-red-400"
                            aria-label="Unlink payoff"
                          >
                            <UnlinkIcon className="h-3 w-3" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {/* Payoff side: show any foreshadows that point here. */}
                  {b.beat_type === "payoff" && paysOffFrom.length > 0 ? (
                    <p
                      className="mt-1.5 flex items-center gap-1 border-t border-border/40 pt-1.5 text-[10px] text-emerald-400"
                      title={`Pays off ${paysOffFrom.length} foreshadow${paysOffFrom.length === 1 ? "" : "s"}`}
                    >
                      <LinkIcon className="h-3 w-3" />
                      Pays off {paysOffFrom.length} foreshadow
                      {paysOffFrom.length === 1 ? "" : "s"}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Link-payoff modal                                                          */
/* -------------------------------------------------------------------------- */

function LinkPayoffModal({
  foreshadowBeat,
  allBeats,
  books,
  existingPair,
  onClose,
}: {
  foreshadowBeat: BeatRow;
  allBeats: BeatRow[];
  books: SeriesBookRow[];
  existingPair: ForeshadowPairRow | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const orderByBook = useMemo(
    () => new Map(books.map((b) => [b.id, b.series_order ?? Number.POSITIVE_INFINITY] as const)),
    [books],
  );
  const foreshadowOrder =
    foreshadowBeat.book_id
      ? orderByBook.get(foreshadowBeat.book_id) ?? Number.POSITIVE_INFINITY
      : Number.POSITIVE_INFINITY;

  // Candidates: any beat in the series that sits at a later position
  // than the foreshadow. Spec says "select another beat in a later
  // book" — we widen to "later in the timeline," which also allows
  // same-book-later-chapter setups that are common in genre fiction.
  // We still prefer payoff-typed beats at the top of the list.
  const candidates = useMemo(() => {
    return allBeats
      .filter((b) => b.id !== foreshadowBeat.id)
      .filter((b) => {
        const bo = b.book_id ? orderByBook.get(b.book_id) ?? Number.POSITIVE_INFINITY : Number.POSITIVE_INFINITY;
        if (bo > foreshadowOrder) return true;
        if (bo === foreshadowOrder && b.position > foreshadowBeat.position) return true;
        return false;
      })
      .sort((a, b) => {
        // Payoffs first.
        const ap = a.beat_type === "payoff" ? 0 : 1;
        const bp = b.beat_type === "payoff" ? 0 : 1;
        if (ap !== bp) return ap - bp;
        const ao = a.book_id ? orderByBook.get(a.book_id) ?? Number.POSITIVE_INFINITY : Number.POSITIVE_INFINITY;
        const bo = b.book_id ? orderByBook.get(b.book_id) ?? Number.POSITIVE_INFINITY : Number.POSITIVE_INFINITY;
        if (ao !== bo) return ao - bo;
        return a.position - b.position;
      });
  }, [allBeats, foreshadowBeat, foreshadowOrder, orderByBook]);

  const [selectedId, setSelectedId] = useState<string>(existingPair?.payoff_beat_id ?? "");
  const [note, setNote] = useState<string>(existingPair?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return candidates;
    return candidates.filter((b) => b.description.toLowerCase().includes(needle));
  }, [candidates, q]);

  const save = async () => {
    if (!selectedId) return toast.error("Pick a payoff beat.");
    setBusy(true);
    const res = await linkForeshadowingPair(foreshadowBeat.id, selectedId, note);
    setBusy(false);
    if (!res.ok) return toast.error(res.error ?? "Could not link.");
    toast.success("Linked.");
    onClose();
    router.refresh();
  };

  const bookLabel = (bookId: string | null) => {
    if (!bookId) return "No book";
    const b = books.find((x) => x.id === bookId);
    return b ? `#${b.series_order ?? "?"} ${b.title}` : "—";
  };

  return (
    <div className={responsiveModalRoot()} role="dialog" aria-modal="true" aria-label="Link payoff">
      <button type="button" className={responsiveModalBackdrop()} aria-label="Close" onClick={onClose} />
      <div className={responsiveModalPanel("max-w-lg p-6 gap-3")}>
        <h3 className="font-serif text-xl text-editorial-cream">Link payoff</h3>
        <p className="text-xs text-editorial-muted">
          Foreshadow:{" "}
          <span className="text-editorial-cream/90">{foreshadowBeat.description}</span>
        </p>
        <div>
          <Label htmlFor="ps">Search later beats</Label>
          <Input
            id="ps"
            className="mt-1"
            placeholder="Type to filter…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="max-h-72 overflow-y-auto rounded-md border border-input bg-background">
          {filtered.length === 0 ? (
            <p className="p-3 text-xs text-editorial-muted">
              No later beats{" "}
              {q ? "match that search" : "exist yet — write one first"}.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {filtered.map((c) => {
                const meta = beatMeta(c.beat_type);
                return (
                  <li key={c.id}>
                    <label className="flex cursor-pointer items-start gap-2 p-2 hover:bg-card/40">
                      <input
                        type="radio"
                        name="payoff"
                        value={c.id}
                        checked={selectedId === c.id}
                        onChange={() => setSelectedId(c.id)}
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center gap-1.5">
                          {meta ? (
                            <span
                              className={cn(
                                "rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-wide",
                                meta.chipClass,
                              )}
                            >
                              {meta.label}
                            </span>
                          ) : null}
                          <span className="text-[10px] uppercase tracking-wide text-editorial-muted">
                            {bookLabel(c.book_id)}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-xs text-editorial-cream/90">
                          {c.description}
                        </p>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div>
          <Label htmlFor="pn">Note (optional)</Label>
          <textarea
            id="pn"
            className="mt-1 w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Why this pair matters…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={busy || !selectedId} onClick={() => void save()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : existingPair ? "Update link" : "Link"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Arc editor modal                                                           */
/* -------------------------------------------------------------------------- */

function ArcEditor({
  seriesId,
  books,
  codex,
  mode,
  initial,
  onClose,
  onCreated,
}: {
  seriesId: string;
  books: SeriesBookRow[];
  codex: CodexRow[];
  mode: "create" | "edit";
  initial?: ArcRow;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [desc, setDesc] = useState(initial?.description_md ?? "");
  const [type, setType] = useState<SeriesArcTypeDb>(initial?.arc_type ?? "plot");
  const [status, setStatus] = useState<SeriesArcStatusDb>(initial?.status ?? "setup");
  const [startsBookId, setStartsBookId] = useState<string>(initial?.starts_book_id ?? "");
  const [endsBookId, setEndsBookId] = useState<string>(initial?.ends_book_id ?? "");
  const [linkedIds, setLinkedIds] = useState<string[]>(initial?.linked_codex_entry_ids ?? []);
  const [aiHint, setAiHint] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [busy, setBusy] = useState(false);

  const fillArcWithAi = async () => {
    const h = aiHint.trim();
    if (!h) {
      toast.error("Add a short description of the arc, then try again.");
      return;
    }
    setAiBusy(true);
    try {
      const res = await fetch("/api/ai/suggest-series-arc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seriesId,
          userHint: h,
          formArcType: type,
          formStatus: status,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        name?: string;
        description_md?: string;
        arc_type?: SeriesArcTypeDb;
        status?: SeriesArcStatusDb;
        starts_book_id?: string | null;
        ends_book_id?: string | null;
        linked_codex_entry_ids?: string[];
      };
      if (!res.ok) {
        toast.error(data.error ?? "Could not generate a suggestion.");
        return;
      }
      if (!data.name) {
        toast.error("Unexpected response. Try again.");
        return;
      }
      setName(data.name);
      if (data.description_md != null) setDesc(data.description_md);
      if (data.arc_type) setType(data.arc_type);
      if (data.status) setStatus(data.status);
      setStartsBookId(data.starts_book_id ?? "");
      setEndsBookId(data.ends_book_id ?? "");
      if (Array.isArray(data.linked_codex_entry_ids)) {
        setLinkedIds(
          data.linked_codex_entry_ids.filter((id) => codex.some((c) => c.id === id)),
        );
      }
      toast.success("Form filled. Review and save.");
    } catch {
      toast.error("Request failed. Check your connection and try again.");
    } finally {
      setAiBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    if (mode === "create") {
      const res = await createArcAction(seriesId, {
        name: name.trim() || "Untitled arc",
        description_md: desc.trim() || null,
        arc_type: type,
        status,
        starts_book_id: startsBookId || null,
        ends_book_id: endsBookId || null,
        linked_codex_entry_ids: linkedIds,
      });
      setBusy(false);
      if (!res.ok) return toast.error(res.error ?? "Could not create arc.");
      toast.success("Arc created.");
      if (res.ok && onCreated) onCreated(res.id);
    } else if (initial) {
      const res = await updateArcAction(initial.id, {
        name: name.trim() || "Untitled arc",
        description_md: desc.trim() || null,
        arc_type: type,
        status,
        starts_book_id: startsBookId || null,
        ends_book_id: endsBookId || null,
        linked_codex_entry_ids: linkedIds,
      });
      setBusy(false);
      if (!res.ok) return toast.error(res.error ?? "Could not save arc.");
      toast.success("Arc saved.");
    }
    onClose();
    router.refresh();
  };

  const toggleLinked = (id: string) => {
    setLinkedIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  };

  return (
    <div
      className={responsiveModalRoot()}
      role="dialog"
      aria-modal="true"
      aria-label={mode === "create" ? "Create arc" : "Edit arc"}
    >
      <button type="button" className={responsiveModalBackdrop()} aria-label="Close" onClick={onClose} />
      <div className={responsiveModalPanel("max-w-lg p-6 gap-3")}>
        <h3 className="font-serif text-xl text-editorial-cream">
          {mode === "create" ? "New arc" : "Edit arc"}
        </h3>
        <div className="rounded-lg border border-gold/25 bg-gold/5 p-3">
          <p className="text-xs leading-relaxed text-editorial-muted">
            Describe the arc, paste notes, or stay high-level. AI can suggest name, type, status, span
            across books, and linked codex. Edit anything before save.
          </p>
          <label htmlFor="arc-ai-hint" className="sr-only">
            Hints for AI
          </label>
          <textarea
            id="arc-ai-hint"
            value={aiHint}
            onChange={(e) => setAiHint(e.target.value)}
            className="mt-2 w-full min-h-[88px] rounded-md border border-input bg-background px-3 py-2 text-sm text-editorial-cream"
            placeholder="E.g. the blood-feud that starts in book 1 and pays off in book 3 when X reveals Y."
          />
          <Button
            type="button"
            variant="outline"
            className="mt-2 w-full border-gold/50 text-gold hover:bg-gold/10"
            disabled={aiBusy}
            onClick={() => void fillArcWithAi()}
          >
            {aiBusy ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 shrink-0" />
            )}
            <span className="ml-2">Auto-fill with AI</span>
          </Button>
        </div>
        <div>
          <Label htmlFor="an">Name</Label>
          <Input id="an" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="ad">Description</Label>
          <textarea
            id="ad"
            className="mt-1 w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="atype">Type</Label>
            <select
              id="atype"
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as SeriesArcTypeDb)}
            >
              {ARC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="astat">Status</Label>
            <select
              id="astat"
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as SeriesArcStatusDb)}
            >
              {ARC_STATUSES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="astart">Starts in</Label>
            <select
              id="astart"
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={startsBookId}
              onChange={(e) => setStartsBookId(e.target.value)}
            >
              <option value="">—</option>
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  #{b.series_order ?? "?"} {b.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="aend">Ends in</Label>
            <select
              id="aend"
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={endsBookId}
              onChange={(e) => setEndsBookId(e.target.value)}
            >
              <option value="">—</option>
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  #{b.series_order ?? "?"} {b.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        {codex.length > 0 ? (
          <div>
            <Label>Linked codex entries</Label>
            <div className="mt-1 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-md border border-input bg-background p-2">
              {codex.map((c) => {
                const on = linkedIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleLinked(c.id)}
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[11px]",
                      on
                        ? "border-gold text-gold"
                        : "border-border/60 text-editorial-muted hover:border-gold/40",
                    )}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={busy} onClick={() => void save()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Beat editor modal                                                          */
/* -------------------------------------------------------------------------- */

function BeatEditor({
  arcId,
  books,
  chapters,
  initialBookId,
  initialBeat,
  onClose,
}: {
  arcId: string;
  books: SeriesBookRow[];
  chapters: SeriesChapterRow[];
  initialBookId: string | null;
  initialBeat?: BeatRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const isEdit = !!initialBeat;
  const [bookId, setBookId] = useState<string>(
    initialBeat?.book_id ?? initialBookId ?? books[0]?.id ?? "",
  );
  const [chapterId, setChapterId] = useState<string>(initialBeat?.chapter_id ?? "");
  const [beatType, setBeatType] = useState<SeriesArcBeatTypeDb>(
    initialBeat?.beat_type ?? "development",
  );
  const [description, setDescription] = useState(initialBeat?.description ?? "");
  const [status, setStatus] = useState<SeriesArcBeatStatusDb>(
    initialBeat?.status ?? "planned",
  );
  const [position, setPosition] = useState<number>(initialBeat?.position ?? 0);
  const [aiHint, setAiHint] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [busy, setBusy] = useState(false);

  // Only chapters in the selected book are valid targets. Switching books
  // clears any previous chapter selection that would now dangle.
  const bookChapters = useMemo(
    () =>
      chapters
        .filter((c) => c.book_id === bookId)
        .sort((a, b) => a.chapter_number - b.chapter_number),
    [chapters, bookId],
  );

  useEffect(() => {
    if (chapterId && !bookChapters.find((c) => c.id === chapterId)) {
      setChapterId("");
    }
  }, [bookChapters, chapterId]);

  const fillBeatWithAi = async () => {
    const h = aiHint.trim();
    if (!h) {
      toast.error("Add what this beat should cover, then try again.");
      return;
    }
    setAiBusy(true);
    try {
      const res = await fetch("/api/ai/suggest-series-beat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          arcId,
          userHint: h,
          formBeatType: beatType,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        beat_type?: SeriesArcBeatTypeDb;
        description?: string;
        status?: SeriesArcBeatStatusDb;
        book_id?: string | null;
        chapter_id?: string | null;
      };
      if (!res.ok) {
        toast.error(data.error ?? "Could not generate a suggestion.");
        return;
      }
      if (!data.description) {
        toast.error("Unexpected response. Try again.");
        return;
      }
      if (data.beat_type) setBeatType(data.beat_type);
      setDescription(data.description);
      if (data.status) setStatus(data.status);
      const nextBookId =
        data.book_id && books.some((b) => b.id === data.book_id)
          ? data.book_id
          : books.length === 1
            ? books[0]!.id
            : bookId;
      if (data.book_id && books.some((b) => b.id === data.book_id)) {
        setBookId(data.book_id);
      } else if (books.length === 1) {
        setBookId(books[0]!.id);
      }
      if (data.chapter_id) {
        const ch = chapters.find((c) => c.id === data.chapter_id);
        if (ch && ch.book_id === nextBookId) {
          setChapterId(data.chapter_id);
        } else {
          setChapterId("");
        }
      } else {
        setChapterId("");
      }
      toast.success("Form filled. Review and save.");
    } catch {
      toast.error("Request failed. Check your connection and try again.");
    } finally {
      setAiBusy(false);
    }
  };

  const save = async () => {
    if (!description.trim()) return toast.error("Describe this beat.");
    setBusy(true);
    if (isEdit && initialBeat) {
      const res = await updateBeatAction(initialBeat.id, {
        book_id: bookId || null,
        chapter_id: chapterId || null,
        beat_type: beatType,
        description: description.trim(),
        status,
        position: position >= 0 ? position : initialBeat.position,
      });
      setBusy(false);
      if (!res.ok) return toast.error(res.error ?? "Could not save beat.");
      toast.success("Beat saved.");
    } else {
      const res = await createBeatAction({
        arc_id: arcId,
        book_id: bookId || null,
        chapter_id: chapterId || null,
        position: 0,
        beat_type: beatType,
        description: description.trim(),
        status,
      });
      setBusy(false);
      if (!res.ok) return toast.error(res.error ?? "Could not create beat.");
      toast.success("Beat added.");
    }
    onClose();
    router.refresh();
  };

  const del = async () => {
    if (!initialBeat) return;
    if (!confirm("Delete this beat?")) return;
    setBusy(true);
    const res = await deleteBeatAction(initialBeat.id);
    setBusy(false);
    if (!res.ok) return toast.error(res.error ?? "Could not delete.");
    toast.success("Beat deleted.");
    onClose();
    router.refresh();
  };

  return (
    <div
      className={responsiveModalRoot()}
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? "Edit beat" : "New beat"}
    >
      <button type="button" className={responsiveModalBackdrop()} aria-label="Close" onClick={onClose} />
      <div className={responsiveModalPanel("max-w-md p-6 gap-3")}>
        <h3 className="font-serif text-lg text-editorial-cream">
          {isEdit ? "Edit beat" : "New beat"}
        </h3>
        <div className="rounded-lg border border-gold/25 bg-gold/5 p-3">
          <p className="text-xs leading-relaxed text-editorial-muted">
            Say what happens in this beat, foreshadowing, payoff, or a turning point. AI suggests type, book,
            chapter, and wording. Edit before save.
          </p>
          <label htmlFor="beat-ai-hint" className="sr-only">
            Hints for AI
          </label>
          <textarea
            id="beat-ai-hint"
            value={aiHint}
            onChange={(e) => setAiHint(e.target.value)}
            className="mt-2 w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm text-editorial-cream"
            placeholder="E.g. Protagonist finds the locket; hints the aunt was lying since chapter 2."
          />
          <Button
            type="button"
            variant="outline"
            className="mt-2 w-full border-gold/50 text-gold hover:bg-gold/10"
            disabled={aiBusy}
            onClick={() => void fillBeatWithAi()}
          >
            {aiBusy ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 shrink-0" />
            )}
            <span className="ml-2">Auto-fill with AI</span>
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="bbi">Book</Label>
            <select
              id="bbi"
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
            >
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  #{b.series_order ?? "?"} {b.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="bci">Chapter (optional)</Label>
            <select
              id="bci"
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
              value={chapterId}
              onChange={(e) => setChapterId(e.target.value)}
              disabled={bookChapters.length === 0}
            >
              <option value="">
                {bookChapters.length === 0
                  ? "No chapters yet"
                  : "— not linked —"}
              </option>
              {bookChapters.map((c) => (
                <option key={c.id} value={c.id}>
                  Ch {c.chapter_number}: {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="bt">Type</Label>
            <select
              id="bt"
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={beatType}
              onChange={(e) => setBeatType(e.target.value as SeriesArcBeatTypeDb)}
            >
              {BEAT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="bs">Status</Label>
            <select
              id="bs"
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as SeriesArcBeatStatusDb)}
            >
              {BEAT_STATUSES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <Label htmlFor="bd">Description</Label>
          <textarea
            id="bd"
            className="mt-1 w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        {isEdit ? (
          <div>
            <Label htmlFor="bp">Position (within arc)</Label>
            <Input
              id="bp"
              type="number"
              min={0}
              value={position}
              onChange={(e) => setPosition(Number.parseInt(e.target.value || "0", 10))}
              className="mt-1"
            />
            <p className="mt-1 text-[10px] text-editorial-muted">
              Controls beat order inside this arc. Power users only — normally
              managed by reorder + drag.
            </p>
          </div>
        ) : null}
        <div className="flex items-center justify-between pt-2">
          {isEdit ? (
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void del()}>
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" disabled={busy} onClick={() => void save()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Foreshadowing audit report                                                  */
/* -------------------------------------------------------------------------- */

function ForeshadowAuditReport({
  seriesId,
  books,
  arcs,
  beats,
  onClose,
  onAddPayoffFor,
}: {
  seriesId: string;
  books: SeriesBookRow[];
  arcs: ArcRow[];
  beats: BeatRow[];
  onClose: () => void;
  onAddPayoffFor: (foreshadowBeatId: string) => void;
}) {
  void arcs;
  void beats;
  const [report, setReport] = useState<ForeshadowReport | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getForeshadowingReport(seriesId);
      if (cancelled) return;
      if (!res.ok) setErr(res.error);
      else setReport(res.report);
    })();
    return () => {
      cancelled = true;
    };
  }, [seriesId]);

  const bookTitle = (id: string | null) => {
    if (!id) return "—";
    const b = books.find((x) => x.id === id);
    return b ? `#${b.series_order ?? "?"} ${b.title}` : "—";
  };

  /* Prompt 16.5 § EXPORT: the spec says "Download PDF report". We
   * defer to the browser print dialog (save-as-PDF is always there)
   * rather than ship a pdfmake dependency for a revision-phase
   * checklist. `window.print()` with a dedicated print CSS would be
   * nicer; for v1 we use a printable-only wrapper class. */
  const doPrint = () => {
    if (typeof window !== "undefined") window.print();
  };

  const totalForeshadows = report?.items.length ?? 0;
  const unmatchedForeshadows = report?.items.filter((i) => !i.matched).length ?? 0;
  const explicitMatched = report?.items.filter((i) => i.matchSource === "explicit").length ?? 0;
  const heuristicMatched = report?.items.filter((i) => i.matchSource === "heuristic").length ?? 0;
  const unmatchedPayoffCount = report?.unmatchedPayoffs.length ?? 0;

  return (
    <div
      className={responsiveModalRoot()}
      role="dialog"
      aria-modal="true"
      aria-label="Foreshadowing audit report"
    >
      <button
        type="button"
        className={cn(responsiveModalBackdrop(), "print:hidden")}
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className={responsiveModalPanel("max-w-3xl p-6 gap-3 print:max-w-none print:rounded-none print:p-4")}
      >
        <div ref={printRef} className="space-y-4 print:text-black">
          <div className="flex flex-wrap items-start justify-between gap-3 print:block">
            <div>
              <h3 className="font-serif text-xl text-editorial-cream print:text-black">
                Foreshadowing audit
              </h3>
              <p className="mt-1 text-xs text-editorial-muted print:text-neutral-600">
                Track Chekhov's-gun problems across the series — unresolved
                hints, unearned reveals, and explicit pairs waiting to
                land.
              </p>
            </div>
            <div className="flex gap-2 print:hidden">
              <Button type="button" variant="outline" size="sm" onClick={doPrint}>
                <Download className="mr-1 h-3.5 w-3.5" />
                Download PDF
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>

          {err ? (
            <p className="text-sm text-red-400">{err}</p>
          ) : !report ? (
            <p className="text-sm text-editorial-muted">Loading…</p>
          ) : (
            <>
              {/* Summary chips */}
              <div className="flex flex-wrap gap-2 text-[11px] print:hidden">
                <SummaryChip label="Foreshadows" value={totalForeshadows} tone="neutral" />
                <SummaryChip label="Explicit pairs" value={explicitMatched} tone="good" />
                <SummaryChip label="Heuristic matches" value={heuristicMatched} tone="neutral" />
                <SummaryChip label="Unmatched foreshadows" value={unmatchedForeshadows} tone="bad" />
                <SummaryChip label="Unmatched payoffs" value={unmatchedPayoffCount} tone="warn" />
              </div>

              {/* Foreshadows */}
              <section>
                <h4 className="font-serif text-lg text-editorial-cream print:text-black">
                  Foreshadows
                </h4>
                {report.items.length === 0 ? (
                  <p className="mt-2 text-sm text-editorial-muted">
                    No foreshadow beats yet. Add beats of type{" "}
                    <strong>foreshadow</strong> in early books and{" "}
                    <strong>payoff</strong> in later books to populate this
                    report.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {report.items.map((it) => (
                      <li
                        key={it.foreshadowBeatId}
                        className={cn(
                          "rounded-md border p-3 text-sm print:border-neutral-400 print:bg-white",
                          it.matched
                            ? "border-border/60 bg-background/60"
                            : "border-red-500/40 bg-red-500/10",
                        )}
                      >
                        <p className="text-[11px] uppercase tracking-wide text-editorial-muted print:text-neutral-600">
                          {it.arcName} · foreshadow in {bookTitle(it.foreshadowBookId)}
                          {it.matchSource === "explicit" ? (
                            <span className="ml-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-emerald-300">
                              explicit
                            </span>
                          ) : it.matchSource === "heuristic" ? (
                            <span className="ml-2 rounded-full border border-border/60 px-1.5 py-0.5">
                              heuristic
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-1 text-editorial-cream/90 print:text-black">
                          {it.description}
                        </p>
                        {it.matched ? (
                          <div className="mt-2 border-l-2 border-emerald-500/40 pl-2 text-xs">
                            <p className="text-emerald-400">
                              Pays off in {bookTitle(it.payoffBookId)}
                              {it.payoffArcId && it.payoffArcId !== it.arcId
                                ? ` (arc: ${it.payoffArcName})`
                                : ""}
                              :
                            </p>
                            <p className="mt-0.5 text-editorial-cream/80 print:text-black">
                              {it.payoffDescription}
                            </p>
                            {it.pairNote ? (
                              <p className="mt-1 italic text-editorial-muted">{it.pairNote}</p>
                            ) : null}
                          </div>
                        ) : (
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs text-red-400">
                              Unmatched — no later payoff beat found.
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="print:hidden"
                              onClick={() => onAddPayoffFor(it.foreshadowBeatId)}
                            >
                              <Plus className="mr-1 h-3.5 w-3.5" />
                              Add missing payoff
                            </Button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Unmatched payoffs */}
              <section>
                <h4 className="font-serif text-lg text-editorial-cream print:text-black">
                  Unexpected payoffs
                </h4>
                {report.unmatchedPayoffs.length === 0 ? (
                  <p className="mt-2 text-sm text-editorial-muted">
                    Every payoff has a matching foreshadow. Nicely planted.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {report.unmatchedPayoffs.map((it) => (
                      <li
                        key={it.payoffBeatId}
                        className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm print:bg-white"
                      >
                        <p className="text-[11px] uppercase tracking-wide text-editorial-muted print:text-neutral-600">
                          {it.arcName} · payoff in {bookTitle(it.bookId)}
                        </p>
                        <p className="mt-1 text-editorial-cream/90 print:text-black">
                          {it.description}
                        </p>
                        <p className="mt-2 text-xs text-yellow-300 print:text-yellow-700">
                          No foreshadow points at this payoff — the reveal
                          may land unearned.
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "good" | "bad" | "warn" | "neutral";
}) {
  const toneClass =
    tone === "good"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : tone === "bad"
        ? "border-red-500/40 bg-red-500/10 text-red-300"
        : tone === "warn"
          ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-300"
          : "border-border/60 bg-card/40 text-editorial-muted";
  return (
    <span className={cn("rounded-full border px-2 py-0.5", toneClass)}>
      {label}: <strong>{value}</strong>
    </span>
  );
}

