"use server";

import { revalidatePath } from "next/cache";

import { summarizeBookForSeries } from "@/lib/series/summarize";
import { createClient } from "@/lib/supabase/server";
import { ensureProfileRowForUser } from "@/lib/supabase/ensure-profile-row";
import { trackEvent } from "@/lib/utils/analytics";

/**
 * User-triggered series summarization (Prompt 16 PRIOR-BOOK SUMMARIZATION).
 *
 * Called from the series Books tab "Summarize for series" button. Also
 * reused by `markBookCompleteAction` as its auto-trigger branch.
 *
 * Behaviour:
 *  - Requires a signed-in user (RLS also enforces ownership via book_id).
 *  - Requires a Pro subscription (series is a Pro feature).
 *  - Returns a discriminated result so the UI can surface success /
 *    specific skip reasons (e.g. "manuscript too short") without
 *    re-reading the AI response.
 *  - Revalidates the series detail page so the "last generated" timestamp
 *    updates on refresh.
 */
export async function summarizeBookForSeriesAction(
  bookId: string,
): Promise<
  | {
      ok: true;
      plotSummaryWords: number;
      characterStatesPersisted: number;
      openArcsCount: number;
      worldChangesCount: number;
    }
  | { ok: false; error: string; code?: string }
> {
  if (!bookId) {
    return { ok: false, error: "Missing book id." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  /* Mirrors requirePro in series/actions.ts. Kept local so this module
   * doesn't cross-import a private helper. */
  let { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .maybeSingle();
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
    return { ok: false, error: "Series summarization is a Pro feature." };
  }

  const result = await summarizeBookForSeries(supabase, bookId, user.id);

  if (result.status === "ok") {
    /* Revalidate both the book's project page (its export / cover page may
     * render the summary) and the series detail page the user clicked
     * from. We don't know the series id without another query — but
     * revalidatePath can take the parent segment and invalidate all
     * children. */
    revalidatePath(`/projects/${bookId}`);
    revalidatePath("/dashboard/series", "layout");

    await trackEvent(user, "series_book_summarized", null, {
      bookId,
      plotSummaryWords: result.plotSummaryWords,
      characterStatesPersisted: result.characterStatesPersisted,
      openArcsCount: result.openArcsCount,
      worldChangesCount: result.worldChangesCount,
    });

    return {
      ok: true,
      plotSummaryWords: result.plotSummaryWords,
      characterStatesPersisted: result.characterStatesPersisted,
      openArcsCount: result.openArcsCount,
      worldChangesCount: result.worldChangesCount,
    };
  }

  if (result.status === "skipped") {
    const copy: Record<string, string> = {
      not_found: "This book could not be found.",
      not_in_series: "This book is not part of a series.",
      no_chapters: "This book has no chapters to summarize yet.",
      manuscript_too_short: "Add more chapter content before summarizing.",
    };
    return {
      ok: false,
      error: copy[result.reason] ?? "Nothing to summarize yet.",
      code: result.reason,
    };
  }

  const errorCopy: Record<string, string> = {
    openai_not_configured: "The summarizer is not configured.",
    openai_failed: "The summarizer is temporarily unavailable.",
    parse_failed: "The summarizer returned an invalid response.",
    book_fetch_failed: "Could not load this book.",
    chapters_fetch_failed: "Could not load this book's chapters.",
    book_update_failed: "Could not save the summary.",
    unexpected: "Something went wrong while summarizing.",
  };
  return {
    ok: false,
    error: errorCopy[result.reason] ?? "Could not summarize this book.",
    code: result.reason,
  };
}

/**
 * Mark a book's status as 'complete' and — when the book belongs to a
 * series — kick off its prior-book summary as a fire-and-forget side
 * effect. The status update always runs first and surfaces its own
 * errors; the summary call is best-effort so a transient AI failure
 * never blocks the "book is done" state change.
 *
 * This is the server-side seam that replaces the direct `supabase
 * .from("books").update({ status: "complete" })` call that used to live
 * inside CoverGenerator — routing through a server action is what lets
 * the auto-summary trigger land server-side with the current user's
 * session + RLS still enforced.
 */
export async function markBookCompleteAction(
  bookId: string,
): Promise<
  | { ok: true; seriesSummaryQueued: boolean }
  | { ok: false; error: string }
> {
  if (!bookId) {
    return { ok: false, error: "Missing book id." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  const { data: book, error: readErr } = await supabase
    .from("books")
    .select("id, user_id, series_id")
    .eq("id", bookId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (readErr || !book) {
    return { ok: false, error: "Could not load this book." };
  }

  const { error: updErr } = await supabase
    .from("books")
    .update({ status: "complete" })
    .eq("id", bookId)
    .eq("user_id", user.id);
  if (updErr) {
    return { ok: false, error: "Could not update book status." };
  }

  revalidatePath(`/projects/${bookId}`);
  revalidatePath("/dashboard");

  if (!book.series_id) {
    return { ok: true, seriesSummaryQueued: false };
  }

  /* Fire-and-forget the summary. A Vercel serverless runtime won't keep a
   * dangling promise alive after the response ends, so we await but never
   * bubble failures — worst case the user can re-run manually from the
   * Books tab. `summarizeBookForSeries` is already no-throw. */
  try {
    await summarizeBookForSeries(supabase, bookId, user.id);
  } catch {
    /* Already logged inside summarizeBookForSeries; status update stands. */
  }

  revalidatePath("/dashboard/series", "layout");
  return { ok: true, seriesSummaryQueued: true };
}
