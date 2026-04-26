"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/utils/errors";
import type {
  Database,
  SeriesArcBeatStatusDb,
  SeriesArcBeatTypeDb,
  SeriesArcStatusDb,
  SeriesArcTypeDb,
} from "@/types/database.types";

import { validateArcBookSpan } from "./_lib/validate-arc-span";

type ArcUpdate = Database["public"]["Tables"]["series_arcs"]["Update"];
type BeatUpdate = Database["public"]["Tables"]["series_arc_beats"]["Update"];

const ARC_TYPES: readonly SeriesArcTypeDb[] = [
  "character",
  "plot",
  "thematic",
  "romance",
  "mystery",
  "world",
  "custom",
] as const;

const ARC_STATUSES: readonly SeriesArcStatusDb[] = [
  "setup",
  "developing",
  "climax",
  "resolved",
  "abandoned",
] as const;

const BEAT_TYPES: readonly SeriesArcBeatTypeDb[] = [
  "setup",
  "foreshadow",
  "development",
  "complication",
  "payoff",
  "resolution",
] as const;

const BEAT_STATUSES: readonly SeriesArcBeatStatusDb[] = [
  "planned",
  "drafted",
  "complete",
] as const;

/* -------------------------------------------------------------------------- */
/*  Schemas                                                                    */
/* -------------------------------------------------------------------------- */

const arcInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  description_md: z.string().trim().max(20_000).nullable().optional(),
  arc_type: z.enum(ARC_TYPES as unknown as [SeriesArcTypeDb, ...SeriesArcTypeDb[]]).nullable().optional(),
  status: z.enum(ARC_STATUSES as unknown as [SeriesArcStatusDb, ...SeriesArcStatusDb[]]).default("setup"),
  starts_book_id: z.string().uuid().nullable().optional(),
  ends_book_id: z.string().uuid().nullable().optional(),
  linked_codex_entry_ids: z.array(z.string().uuid()).max(50).default([]),
});

export type ArcInput = z.infer<typeof arcInputSchema>;

const beatInputSchema = z.object({
  arc_id: z.string().uuid(),
  book_id: z.string().uuid().nullable().optional(),
  chapter_id: z.string().uuid().nullable().optional(),
  position: z.number().int().min(0).max(10_000).default(0),
  beat_type: z.enum(BEAT_TYPES as unknown as [SeriesArcBeatTypeDb, ...SeriesArcBeatTypeDb[]]).nullable().optional(),
  description: z.string().trim().min(1).max(2_000),
  status: z.enum(BEAT_STATUSES as unknown as [SeriesArcBeatStatusDb, ...SeriesArcBeatStatusDb[]]).default("planned"),
});

export type BeatInput = z.infer<typeof beatInputSchema>;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

async function ensureSeriesOwned(seriesId: string): Promise<
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; userId: string }
  | { ok: false; error: string }
> {
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: "Not signed in." };
  const { data } = await supabase
    .from("series")
    .select("id")
    .eq("id", seriesId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return { ok: false, error: "Series not found." };
  return { ok: true, supabase, userId: user.id };
}

async function resolveSeriesIdForArc(
  supabase: Awaited<ReturnType<typeof createClient>>,
  arcId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("series_arcs")
    .select("series_id")
    .eq("id", arcId)
    .maybeSingle();
  return data?.series_id ?? null;
}

function revalSeries(seriesId: string | null): void {
  revalidatePath("/dashboard");
  if (seriesId) revalidatePath(`/dashboard/series/${seriesId}`);
}

/* -------------------------------------------------------------------------- */
/*  Arc CRUD                                                                   */
/* -------------------------------------------------------------------------- */

export async function createArcAction(
  seriesId: string,
  input: ArcInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = arcInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const owner = await ensureSeriesOwned(seriesId);
  if (!owner.ok) return owner;

  const { data, error } = await owner.supabase
    .from("series_arcs")
    .insert({
      series_id: seriesId,
      name: parsed.data.name,
      description_md: parsed.data.description_md ?? null,
      arc_type: parsed.data.arc_type ?? null,
      status: parsed.data.status,
      starts_book_id: parsed.data.starts_book_id ?? null,
      ends_book_id: parsed.data.ends_book_id ?? null,
      linked_codex_entry_ids: parsed.data.linked_codex_entry_ids,
    })
    .select("id")
    .single();
  if (error || !data) {
    logServerError("createArc", error);
    return { ok: false, error: "Could not create arc." };
  }
  revalSeries(seriesId);
  return { ok: true, id: data.id };
}

