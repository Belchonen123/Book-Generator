"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { Database, ChapterStatusDb } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type ChapterRow = {
  id: string;
  chapter_number: number;
};

/**
 * Chapters that changed slot or sit next to a moved chapter in the new
 * order — candidates for opening/closing handoff rewrites.
 */
function computeAffectedChapterIds(
  beforeOrderedIds: string[],
  afterOrderedIds: string[],
): string[] {
  const oldIndex = (id: string) => beforeOrderedIds.indexOf(id);
  const moved = new Set<string>();
  for (const id of afterOrderedIds) {
    if (oldIndex(id) !== afterOrderedIds.indexOf(id)) {
      moved.add(id);
    }
  }
  const out = new Set<string>(moved);
  for (const id of Array.from(moved)) {
    const i = afterOrderedIds.indexOf(id);
    if (i > 0) out.add(afterOrderedIds[i - 1]!);
    if (i < afterOrderedIds.length - 1) out.add(afterOrderedIds[i + 1]!);
  }
  return Array.from(out);
}

export type ReorderChaptersListRow = {
  id: string;
  chapter_number: number;
  title: string;
  status: ChapterStatusDb;
  word_count: number;
};

export type ReorderChaptersSuccess = {
  ok: true;
  /** Full new order: chapter id per 1-based position. */
  orderedIds: string[];
  /** Chapters to consider for transition rewrites. */
  affectedChapterIds: string[];
  /** Fresh list for the client. */
  chapters: ReorderChaptersListRow[];
};

export type ReorderChaptersResult = ReorderChaptersSuccess | { ok: false; error: string };

/**
 * Reassigns `chapter_number` 1..n to match `orderedIds` (full permutation
 * of the book’s chapters). Uses a two-pass update to stay clear of the
 * UNIQUE (book_id, chapter_number) constraint.
 */
export async function reorderChaptersAction(
  bookId: string,
  orderedIds: string[],
): Promise<ReorderChaptersResult> {
  if (!bookId || !Array.isArray(orderedIds) || orderedIds.length === 0) {
    return { ok: false, error: "Invalid order." };
  }

  const supabase = (await createClient()) as SupabaseClient<Database>;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    return { ok: false, error: "Could not load profile." };
  }
  if (profile?.subscription_tier !== "pro") {
    return { ok: false, error: "Reordering chapters is a Pro feature." };
  }

  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("id, user_id")
    .eq("id", bookId)
    .maybeSingle();
  if (bookError || !book) {
    return { ok: false, error: "Book not found." };
  }
  if (book.user_id !== user.id) {
    return { ok: false, error: "Not allowed." };
  }

  const { data: rows, error: rowError } = await supabase
    .from("chapters")
    .select("id, chapter_number")
    .eq("book_id", bookId)
    .order("chapter_number", { ascending: true });
  if (rowError) {
    return { ok: false, error: "Could not load chapters." };
  }
  if (!rows?.length) {
    return { ok: false, error: "No chapters to reorder." };
  }

  const byNumber = (rows as ChapterRow[]).slice().sort((a, b) => a.chapter_number - b.chapter_number);
  const beforeOrderedIds = byNumber.map((r) => r.id);
  const fromDb = new Set(beforeOrderedIds);
  if (orderedIds.length !== fromDb.size || orderedIds.some((id) => !fromDb.has(id))) {
    return { ok: false, error: "Order must include every chapter exactly once." };
  }

  const affectedChapterIds = computeAffectedChapterIds(beforeOrderedIds, orderedIds);

  const { error: reorderErr } = await supabase.rpc("reorder_chapters", {
    p_book_id: bookId,
    p_ordered_ids: orderedIds,
  });
  if (reorderErr) {
    return { ok: false, error: "Could not reorder chapters." };
  }

  revalidatePath(`/projects/${bookId}`);
  revalidatePath(`/projects/${bookId}/outline`);
  for (const id of orderedIds) {
    revalidatePath(`/projects/${bookId}/chapters/${id}`);
  }

  const { data: fresh, error: freshErr } = await supabase
    .from("chapters")
    .select("id, chapter_number, title, status, word_count")
    .eq("book_id", bookId)
    .order("chapter_number", { ascending: true });
  if (freshErr || !fresh) {
    return { ok: false, error: "Reordered, but could not refresh the list." };
  }

  return {
    ok: true,
    orderedIds,
    affectedChapterIds,
    chapters: fresh as ReorderChaptersListRow[],
  };
}
