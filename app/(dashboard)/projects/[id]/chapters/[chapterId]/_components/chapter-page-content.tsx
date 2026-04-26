import type { PostgrestError, SupabaseClient, User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { ChapterEditor } from "@/components/book/ChapterEditor";
import { refreshStalePriorBookSummaries } from "@/lib/series/summarize";
import { ensureProfileRowForUser } from "@/lib/supabase/ensure-profile-row";
import { createClient } from "@/lib/supabase/server";
import {
  getAskRewriteOnOutlineEdit,
  getAutoSlopScan,
} from "@/lib/utils/profile-preferences";
import { logServerError } from "@/lib/utils/errors";
import { isUuidString } from "@/lib/utils/is-uuid";
import type { Database, Json } from "@/types/database.types";

type ProfileForChapter = {
  subscription_tier: Database["public"]["Tables"]["profiles"]["Row"]["subscription_tier"];
  preferences: Json;
};

function isPreferencesColumnMissing(err: PostgrestError): boolean {
  if (err.code === "42703") return true;
  const m = err.message?.toLowerCase() ?? "";
  return m.includes("preferences") && (m.includes("does not exist") || m.includes("column"));
}

async function loadProfileForChapterEditor(
  supabase: SupabaseClient<Database>,
  user: User,
): Promise<ProfileForChapter | null> {
  const withPrefs = await supabase
    .from("profiles")
    .select("subscription_tier, preferences")
    .eq("id", user.id)
    .maybeSingle();

  if (!withPrefs.error && withPrefs.data) {
    return {
      subscription_tier: withPrefs.data.subscription_tier,
      preferences: withPrefs.data.preferences ?? {},
    };
  }

  if (withPrefs.error && isPreferencesColumnMissing(withPrefs.error)) {
    const tierOnly = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .maybeSingle();
    if (!tierOnly.error && tierOnly.data) {
      return {
        subscription_tier: tierOnly.data.subscription_tier,
        preferences: {},
      };
    }
  }

  if (withPrefs.error && !isPreferencesColumnMissing(withPrefs.error)) {
    logServerError("chapter-page.profile-fetch", withPrefs.error);
    return null;
  }

  const ensured = await ensureProfileRowForUser(
    supabase as unknown as SupabaseClient<Database>,
    user,
  );
  if (!ensured.ok) {
    logServerError(
      "chapter-page.profile-create",
      new Error(
        `${ensured.error}${ensured.code ? ` (code ${ensured.code})` : ""}${ensured.hint ? ` | ${ensured.hint}` : ""}`,
      ),
    );
    return null;
  }

  const retry = await supabase
    .from("profiles")
    .select("subscription_tier, preferences")
    .eq("id", user.id)
    .maybeSingle();

  if (!retry.error && retry.data) {
    return {
      subscription_tier: retry.data.subscription_tier,
      preferences: retry.data.preferences ?? {},
    };
  }

  if (retry.error && isPreferencesColumnMissing(retry.error)) {
    const tierOnly = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .maybeSingle();
    if (!tierOnly.error && tierOnly.data) {
      return {
        subscription_tier: tierOnly.data.subscription_tier,
        preferences: {},
      };
    }
  }

  if (retry.error) {
    logServerError("chapter-page.profile-retry", retry.error);
  }

  return {
    subscription_tier: "free",
    preferences: {},
  };
}

export async function ChapterPageContent({
  bookId,
  chapterId,
}: {
  bookId: string;
  chapterId: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!isUuidString(bookId)) {
    redirect("/dashboard");
  }

  /* Match the explicit user_id filter that project-entry-content.tsx uses
   * (the page that redirected here). Belt-and-braces: RLS already enforces
   * this, but the extra predicate makes the "no row" case deterministic and
   * keeps the query short-circuitable on the server. */
  const bookFullSelect =
    "id, title, subtitle, user_id, book_type, series_id, continuity_checks_enabled" as const;
  if (!isUuidString(chapterId)) {
    redirect(`/projects/${bookId}/outline`);
  }
  const [{ book, bookError }, profile, { data: chapter, error: chapterError }, { data: chapters }] =
    await Promise.all([
      (async () => {
        let { data: book, error: bookError } = await supabase
          .from("books")
          .select(bookFullSelect)
          .eq("id", bookId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (
          bookError?.code === "42703" &&
          (bookError.message?.toLowerCase().includes("continuity_checks_enabled") ?? false)
        ) {
          const legacy = await supabase
            .from("books")
            .select("id, title, subtitle, user_id, book_type, series_id")
            .eq("id", bookId)
            .eq("user_id", user.id)
            .maybeSingle();
          book = legacy.data
            ? { ...legacy.data, continuity_checks_enabled: true as const }
            : null;
          bookError = legacy.error;
        }

        return { book, bookError };
      })(),
      loadProfileForChapterEditor(supabase, user),
      supabase
        .from("chapters")
        .select(
          "id, book_id, chapter_number, title, status, word_count, content, outline_summary, author_notes, target_word_count, updated_at",
        )
        .eq("id", chapterId)
        .eq("book_id", bookId)
        .maybeSingle(),
      supabase
        .from("chapters")
        .select("id, chapter_number, title, status, word_count")
        .eq("book_id", bookId)
        .order("chapter_number", { ascending: true }),
    ]);

  if (bookError) {
    logServerError("chapter-page.book-fetch", {
      bookId,
      chapterId,
      userId: user.id,
      pgCode: bookError.code,
      pgMessage: bookError.message,
      pgDetails: bookError.details,
      pgHint: bookError.hint,
    });
    redirect("/dashboard");
  }
  if (!book) {
    logServerError("chapter-page.book-not-found", {
      bookId,
      chapterId,
      userId: user.id,
      note: "RLS-denied or row deleted; user did reach project-entry for this id, so likely an auth-cookie/session mismatch between requests",
    });
    redirect("/dashboard");
  }

  if (!profile) {
    redirect("/login?recover=1");
  }

  if (chapterError) {
    const msg = chapterError.message ?? "";
    if (
      chapterError.code === "22P02" ||
      /invalid input syntax for type uuid/i.test(msg)
    ) {
      redirect(`/projects/${bookId}/outline`);
    }
    logServerError("chapter-page.chapter-fetch", chapterError);
    redirect(`/projects/${bookId}/outline`);
  }

  /* Stale chapter id (e.g. user hit /chapters/<id> for a chapter that was
   * removed during an outline regeneration). Book is fine — bounce to the
   * outline so they can pick a real chapter instead of staring at a 404. */
  if (!chapter) {
    logServerError("chapter-page.chapter-missing-redirect-to-outline", {
      bookId,
      chapterId,
      userId: user.id,
    });
    redirect(`/projects/${bookId}/outline`);
  }

  /* Prompt 16 § 294-305: background continuity warnings. Only query when
   * the book is actually in a series — non-series chapters can never
   * have warnings, and skipping the round-trip keeps the page render
   * fast for the 95% of books that aren't part of a series. */
  const isInSeries = !!book.series_id;
  /* Prompt 16.4 § TRIGGER POINTS: refresh stale summaries of prior books
   * whenever the author opens a book in a series. Fire-and-forget — the
   * OpenAI round-trip can take several seconds, and the cached summary
   * (possibly stale by one edit) is still useful for this render. Any
   * refresh that completes lands on the NEXT generation call. The helper
   * never throws. */
  if (isInSeries) {
    void refreshStalePriorBookSummaries(supabase, book.id, user.id);
  }
  const continuityWarnings = isInSeries
    ? (
        await supabase
          .from("continuity_warnings")
          .select("id, excerpt, issue, suggestion, codex_entry_ids, created_at")
          .eq("chapter_id", chapter.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
      ).data ?? []
    : [];

  return (
    <ChapterEditor
      bookId={book.id}
      bookTitle={book.title}
      bookSubtitle={book.subtitle}
      bookType={book.book_type ?? "fiction"}
      initialChapters={chapters ?? []}
      chapter={chapter}
      subscriptionTier={profile.subscription_tier}
      userId={user.id}
      askRewriteOnOutlineEdit={getAskRewriteOnOutlineEdit(profile.preferences)}
      autoSlopScan={getAutoSlopScan(profile.preferences)}
      isInSeries={isInSeries}
      continuityChecksEnabled={book.continuity_checks_enabled ?? true}
      initialContinuityWarnings={continuityWarnings}
    />
  );
}
