import { notFound, redirect } from "next/navigation";

import { IdeaChat } from "@/components/book/IdeaChat";
import { parseRefinedIdeaFromDb } from "@/lib/refined-idea/parse";
import { createClient } from "@/lib/supabase/server";

/**
 * Dedicated idea-phase route. Always renders the IdeaChat regardless of book
 * status so authors can revisit / tweak the premise even after they've moved
 * on to outline, chapters, cover, or export.
 *
 * The "auto-resume" behavior that redirects users from `/projects/[id]` to the
 * furthest step they've reached lives in `project-entry-content.tsx` and is
 * intentionally NOT duplicated here.
 */
export async function IdeaPageContent({ bookId }: { bookId: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: book, error } = await supabase
    .from("books")
    .select("id, user_id, title, idea_conversation, refined_idea, book_type")
    .eq("id", bookId)
    .eq("user_id", user.id)
    .single();

  if (error || !book) {
    notFound();
  }

  const refined = parseRefinedIdeaFromDb(book.refined_idea, "idea-page.initial", {
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
