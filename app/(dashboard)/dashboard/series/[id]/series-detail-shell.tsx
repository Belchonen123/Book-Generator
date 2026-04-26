"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { SeriesKeyboardShortcuts } from "@/components/series/SeriesKeyboardShortcuts";
import { cn } from "@/lib/utils/cn";
import type {
  CodexEntryScopeDb,
  CodexEntryTypeDb,
  Json,
  SeriesArcBeatStatusDb,
  SeriesArcBeatTypeDb,
  SeriesArcStatusDb,
  SeriesArcTypeDb,
  SeriesStatusDb,
} from "@/types/database.types";

import { OverviewTab } from "./_tabs/overview-tab";
import { BooksTab } from "./_tabs/books-tab";
import { CodexTab } from "./_tabs/codex-tab";
import { ArcsTab } from "./_tabs/arcs-tab";
import { MetadataTab } from "./_tabs/metadata-tab";
import { TimelineTab } from "./_tabs/timeline-tab";

/* -------------------------------------------------------------------------- */
/*  Shared row types                                                           */
/* -------------------------------------------------------------------------- */

export type SeriesRow = {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  genre: string | null;
  planned_book_count: number | null;
  status: SeriesStatusDb;
  shared_character_bible: Json;
  shared_world_notes: string | null;
  updated_at: string;
};

export type SeriesBookRow = {
  id: string;
  title: string;
  subtitle: string | null;
  status: string;
  word_count: number;
  chapter_count: number;
  cover_url: string | null;
  series_order: number | null;
  reading_order_note: string | null;
  series_summary_generated_at: string | null;
  /** Populated by "Summarize for series" — shown in Books tab. */
  series_plot_summary: string | null;
  series_end_state_dossier: string | null;
  updated_at: string;
};

/**
 * Books the current user owns that are NOT yet attached to any series.
 * Used exclusively by the Books tab's "Add existing book" modal; loaded
 * server-side so the modal opens without a round-trip.
 */
export type OrphanBookRow = {
  id: string;
  title: string;
  subtitle: string | null;
  cover_url: string | null;
  status: string;
  word_count: number;
};

export type CodexRow = {
  id: string;
  book_id: string | null;
  series_id: string | null;
  scope: CodexEntryScopeDb;
  entry_type: CodexEntryTypeDb;
  name: string;
  aliases: string[];
  summary: string | null;
  description_md: string | null;
  custom_fields: Json;
  updated_at: string;
};

export type OverlayRow = {
  id: string;
  codex_entry_id: string;
  book_id: string;
  field_overrides: Json;
  description_override: string | null;
  notes: string | null;
};

export type ProgressionRow = {
  id: string;
  codex_entry_id: string;
  book_id: string;
  chapter_id: string | null;
  event_type: string;
  description: string;
  position_hint: string | null;
  created_at: string;
};

export type ArcRow = {
  id: string;
  name: string;
  description_md: string | null;
  arc_type: SeriesArcTypeDb | null;
  status: SeriesArcStatusDb;
  starts_book_id: string | null;
  ends_book_id: string | null;
  linked_codex_entry_ids: string[];
};

export type BeatRow = {
  id: string;
  arc_id: string;
  book_id: string | null;
  chapter_id: string | null;
  position: number;
  beat_type: SeriesArcBeatTypeDb | null;
  description: string;
  status: SeriesArcBeatStatusDb;
};

/**
 * Explicit foreshadow→payoff link. One row per foreshadow beat; a
 * single payoff can be referenced by multiple foreshadows. When the
 * payoff beat is deleted the row survives with `payoff_beat_id: null`
 * so the audit report can flag the foreshadow as "payoff was deleted".
 */
export type ForeshadowPairRow = {
  id: string;
  foreshadow_beat_id: string;
  payoff_beat_id: string | null;
  note: string | null;
  created_at: string;
};

export type SeriesChapterRow = {
  id: string;
  book_id: string;
  chapter_number: number;
  title: string;
};

export type SeriesMetadataRow = {
  kdp_series_name: string | null;
  kdp_series_number_format: string;
  amazon_series_asin: string | null;
  boxed_set_title: string | null;
  boxed_set_description: string | null;
  cross_promo_copy_md: string | null;
  also_by_author_list_md: string | null;
  reading_order_copy_md: string | null;
  boxed_set_dedication_md: string | null;
  boxed_set_author_note_md: string | null;
  newsletter_signup_copy_md: string | null;
  boxed_set_included_book_ids: string[] | null;
  audiobook_bundle_metadata: Json;
};

