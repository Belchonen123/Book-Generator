import { notFound, redirect } from "next/navigation";

import { CoverPageWorkspace } from "@/components/book/CoverPageWorkspace";
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

  return <CoverPageWorkspace book={book} profile={profile} />;
}
