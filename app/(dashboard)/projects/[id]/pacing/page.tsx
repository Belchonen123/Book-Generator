import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { SimplePageSkeleton } from "@/components/layout/skeletons";
import { createClient } from "@/lib/supabase/server";
import { ensureProfileRowForUser } from "@/lib/supabase/ensure-profile-row";

import { PacingPageContent } from "./_components/pacing-page-content";
import { PacingProUpsell } from "./_components/pacing-pro-upsell";

export default async function PacingPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<SimplePageSkeleton />}>
      <PacingPageLoader bookId={params.id} />
    </Suspense>
  );
}

async function PacingPageLoader({ bookId }: { bookId: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("id, user_id, book_type")
    .eq("id", bookId)
    .eq("user_id", user.id)
    .single();

  if (bookError || !book) {
    notFound();
  }

  if ((book.book_type ?? "fiction") === "non_fiction") {
    const { data: ch } = await supabase
      .from("chapters")
      .select("id")
      .eq("book_id", bookId)
      .order("chapter_number", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (ch?.id) {
      redirect(`/projects/${bookId}/chapters/${ch.id}`);
    }
    redirect(`/projects/${bookId}/outline`);
  }

  let { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return (
      <div className="p-8 text-sm text-rose-300">Could not load your profile. Try again later.</div>
    );
  }

  if (!profile) {
    const ensured = await ensureProfileRowForUser(supabase, user);
    if (!ensured.ok) {
      return (
        <div className="p-8 text-sm text-rose-300">
          Could not load your profile.
          {ensured.code ? ` (${ensured.code})` : ""} Try again later.
        </div>
      );
    }
    profile = { subscription_tier: "free" as const };
  }

  if (profile.subscription_tier !== "pro") {
    return (
      <div className="px-4 py-10 sm:px-6">
        <PacingProUpsell />
      </div>
    );
  }

  const { data: chapterRows, error: chError } = await supabase
    .from("chapters")
    .select("id, title, chapter_number, content")
    .eq("book_id", bookId)
    .order("chapter_number", { ascending: true });

  if (chError) {
    return (
      <div className="p-8 text-sm text-rose-300">Could not load chapters. Try again later.</div>
    );
  }

  return (
    <PacingPageContent
      bookId={bookId}
      chapters={chapterRows ?? []}
    />
  );
}