/* -------------------------------------------------------------------------- */
/*  Tab shell                                                                  */
/* -------------------------------------------------------------------------- */

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "books", label: "Books" },
  { id: "codex", label: "Codex" },
  { id: "arcs", label: "Arcs" },
  { id: "timeline", label: "Timeline" },
  { id: "metadata", label: "Metadata" },
  { id: "export", label: "Export" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function SeriesDetailShell(props: {
  series: SeriesRow;
  books: SeriesBookRow[];
  orphanBooks: OrphanBookRow[];
  codex: CodexRow[];
  overlays: OverlayRow[];
  progressions: ProgressionRow[];
  arcs: ArcRow[];
  beats: BeatRow[];
  foreshadowPairs: ForeshadowPairRow[];
  chapters: SeriesChapterRow[];
  metadata: SeriesMetadataRow | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Seed initial tab from the `?tab=` query param so keyboard shortcuts
  // (and bookmarked deep links) land the user on the right section.
  const initialTab: TabId = useMemo(() => {
    const queryTab = searchParams?.get("tab") ?? null;
    const match = TABS.find((t) => t.id === queryTab);
    return match ? (match.id as TabId) : "overview";
  }, [searchParams]);
  const [tab, setTab] = useState<TabId>(initialTab);

  // When the query string changes after mount (e.g. the keyboard handler
  // pushed a new URL), reflect that in the active tab without clobbering
  // the user's clicks.
  useEffect(() => {
    const queryTab = searchParams?.get("tab") ?? null;
    const match = TABS.find((t) => t.id === queryTab);
    if (match && match.id !== tab) {
      setTab(match.id as TabId);
    }
    // Intentionally exclude `tab` from the dep list: this is a one-way
    // sync from URL → state so local setTab calls don't loop us back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  /**
   * Clicking a tab button should also update the URL so the shortcut
   * handler / router keep a consistent source of truth. `replace` keeps
   * the back button clean (every tab click would otherwise grow history).
   */
  const selectTab = (next: TabId) => {
    setTab(next);
    const current = new URLSearchParams(searchParams?.toString() ?? "");
    current.set("tab", next);
    // Drop the deep-link entry param when the user navigates away from
    // the Codex tab so re-opening the same entry requires intent.
    if (next !== "codex") current.delete("entry");
    router.replace(`${pathname}?${current.toString()}`, { scroll: false });
  };

  const deepLinkedEntryId = useMemo(
    () => searchParams?.get("entry") ?? null,
    [searchParams],
  );

  const totalWordCount = useMemo(
    () => props.books.reduce((sum, b) => sum + (b.word_count ?? 0), 0),
    [props.books],
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <SeriesKeyboardShortcuts seriesId={props.series.id} insideSeriesShell />
      <p className="text-xs font-semibold uppercase tracking-wide text-editorial-muted">
        <Link href="/dashboard" className="text-gold hover:underline">
          Library
        </Link>{" "}
        /{" "}
        <Link href="/dashboard/series" className="text-gold hover:underline">
          Series
        </Link>{" "}
        / {props.series.name}
      </p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="line-clamp-2 font-serif text-3xl text-editorial-cream">
            {props.series.name}
          </h1>
          {props.series.tagline ? (
            <p className="mt-1 max-w-2xl text-sm italic text-editorial-muted">
              {props.series.tagline}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] text-editorial-muted">
          <span className="rounded-full border border-border/60 px-2 py-0.5 uppercase tracking-wide">
            {props.series.status}
          </span>
          {props.series.genre ? (
            <span className="rounded-full border border-border/60 px-2 py-0.5">
              {props.series.genre}
            </span>
          ) : null}
          <span className="rounded-full border border-border/60 px-2 py-0.5">
            {props.books.length}
            {props.series.planned_book_count
              ? ` / ${props.series.planned_book_count}`
              : ""}{" "}
            book{props.books.length === 1 ? "" : "s"}
          </span>
          <span className="rounded-full border border-border/60 px-2 py-0.5">
            {totalWordCount.toLocaleString()} words
          </span>
        </div>
      </div>

      <nav
        className="mt-6 -mx-4 overflow-x-auto border-b border-border/60 px-4 sm:-mx-6 sm:px-6"
        aria-label="Series sections"
      >
        <ul className="flex min-w-max gap-1">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => selectTab(t.id)}
                  className={cn(
                    "relative border-b-2 px-3 py-2 text-sm transition-colors",
                    active
                      ? "border-gold text-editorial-cream"
                      : "border-transparent text-editorial-muted hover:text-editorial-cream",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {t.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-6">
        {tab === "overview" && (
          <OverviewTab
            series={props.series}
            books={props.books}
            totalWordCount={totalWordCount}
          />
        )}
        {tab === "books" && (
          <BooksTab
            seriesId={props.series.id}
            initialBooks={props.books}
            orphanBooks={props.orphanBooks}
          />
        )}
        {tab === "codex" && (
          <CodexTab
            seriesId={props.series.id}
            books={props.books}
            codex={props.codex}
            overlays={props.overlays}
            progressions={props.progressions}
            initialOpenEntryId={deepLinkedEntryId}
          />
        )}
        {tab === "arcs" && (
          <ArcsTab
            seriesId={props.series.id}
            books={props.books}
            arcs={props.arcs}
            beats={props.beats}
            foreshadowPairs={props.foreshadowPairs}
            codex={props.codex}
            chapters={props.chapters}
          />
        )}
        {tab === "timeline" && (
          <TimelineTab
            seriesId={props.series.id}
            books={props.books}
            chapters={props.chapters}
            arcs={props.arcs}
            beats={props.beats}
            codex={props.codex}
            progressions={props.progressions}
          />
        )}
        {tab === "metadata" && (
          <MetadataTab
            seriesId={props.series.id}
            seriesName={props.series.name}
            metadata={props.metadata}
          />
        )}
        {tab === "export" && (
          <ExportTabCallout
            seriesId={props.series.id}
            seriesName={props.series.name}
            bookCount={props.books.length}
          />
        )}
      </div>
    </div>
  );
}

function ExportTabCallout({
  seriesId,
  seriesName,
  bookCount,
}: {
  seriesId: string;
  seriesName: string;
  bookCount: number;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/30 p-8 text-center">
      <h2 className="font-serif text-xl text-editorial-cream">
        Boxed-set export
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-editorial-muted">
        Combine the {bookCount} book{bookCount === 1 ? "" : "s"} in{" "}
        <strong>{seriesName}</strong> into a single manuscript with shared
        front- and back-matter.
      </p>
      <Link
        href={`/dashboard/series/${seriesId}/boxed-set`}
        className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-gold px-6 text-sm font-semibold text-editorial-bg hover:bg-gold/90"
      >
        Open boxed-set editor
      </Link>
    </div>
  );
}

