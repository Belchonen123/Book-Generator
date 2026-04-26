import { notFound, redirect } from "next/navigation";

import { IdeaChat } from "@/components/book/IdeaChat";
import { resolveChapterEntryId } from "@/lib/book/project-entry";
import { parseRefinedIdeaFromDb } from "@/lib/refined-idea/parse";
import { createClient } from "@/lib/supabase/server";
import type { BookStatusDb } from "@/types/database.types";

export async function ProjectEntryContent({ bookId }: { bookId: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: book, error } = await supabase
    .from("books")
    .select("id, user_id, status, title, idea_conversation, refined_idea, book_type")
    .eq("id", bookId)
    .eq("user_id", user.id)
    .single();

  if (error || !book) {
    notFound();
  }

  const status = book.status as BookStatusDb;

  if (status === "idea" || status === "refining") {
    const refined = parseRefinedIdeaFromDb(book.refined_idea, "project-entry.initial", {
      bookId: book.id,
    });
    const initialRefinedIdea = refined.ok ? refined.data : null;
    const refinedIdeaFromDbInvalid = refined.invalid;

    return (
      <div className="px-4 py-6 sm:px-6 sm:py-8">
        <IdeaChat
          bookId={book.id}
          bookTitle={book.title}
          initialConversation={book.idea_conversation}
          initialRefinedIdea={initialRefinedIdea}
          refinedIdeaFromDbInvalid={refinedIdeaFromDbInvalid}
          initialBookType={book.book_type ?? "fiction"}
        />
      </div>
    );
  }

  if (status === "outlining") {
    redirect(`/projects/${book.id}/outline`);
  }

  if (status === "writing" || status === "editing") {
    const chapterId = await resolveChapterEntryId(supabase, book.id);
    if (!chapterId) {
      redirect(`/projects/${book.id}/outline`);
    }
    redirect(`/projects/${book.id}/chapters/${chapterId}`);
  }

  if (status === "cover") {
    redirect(`/projects/${book.id}/cover`);
  }

  if (status === "complete") {
    redirect(`/projects/${book.id}/export`);
  }

  redirect(`/projects/${book.id}/outline`);
}
