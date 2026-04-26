import { redirect } from "next/navigation";
import { Suspense } from "react";

import { DashboardClient } from "@/components/book/dashboard-client";
import { DashboardGridSkeleton } from "@/components/layout/skeletons";
import { greetingFirstName } from "@/lib/dashboard/greeting";
import { DASHBOARD_BOOKS_PAGE_SIZE } from "@/lib/dashboard/pagination";
import { createClient } from "@/lib/supabase/server";
import { FREE_BOOK_LIMIT } from "@/lib/subscription/limits";
import type { DashboardBook } from "@/types/book.types";

export async function DashboardContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("subscription_tier, full_name, email, has_seen_onboarding")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    redirect("/login");
  }

  const booksPageQuery = supabase
    .from("books")
    .select(
      "id, title, genre, status, word_count, chapter_count, updated_at, series_id, series_order, series(id, name)",
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .range(0, DASHBOARD_BOOKS_PAGE_SIZE - 1);

  const seriesListQuery = supabase
    .from("series")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  const booksCountQuery = supabase
    .from("books")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const booksStatsQuery = supabase
    .from("books")
    .select("word_count, status")
    .eq("user_id", user.id);

  const chapterEventsQuery = supabase
    .from("book_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("event_type", "chapter_generated");

  const [
    { data: booksRaw, error: booksError },
    { count: totalBookCount, error: countError },
    { data: statsRows, error: statsRowsError },
    { count: chaptersGenerated, error: eventsError },
    { data: seriesRows },
  ] = await Promise.all([
    booksPageQuery,
    booksCountQuery,
    booksStatsQuery,
    chapterEventsQuery,
    seriesListQuery,
  ]);

  const books: DashboardBook[] =
    booksError || !booksRaw
      ? []
      : booksRaw.map((b) => {
          const s = b.series as { id: string; name: string } | null;
          return {
            id: b.id,
            title: b.title,
            genre: b.genre,
            status: b.status,
            word_count: b.word_count,
            chapter_count: b.chapter_count,
            updated_at: b.updated_at,
            seriesId: b.series_id,
            seriesName: s?.name ?? null,
            seriesOrder: b.series_order,
          };
        });

  const seriesOptions =
    (seriesRows ?? []).map((r) => ({ id: r.id, name: r.name })) ?? [];

  const totalBooks = countError ? books.length : (totalBookCount ?? 0);
  const hasMoreBooks = !booksError && booksRaw.length === DASHBOARD_BOOKS_PAGE_SIZE;

  const safeStatsRows = statsRowsError || !statsRows ? [] : statsRows;
  const totalWordsWritten = safeStatsRows.reduce((acc, b) => acc + (b.word_count ?? 0), 0);
  const booksCompleted = safeStatsRows.filter((b) => b.status === "complete").length;
  const chaptersGeneratedCount =
    !eventsError && typeof chaptersGenerated === "number" ? chaptersGenerated : 0;

  const firstName = greetingFirstName(profile.full_name, profile.email);

  return (
    <>
      {booksError ? (
        <div
          role="alert"
          className="mx-auto max-w-6xl border-b border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-editorial-cream sm:px-6"
        >
          <p className="font-medium text-destructive-foreground">Could not load your library</p>
          <p className="mt-1 text-editorial-muted">
            {booksError.message} — check Supabase RLS and that you are on the correct project.
          </p>
        </div>
      ) : null}
      <Suspense fallback={<DashboardGridSkeleton />}>
        <DashboardClient
          books={books}
          seriesOptions={seriesOptions}
          hasMoreBooks={hasMoreBooks}
          subscriptionTier={profile.subscription_tier}
          bookCount={totalBooks}
          freeBookLimit={FREE_BOOK_LIMIT}
          hasSeenOnboarding={profile.has_seen_onboarding ?? false}
          greetingName={firstName}
          stats={{
            totalBooks,
            totalWordsWritten,
            chaptersGenerated: chaptersGeneratedCount,
            booksCompleted,
          }}
        />
      </Suspense>
    </>
  );
}