export async function updateArcAction(
  arcId: string,
  patch: Partial<ArcInput>,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: "Not signed in." };

  const seriesId = await resolveSeriesIdForArc(supabase, arcId);
  if (!seriesId) return { ok: false, error: "Arc not found." };
  const owner = await ensureSeriesOwned(seriesId);
  if (!owner.ok) return owner;

  const update: ArcUpdate = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) update.name = patch.name.trim() || "Untitled arc";
  if (patch.description_md !== undefined) update.description_md = patch.description_md;
  if (patch.arc_type !== undefined) update.arc_type = patch.arc_type;
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.starts_book_id !== undefined) update.starts_book_id = patch.starts_book_id;
  if (patch.ends_book_id !== undefined) update.ends_book_id = patch.ends_book_id;
  if (patch.linked_codex_entry_ids !== undefined)
    update.linked_codex_entry_ids = patch.linked_codex_entry_ids;

  /* Prompt 16 § 397-406 (edge case #6): if the arc is being narrowed
   * so start_book_id == end_book_id, make sure no beats live outside
   * that single book. We only need to fetch the *other* endpoint if
   * the patch is partial. */
  if (patch.starts_book_id !== undefined || patch.ends_book_id !== undefined) {
    const { data: arcRow } = await supabase
      .from("series_arcs")
      .select("starts_book_id, ends_book_id")
      .eq("id", arcId)
      .maybeSingle();
    const finalStarts =
      patch.starts_book_id !== undefined
        ? patch.starts_book_id ?? null
        : arcRow?.starts_book_id ?? null;
    const finalEnds =
      patch.ends_book_id !== undefined
        ? patch.ends_book_id ?? null
        : arcRow?.ends_book_id ?? null;
    const span = await validateArcBookSpan(
      supabase,
      arcId,
      finalStarts,
      finalEnds,
    );
    if (!span.ok) return span;
  }

  const { error } = await supabase
    .from("series_arcs")
    .update(update)
    .eq("id", arcId);
  if (error) {
    logServerError("updateArc", error);
    return { ok: false, error: "Could not update arc." };
  }
  revalSeries(seriesId);
  return { ok: true };
}

export async function deleteArcAction(
  arcId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: "Not signed in." };

  const seriesId = await resolveSeriesIdForArc(supabase, arcId);
  if (!seriesId) return { ok: false, error: "Arc not found." };
  const owner = await ensureSeriesOwned(seriesId);
  if (!owner.ok) return owner;

  const { error } = await supabase
    .from("series_arcs")
    .delete()
    .eq("id", arcId);
  if (error) {
    logServerError("deleteArc", error);
    return { ok: false, error: "Could not delete arc." };
  }
  revalSeries(seriesId);
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/*  Beat CRUD                                                                  */
/* -------------------------------------------------------------------------- */

