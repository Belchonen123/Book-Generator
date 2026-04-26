import { notFound, redirect } from "next/navigation";

import { OutlineEditorLazy } from "@/components/book/heavy-panels";
import { SeriesBiblePromote } from "@/components/book/SeriesBiblePromote";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";

function hasBibleContent(value: Json | null | undefined): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "object" && !Array.isArray(value)) {
    return Object.keys(value as object).length > 0;
  }
  return true;
}

export async function OutlinePageContent({ bookId }: { bookId: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("id, title, book_type, series_id, character_bible")
    .eq("id", bookId)
    .eq("user_id", user.id)
    .single();

  if (bookError || !book) {
    notFound();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .maybeSingle();

  const { data: outline } = await supabase
    .from("outlines")
    .select("id, book_id, sections, approved")
    .eq("book_id", book.id)
    .maybeSingle();

  const { data: chapters } = await supabase
    .from("chapters")
    .select("id, content, word_count, status")
    .eq("book_id", book.id);
  const anyChapterWritten = (chapters ?? []).some(
    (c) =>
      (c.word_count ?? 0) > 50 ||
      c.status === "draft" ||
      c.status === "edited" ||
      c.status === "approved",
  );

  return (
    <>
      <OutlineEditorLazy
        bookId={book.id}
        bookTitle={book.title}
        bookType={book.book_type}
        initialOutline={outline}
        lockStructuralEdits={anyChapterWritten}
      />
      <div className="px-4 pb-10 sm:px-6">
        <SeriesBiblePromote
          bookId={book.id}
          hasSeries={book.series_id != null}
          hasCharacterBible={hasBibleContent(book.character_bible as Json)}
          isPro={profile?.subscription_tier === "pro"}
        />
      </div>
    </>
  );
}
