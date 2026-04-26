import { redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import type { BookStatusDb, SeriesStatusDb } from "@/types/database.types";

import { AddExistingBookToSeries } from "./_components/add-existing-book-to-series";
import { NewSeriesLauncher } from "./_components/new-series-launcher";

type SeriesListRow = {
  id: string;
  name: string;
  tagline: string | null;
  genre: string | null;
  status: SeriesStatusDb;
  planned_book_count: number | null;
  updated_at: string;
  bookCount: number;
  totalWordCount: number;
  coverUrls: string[];
  statusCounts: Partial<Record<BookStatusDb, number>>;
};

type OrphanBookRow = {
  id: string;
  title: string;
  subtitle: string | null;
  cover_url: string | null;
  status: BookStatusDb;
  word_count: number;
};

type SeriesOption = { id: string; name: string };

export const metadata = {
  title: "Series — ChapterAI",
};

/**
 * Human-readable status buckets we surface on the card. We collapse the
 * internal workflow states (idea/outlining/writing/cover/complete) into a
 * smaller palette so the card stays scannable.
 */
const STATUS_BUCKETS: {
  key: "drafting" | "outlining" | "complete";
  label: string;
  match: (s: BookStatusDb) => boolean;
  dotClass: string;
}[] = [
  {
    key: "outlining",
    label: "outlining",
    match: (s) => s === "idea" || s === "outlining",
    dotClass: "bg-slate-400",
  },
  {
    key: "drafting",
    label: "drafting",
    match: (s) => s === "writing" || s === "cover",
    dotClass: "bg-amber-400",
  },
  {
    key: "complete",
    label: "complete",
    match: (s) => s === "complete",
    dotClass: "bg-emerald-400",
  },
];

export default async function SeriesIndexPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: proRow } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .maybeSingle();
  const isPro = proRow?.subscription_tier === "pro";

  const { data: seriesRows } = await supabase
    .from("series")
    .select(
      "id, name, tagline, genre, status, planned_book_count, updated_at",
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  /*
   * Single books fetch powers three views:
   *   1. Per-series aggregation (counts, words, covers, status breakdown).
   *   2. Orphan-book picker for "Add existing book to series".
   *   3. Minimal series options payload for that picker.
   */
  const { data: allBooks } = await supabase
    .from("books")
    .select(
      "id, series_id, series_order, title, subtitle, cover_url, status, word_count",
    )
    .eq("user_id", user.id);

  type Agg = {
    bookCount: number;
    totalWordCount: number;
    coverEntries: { url: string; order: number }[];
    statusCounts: Partial<Record<BookStatusDb, number>>;
  };
  const aggBySeries = new Map<string, Agg>();
  const orphanBooks: OrphanBookRow[] = [];

  for (const b of allBooks ?? []) {
    if (!b.series_id) {
      orphanBooks.push({
        id: b.id,
        title: b.title ?? "Untitled",
        subtitle: b.subtitle ?? null,
        cover_url: b.cover_url ?? null,
        status: b.status as BookStatusDb,
        word_count: b.word_count ?? 0,
      });
      continue;
    }
    const cur: Agg = aggBySeries.get(b.series_id) ?? {
      bookCount: 0,
      totalWordCount: 0,
      coverEntries: [],
      statusCounts: {},
    };
    cur.bookCount += 1;
    cur.totalWordCount += b.word_count ?? 0;
    if (b.cover_url) {
      cur.coverEntries.push({
        url: b.cover_url,
        order: b.series_order ?? Number.POSITIVE_INFINITY,
      });
    }
    const s = b.status as BookStatusDb;
    cur.statusCounts[s] = (cur.statusCounts[s] ?? 0) + 1;
    aggBySeries.set(b.series_id, cur);
  }

  const rows: SeriesListRow[] = (seriesRows ?? []).map((s) => {
    const agg = aggBySeries.get(s.id);
    const covers = (agg?.coverEntries ?? [])
      .slice()
      .sort((a, b) => a.order - b.order)
      .slice(0, 3)
      .map((c) => c.url);
    return {
      id: s.id,
      name: s.name,
      tagline: s.tagline,
      genre: s.genre,
      status: s.status,
      planned_book_count: s.planned_book_count,
      updated_at: s.updated_at,
      bookCount: agg?.bookCount ?? 0,
      totalWordCount: agg?.totalWordCount ?? 0,
      coverUrls: covers,
      statusCounts: agg?.statusCounts ?? {},
    };
  });

  const seriesOptions: SeriesOption[] = (seriesRows ?? []).map((s) => ({
    id: s.id,
    name: s.name,
  }));

  const canAddExisting = orphanBooks.length > 0 && seriesOptions.length > 0;
  const canConvertStandalone = isPro && orphanBooks.length >= 2;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-editorial-muted">
            <Link href="/dashboard" className="text-gold hover:underline">
              Library
            </Link>{" "}
            / Series
          </p>
          <h1 className="mt-1 font-serif text-3xl text-editorial-cream">
            Your series
          </h1>
          <p className="mt-2 max-w-xl text-sm text-editorial-muted">
            Group linked manuscripts. Share codex entries, track arcs and
            foreshadowing across books, and package boxed sets for KDP.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canConvertStandalone ? (
            <Link
              href="/dashboard/series/convert"
              className="inline-flex items-center rounded-md border border-border/60 px-3 py-1.5 text-xs font-semibold text-editorial-cream hover:border-gold hover:text-gold"
            >
              Convert standalone → series
            </Link>
          ) : null}
          {canAddExisting ? (
            <AddExistingBookToSeries
              orphanBooks={orphanBooks}
              seriesOptions={seriesOptions}
              isPro={isPro}
            />
          ) : null}
          <NewSeriesLauncher isPro={isPro} />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="mt-10 rounded-lg border border-border/60 bg-card/40 p-8 text-center">
          <h2 className="font-serif text-xl text-editorial-cream">
            No series yet
          </h2>
          <p className="mt-2 text-sm text-editorial-muted">
            Create a series, then add books to share characters, world notes,
            and arcs across every volume.
          </p>
          <div className="mt-4 flex justify-center">
            <NewSeriesLauncher isPro={isPro} variant="cta" />
          </div>
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => {
            const breakdown = STATUS_BUCKETS.map((bucket) => {
              const count = Object.entries(r.statusCounts).reduce(
                (sum, [s, n]) =>
                  sum + (bucket.match(s as BookStatusDb) ? n ?? 0 : 0),
                0,
              );
              return { ...bucket, count };
            }).filter((b) => b.count > 0);
            const planned = r.planned_book_count ?? 0;
            const completeCount = r.statusCounts.complete ?? 0;
            // Denominator prefers the author's declared plan when they set
            // one, then falls back to the actual book count so a series
            // without a plan still shows a meaningful ratio.
            const progressDenom = Math.max(planned || r.bookCount, 1);
            const progressPct = Math.min(
              100,
              Math.round((completeCount / progressDenom) * 100),
            );
            const progressLabel = planned
              ? `${completeCount} complete of ${planned} planned`
              : `${completeCount} of ${r.bookCount} complete`;

            return (
              <li key={r.id}>
                <Link
                  prefetch
                  href={`/dashboard/series/${r.id}`}
                  className="group block overflow-hidden rounded-xl border border-border/60 bg-card/40 transition-colors hover:border-gold/60"
                >
                  <CoverMosaic covers={r.coverUrls} status={r.status} />
                  <div className="p-4">
                    <h3 className="line-clamp-1 font-serif text-lg text-editorial-cream group-hover:text-gold">
                      {r.name}
                    </h3>
                    {r.tagline ? (
                      <p className="mt-1 line-clamp-2 text-xs text-editorial-muted">
                        {r.tagline}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-editorial-muted">
                      {r.genre ? (
                        <span className="rounded-full border border-border/60 px-2 py-0.5">
                          {r.genre}
                        </span>
                      ) : null}
                      <span>
                        {r.bookCount}
                        {planned ? ` / ${planned}` : ""}{" "}
                        book{r.bookCount === 1 ? "" : "s"}
                      </span>
                      <span>·</span>
                      <span>{r.totalWordCount.toLocaleString()} words</span>
                    </div>
                    <div className="mt-3">
                      <div
                        className="h-1 w-full overflow-hidden rounded-full bg-border/40"
                        role="progressbar"
                        aria-valuenow={progressPct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${progressLabel}, ${progressPct}%`}
                      >
                        <div
                          className="h-full rounded-full bg-gold/80 transition-[width]"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <p className="mt-1.5 text-[10px] text-editorial-muted">
                        {progressLabel}
                      </p>
                    </div>
                    {breakdown.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-editorial-muted">
                        {breakdown.map((b) => (
                          <span key={b.key} className="inline-flex items-center gap-1.5">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${b.dotClass}`}
                              aria-hidden
                            />
                            {b.count} {b.label}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * Stacked-book visual: up to three layered covers offset so the series "spine
 * thickness" reads at a glance. Degrades gracefully to the series name
 * monogram when no covers exist yet.
 */
function CoverMosaic({
  covers,
  status,
}: {
  covers: string[];
  status: SeriesStatusDb;
}) {
  const top = covers[0];
  const mid = covers[1];
  const back = covers[2];

  return (
    <div
      className="relative h-36 w-full overflow-hidden bg-gradient-to-br from-[#1a1e2e] to-[#0f1117]"
      aria-hidden="true"
    >
      {back ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={back}
          alt=""
          className="absolute inset-y-4 right-2 h-28 w-20 rotate-6 rounded-sm object-cover opacity-40 shadow-md"
        />
      ) : null}
      {mid ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mid}
          alt=""
          className="absolute inset-y-3 right-8 h-28 w-20 -rotate-3 rounded-sm object-cover opacity-60 shadow-md"
        />
      ) : null}
      {top ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={top}
          alt=""
          className="absolute inset-y-2 right-14 h-28 w-20 rounded-sm object-cover shadow-xl transition-transform group-hover:-translate-y-1"
        />
      ) : (
        <div className="absolute inset-y-2 right-14 flex h-28 w-20 items-center justify-center rounded-sm border border-border/60 bg-background/40 text-xs font-serif uppercase tracking-wide text-editorial-muted">
          Series
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0f1117] to-transparent" />
      <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-editorial-cream">
        {status}
      </span>
    </div>
  );
}