export async function createBeatAction(
  input: BeatInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = beatInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: "Not signed in." };

  const seriesId = await resolveSeriesIdForArc(supabase, parsed.data.arc_id);
  if (!seriesId) return { ok: false, error: "Arc not found." };
  const owner = await ensureSeriesOwned(seriesId);
  if (!owner.ok) return owner;

  // Compute next position if none specified (append).
  let pos = parsed.data.position;
  if (pos === 0) {
    const { data: lastRow } = await supabase
      .from("series_arc_beats")
      .select("position")
      .eq("arc_id", parsed.data.arc_id)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    pos = (lastRow?.position ?? 0) + 1;
  }

  /* Prompt 16 § 397-406 (edge case #6): if the parent arc is pinned to
   * a single book (starts==ends) and this beat is being placed in a
   * different book, reject the insert. */
  if (parsed.data.book_id) {
    const { data: arcRow } = await supabase
      .from("series_arcs")
      .select("starts_book_id, ends_book_id")
      .eq("id", parsed.data.arc_id)
      .maybeSingle();
    const span = await validateArcBookSpan(
      supabase,
      parsed.data.arc_id,
      arcRow?.starts_book_id ?? null,
      arcRow?.ends_book_id ?? null,
      { beatId: null, newBookId: parsed.data.book_id },
    );
    if (!span.ok) return span;
  }

  const { data, error } = await supabase
    .from("series_arc_beats")
    .insert({
      arc_id: parsed.data.arc_id,
      book_id: parsed.data.book_id ?? null,
      chapter_id: parsed.data.chapter_id ?? null,
      position: pos,
      beat_type: parsed.data.beat_type ?? null,
      description: parsed.data.description,
      status: parsed.data.status,
    })
    .select("id")
    .single();
  if (error || !data) {
    logServerError("createBeat", error);
    return { ok: false, error: "Could not create beat." };
  }
  revalSeries(seriesId);
  return { ok: true, id: data.id };
}

export async function updateBeatAction(
  beatId: string,
  patch: Partial<Omit<BeatInput, "arc_id">>,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: beat } = await supabase
    .from("series_arc_beats")
    .select("id, arc_id")
    .eq("id", beatId)
    .maybeSingle();
  if (!beat) return { ok: false, error: "Beat not found." };

  const seriesId = await resolveSeriesIdForArc(supabase, beat.arc_id);
  if (!seriesId) return { ok: false, error: "Arc not found." };
  const owner = await ensureSeriesOwned(seriesId);
  if (!owner.ok) return owner;

  const update: BeatUpdate = { updated_at: new Date().toISOString() };
  if (patch.book_id !== undefined) update.book_id = patch.book_id;
  if (patch.chapter_id !== undefined) update.chapter_id = patch.chapter_id;
  if (patch.position !== undefined) update.position = patch.position;
  if (patch.beat_type !== undefined) update.beat_type = patch.beat_type;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.status !== undefined) update.status = patch.status;

  /* Prompt 16 § 397-406 (edge case #6): moving a beat to a different
   * book must not violate the arc's single-book pin. Only run the
   * check when book_id is actually changing. */
  if (patch.book_id !== undefined) {
    const { data: arcRow } = await supabase
      .from("series_arcs")
      .select("starts_book_id, ends_book_id")
      .eq("id", beat.arc_id)
      .maybeSingle();
    const span = await validateArcBookSpan(
      supabase,
      beat.arc_id,
      arcRow?.starts_book_id ?? null,
      arcRow?.ends_book_id ?? null,
      { beatId, newBookId: patch.book_id ?? null },
    );
    if (!span.ok) return span;
  }

  const { error } = await supabase
    .from("series_arc_beats")
    .update(update)
    .eq("id", beatId);
  if (error) {
    logServerError("updateBeat", error);
    return { ok: false, error: "Could not update beat." };
  }
  revalSeries(seriesId);
  return { ok: true };
}

export async function deleteBeatAction(
  beatId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: beat } = await supabase
    .from("series_arc_beats")
    .select("id, arc_id")
    .eq("id", beatId)
    .maybeSingle();
  if (!beat) return { ok: false, error: "Beat not found." };

  const seriesId = await resolveSeriesIdForArc(supabase, beat.arc_id);
  const { error } = await supabase
    .from("series_arc_beats")
    .delete()
    .eq("id", beatId);
  if (error) {
    logServerError("deleteBeat", error);
    return { ok: false, error: "Could not delete beat." };
  }
  revalSeries(seriesId);
  return { ok: true };
}

/**
 * Reorder beats within a single arc by providing their ordered IDs.
 * Positions are rewritten as 1..N to match the new order.
 */
