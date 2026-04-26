import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ChapterRevisionSource,
  Database,
  SubscriptionTierDb,
} from "@/types/database.types";

/** Hard cap stored per chapter. Older rows are evicted after each insert. */
export const MAX_REVISIONS_PER_CHAPTER = 50;

/** Free-tier users see at most this many revisions; Pro sees up to MAX. */
export const FREE_REVISION_VIEW_LIMIT = 5;
export const PRO_REVISION_VIEW_LIMIT = MAX_REVISIONS_PER_CHAPTER;

export function revisionViewLimitForTier(tier: SubscriptionTierDb): number {
  return tier === "pro" ? PRO_REVISION_VIEW_LIMIT : FREE_REVISION_VIEW_LIMIT;
}

type Supabase = SupabaseClient<Database>;

export type ChapterRevisionRow =
  Database["public"]["Tables"]["chapter_revisions"]["Row"];

export type SnapshotResult =
  | { ok: true; revisionId: string }
  | { ok: false; error: string; code?: "empty" | "not_found" | "insert_failed" };

/**
 * Write a new `chapter_revisions` row reflecting the *current* chapters row
 * state. Call this BEFORE mutating the chapter so the revision represents
 * the pre-change snapshot.
 *
 * Returns `{ ok: false, code: "empty" }` when the chapter has no content
 * to preserve (first-ever generation, never-written pending chapter, etc.)
 * — callers can safely ignore that case.
 *
 * After a successful insert we delete any rows beyond
 * {@link MAX_REVISIONS_PER_CHAPTER} (oldest first) so disk usage stays
 * bounded per chapter.
 */
export async function snapshotChapter(
  supabase: Supabase,
  params: {
    chapterId: string;
    userId: string;
    source: ChapterRevisionSource;
  },
): Promise<SnapshotResult> {
  const { chapterId, userId, source } = params;

  const { data: chapter, error: fetchError } = await supabase
    .from("chapters")
    .select("id, book_id, title, content, word_count")
    .eq("id", chapterId)
    .maybeSingle();

  if (fetchError || !chapter) {
    return { ok: false, error: "Chapter not found.", code: "not_found" };
  }

  const content = chapter.content?.trim() ?? "";
  if (!content) {
    return { ok: false, error: "Nothing to snapshot.", code: "empty" };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("chapter_revisions")
    .insert({
      chapter_id: chapter.id,
      book_id: chapter.book_id,
      user_id: userId,
      content,
      word_count: chapter.word_count ?? 0,
      source,
      title_snapshot: chapter.title,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return {
      ok: false,
      error: insertError?.message ?? "Could not save revision.",
      code: "insert_failed",
    };
  }

  // Best-effort eviction of rows beyond the cap. If this fails the primary
  // write still succeeded; the next snapshot will try again.
  try {
    const { data: keepers } = await supabase
      .from("chapter_revisions")
      .select("id")
      .eq("chapter_id", chapter.id)
      .order("created_at", { ascending: false })
      .range(0, MAX_REVISIONS_PER_CHAPTER - 1);

    if (keepers && keepers.length === MAX_REVISIONS_PER_CHAPTER) {
      const keepIds = keepers.map((r) => r.id);
      await supabase
        .from("chapter_revisions")
        .delete()
        .eq("chapter_id", chapter.id)
        .not("id", "in", `(${keepIds.join(",")})`);
    }
  } catch {
    /* eviction is non-critical */
  }

  return { ok: true, revisionId: inserted.id };
}

/**
 * Returns the most recent revisions for a chapter, newest first.
 *
 * {@param tier} caps the result for Free users at
 * {@link FREE_REVISION_VIEW_LIMIT} entries. Pro users see up to
 * {@link PRO_REVISION_VIEW_LIMIT}. The stored row count is always bounded
 * by {@link MAX_REVISIONS_PER_CHAPTER} — the tier limit only restricts the
 * view, not the underlying data.
 */
export async function listRevisions(
  supabase: Supabase,
  chapterId: string,
  tier: SubscriptionTierDb,
): Promise<{ rows: ChapterRevisionRow[]; totalStored: number; limit: number }> {
  const limit = revisionViewLimitForTier(tier);

  const { count } = await supabase
    .from("chapter_revisions")
    .select("id", { count: "exact", head: true })
    .eq("chapter_id", chapterId);

  const { data, error } = await supabase
    .from("chapter_revisions")
    .select(
      "id, chapter_id, book_id, user_id, content, word_count, source, title_snapshot, created_at",
    )
    .eq("chapter_id", chapterId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return { rows: [], totalStored: count ?? 0, limit };
  }

  return { rows: data, totalStored: count ?? 0, limit };
}

/**
 * Restore the current chapter's content to the text captured in the given
 * revision. Also writes a fresh revision with `source='restore'` *before*
 * the restore so the pre-restore state is itself recoverable.
 *
 * Ownership is re-verified against `user_id` (RLS is the first line of
 * defence; this is explicit defense-in-depth so a compromised session
 * can't cross-restore into another user's chapter).
 */
export async function restoreRevision(
  supabase: Supabase,
  revisionId: string,
  userId: string,
): Promise<{ ok: boolean; error?: string; chapterId?: string; bookId?: string }> {
  const { data: revision, error: revisionError } = await supabase
    .from("chapter_revisions")
    .select("id, chapter_id, book_id, user_id, content, title_snapshot")
    .eq("id", revisionId)
    .maybeSingle();

  if (revisionError || !revision) {
    return { ok: false, error: "Revision not found." };
  }
  if (revision.user_id !== userId) {
    return { ok: false, error: "You do not own this revision." };
  }

  // Snapshot the current state first so the restore is itself reversible.
  await snapshotChapter(supabase, {
    chapterId: revision.chapter_id,
    userId,
    source: "restore",
  });

  const trimmed = revision.content.trim();
  const wordCount = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;

  const { error: updateError } = await supabase
    .from("chapters")
    .update({
      content: revision.content,
      word_count: wordCount,
      status: "edited",
    })
    .eq("id", revision.chapter_id)
    .eq("book_id", revision.book_id);

  if (updateError) {
    return { ok: false, error: "Could not restore the revision." };
  }

  // Keep the book's total word_count in sync.
  try {
    const { data: rows } = await supabase
      .from("chapters")
      .select("word_count")
      .eq("book_id", revision.book_id);
    const total = rows?.reduce((acc, r) => acc + (r.word_count ?? 0), 0) ?? 0;
    await supabase
      .from("books")
      .update({ word_count: total })
      .eq("id", revision.book_id);
  } catch {
    /* book-total sync is best-effort */
  }

  return {
    ok: true,
    chapterId: revision.chapter_id,
    bookId: revision.book_id,
  };
}
