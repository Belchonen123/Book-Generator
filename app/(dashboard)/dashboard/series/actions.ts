"use server";

import { revalidatePath } from "next/cache";

import { buildPreviouslyInSeriesText } from "@/lib/series/previously";
import { mergeCharacterBibleIntoSeries } from "@/lib/series/merge-bibles";
import { createClient } from "@/lib/supabase/server";
import { ensureProfileRowForUser } from "@/lib/supabase/ensure-profile-row";
import { logServerError } from "@/lib/utils/errors";
import { trackEvent } from "@/lib/utils/analytics";
import type { BookStatusDb, Json, SeriesStatusDb } from "@/types/database.types";
import type { User } from "@supabase/supabase-js";

async function requirePro(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: User,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let { data: profile, error } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .maybeSingle();
  if (error) {
    return { ok: false, error: "Could not load profile." };
  }
  if (!profile) {
    const ensured = await ensureProfileRowForUser(supabase, user);
    if (!ensured.ok) {
      return {
        ok: false,
        error: `Could not load profile.${ensured.code ? ` (code ${ensured.code})` : ""}${ensured.hint ? ` ${ensured.hint}` : ""}`,
      };
    }
    profile = { subscription_tier: "free" as const };
  }
  if (profile.subscription_tier !== "pro") {
    return { ok: false, error: "Series is a Pro feature." };
  }
  return { ok: true };
}

/**
 * Create a new series. The optional fields (tagline, genre, plannedBookCount,
 * status, worldNotes) are captured up-front so the series lands in a state
 * the downstream codex / arcs / metadata tabs can consume without a second
 * edit round-trip.
 */
