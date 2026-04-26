import { notFound, redirect } from "next/navigation";

import { FREE_REVISION_VIEW_LIMIT, listRevisions } from "@/lib/book/revisions";
import { createClient } from "@/lib/supabase/server";

import { RevisionsList, type RevisionListItem } from "./_components/revisions-list";

export const dynamic = "force-dynamic";

const PREVIEW_CHAR_LIMIT = 200;

/** Strips markdown-ish punctuation and condenses whitespace for a compact preview. */
function buildPreview(content: string): string {
  const stripped = content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[*_`#>]+/g, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (stripped.length <= PREVIEW_CHAR_LIMIT) return stripped;
  return `${stripped.slice(0, PREVIEW_CHAR_LIMIT).trimEnd()}…`;
}

export default async function ChapterRevisionsPage({
  params,
}: {
  params: { id: string; chapterId: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: book } = await supabase
    .from("books")
    .select("id, user_id")
    .eq("id", params.id)
    .single();

  if (!book || book.user_id !== user.id) {
    notFound();
  }

  const { data: chapter } = await supabase
    .from("chapters")
    .select("id, book_id, title")
    .eq("id", params.chapterId)
    .eq("book_id", params.id)
    .single();

  if (!chapter) {
    notFound();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .single();

  const tier = profile?.subscription_tier ?? "free";
  const { rows, totalStored, limit } = await listRevisions(
    supabase,
    chapter.id,
    tier,
  );

  /* Walk newest-first so each row's `wordDelta` describes its growth
   * relative to the revision that PRECEDED it chronologically (i.e. the
   * next row in the DESC-ordered list). A positive delta means "this
   * revision added words vs the one before it in time." */
  const revisions: RevisionListItem[] = rows.map((row, idx) => {
    const prev = rows[idx + 1];
    const wordDelta = prev ? row.word_count - prev.word_count : 0;
    return {
      id: row.id,
      source: row.source,
      title_snapshot: row.title_snapshot,
      word_count: row.word_count,
      content: row.content,
      preview: buildPreview(row.content),
      created_at: row.created_at,
      wordDelta,
    };
  });

  return (
    <RevisionsList
      bookId={book.id}
      chapterId={chapter.id}
      chapterTitle={chapter.title}
      revisions={revisions}
      totalStored={totalStored}
      viewLimit={limit}
      tierIsFree={tier === "free" && totalStored > FREE_REVISION_VIEW_LIMIT}
    />
  );
}
