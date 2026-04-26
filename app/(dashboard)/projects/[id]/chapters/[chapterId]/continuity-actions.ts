"use server";

import { revalidatePath } from "next/cache";

import { runContinuityCheckForChapter } from "@/lib/series/continuity-check";
import { createClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/utils/errors";

/**
 * Server actions for the Prompt-16 continuity / plot-hole warnings.
 *
 *  - `dismissContinuityWarningAction(id)` — mark a flagged passage as
 *    intentionally acceptable.
 *  - `resolveContinuityWarningAction(id)` — mark as fixed (e.g. after the
 *    user edited the passage to address the contradiction).
 *  - `setContinuityChecksEnabledAction(bookId, enabled)` — per-book
 *    toggle. Default is TRUE at the schema level; user disables to opt
 *    out.
 *  - `runContinuityCheckAction(bookId, chapterId)` — on-demand trigger
 *    (manual run from the editor) in addition to the auto-trigger that
 *    fires from `/api/ai/generate-chapter` after each successful
 *    generation.
 */

type SimpleResult = { ok: true } | { ok: false; error: string };

async function authedClient(): Promise<
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; userId: string }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  return { ok: true, supabase, userId: user.id };
}

export async function dismissContinuityWarningAction(
  warningId: string,
): Promise<SimpleResult> {
  if (!warningId) return { ok: false, error: "Missing warning id." };
  const auth = await authedClient();
  if (!auth.ok) return auth;

  const { data: row, error: fetchErr } = await auth.supabase
    .from("continuity_warnings")
    .select("id, book_id, chapter_id")
    .eq("id", warningId)
    .maybeSingle();
  if (fetchErr || !row) {
    return { ok: false, error: "Warning not found." };
  }

  const { error } = await auth.supabase
    .from("continuity_warnings")
    .update({
      status: "dismissed",
      dismissed_at: new Date().toISOString(),
    })
    .eq("id", warningId);
  if (error) {
    logServerError("continuity.dismiss", error);
    return { ok: false, error: "Could not dismiss warning." };
  }

  revalidatePath(
    `/projects/${row.book_id}/chapters/${row.chapter_id}`,
  );
  return { ok: true };
}

export async function resolveContinuityWarningAction(
  warningId: string,
): Promise<SimpleResult> {
  if (!warningId) return { ok: false, error: "Missing warning id." };
  const auth = await authedClient();
  if (!auth.ok) return auth;

  const { data: row, error: fetchErr } = await auth.supabase
    .from("continuity_warnings")
    .select("id, book_id, chapter_id")
    .eq("id", warningId)
    .maybeSingle();
  if (fetchErr || !row) {
    return { ok: false, error: "Warning not found." };
  }

  const { error } = await auth.supabase
    .from("continuity_warnings")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", warningId);
  if (error) {
    logServerError("continuity.resolve", error);
    return { ok: false, error: "Could not mark warning resolved." };
  }

  revalidatePath(
    `/projects/${row.book_id}/chapters/${row.chapter_id}`,
  );
  return { ok: true };
}

export async function setContinuityChecksEnabledAction(
  bookId: string,
  enabled: boolean,
): Promise<SimpleResult> {
  if (!bookId) return { ok: false, error: "Missing book id." };
  const auth = await authedClient();
  if (!auth.ok) return auth;

  const { error } = await auth.supabase
    .from("books")
    .update({ continuity_checks_enabled: enabled })
    .eq("id", bookId)
    .eq("user_id", auth.userId);
  if (error) {
    logServerError("continuity.toggle", error);
    return { ok: false, error: "Could not save preference." };
  }

  revalidatePath(`/projects/${bookId}`, "layout");
  return { ok: true };
}

export async function runContinuityCheckAction(
  bookId: string,
  chapterId: string,
): Promise<
  | {
      ok: true;
      status: "ok" | "skipped";
      reason?: string;
      warningsDetected?: number;
      entitiesScanned?: number;
    }
  | { ok: false; error: string; code?: string }
> {
  if (!bookId || !chapterId) {
    return { ok: false, error: "Missing book or chapter id." };
  }
  const auth = await authedClient();
  if (!auth.ok) return auth;

  /* Pro-gate manual runs to mirror the automatic trigger, which is behind
   * the series feature (series is Pro-only). Book-level ownership is
   * re-checked inside runContinuityCheckForChapter. */
  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", auth.userId)
    .maybeSingle();
  if (!profile || profile.subscription_tier !== "pro") {
    return {
      ok: false,
      error: "Continuity check is a Pro feature.",
      code: "UPGRADE_REQUIRED",
    };
  }

  const result = await runContinuityCheckForChapter(auth.supabase, {
    bookId,
    chapterId,
    userId: auth.userId,
  });

  revalidatePath(`/projects/${bookId}/chapters/${chapterId}`);

  if (result.status === "ok") {
    return {
      ok: true,
      status: "ok",
      warningsDetected: result.warningsDetected,
      entitiesScanned: result.entitiesScanned,
    };
  }
  if (result.status === "skipped") {
    const friendly: Record<string, string> = {
      not_in_series: "This book isn't in a series yet.",
      disabled_by_book: "Continuity checks are turned off for this book.",
      non_fiction: "Continuity checks run on fiction projects only.",
      chapter_too_short: "Add more text before running a check.",
      no_series_entities_mentioned:
        "No series characters or entities were found in this chapter.",
      no_prior_progressions:
        "No prior canon to compare against yet — add progressions on the codex tab.",
    };
    return {
      ok: true,
      status: "skipped",
      reason: friendly[result.reason] ?? result.reason,
    };
  }

  const errCopy: Record<string, string> = {
    openai_not_configured: "The checker is not configured.",
    openai_failed: "The checker is temporarily unavailable.",
    parse_failed: "The checker returned an invalid response.",
    book_fetch_failed: "Could not load this book.",
    chapter_fetch_failed: "Could not load this chapter.",
    codex_fetch_failed: "Could not load the series codex.",
    insert_failed: "Could not save warnings.",
    unexpected: "Something went wrong while running the check.",
  };
  return {
    ok: false,
    error: errCopy[result.reason] ?? "Could not run continuity check.",
    code: result.reason,
  };
}
