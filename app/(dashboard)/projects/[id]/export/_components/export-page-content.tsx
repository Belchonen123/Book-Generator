import { notFound, redirect } from "next/navigation";

import { ExportPanelLazy } from "@/components/book/heavy-panels";
import { createClient } from "@/lib/supabase/server";

export async function ExportPageContent({ bookId }: { bookId: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("id, user_id, title, genre, word_count, chapter_count, cover_url")
    .eq("id", bookId)
    .eq("user_id", user.id)
    .single();

  if (bookError || !book) {
    notFound();
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .maybeSingle();
  const isPro = profileRow?.subscription_tier === "pro";

  const { data: chapters, error: chError } = await supabase
    .from("chapters")
    .select("id, chapter_number, title, status, content")
    .eq("book_id", book.id)
    .order("chapter_number", { ascending: true });

  const chapterRows = chError
    ? []
    : (chapters ?? []).map(({ content, ...rest }) => ({
        ...rest,
        hasAudioBody: typeof content === "string" && content.trim().length > 0,
      }));

  return (
    <ExportPanelLazy
      bookId={book.id}
      title={book.title}
      genre={book.genre}
      wordCount={book.word_count}
      chapterCount={book.chapter_count}
      coverUrl={book.cover_url}
      chapters={chapterRows}
      isPro={isPro}
    />
  );
}
