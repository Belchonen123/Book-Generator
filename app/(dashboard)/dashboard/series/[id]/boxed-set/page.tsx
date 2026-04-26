import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { BoxedSetEditor } from "./_components/boxed-set-editor";

/**
 * Boxed-set compilation page (Prompt 16 lines 308-326). Renders the
 * editable front/back-matter blocks plus the per-book inclusion list and
 * wires the compile button to `/api/series/compile-boxed-set`.
 *
 * Everything server-side here is ownership-gated: we fetch only the series
 * this user owns and only its books; the compile route re-validates.
 */
export default async function SeriesBoxedSetPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, full_name, pen_name, bio")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.subscription_tier !== "pro") {
    redirect("/dashboard?error=series");
  }

  const { data: series } = await supabase
    .from("series")
    .select("id, name, tagline, description, genre")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!series) notFound();

  const [{ data: books }, { data: metaRow }] = await Promise.all([
    supabase
      .from("books")
      .select(
        "id, title, subtitle, status, word_count, chapter_count, cover_url, series_order",
      )
      .eq("series_id", series.id)
      .eq("user_id", user.id)
      .order("series_order", { ascending: true, nullsFirst: false }),
    supabase
      .from("series_metadata")
      .select(
        "boxed_set_title, boxed_set_description, reading_order_copy_md, also_by_author_list_md, boxed_set_dedication_md, boxed_set_author_note_md, newsletter_signup_copy_md, boxed_set_included_book_ids",
      )
      .eq("series_id", series.id)
      .maybeSingle(),
  ]);

  // "Also by this author" should also surface books outside the series so the
  // user can cross-promote standalones. We pull a slim list for the editor.
  const { data: externalBooks } = await supabase
    .from("books")
    .select("id, title, series_id")
    .eq("user_id", user.id)
    .neq("series_id", series.id);

  const bookRows = (books ?? []).map((b, idx) => ({
    id: b.id,
    title: b.title,
    subtitle: b.subtitle ?? null,
    status: b.status as string,
    word_count: b.word_count ?? 0,
    chapter_count: b.chapter_count ?? 0,
    cover_url: b.cover_url ?? null,
    // Normalize series_order so the UI has a stable number to display even if
    // older rows have null positions.
    series_order: b.series_order ?? idx + 1,
  }));

  const externalBookRows = (externalBooks ?? [])
    .filter((b) => b.series_id !== series.id)
    .map((b) => ({ id: b.id, title: b.title }));

  const authorName =
    profile.pen_name?.trim() || profile.full_name?.trim() || "";

  return (
    <BoxedSetEditor
      series={{
        id: series.id,
        name: series.name,
        tagline: series.tagline ?? null,
      }}
      books={bookRows}
      externalBooks={externalBookRows}
      author={{ displayName: authorName, bio: profile.bio ?? null }}
      metadata={{
        boxedSetTitle: metaRow?.boxed_set_title ?? null,
        boxedSetDescription: metaRow?.boxed_set_description ?? null,
        readingOrderCopyMd: metaRow?.reading_order_copy_md ?? null,
        alsoByAuthorMd: metaRow?.also_by_author_list_md ?? null,
        dedicationMd: metaRow?.boxed_set_dedication_md ?? null,
        authorNoteMd: metaRow?.boxed_set_author_note_md ?? null,
        newsletterSignupMd: metaRow?.newsletter_signup_copy_md ?? null,
        includedBookIds: metaRow?.boxed_set_included_book_ids ?? null,
      }}
    />
  );
}