export async function reorderBeatsAction(
  arcId: string,
  orderedBeatIds: string[],
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: "Not signed in." };

  const seriesId = await resolveSeriesIdForArc(supabase, arcId);
  if (!seriesId) return { ok: false, error: "Arc not found." };
  const owner = await ensureSeriesOwned(seriesId);
  if (!owner.ok) return owner;

  let position = 1;
  for (const id of orderedBeatIds) {
    const { error } = await supabase
      .from("series_arc_beats")
      .update({ position, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("arc_id", arcId);
    if (error) {
      logServerError("reorderBeats", error);
      return { ok: false, error: "Could not save order." };
    }
    position += 1;
  }
  revalSeries(seriesId);
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/*  Foreshadowing pairs                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Shared ownership check for a beat. Verifies the beat belongs to an arc
 * in a series owned by the current user. Returns the series id on
 * success so callers can revalidate the right path.
 */
async function ensureBeatOwned(
  supabase: Awaited<ReturnType<typeof createClient>>,
  beatId: string,
  userId: string,
): Promise<
  | { ok: true; seriesId: string; arcId: string; bookId: string | null }
  | { ok: false; error: string }
> {
  const { data } = await supabase
    .from("series_arc_beats")
    .select("id, arc_id, book_id, series_arcs!inner(series_id, series!inner(user_id))")
    .eq("id", beatId)
    .maybeSingle();
  if (!data) return { ok: false, error: "Beat not found." };
  // Type-level note: the joined `series_arcs!inner(series!inner(user_id))`
  // collapses to a nested object in the PostgREST response. We hit it
  // with an `any` cast — the RLS policy already enforces ownership on
  // read, but we still double-check the user id here so the action is
  // safe to call from anywhere without re-auditing RLS.
  const row = data as unknown as {
    arc_id: string;
    book_id: string | null;
    series_arcs: { series_id: string; series: { user_id: string } };
  };
  if (row.series_arcs.series.user_id !== userId) {
    return { ok: false, error: "Not authorized." };
  }
  return {
    ok: true,
    seriesId: row.series_arcs.series_id,
    arcId: row.arc_id,
    bookId: row.book_id,
  };
}

/**
 * Link a foreshadow beat to a specific payoff beat. The spec allows the
 * payoff to be in a different arc — writers sometimes seed a hint in
 * one thread that pays off in another. We still validate that both
 * beats belong to arcs in the *same* series so the link can't cross
 * projects.
 *
 * Enforces one-link-per-foreshadow via UPSERT on the unique constraint.
 */
export async function linkForeshadowingPair(
  foreshadowBeatId: string,
  payoffBeatId: string,
  note?: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: "Not signed in." };

  const f = await ensureBeatOwned(supabase, foreshadowBeatId, user.id);
  if (!f.ok) return f;
  const p = await ensureBeatOwned(supabase, payoffBeatId, user.id);
  if (!p.ok) return p;
  if (f.seriesId !== p.seriesId) {
    return { ok: false, error: "Beats must be in the same series." };
  }
  if (foreshadowBeatId === payoffBeatId) {
    return { ok: false, error: "A beat can't pay off itself." };
  }

  const trimmedNote = note?.trim() || null;

  // UPSERT: if the foreshadow already has a link, replace it rather
  // than erroring. The unique constraint is on foreshadow_beat_id so
  // this collapses the common "oops wrong payoff" retry into a single
  // user gesture.
  const { data, error } = await supabase
    .from("series_foreshadowing_pairs")
    .upsert(
      {
        foreshadow_beat_id: foreshadowBeatId,
        payoff_beat_id: payoffBeatId,
        note: trimmedNote,
      },
      { onConflict: "foreshadow_beat_id" },
    )
    .select("id")
    .single();
  if (error || !data) {
    logServerError("linkForeshadowingPair", error);
    return { ok: false, error: "Could not link beats." };
  }
  revalSeries(f.seriesId);
  return { ok: true, id: data.id };
}

export async function unlinkForeshadowingPair(
  pairId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: "Not signed in." };

  // Resolve the parent series via the foreshadow beat so we can
  // revalidate afterwards. RLS ensures we only see our own pairs.
  const { data: pair } = await supabase
    .from("series_foreshadowing_pairs")
    .select("foreshadow_beat_id")
    .eq("id", pairId)
    .maybeSingle();
  let seriesId: string | null = null;
  if (pair?.foreshadow_beat_id) {
    const owner = await ensureBeatOwned(supabase, pair.foreshadow_beat_id, user.id);
    if (owner.ok) seriesId = owner.seriesId;
  }

  const { error } = await supabase
    .from("series_foreshadowing_pairs")
    .delete()
    .eq("id", pairId);
  if (error) {
    logServerError("unlinkForeshadowingPair", error);
    return { ok: false, error: "Could not unlink beats." };
  }
  if (seriesId) revalSeries(seriesId);
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/*  Foreshadowing report                                                       */
/* -------------------------------------------------------------------------- */

export type ForeshadowReportItem = {
  foreshadowBeatId: string;
  arcId: string;
  arcName: string;
  foreshadowBookId: string | null;
  description: string;
  payoffBeatId: string | null;
  payoffArcId: string | null;
  payoffArcName: string | null;
  payoffBookId: string | null;
  payoffDescription: string | null;
  matched: boolean;
  /** Which mechanism matched this pair (or why it didn't). */
  matchSource: "explicit" | "heuristic" | "unmatched";
  /** Explicit pair row id, when matchSource === 'explicit'. */
  pairId: string | null;
  /** Optional author note from the pair row. */
  pairNote: string | null;
};

export type UnmatchedPayoffItem = {
  payoffBeatId: string;
  arcId: string;
  arcName: string;
  bookId: string | null;
  description: string;
};

export type ForeshadowReport = {
  items: ForeshadowReportItem[];
  unmatchedPayoffs: UnmatchedPayoffItem[];
};

/**
 * Returns every foreshadow beat in the series paired with either an
 * explicit payoff (via series_foreshadowing_pairs) or, failing that,
 * the first later payoff beat in the same arc by (book.series_order,
 * beat.position) ascending.
 *
 * Also surfaces any payoff beats that no foreshadow points at — those
 * are the "unearned twists" the audit flags yellow so authors can
 * decide whether to plant a seed for them.
 */
export async function getForeshadowingReport(
  seriesId: string,
): Promise<{ ok: true; report: ForeshadowReport } | { ok: false; error: string }> {
  const owner = await ensureSeriesOwned(seriesId);
  if (!owner.ok) return owner;

  const { data: arcs } = await owner.supabase
    .from("series_arcs")
    .select("id, name")
    .eq("series_id", seriesId);
  if (!arcs?.length) {
    return { ok: true, report: { items: [], unmatchedPayoffs: [] } };
  }

  const arcIds = arcs.map((a) => a.id);
  const { data: beats } = await owner.supabase
    .from("series_arc_beats")
    .select("id, arc_id, book_id, position, beat_type, description")
    .in("arc_id", arcIds)
    .in("beat_type", ["foreshadow", "payoff"]);

  if (!beats?.length) {
    return { ok: true, report: { items: [], unmatchedPayoffs: [] } };
  }

  // Load explicit pairs so they win over the heuristic match. RLS only
  // returns pairs whose foreshadow beat belongs to this user's series,
  // but we still filter to this series' beat ids to be safe.
  const beatIdSet = new Set(beats.map((b) => b.id));
  const { data: pairs } = await owner.supabase
    .from("series_foreshadowing_pairs")
    .select("id, foreshadow_beat_id, payoff_beat_id, note")
    .in("foreshadow_beat_id", Array.from(beatIdSet));
  const explicitByForeshadow = new Map<string, { id: string; payoff_beat_id: string | null; note: string | null }>();
  for (const p of pairs ?? []) {
    explicitByForeshadow.set(p.foreshadow_beat_id, {
      id: p.id,
      payoff_beat_id: p.payoff_beat_id,
      note: p.note,
    });
  }

  const bookIds = Array.from(
    new Set(beats.map((b) => b.book_id).filter((v): v is string => !!v)),
  );
  const orderByBook = new Map<string, number>();
  if (bookIds.length > 0) {
    const { data: books } = await owner.supabase
      .from("books")
      .select("id, series_order")
      .in("id", bookIds);
    for (const b of books ?? []) {
      orderByBook.set(b.id, b.series_order ?? Number.POSITIVE_INFINITY);
    }
  }

  const arcNameById = new Map(arcs.map((a) => [a.id, a.name] as const));
  const beatById = new Map(beats.map((b) => [b.id, b] as const));

  // Partition beats by arc for the heuristic fallback path.
  const byArc = new Map<string, typeof beats>();
  for (const b of beats) {
    if (!byArc.has(b.arc_id)) byArc.set(b.arc_id, [] as typeof beats);
    byArc.get(b.arc_id)!.push(b);
  }

  const items: ForeshadowReportItem[] = [];
  const usedPayoffIds = new Set<string>();

  for (const [arcId, arcBeats] of Array.from(byArc.entries())) {
    const sorted = [...arcBeats].sort((a, b) => {
      const ao = a.book_id ? orderByBook.get(a.book_id) ?? Number.POSITIVE_INFINITY : Number.POSITIVE_INFINITY;
      const bo = b.book_id ? orderByBook.get(b.book_id) ?? Number.POSITIVE_INFINITY : Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao - bo;
      return a.position - b.position;
    });
    const payoffs = sorted.filter((b) => b.beat_type === "payoff");
    const foreshadows = sorted.filter((b) => b.beat_type === "foreshadow");

    for (const f of foreshadows) {
      const explicit = explicitByForeshadow.get(f.id);

      // 1. Explicit pair wins — even if the payoff is in another arc.
      if (explicit?.payoff_beat_id) {
        const payoffBeat = beatById.get(explicit.payoff_beat_id);
        if (payoffBeat) {
          usedPayoffIds.add(payoffBeat.id);
          items.push({
            foreshadowBeatId: f.id,
            arcId,
            arcName: arcNameById.get(arcId) ?? "Untitled",
            foreshadowBookId: f.book_id,
            description: f.description,
            payoffBeatId: payoffBeat.id,
            payoffArcId: payoffBeat.arc_id,
            payoffArcName: arcNameById.get(payoffBeat.arc_id) ?? "Untitled",
            payoffBookId: payoffBeat.book_id,
            payoffDescription: payoffBeat.description,
            matched: true,
            matchSource: "explicit",
            pairId: explicit.id,
            pairNote: explicit.note,
          });
          continue;
        }
        // Explicit link with a missing payoff (foreign key SET NULL
        // already nulled the row). Treat like an unmatched foreshadow.
      }

      // 2. Heuristic: first later unused payoff in the SAME arc.
      const payoff = payoffs.find((p) => {
        if (usedPayoffIds.has(p.id)) return false;
        const fo = f.book_id ? orderByBook.get(f.book_id) ?? Number.POSITIVE_INFINITY : Number.POSITIVE_INFINITY;
        const po = p.book_id ? orderByBook.get(p.book_id) ?? Number.POSITIVE_INFINITY : Number.POSITIVE_INFINITY;
        if (po > fo) return true;
        if (po === fo && p.position > f.position) return true;
        return false;
      });
      if (payoff) usedPayoffIds.add(payoff.id);

      items.push({
        foreshadowBeatId: f.id,
        arcId,
        arcName: arcNameById.get(arcId) ?? "Untitled",
        foreshadowBookId: f.book_id,
        description: f.description,
        payoffBeatId: payoff?.id ?? null,
        payoffArcId: payoff?.arc_id ?? null,
        payoffArcName: payoff ? arcNameById.get(payoff.arc_id) ?? "Untitled" : null,
        payoffBookId: payoff?.book_id ?? null,
        payoffDescription: payoff?.description ?? null,
        matched: !!payoff,
        matchSource: payoff ? "heuristic" : "unmatched",
        pairId: null,
        pairNote: null,
      });
    }
  }

  // Payoff beats that no foreshadow points at, explicitly or heuristically.
  const allPayoffs = beats.filter((b) => b.beat_type === "payoff");
  const unmatchedPayoffs: UnmatchedPayoffItem[] = allPayoffs
    .filter((p) => !usedPayoffIds.has(p.id))
    .map((p) => ({
      payoffBeatId: p.id,
      arcId: p.arc_id,
      arcName: arcNameById.get(p.arc_id) ?? "Untitled",
      bookId: p.book_id,
      description: p.description,
    }));

  return { ok: true, report: { items, unmatchedPayoffs } };
}
