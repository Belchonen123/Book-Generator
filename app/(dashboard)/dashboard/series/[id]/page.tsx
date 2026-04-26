import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type {
  CodexEntryScopeDb,
  CodexEntryTypeDb,
  Json,
  SeriesArcBeatStatusDb,
  SeriesArcBeatTypeDb,
  SeriesArcStatusDb,
  SeriesArcTypeDb,
  SeriesStatusDb,
} from "@/types/database.types";

import { SeriesDetailShell } from "./series-detail-shell";

/**
 * Full server load for the Series detail page. Everything under the tab
 * components is rendered from these props — each tab can mutate via server
 * actions + router.refresh() to re-enter this loader.
 */
export default async function SeriesDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: proRow } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .maybeSingle();
  if (proRow?.subscription_tier !== "pro") {
    redirect("/dashboard?error=series");
  }

  const { data: series } = await supabase
    .from("series")
    .select(
      "id, name, tagline, description, genre, planned_book_count, status, shared_character_bible, shared_world_notes, updated_at",
    )
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!series) notFound();

  const [
    { data: books },
    { data: orphanBookRows },
    { data: codex },
    { data: overlays },
    { data: progressions },
    { data: arcs },
    { data: beats },
    { data: metaRow },
  ] = await Promise.all([
      supabase
        .from("books")
        .select(
          "id, title, subtitle, status, word_count, chapter_count, cover_url, series_order, reading_order_note, series_summary_generated_at, series_plot_summary, series_end_state_dossier, updated_at",
        )
        .eq("series_id", series.id)
        .eq("user_id", user.id)
        .order("series_order", { ascending: true, nullsFirst: false }),
      // Orphan books power the Books-tab "Add existing book" modal. We load
      // them here so the modal opens with zero additional network cost. RLS
      // guarantees only the caller's own books come back, and the
      // `series_id IS NULL` filter drops anything already linked into
      // another series — matching the spec's contract.
      supabase
        .from("books")
        .select("id, title, subtitle, cover_url, status, word_count")
        .eq("user_id", user.id)
        .is("series_id", null)
        .order("updated_at", { ascending: false }),
      // Pull all of the user's codex entries and filter to this series in JS.
      // PostgREST .or() can't express "book_id IN (books in this series)"
      // without a roundtrip; typical codex sizes are small (dozens to low
      // hundreds) so a full fetch + in-memory filter is cheaper and simpler.
      supabase
        .from("codex_entries")
        .select("id, book_id, series_id, scope, entry_type, name, aliases, summary, description_md, custom_fields, updated_at")
        .eq("user_id", user.id),
      supabase
        .from("codex_entry_overlays")
        .select("id, codex_entry_id, book_id, field_overrides, description_override, notes, updated_at"),
      supabase
        .from("codex_progressions")
        .select("id, codex_entry_id, book_id, chapter_id, event_type, description, position_hint, created_at")
        .order("created_at", { ascending: true }),
      supabase
        .from("series_arcs")
        .select(
          "id, name, description_md, arc_type, status, starts_book_id, ends_book_id, linked_codex_entry_ids, updated_at",
        )
        .eq("series_id", series.id),
      supabase
        .from("series_arc_beats")
        .select("id, arc_id, book_id, chapter_id, position, beat_type, description, status"),
      supabase
        .from("series_metadata")
        .select(
          "series_id, kdp_series_name, kdp_series_number_format, amazon_series_asin, boxed_set_title, boxed_set_description, cross_promo_copy_md, also_by_author_list_md, reading_order_copy_md, boxed_set_dedication_md, boxed_set_author_note_md, newsletter_signup_copy_md, boxed_set_included_book_ids, audiobook_bundle_metadata",
        )
        .eq("series_id", series.id)
        .maybeSingle(),
    ]);

  // Keep only entries that (a) are series-scoped to THIS series OR
  // (b) are book-scoped to one of THIS series' books.
  const bookIdSet = new Set((books ?? []).map((b) => b.id));
  const filteredCodex = (codex ?? []).filter((c) => {
    if (c.scope === "series") return c.series_id === series.id;
    if (c.scope === "project") return c.book_id != null && bookIdSet.has(c.book_id);
    return false;
  });

  // Scope overlays to books in this series only (RLS already enforces user,
  // but we prune cross-series rows that could appear if the RLS select
  // spans other series of the same user).
  const codexIdSet = new Set(filteredCodex.map((c) => c.id));
  const filteredOverlays = (overlays ?? []).filter(
    (o) => codexIdSet.has(o.codex_entry_id) && bookIdSet.has(o.book_id),
  );
  const filteredProgressions = (progressions ?? []).filter(
    (p) => codexIdSet.has(p.codex_entry_id) && bookIdSet.has(p.book_id),
  );

  const arcIdSet = new Set((arcs ?? []).map((a) => a.id));
  const filteredBeats = (beats ?? []).filter((b) => arcIdSet.has(b.arc_id));

  // Prompt 16.5: explicit foreshadow pairs (one-shot lookup keyed on the
  // beat ids we already filtered). Scoped to this series' beats so pairs
  // from other series the user owns never leak into this view.
  const filteredBeatIds = filteredBeats.map((b) => b.id);
  const { data: foreshadowPairs } =
    filteredBeatIds.length > 0
      ? await supabase
          .from("series_foreshadowing_pairs")
          .select("id, foreshadow_beat_id, payoff_beat_id, note, created_at")
          .in("foreshadow_beat_id", filteredBeatIds)
      : {
          data: [] as {
            id: string;
            foreshadow_beat_id: string;
            payoff_beat_id: string | null;
            note: string | null;
            created_at: string;
          }[],
        };

  // Chapters for every book in the series power the beat → chapter picker in
  // the Arcs tab. Kept intentionally lean (id/title/book_id/number) to avoid
  // shipping chapter bodies in the series payload.
  const bookIdArr = Array.from(bookIdSet);
  const { data: chapters } =
    bookIdArr.length > 0
      ? await supabase
          .from("chapters")
          .select("id, book_id, chapter_number, title, status")
          .in("book_id", bookIdArr)
          .order("chapter_number", { ascending: true })
      : { data: [] as { id: string; book_id: string; chapter_number: number; title: string; status: string }[] };

  return (
    <SeriesDetailShell
      series={{
        id: series.id,
        name: series.name,
        tagline: series.tagline,
        description: series.description,
        genre: series.genre,
        planned_book_count: series.planned_book_count,
        status: series.status as SeriesStatusDb,
        shared_character_bible: (series.shared_character_bible ?? {}) as Json,
        shared_world_notes: series.shared_world_notes,
        updated_at: series.updated_at,
      }}
      books={(books ?? []).map((b) => ({
        id: b.id,
        title: b.title,
        subtitle: b.subtitle ?? null,
        status: b.status,
        word_count: b.word_count ?? 0,
        chapter_count: b.chapter_count ?? 0,
        cover_url: b.cover_url ?? null,
        series_order: b.series_order ?? null,
        reading_order_note: b.reading_order_note ?? null,
        series_summary_generated_at: b.series_summary_generated_at ?? null,
        series_plot_summary: b.series_plot_summary ?? null,
        series_end_state_dossier: b.series_end_state_dossier ?? null,
        updated_at: b.updated_at,
      }))}
      orphanBooks={(orphanBookRows ?? []).map((b) => ({
        id: b.id,
        title: b.title ?? "Untitled",
        subtitle: b.subtitle ?? null,
        cover_url: b.cover_url ?? null,
        status: b.status,
        word_count: b.word_count ?? 0,
      }))}
      codex={filteredCodex.map((c) => ({
        id: c.id,
        book_id: c.book_id,
        series_id: c.series_id,
        scope: c.scope as CodexEntryScopeDb,
        entry_type: c.entry_type as CodexEntryTypeDb,
        name: c.name,
        aliases: c.aliases ?? [],
        summary: c.summary,
        description_md: c.description_md,
        custom_fields: (c.custom_fields ?? {}) as Json,
        updated_at: c.updated_at,
      }))}
      overlays={filteredOverlays.map((o) => ({
        id: o.id,
        codex_entry_id: o.codex_entry_id,
        book_id: o.book_id,
        field_overrides: (o.field_overrides ?? {}) as Json,
        description_override: o.description_override,
        notes: o.notes,
      }))}
      progressions={filteredProgressions.map((p) => ({
        id: p.id,
        codex_entry_id: p.codex_entry_id,
        book_id: p.book_id,
        chapter_id: p.chapter_id,
        event_type: p.event_type,
        description: p.description,
        position_hint: p.position_hint,
        created_at: p.created_at,
      }))}
      arcs={(arcs ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        description_md: a.description_md,
        arc_type: (a.arc_type as SeriesArcTypeDb | null) ?? null,
        status: a.status as SeriesArcStatusDb,
        starts_book_id: a.starts_book_id,
        ends_book_id: a.ends_book_id,
        linked_codex_entry_ids: a.linked_codex_entry_ids ?? [],
      }))}
      beats={filteredBeats.map((b) => ({
        id: b.id,
        arc_id: b.arc_id,
        book_id: b.book_id,
        chapter_id: b.chapter_id,
        position: b.position ?? 0,
        beat_type: (b.beat_type as SeriesArcBeatTypeDb | null) ?? null,
        description: b.description,
        status: b.status as SeriesArcBeatStatusDb,
      }))}
      foreshadowPairs={(foreshadowPairs ?? []).map((p) => ({
        id: p.id,
        foreshadow_beat_id: p.foreshadow_beat_id,
        payoff_beat_id: p.payoff_beat_id,
        note: p.note,
        created_at: p.created_at,
      }))}
      chapters={(chapters ?? []).map((c) => ({
        id: c.id,
        book_id: c.book_id,
        chapter_number: c.chapter_number,
        title: c.title,
      }))}
      metadata={
        metaRow
          ? {
              kdp_series_name: metaRow.kdp_series_name ?? null,
              kdp_series_number_format: metaRow.kdp_series_number_format ?? "standard",
              amazon_series_asin: metaRow.amazon_series_asin ?? null,
              boxed_set_title: metaRow.boxed_set_title ?? null,
              boxed_set_description: metaRow.boxed_set_description ?? null,
              cross_promo_copy_md: metaRow.cross_promo_copy_md ?? null,
              also_by_author_list_md: metaRow.also_by_author_list_md ?? null,
              reading_order_copy_md: metaRow.reading_order_copy_md ?? null,
              boxed_set_dedication_md: metaRow.boxed_set_dedication_md ?? null,
              boxed_set_author_note_md: metaRow.boxed_set_author_note_md ?? null,
              newsletter_signup_copy_md: metaRow.newsletter_signup_copy_md ?? null,
              boxed_set_included_book_ids: metaRow.boxed_set_included_book_ids ?? null,
              audiobook_bundle_metadata: (metaRow.audiobook_bundle_metadata ?? {}) as Json,
            }
          : null
      }
    />
  );
}
