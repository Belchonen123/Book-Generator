"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

/**
 * Reorder chapters during the writing phase.
 *
 * Accepts an array of chapter ids in the user's desired new order and rewrites
 * `chapter_number` on each so they match the array index (1-based).
 *
 * Because `chapters` has a `UNIQUE (book_id, chapter_number)` constraint
 * (migration 004), we do a two-pass update: first pass sets each chapter's
 * chapter_number to a negative, temporary value to avoid collisions; second
 * pass sets the real target numbers.
 *
 * The RLS `USING (auth.uid() = user_id)` on the `chapters` table + a join
 * check here guarantees only the owner can rewrite these rows.
 */
export async function reorderChaptersAction(
  bookId: string,
  orderedChapterIds: string[],
): Promise<{ ok: boolean; error?: string }> {
  if (!bookId || orderedChapterIds.length === 0) {
    return { ok: false, error: "No chapters supplied." };
  }

  const seen = new Set<string>();
  for (const id of orderedChapterIds) {
    if (typeof id !== "string" || !id) return { ok: false, error: "Invalid chapter id." };
    if (seen.has(id)) return { ok: false, error: "Duplicate chapter id in request." };
    seen.add(id);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // Confirm book ownership explicitly (defence-in-depth on top of RLS).
  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("id, user_id")
    .eq("id", bookId)
    .single();
  if (bookError || !book || book.user_id !== user.id) {
    return { ok: false, error: "Book not found." };
  }

  // Confirm every id we were given belongs to this book AND that the caller
  // supplied *all* chapters (partial reorders would leave gaps/collisions).
  const { data: existing, error: listError } = await supabase
    .from("chapters")
    .select("id")
    .eq("book_id", bookId);
  if (listError || !existing) {
    return { ok: false, error: "Could not load chapters." };
  }
  if (existing.length !== orderedChapterIds.length) {
    return { ok: false, error: "Chapter list is out of sync — refresh and try again." };
  }
  const existingIds = new Set(existing.map((c) => c.id));
  for (const id of orderedChapterIds) {
    if (!existingIds.has(id)) {
      return { ok: false, error: "Unknown chapter id in request." };
    }
  }

  const { error: rpcError } = await supabase.rpc("reorder_chapters", {
    p_book_id: bookId,
    p_ordered_ids: orderedChapterIds,
  });
  if (rpcError) return { ok: false, error: "Reorder failed. Refresh and retry." };

  revalidatePath(`/projects/${bookId}`);
  revalidatePath(`/projects/${bookId}/export`);
  return { ok: true };
}
