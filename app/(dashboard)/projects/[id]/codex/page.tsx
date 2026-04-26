import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { SimplePageSkeleton } from "@/components/layout/skeletons";
import type { CodexEntryOverlay } from "@/lib/codex/types";
import { createClient } from "@/lib/supabase/server";
import type {
  CodexEntryAiScopeDb,
  CodexEntryRelationDb,
  CodexEntryScopeDb,
  CodexEntryTypeDb,
} from "@/types/database.types";

import { CodexPageContent, type SeriesContextRow } from "./_components/codex-page-content";
import type { CodexChapterRef, ProgressionPreviewRow } from "./_components/entry-editor";

export const metadata: Metadata = {
  title: "Codex",
};

export default function CodexPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<SimplePageSkeleton />}>
      <CodexPageLoader bookId={params.id} />
    </Suspense>
  );
}

async function CodexPageLoader({ bookId }: { bookId: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Resolve the book + whether it belongs to a series in one round-trip.
  // Series context drives every downstream decision: whether we fetch
  // series-scoped entries at all, whether the sidebar groups entries, and
  // whether we render the "Editing {book} in {series}" chip.
  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("id, title, series_id")
    .eq("id", bookId)
    .eq("user_id", user.id)
    .single();

  if (bookError || !book) {
    notFound();
  }

  const seriesId = book.series_id ?? null;

  // Fetch the book's project-scoped entries + (if in a series) the
  // series-scoped entries + every sibling book's title/order for the
  // demote picker + overlay rows + progressions — all concurrently. Each
  // query is cheap on its own; fanning them out keeps TTFB low on books
  // with heavy codexes.
  const [
    projectEntriesRes,
    seriesEntriesRes,
    seriesRes,
    seriesBooksRes,
    overlaysRes,
    progressionsRes,
    chaptersRes,
  ] = await Promise.all([
    supabase
      .from("codex_entries")
      .select(
        "id, book_id, series_id, scope, entry_type, name, aliases, summary, description_md, custom_fields, ai_scope, relations, image_url, created_at, updated_at",
      )
      .eq("book_id", bookId)
      .eq("scope", "project")
      .order("updated_at", { ascending: false }),
    seriesId
      ? supabase
          .from("codex_entries")
          .select(
            "id, book_id, series_id, scope, entry_type, name, aliases, summary, description_md, custom_fields, ai_scope, relations, image_url, created_at, updated_at",
          )
          .eq("series_id", seriesId)
          .in("scope", ["series", "shared"])
          .order("updated_at", { ascending: false })
      : Promise.resolve({ data: [] as unknown[], error: null }),
    seriesId
      ? supabase
          .from("series")
          .select("id, name")
          .eq("id", seriesId)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    seriesId
      ? supabase
          .from("books")
          .select("id, title, series_order")
          .eq("series_id", seriesId)
          .eq("user_id", user.id)
          .order("series_order", { ascending: true })
      : Promise.resolve({ data: [] as Array<{ id: string; title: string | null; series_order: number | null }>, error: null }),
    seriesId
      ? supabase
          .from("codex_entry_overlays")
          .select(
            "id, codex_entry_id, book_id, description_override, notes, field_overrides",
          )
          .eq("book_id", bookId)
      : Promise.resolve({ data: [] as Array<{ id: string; codex_entry_id: string; book_id: string; description_override: string | null; notes: string | null; field_overrides: unknown }>, error: null }),
    seriesId
      ? /* For every series entry the user owns, pull the last 50 progressions
         * across ALL books in the series. We'll filter + sort per-entry
         * client-side (cheap). The entry-editor uses this list to render
         * the timeline; the matcher/AI-context path has its own fetch with
         * the no-future-spoilers window so we don't duplicate that logic
         * here. */
        supabase
          .from("codex_progressions")
          .select(
            "id, codex_entry_id, book_id, chapter_id, event_type, description, position_hint, created_at",
          )
          .order("created_at", { ascending: true })
          .limit(500)
      : supabase
          .from("codex_progressions")
          .select(
            "id, codex_entry_id, book_id, chapter_id, event_type, description, position_hint, created_at",
          )
          .eq("book_id", bookId)
          .order("created_at", { ascending: true })
          .limit(500),
    supabase
      .from("chapters")
      .select("id, chapter_number, title")
      .eq("book_id", bookId)
      .order("chapter_number", { ascending: true }),
  ]);

  const overlayRows = (overlaysRes.data ?? []) as Array<{
    id: string;
    codex_entry_id: string;
    book_id: string;
    description_override: string | null;
    notes: string | null;
    field_overrides: unknown;
  }>;
  const overlayByEntryId = new Map<string, CodexEntryOverlay>();
  for (const o of overlayRows) {
    overlayByEntryId.set(o.codex_entry_id, {
      id: o.id,
      book_id: o.book_id,
      description_override: o.description_override,
      notes: o.notes,
      field_overrides:
        o.field_overrides && typeof o.field_overrides === "object" && !Array.isArray(o.field_overrides)
          ? (o.field_overrides as Record<string, unknown>)
          : {},
    });
  }

  type RawRow = {
    id: string;
    book_id: string | null;
    series_id: string | null;
    scope: string | null;
    entry_type: string;
    name: string;
    aliases: string[] | null;
    summary: string | null;
    description_md: string | null;
    custom_fields: unknown;
    ai_scope: string;
    relations: unknown;
    image_url: string | null;
    created_at: string;
    updated_at: string;
  };

  function coerce(row: RawRow) {
    const scope = (row.scope ?? "project") as CodexEntryScopeDb;
    const isSeries = scope === "series" || scope === "shared";
    const overlay = isSeries ? overlayByEntryId.get(row.id) ?? null : null;

    const baseCustom =
      row.custom_fields && typeof row.custom_fields === "object" && !Array.isArray(row.custom_fields)
        ? (row.custom_fields as Record<string, unknown>)
        : {};
    const overCustom = overlay
      ? (overlay.field_overrides as Record<string, unknown>)
      : {};
    const mergedCustom: Record<string, unknown> = { ...baseCustom, ...overCustom };

    const description = overlay?.description_override?.trim()
      ? overlay.description_override
      : row.description_md ?? "";

    return {
      id: row.id,
      /* For series entries we synthesize book_id = currentBookId so the
       * existing editor code paths keep working. See hooks/use-codex-entries
       * for the matching synthesis used in the chapter editor. */
      book_id: isSeries ? bookId : row.book_id ?? "",
      owning_book_id: isSeries ? null : row.book_id ?? null,
      entry_type: row.entry_type as CodexEntryTypeDb,
      name: row.name,
      aliases: row.aliases ?? [],
      summary: row.summary,
      description_md: description,
      custom_fields: mergedCustom,
      ai_scope: row.ai_scope as CodexEntryAiScopeDb,
      relations: Array.isArray(row.relations)
        ? ((row.relations as CodexEntryRelationDb[]) ?? []).filter(
            (r) => r && typeof r === "object" && typeof r.targetId === "string",
          )
        : [],
      image_url: row.image_url,
      created_at: row.created_at,
      updated_at: row.updated_at,
      scope,
      series_id: row.series_id,
      is_series_scoped: isSeries,
      is_modified_here: Boolean(overlay),
      overlay_for_book: overlay,
    };
  }

  const initialEntries = [
    ...((projectEntriesRes.data ?? []) as RawRow[]).map(coerce),
    ...((seriesEntriesRes.data ?? []) as RawRow[]).map(coerce),
  ];

  const seriesContext: SeriesContextRow | null = seriesId
    ? {
        id: seriesId,
        name:
          (seriesRes.data && "name" in seriesRes.data
            ? (seriesRes.data as { name: string }).name
            : null) ?? "Untitled series",
        books: ((seriesBooksRes.data ?? []) as Array<{
          id: string;
          title: string | null;
          series_order: number | null;
        }>).map((b) => ({
          id: b.id,
          title: b.title?.trim() || "Untitled",
          series_order: b.series_order ?? null,
        })),
      }
    : null;

  const progressions: ProgressionPreviewRow[] = (
    (progressionsRes.data ?? []) as Array<{
      id: string;
      codex_entry_id: string;
      book_id: string;
      chapter_id: string | null;
      event_type: string;
      description: string;
      position_hint: string | null;
      created_at: string;
    }>
  ).map((p) => ({
    id: p.id,
    codex_entry_id: p.codex_entry_id,
    book_id: p.book_id,
    chapter_id: p.chapter_id,
    event_type: p.event_type,
    description: p.description,
    position_hint: p.position_hint,
    created_at: p.created_at,
  }));
  const chapters: CodexChapterRef[] = (
    (chaptersRes.data ?? []) as Array<{
      id: string;
      chapter_number: number;
      title: string | null;
    }>
  ).map((c) => ({
    id: c.id,
    chapter_number: c.chapter_number,
    title: c.title?.trim() || "Untitled",
  }));

  return (
    <CodexPageContent
      bookId={book.id}
      bookTitle={book.title?.trim() || "Untitled"}
      initialEntries={initialEntries}
      seriesContext={seriesContext}
      initialProgressions={progressions}
      initialChapters={chapters}
    />
  );
}
