"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils/cn";

import type {
  ArcRow,
  BeatRow,
  CodexRow,
  ProgressionRow,
  SeriesBookRow,
  SeriesChapterRow,
} from "../series-detail-shell";
import type { SeriesArcBeatTypeDb } from "@/types/database.types";

/**
 * Prompt 16.5 § TIMELINE TAB
 * "A horizontal 'big picture' view showing EVERY chapter across all
 *  books, with overlays for:
 *    - Character progressions (swim lanes)
 *    - Arc beats (vertical markers crossing chapter boundaries,
 *      color-coded by arc)
 *    - POV lock (placeholder — not modeled on chapter rows yet)
 *  Zoom levels:
 *    - Series level: each book is one column, chapters are compressed
 *    - Book level: one book fills the view, each chapter is a column
 *    - Chapter level: requires Prompt 12 scene beats — stubbed for now"
 *
 * v1 implementation is intentionally CSS-driven (flex + min-width grids)
 * rather than SVG or react-flow. The horizontal scroll contract matches
 * the Arcs tab so both views feel like the same "series workspace",
 * and we avoid a new runtime dep. When chapter counts balloon (10+
 * books × 40 chapters each) we can swap in virtualization without a
 * data-layer change.
 */

const BEAT_CHIP: Record<SeriesArcBeatTypeDb, { ring: string; dot: string }> = {
  setup:        { ring: "ring-blue-500/60",    dot: "bg-blue-500" },
  foreshadow:   { ring: "ring-yellow-500/60",  dot: "bg-yellow-500" },
  development:  { ring: "ring-neutral-500/60", dot: "bg-neutral-400" },
  complication: { ring: "ring-orange-500/60",  dot: "bg-orange-500" },
  payoff:       { ring: "ring-emerald-500/60", dot: "bg-emerald-500" },
  resolution:   { ring: "ring-teal-500/60",    dot: "bg-teal-500" },
};

type ZoomLevel = "series" | "book";

