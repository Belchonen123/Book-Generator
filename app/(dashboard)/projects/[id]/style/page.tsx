import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { SimplePageSkeleton } from "@/components/layout/skeletons";
import { createClient } from "@/lib/supabase/server";

import { StylePageContent } from "./_components/style-page-content";

export const metadata: Metadata = {
  title: "Voice & Style",
};

export default function StylePage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<SimplePageSkeleton />}>
      <StylePageLoader bookId={params.id} />
    </Suspense>
  );
}

async function StylePageLoader({ bookId }: { bookId: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: book, error } = await supabase
    .from("books")
    .select("id, title, style_examples, style_instructions")
    .eq("id", bookId)
    .eq("user_id", user.id)
    .single();

  if (error || !book) {
    notFound();
  }

  return (
    <StylePageContent
      bookId={book.id}
      bookTitle={book.title?.trim() || "Untitled"}
      initialStyleExamples={book.style_examples ?? ""}
      initialStyleInstructions={book.style_instructions ?? ""}
    />
  );
}
