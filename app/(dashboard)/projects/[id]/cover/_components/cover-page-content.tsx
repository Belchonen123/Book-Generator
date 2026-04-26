import { notFound, redirect } from "next/navigation";

import { AboutAuthorPanel } from "@/components/book/AboutAuthorPanel";
import { BackCoverCopyPanel } from "@/components/book/BackCoverCopyPanel";
import { BookMetadataPanel } from "@/components/book/BookMetadataPanel";
import { CoverGeneratorLazy } from "@/components/book/heavy-panels";
import { createClient } from "@/lib/supabase/server";

export async function CoverPageContent({ bookId }: { bookId: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [bookResult, profileResult] = await Promise.all([
    supabase
      .from("books")
      .select(
        "id, title, subtitle, author_display_name, genre, refined_idea, tone, cover_url, cover_prompt, back_cover_copy, about_author",
      )
      .eq("id", bookId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("profiles")
      .select("full_name, bio, pen_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const { data: book, error } = bookResult;
  if (error || !book) {
    notFound();
  }

  const profile = profileResult.data ?? null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="min-w-0">
          <CoverGeneratorLazy
            bookId={book.id}
            bookTitle={book.title}
            genre={book.genre}
            refinedIdea={book.refined_idea}
            tone={book.tone}
            initialCoverUrl={book.cover_url}
            initialCoverPrompt={book.cover_prompt}
          />
        </div>

        <aside className="min-w-0 space-y-6">
          <BookMetadataPanel
            bookId={book.id}
            initialTitle={book.title}
            initialSubtitle={book.subtitle}
            initialAuthorDisplayName={book.author_display_name}
          />
          <BackCoverCopyPanel
            bookId={book.id}
            initialBlurb={book.back_cover_copy}
          />
          <AboutAuthorPanel
            bookId={book.id}
            initialAboutAuthor={book.about_author}
            profileBio={profile?.bio ?? null}
            profilePenName={profile?.pen_name ?? null}
            profileFullName={profile?.full_name ?? null}
            profileAvatarUrl={profile?.avatar_url ?? null}
          />
        </aside>
      </div>
    </div>
  );
}