export async function createSeriesAction(
  name: string,
  description: string,
  options?: {
    tagline?: string | null;
    genre?: string | null;
    plannedBookCount?: number | null;
    status?: SeriesStatusDb;
    worldNotes?: string | null;
  },
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const t = name.trim();
  if (!t) {
    return { ok: false, error: "Series name is required." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }
  const pro = await requirePro(supabase, user);
  if (!pro.ok) {
    return { ok: false, error: pro.error };
  }

  const plannedRaw = options?.plannedBookCount;
  const planned =
    typeof plannedRaw === "number" && Number.isFinite(plannedRaw) && plannedRaw >= 0
      ? Math.floor(plannedRaw)
      : null;

  const { data: row, error } = await supabase
    .from("series")
    .insert({
      user_id: user.id,
      name: t,
      description: description.trim() || null,
      tagline: options?.tagline?.trim() || null,
      genre: options?.genre?.trim() || null,
      planned_book_count: planned,
      status: options?.status ?? "planning",
      shared_world_notes: options?.worldNotes?.trim() || null,
    })
    .select("id")
    .single();
  if (error || !row) {
    logServerError("createSeries", error);
    // Map the most common Postgres failure modes to an actionable message
    // so the user can self-diagnose instead of seeing a black box.
    // `error` is a PostgrestError: { code, message, details, hint }.
    const pgCode = (error as { code?: string } | null)?.code ?? "";
    const rawMsg = (error as { message?: string } | null)?.message ?? "";
    let friendly = "Could not create series.";
    if (pgCode === "42501" || /row-level security/i.test(rawMsg)) {
      friendly =
        "Could not create series: your account isn't authorized to write to the series table (RLS). Try signing out and back in.";
    } else if (pgCode === "23503") {
      friendly =
        "Could not create series: your profile row is missing. Refresh the page and try again.";
    } else if (pgCode === "23514") {
      friendly =
        "Could not create series: one of the values (likely status) isn't allowed by the database.";
    } else if (pgCode === "42703" || /column .* does not exist/i.test(rawMsg)) {
      friendly =
        "Could not create series: the database is missing a series column. A migration is likely out of date — run the latest Supabase migrations.";
    } else if (rawMsg) {
      friendly = `Could not create series: ${rawMsg}`;
    }
    return { ok: false, error: friendly };
  }
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/series", "layout");
  revalidatePath(`/dashboard/series/${row.id}`);
  await trackEvent(user, "series_created", null, { seriesId: row.id });
  return { ok: true, id: row.id };
}

export async function updateSeriesAction(
  seriesId: string,
  input: {
    name?: string;
    description?: string | null;
    shared_world_notes?: string | null;
    shared_character_bible?: Json;
    tagline?: string | null;
    genre?: string | null;
    planned_book_count?: number | null;
    status?: SeriesStatusDb;
  },
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }
  const pro = await requirePro(supabase, user);
  if (!pro.ok) {
    return { ok: false, error: pro.error };
  }
  const { data: s } = await supabase
    .from("series")
    .select("id")
    .eq("id", seriesId)
    .eq("user_id", user.id)
    .single();
  if (!s) {
    return { ok: false, error: "Series not found." };
  }
  const { error } = await supabase
    .from("series")
    .update({
      ...(input.name !== undefined && { name: input.name.trim() || "Untitled series" }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.shared_world_notes !== undefined && { shared_world_notes: input.shared_world_notes }),
      ...(input.shared_character_bible !== undefined && {
        shared_character_bible: input.shared_character_bible,
      }),
      ...(input.tagline !== undefined && { tagline: input.tagline }),
      ...(input.genre !== undefined && { genre: input.genre }),
      ...(input.planned_book_count !== undefined && { planned_book_count: input.planned_book_count }),
      ...(input.status !== undefined && { status: input.status }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", seriesId)
    .eq("user_id", user.id);
  if (error) {
    return { ok: false, error: "Could not update series." };
  }
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/series/${seriesId}`);
  return { ok: true };
}

/**
 * Delete a series. Books that belonged to it become standalone (series_id nulled
 * via the existing ON DELETE SET NULL cascade). Series-scoped codex entries are
 * demoted to the first remaining standalone book by position (spec section
 * "EDGE CASES TO HANDLE" → series deletion).
 */
export async function deleteSeriesAction(
  seriesId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }
  const pro = await requirePro(supabase, user);
  if (!pro.ok) {
    return { ok: false, error: pro.error };
  }

  const { data: series } = await supabase
    .from("series")
    .select("id")
    .eq("id", seriesId)
    .eq("user_id", user.id)
    .single();
  if (!series) {
    return { ok: false, error: "Series not found." };
  }

  const { data: firstBook } = await supabase
    .from("books")
    .select("id")
    .eq("series_id", seriesId)
    .eq("user_id", user.id)
    .order("series_order", { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  // Demote series-scoped codex entries to the first book's project scope
  // before cascade drops them. If no book remains, they'll be cascade-deleted —
  // acceptable since they belonged to a deleted series with no owning book.
  if (firstBook) {
    await supabase
      .from("codex_entries")
      .update({
        scope: "project",
        book_id: firstBook.id,
        series_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("series_id", seriesId)
      .eq("scope", "series")
      .eq("user_id", user.id);
  }

  const { error } = await supabase
    .from("series")
    .delete()
    .eq("id", seriesId)
    .eq("user_id", user.id);
  if (error) {
    logServerError("deleteSeries", error);
    return { ok: false, error: "Could not delete series." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/series");
  await trackEvent(user, "series_deleted", null, { seriesId });
  return { ok: true };
}

/** Remove a single book from its current series without deleting the book. */
export async function removeBookFromSeriesAction(
  bookId: string,
): Promise<{ ok: boolean; error?: string }> {
  // Same semantics as moveBookToSeriesAction(bookId, null); we expose a
  // clearer-named wrapper because the spec's UI references it directly.
  return moveBookToSeriesAction(bookId, null);
}

export async function moveBookToSeriesAction(
  bookId: string,
  seriesId: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }
  const pro = await requirePro(supabase, user);
  if (!pro.ok) {
    return { ok: false, error: pro.error };
  }
  if (seriesId) {
    const { data: s } = await supabase
      .from("series")
      .select("id")
      .eq("id", seriesId)
      .eq("user_id", user.id)
      .single();
    if (!s) {
      return { ok: false, error: "Series not found." };
    }
  }
  if (seriesId) {
    const { data: maxRow } = await supabase
      .from("books")
      .select("series_order")
      .eq("series_id", seriesId)
      .order("series_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = (maxRow?.series_order ?? 0) + 1;
    const { data: ser } = await supabase
      .from("series")
      .select("shared_character_bible")
      .eq("id", seriesId)
      .single();
    const bible = ser?.shared_character_bible;
    const { data: current } = await supabase
      .from("books")
      .select("character_bible")
      .eq("id", bookId)
      .eq("user_id", user.id)
      .single();
    const mergedBible = current?.character_bible
      ? mergeCharacterBibleIntoSeries(
          (bible ?? {}) as Json,
          current.character_bible as Json,
        )
      : ((bible ?? {}) as Json);
    const prevText = await buildPreviouslyInSeriesText(
      supabase,
      seriesId,
      user.id,
      nextOrder,
      bookId,
    );
    const { error } = await supabase
      .from("books")
      .update({
        series_id: seriesId,
        series_order: nextOrder,
        character_bible: mergedBible,
        previously_in_series: prevText || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookId)
      .eq("user_id", user.id);
    if (error) {
      return { ok: false, error: "Could not move book." };
    }
  } else {
    const { error } = await supabase
      .from("books")
      .update({
        series_id: null,
        series_order: null,
        previously_in_series: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookId)
      .eq("user_id", user.id);
    if (error) {
      return { ok: false, error: "Could not update book." };
    }
  }
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/series", "layout");
  revalidatePath(`/projects/${bookId}`);
  return { ok: true };
}

/**
 * Reorder every book in a series in a single transaction.
 *
 * Calls the `public.reorder_series_books(uuid, uuid[])` SECURITY DEFINER RPC
 * (migration 043) which:
 *   - re-verifies caller ownership via `auth.uid()`,
 *   - flips existing `series_order` values to negative so a later UNIQUE
 *     constraint can't fire mid-update, and
 *   - reassigns positions 1..N in the array order.
 *
 * If the RPC throws `Not authorized` the caller hit a rogue / stale series
 * id — we surface that as a standard "Series not found." error so the UI
 * reaction is the same as every other ownership failure.
 */
export async function reorderSeriesBooksAction(
  seriesId: string,
  orderedBookIds: string[],
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }
  const pro = await requirePro(supabase, user);
  if (!pro.ok) {
    return { ok: false, error: pro.error };
  }
  if (!orderedBookIds.length) {
    // No-op. Still revalidate so a caller that clears the list sees a
    // consistent render.
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/series/${seriesId}`);
    return { ok: true };
  }

  const { error } = await supabase.rpc("reorder_series_books", {
    p_series_id: seriesId,
    p_book_ids: orderedBookIds,
  });
  if (error) {
    logServerError("reorderSeriesBooks.rpc", error);
    const msg = (error.message ?? "").toLowerCase();
    if (msg.includes("not authorized")) {
      return { ok: false, error: "Series not found." };
    }
    return { ok: false, error: "Could not save order." };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/series/${seriesId}`);
  return { ok: true };
}

export async function createBookInSeriesAction(
  seriesId: string,
): Promise<{ ok: true; bookId: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }
  const pro = await requirePro(supabase, user);
  if (!pro.ok) {
    return { ok: false, error: pro.error };
  }
  const { data: s } = await supabase
    .from("series")
    .select("id, name, genre, shared_character_bible")
    .eq("id", seriesId)
    .eq("user_id", user.id)
    .single();
  if (!s) {
    return { ok: false, error: "Series not found." };
  }
  const { data: maxRow } = await supabase
    .from("books")
    .select("series_order")
    .eq("series_id", seriesId)
    .order("series_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (maxRow?.series_order ?? 0) + 1;

  // Inherit series genre + a placeholder title so the new book arrives pre-
  // populated with the shared-world context (spec's "pre-populated with genre,
  // series name" contract).
  const { data: book, error } = await supabase
    .from("books")
    .insert({
      user_id: user.id,
      title: `${s.name} — Book ${nextOrder}`,
      status: "idea",
      genre: s.genre,
      series_id: seriesId,
      series_order: nextOrder,
      character_bible: s.shared_character_bible as Json,
    })
    .select("id")
    .single();
  if (error || !book) {
    return { ok: false, error: "Could not create book." };
  }
  const prevText = await buildPreviouslyInSeriesText(
    supabase,
    seriesId,
    user.id,
    nextOrder,
    book.id,
  );
  await supabase
    .from("books")
    .update({ previously_in_series: prevText || null })
    .eq("id", book.id);
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/series/${seriesId}`);
  await trackEvent(user.id, "book_created", book.id, { inSeries: true, seriesId });
  return { ok: true, bookId: book.id };
}

/* ==========================================================================
 * Readers
 * ========================================================================== */

export type SeriesListRow = {
  id: string;
  name: string;
  tagline: string | null;
  genre: string | null;
  status: SeriesStatusDb;
  planned_book_count: number | null;
  updated_at: string;
  bookCount: number;
  totalWordCount: number;
  /** Sorted by `series_order` ascending; pre-capped to `coverLimit` for UI. */
  coverUrls: string[];
  statusCounts: Partial<Record<BookStatusDb, number>>;
};

/**
 * List every series the current user owns, aggregated with the stats that
 * `/dashboard/series` and (16.2) the dashboard shelf both need: book count,
 * total word count, a preview strip of covers, and a per-status histogram.
 *
 * Returns an empty array for anonymous callers — we do NOT 401 here because
 * this function is also consumed from pages that render an unauthenticated
 * shell before redirecting.
 */
export async function listSeriesForUser({
  coverLimit = 3,
}: { coverLimit?: number } = {}): Promise<SeriesListRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: seriesRows, error: seriesErr } = await supabase
    .from("series")
    .select("id, name, tagline, genre, status, planned_book_count, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  if (seriesErr) {
    logServerError("listSeriesForUser.select", seriesErr);
    return [];
  }
  if (!seriesRows || seriesRows.length === 0) return [];

  const seriesIds = seriesRows.map((s) => s.id);

  const { data: books, error: booksErr } = await supabase
    .from("books")
    .select("series_id, series_order, cover_url, status, word_count")
    .eq("user_id", user.id)
    .in("series_id", seriesIds);
  if (booksErr) {
    logServerError("listSeriesForUser.books", booksErr);
    // Surface series rows with zero aggregates rather than failing the page.
  }

  type Agg = {
    bookCount: number;
    totalWordCount: number;
    coverEntries: { url: string; order: number }[];
    statusCounts: Partial<Record<BookStatusDb, number>>;
  };
  const aggBySeries = new Map<string, Agg>();
  for (const b of books ?? []) {
    if (!b.series_id) continue;
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

  return seriesRows.map((s) => {
    const agg = aggBySeries.get(s.id);
    const covers = (agg?.coverEntries ?? [])
      .slice()
      .sort((a, b) => a.order - b.order)
      .slice(0, Math.max(0, coverLimit))
      .map((c) => c.url);
    return {
      id: s.id,
      name: s.name,
      tagline: s.tagline,
      genre: s.genre,
      status: s.status as SeriesStatusDb,
      planned_book_count: s.planned_book_count,
      updated_at: s.updated_at,
      bookCount: agg?.bookCount ?? 0,
      totalWordCount: agg?.totalWordCount ?? 0,
      coverUrls: covers,
      statusCounts: agg?.statusCounts ?? {},
    };
  });
}

export async function promoteCharacterBibleToSeriesAction(
  bookId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }
  const pro = await requirePro(supabase, user);
  if (!pro.ok) {
    return { ok: false, error: pro.error };
  }
  const { data: book, error: berr } = await supabase
    .from("books")
    .select("id, series_id, character_bible")
    .eq("id", bookId)
    .eq("user_id", user.id)
    .single();
  if (berr || !book?.series_id || !book.character_bible) {
    return { ok: false, error: "Book is not in a series or has no character bible." };
  }
  const { data: ser } = await supabase
    .from("series")
    .select("shared_character_bible")
    .eq("id", book.series_id)
    .eq("user_id", user.id)
    .single();
  if (!ser) {
    return { ok: false, error: "Series not found." };
  }
  const merged = mergeCharacterBibleIntoSeries(ser.shared_character_bible as Json, book.character_bible as Json);
  const { error } = await supabase
    .from("series")
    .update({
      shared_character_bible: merged,
      updated_at: new Date().toISOString(),
    })
    .eq("id", book.series_id);
  if (error) {
    return { ok: false, error: "Could not update series." };
  }
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/series/${book.series_id}`);
  return { ok: true };
}
