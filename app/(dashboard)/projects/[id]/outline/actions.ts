"use server";

import { generateCharacterBiblePayload } from "@/lib/openai/generate-character-bible";
import { briefSourceForBookRow } from "@/lib/refined-idea/parse";
import { createClient } from "@/lib/supabase/server";
import type { BookTypeDb, Json } from "@/types/database.types";
import { trackEvent } from "@/lib/utils/analytics";
import { logServerError } from "@/lib/utils/errors";

export type ApproveOutlineResult =
  | { ok: true; firstChapterId: string }
  | { ok: false; error: string };

export async function approveOutline(bookId: string): Promise<ApproveOutlineResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Unauthorized" };
  }

  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("id, title, book_type, genre, tone, refined_idea, raw_idea")
    .eq("id", bookId)
    .eq("user_id", user.id)
    .single();

  if (bookError || !book) {
    return { ok: false, error: "Book not found." };
  }

  const { error: outlineUpdateError } = await supabase
    .from("outlines")
    .update({ approved: true })
    .eq("book_id", bookId);

  if (outlineUpdateError) {
    return { ok: false, error: "Could not approve outline." };
  }

  const { error: bookStatusError } = await supabase
    .from("books")
    .update({ status: "writing" })
    .eq("id", bookId)
    .eq("user_id", user.id);

  if (bookStatusError) {
    return { ok: false, error: "Could not update book status." };
  }

  const { data: firstChapter, error: chapterError } = await supabase
    .from("chapters")
    .select("id")
    .eq("book_id", bookId)
    .order("chapter_number", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (chapterError || !firstChapter) {
    return { ok: false, error: "No chapters found. Generate an outline first." };
  }

  const { data: outlineRow, error: outlineReadError } = await supabase
    .from("outlines")
    .select("sections")
    .eq("book_id", bookId)
    .single();

  if (outlineReadError) {
    logServerError("approveOutline.outline-read", outlineReadError);
  } else if (outlineRow) {
    const brief = briefSourceForBookRow({
      refined_idea: book.refined_idea,
      raw_idea: book.raw_idea,
      title: book.title,
      bookId,
      logContext: "approveOutline",
    });

    const bibleResult = await generateCharacterBiblePayload({
      bookTitle: book.title ?? "Untitled",
      bookType: book.book_type as BookTypeDb,
      genre: book.genre,
      tone: book.tone,
      brief: brief || "(No stored brief.)",
      outlineSections: outlineRow.sections,
    });

    if (bibleResult) {
      const { error: bibleUpdateError } = await supabase
        .from("books")
        .update({ character_bible: bibleResult.payload as unknown as Json })
        .eq("id", bookId)
        .eq("user_id", user.id);

      if (bibleUpdateError) {
        logServerError("approveOutline.character-bible-update", bibleUpdateError);
      } else {
        await supabase.from("api_usage").insert({
          user_id: user.id,
          route: "approve-outline:character-bible",
          tokens_used: bibleResult.tokensUsed,
          model: "gpt-4o-mini",
        });
      }
    } else {
      logServerError(
        "approveOutline.character-bible",
        new Error("generation returned null"),
      );
    }
  }

  await trackEvent(user.id, "outline_approved", bookId);
  return { ok: true, firstChapterId: firstChapter.id };
}
