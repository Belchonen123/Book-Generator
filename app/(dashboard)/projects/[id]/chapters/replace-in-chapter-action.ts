"use server";

import { revalidatePath } from "next/cache";

import { snapshotChapter } from "@/lib/book/revisions";
import { createClient } from "@/lib/supabase/server";

function countWordsMd(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

/**
 * Replaces a chapter's markdown in one shot (book-wide find/replace). Snapshots
 * the prior content with `source='find_replace'`.
 */
export async function replaceInChapterAction(
  bookId: string,
  chapterId: string,
  newContent: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!bookId || !chapterId) {
    return { ok: false, error: "Invalid request." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  const { data: book, error: bookErr } = await supabase
    .from("books")
    .select("id")
    .eq("id", bookId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (bookErr || !book) {
    return { ok: false, error: "Book not found." };
  }

  const { data: ch, error: chError } = await supabase
    .from("chapters")
    .select("id, book_id")
    .eq("id", chapterId)
    .eq("book_id", bookId)
    .maybeSingle();

  if (chError || !ch) {
    return { ok: false, error: "Chapter not found." };
  }

  const snap = await snapshotChapter(supabase, {
    chapterId,
    userId: user.id,
    source: "find_replace",
  });
  if (!snap.ok && snap.code !== "empty") {
    return { ok: false, error: snap.error };
  }

  const words = countWordsMd(newContent);

  const { error: upErr } = await supabase
    .from("chapters")
    .update({
      content: newContent,
      word_count: words,
      status: "edited",
    })
    .eq("id", chapterId)
    .eq("book_id", bookId);

  if (upErr) {
    return { ok: false, error: "Could not save chapter." };
  }

  const { data: rows } = await supabase
    .from("chapters")
    .select("word_count")
    .eq("book_id", bookId);
  const sum = rows?.reduce((acc, r) => acc + (r.word_count ?? 0), 0) ?? 0;
  await supabase.from("books").update({ word_count: sum }).eq("id", bookId);

  revalidatePath(`/projects/${bookId}/chapters/${chapterId}`);
  revalidatePath(`/projects/${bookId}/chapters/${chapterId}/revisions`);
  return { ok: true };
}