export function TimelineTab({
  seriesId,
  books,
  chapters,
  arcs,
  beats,
  codex,
  progressions,
}: {
  seriesId: string;
  books: SeriesBookRow[];
  chapters: SeriesChapterRow[];
  arcs: ArcRow[];
  beats: BeatRow[];
  codex: CodexRow[];
  progressions: ProgressionRow[];
}) {
  void seriesId;
  const [zoom, setZoom] = useState<ZoomLevel>("series");
  // Book focus is only used at book-level zoom. Defaults to the first
  // book so the view shows *something* immediately on zoom switch.
  const [focusBookId, setFocusBookId] = useState<string>(books[0]?.id ?? "");

  const orderedBooks = useMemo(
    () =>
      [...books].sort(
        (a, b) => (a.series_order ?? 9999) - (b.series_order ?? 9999),
      ),
    [books],
  );

  // Build the ordered chapter list per book once so every downstream
  // lookup is O(1). At series-level zoom the chapter column widths
  // collapse so a 40-chapter book fits beside a 10-chapter book.
  const chaptersByBook = useMemo(() => {
    const m = new Map<string, SeriesChapterRow[]>();
    for (const ch of chapters) {
      if (!m.has(ch.book_id)) m.set(ch.book_id, []);
      m.get(ch.book_id)!.push(ch);
    }
    for (const arr of Array.from(m.values())) {
      arr.sort((a, b) => a.chapter_number - b.chapter_number);
    }
    return m;
  }, [chapters]);

  // Arc assignment per beat; we only render arcs with at least one
  // beat inside the visible book range so the sidebar stays quiet.
  const arcById = useMemo(() => new Map(arcs.map((a) => [a.id, a] as const)), [arcs]);

  // Characters get one swim lane each. We only include series-scoped
  // codex entries of type 'character' so the lane list stays readable
  // on trilogies with 20 book-specific NPCs.
  const characterEntries = useMemo(
    () => codex.filter((c) => c.entry_type === "character" && c.scope === "series"),
    [codex],
  );

  // Progressions indexed by (entry_id, book_id) — and then we locate
  // the specific chapter column for dotted placement.
  const progressionIndex = useMemo(() => {
    const m = new Map<string, ProgressionRow[]>();
    for (const p of progressions) {
      const k = `${p.codex_entry_id}:${p.book_id}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(p);
    }
    return m;
  }, [progressions]);

  const visibleBooks =
    zoom === "book" && focusBookId
      ? orderedBooks.filter((b) => b.id === focusBookId)
      : orderedBooks;

  // Each chapter column gets a uniform width so arc markers can land
  // on a predictable pixel. Book-level shows wide columns; series-level
  // compresses to match density.
  const chapterWidth = zoom === "book" ? 120 : 44;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-lg text-editorial-cream">Series timeline</h2>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex rounded-md border border-border/60 p-0.5">
            {(["series", "book"] as const).map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setZoom(z)}
                className={cn(
                  "rounded px-3 py-1 uppercase tracking-wide",
                  zoom === z
                    ? "bg-gold/20 text-gold"
                    : "text-editorial-muted hover:text-editorial-cream",
                )}
                aria-pressed={zoom === z}
              >
                {z}
              </button>
            ))}
          </div>
          {zoom === "book" ? (
            <select
              aria-label="Focus book"
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              value={focusBookId}
              onChange={(e) => setFocusBookId(e.target.value)}
            >
              {orderedBooks.map((b) => (
                <option key={b.id} value={b.id}>
                  #{b.series_order ?? "?"} {b.title}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </div>

      {books.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-border/60 p-6 text-center text-sm text-editorial-muted">
          Add books to the series to populate the timeline.
        </p>
      ) : (
        <div className="mt-4 -mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
          <div className="min-w-max">
            {/* --- Book headers + chapter ruler ------------------------------ */}
            <BookHeaderRow
              books={visibleBooks}
              chaptersByBook={chaptersByBook}
              chapterWidth={chapterWidth}
            />

            {/* --- Arc beat markers per arc ---------------------------------- */}
            <ArcMarkers
              books={visibleBooks}
              chaptersByBook={chaptersByBook}
              arcs={arcs}
              beats={beats}
              arcById={arcById}
              chapterWidth={chapterWidth}
            />

            {/* --- Character swim lanes -------------------------------------- */}
            <CharacterLanes
              books={visibleBooks}
              chaptersByBook={chaptersByBook}
              characters={characterEntries}
              progressionIndex={progressionIndex}
              chapterWidth={chapterWidth}
            />
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-3 text-[10px] text-editorial-muted">
        {(Object.keys(BEAT_CHIP) as SeriesArcBeatTypeDb[]).map((t) => (
          <span key={t} className="flex items-center gap-1">
            <span className={cn("inline-block h-2 w-2 rounded-full", BEAT_CHIP[t].dot)} />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Book header row                                                            */
/* -------------------------------------------------------------------------- */

function BookHeaderRow({
  books,
  chaptersByBook,
  chapterWidth,
}: {
  books: SeriesBookRow[];
  chaptersByBook: Map<string, SeriesChapterRow[]>;
  chapterWidth: number;
}) {
  return (
    <div className="flex">
      {/* Leading gutter that matches the lane label column below so
        * everything lines up visually. */}
      <div className="w-40 shrink-0" />
      <div className="flex flex-1 border-b border-border/60">
        {books.map((b) => {
          const chs = chaptersByBook.get(b.id) ?? [];
          const width = Math.max(chs.length, 1) * chapterWidth;
          return (
            <div key={b.id} className="shrink-0 border-r border-border/30" style={{ width }}>
              <div className="px-2 pb-1 pt-2 text-[11px] uppercase tracking-wide text-editorial-muted">
                #{b.series_order ?? "?"} {b.title}
                <span className="ml-2 text-[10px] text-editorial-muted/70">
                  {chs.length} ch
                </span>
              </div>
              <div className="flex">
                {chs.length === 0 ? (
                  <div
                    className="h-6 shrink-0 border-l border-border/30"
                    style={{ width: chapterWidth }}
                  />
                ) : (
                  chs.map((c) => (
                    <Link
                      key={c.id}
                      href={`/projects/${b.id}/chapters/${c.id}`}
                      className="group flex h-6 shrink-0 items-center justify-center border-l border-border/30 text-[10px] text-editorial-muted hover:bg-card/60 hover:text-gold"
                      style={{ width: chapterWidth }}
                      title={`Ch ${c.chapter_number}: ${c.title}`}
                    >
                      {c.chapter_number}
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Arc markers                                                                */
/* -------------------------------------------------------------------------- */

function ArcMarkers({
  books,
  chaptersByBook,
  arcs,
  beats,
  arcById,
  chapterWidth,
}: {
  books: SeriesBookRow[];
  chaptersByBook: Map<string, SeriesChapterRow[]>;
  arcs: ArcRow[];
  beats: BeatRow[];
  arcById: Map<string, ArcRow>;
  chapterWidth: number;
}) {
  // Flatten beats into one row per arc; only arcs with at least one
  // beat in the visible book set render.
  const visibleBookIds = new Set(books.map((b) => b.id));
  const beatsByArc = new Map<string, BeatRow[]>();
  for (const beat of beats) {
    if (!beat.book_id || !visibleBookIds.has(beat.book_id)) continue;
    if (!beatsByArc.has(beat.arc_id)) beatsByArc.set(beat.arc_id, []);
    beatsByArc.get(beat.arc_id)!.push(beat);
  }
  if (beatsByArc.size === 0) return null;

  // Chapter-index lookup so a beat tied to a chapter lands on the
  // matching column. Beats without a chapter id center-dot their
  // book's first column as a fallback.
  const chapterIndex = new Map<string, number>();
  for (const [, chs] of Array.from(chaptersByBook.entries())) {
    chs.forEach((c, i) => chapterIndex.set(c.id, i));
  }

  return (
    <div className="mt-2 space-y-1">
      {arcs
        .filter((a) => beatsByArc.has(a.id))
        .map((a) => {
          const rows = beatsByArc.get(a.id) ?? [];
          return (
            <div key={a.id} className="flex items-center">
              <div
                className="flex h-7 w-40 shrink-0 items-center truncate pr-2 text-[11px] text-editorial-cream/90"
                title={a.name}
              >
                <span className="truncate">{a.name}</span>
                <span className="ml-1 shrink-0 rounded-full border border-border/60 px-1 py-0.5 text-[8px] uppercase tracking-wide text-editorial-muted">
                  {a.status}
                </span>
              </div>
              <div className="relative flex h-7 flex-1">
                {books.map((b) => {
                  const chs = chaptersByBook.get(b.id) ?? [];
                  const width = Math.max(chs.length, 1) * chapterWidth;
                  const arcBeatsInBook = rows.filter((r) => r.book_id === b.id);
                  return (
                    <div
                      key={b.id}
                      className="relative shrink-0 border-r border-border/30 bg-card/20"
                      style={{ width }}
                    >
                      {/* Faint horizontal lane rail */}
                      <div className="absolute inset-x-1 top-1/2 h-px -translate-y-1/2 bg-border/40" />
                      {arcBeatsInBook.map((beat) => {
                        const idx = beat.chapter_id ? chapterIndex.get(beat.chapter_id) : null;
                        const col = idx ?? 0;
                        const left = col * chapterWidth + chapterWidth / 2;
                        const tone = beat.beat_type ? BEAT_CHIP[beat.beat_type] : null;
                        const arc = arcById.get(beat.arc_id);
                        const tip = `${arc?.name ?? "Arc"} · ${beat.beat_type ?? "beat"}\n${beat.description}`;
                        return (
                          <span
                            key={beat.id}
                            className={cn(
                              "absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2",
                              tone?.dot ?? "bg-neutral-500",
                              tone?.ring ?? "ring-neutral-500/60",
                              beat.status === "complete" ? "opacity-100" : "opacity-70",
                            )}
                            style={{ left }}
                            title={tip}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Character swim lanes                                                       */
/* -------------------------------------------------------------------------- */

function CharacterLanes({
  books,
  chaptersByBook,
  characters,
  progressionIndex,
  chapterWidth,
}: {
  books: SeriesBookRow[];
  chaptersByBook: Map<string, SeriesChapterRow[]>;
  characters: CodexRow[];
  progressionIndex: Map<string, ProgressionRow[]>;
  chapterWidth: number;
}) {
  if (characters.length === 0) return null;

  const chapterIndex = new Map<string, number>();
  for (const [, chs] of Array.from(chaptersByBook.entries())) {
    chs.forEach((c, i) => chapterIndex.set(c.id, i));
  }

  return (
    <div className="mt-4 border-t border-border/40 pt-3">
      <p className="mb-2 w-40 text-[10px] uppercase tracking-wide text-editorial-muted">
        Character progressions
      </p>
      <div className="space-y-1">
        {characters.map((c) => (
          <div key={c.id} className="flex items-center">
            <div
              className="flex h-7 w-40 shrink-0 items-center truncate pr-2 text-[11px] text-editorial-cream/90"
              title={c.name}
            >
              <span className="truncate">{c.name}</span>
            </div>
            <div className="flex flex-1">
              {books.map((b) => {
                const chs = chaptersByBook.get(b.id) ?? [];
                const width = Math.max(chs.length, 1) * chapterWidth;
                const progs = progressionIndex.get(`${c.id}:${b.id}`) ?? [];
                const hasAny = progs.length > 0;
                return (
                  <div
                    key={b.id}
                    className={cn(
                      "relative h-7 shrink-0 border-r border-border/30",
                      hasAny ? "bg-gold/10" : "bg-card/20",
                    )}
                    style={{ width }}
                  >
                    <div className="absolute inset-x-1 top-1/2 h-px -translate-y-1/2 bg-border/40" />
                    {progs.map((p) => {
                      const idx = p.chapter_id ? chapterIndex.get(p.chapter_id) : null;
                      const col = idx ?? 0;
                      const left = col * chapterWidth + chapterWidth / 2;
                      const tip = `${p.event_type}\n${p.description}`;
                      return (
                        <span
                          key={p.id}
                          className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-gold"
                          style={{ left }}
                          title={tip}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
