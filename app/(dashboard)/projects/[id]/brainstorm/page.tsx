import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { BrainstormPageClient } from "./_components/brainstorm-page-client";
import {
  getBrainstormSession,
  listBrainstormSessions,
  listKeepersForBook,
} from "./actions";

export const metadata: Metadata = {
  title: "Brainstorm",
};

export const dynamic = "force-dynamic";

export default async function BrainstormPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: book, error } = await supabase
    .from("books")
    .select("id, title")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (error || !book) {
    notFound();
  }

  /* Prefetch everything the client needs for its first paint. Falling
   * back to empty arrays keeps the page useful even if any one query
   * fails — the user can still open the composer and generate fresh. */
  const [sessionsRes, keepersRes] = await Promise.all([
    listBrainstormSessions(book.id),
    listKeepersForBook(book.id),
  ]);

  const initialSessions = sessionsRes.ok ? sessionsRes.data : [];
  const initialKeepers = keepersRes.ok ? keepersRes.data : [];

  /* If the user has an existing session, auto-select the most recent
   * one so they land on useful content instead of an empty canvas. */
  let initialActiveSession = null;
  if (initialSessions.length > 0) {
    const recent = initialSessions[0];
    const res = await getBrainstormSession(book.id, recent.id);
    if (res.ok) initialActiveSession = res.data;
  }

  return (
    <BrainstormPageClient
      bookId={book.id}
      bookTitle={book.title?.trim() || "Untitled"}
      initialSessions={initialSessions}
      initialActiveSession={initialActiveSession}
      initialKeepers={initialKeepers}
    />
  );
}
