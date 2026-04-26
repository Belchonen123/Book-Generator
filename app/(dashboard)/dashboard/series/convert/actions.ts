"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { buildPreviouslyInSeriesText } from "@/lib/series/previously";
import { mergeCharacterBibleIntoSeries } from "@/lib/series/merge-bibles";
import { summarizeBookForSeries } from "@/lib/series/summarize";
import { ensureProfileRowForUser } from "@/lib/supabase/ensure-profile-row";
import { createClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/utils/analytics";
import { logServerError } from "@/lib/utils/errors";
import type {
  CodexEntryTypeDb,
  Json,
} from "@/types/database.types";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import {
  diffForGroup,
  normalizeName,
  type ConversionCodexInstance,
} from "./_lib/codex-diff";

export type { ConversionCodexInstance };

/* -------------------------------------------------------------------------- */
/*  Convert-standalone-books-to-a-series wizard (Prompt 16 § 348-359).        */
/*                                                                            */
/*  Two entry points:                                                         */
/*    1. previewSeriesConversionAction(bookIds)  — runs a codex-diff so the   */
/*       UI can show the user which entries look like the same canonical      */
/*       character across multiple books and let them pick a merge policy.   */
/*    2. executeSeriesConversionAction(input)   — the "Confirm" step. Creates */
/*       the series, links the chosen books in the chosen order, applies     */
/*       every merge decision, and kicks off prior-book summarization in     */
/*       the background.                                                      */
/*                                                                            */
/*  Everything is best-effort transactional: we validate upfront, then run    */
/*  writes sequentially and abort on the first hard error. Callers get a     */
/*  discriminated `{ ok: true, seriesId } | { ok: false, error }` payload.   */
/* -------------------------------------------------------------------------- */

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

async function requirePro(
  supabase: SupabaseServer,
  user: User,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let { data: profile, error } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .maybeSingle();
  if (error) return { ok: false, error: "Could not load profile." };
  if (!profile) {
    const ensured = await ensureProfileRowForUser(supabase, user);
    if (!ensured.ok) {
      return {
        ok: false,
        error: `Could not load profile.${ensured.code ? ` (code ${ensured.code})` : ""}${ensured.hint ? ` ${ensured.hint}` : ""}`,
      };
    }
    profile = { subscription_tier: "free" as const };
  }
  if (profile.subscription_tier !== "pro") {
    return { ok: false, error: "Series is a Pro feature." };
  }
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/*  Preview — codex-diff                                                       */
/* -------------------------------------------------------------------------- */

const previewInputSchema = z
  .array(z.string().uuid())
  .min(2, "Select at least two books to convert.")
  .max(25, "Too many books in a single conversion.");

export type ConversionCodexGroup = {
  /** Deterministic key = normalized-name + entry-type (both used for matching). */
  groupKey: string;
  displayName: string;
  entryType: CodexEntryTypeDb;
  instances: ConversionCodexInstance[];
  /** Which fields actually diverge — helps the UI highlight real conflicts. */
  diffs: {
    summary: boolean;
    description_md: boolean;
    aliases: boolean;
    customFields: boolean;
  };
};

export type ConversionPreviewBook = {
  id: string;
  title: string;
  subtitle: string | null;
  cover_url: string | null;
  status: string;
  word_count: number;
  chapterCount: number;
  codexCount: number;
};

export type ConversionPreview = {
  books: ConversionPreviewBook[];
  /** Entries that appear in ≥2 books with matching name+type. */
  mergeGroups: ConversionCodexGroup[];
  /**
   * Total number of codex entries across the selected books (including
   * ones that would merge). The confirm step uses this for the summary
   * copy ("12 of 38 entries will merge").
   */
  totalCodexEntries: number;
};

export async function previewSeriesConversionAction(
  bookIds: string[],
): Promise<{ ok: true; preview: ConversionPreview } | { ok: false; error: string }> {
  const parsed = previewInputSchema.safeParse(bookIds);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid selection." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const pro = await requirePro(supabase, user);
  if (!pro.ok) return pro;

  /* Books must all belong to the caller AND be standalone (not already in
   * a series). This prevents accidental cross-series merges — if the user
   * wants to reshape an existing series, that's a separate flow. */
  const { data: books, error: booksErr } = await supabase
    .from("books")
    .select(
      "id, title, subtitle, cover_url, status, word_count, series_id",
    )
    .in("id", parsed.data)
    .eq("user_id", user.id);
  if (booksErr) {
    logServerError("previewSeriesConversion.books", booksErr);
    const rawMsg = (booksErr as { message?: string } | null)?.message ?? "";
    return {
      ok: false,
      error: rawMsg ? `Could not load books: ${rawMsg}` : "Could not load books.",
    };
  }
  if (!books || books.length !== parsed.data.length) {
    return { ok: false, error: "One or more selected books were not found." };
  }
  const alreadyInSeries = books.filter((b) => b.series_id);
  if (alreadyInSeries.length > 0) {
    return {
      ok: false,
      error: `"${alreadyInSeries[0]!.title}" is already part of a series. Remove it from that series first.`,
    };
  }

  const bookIdList = books.map((b) => b.id);
  const titleById = new Map(books.map((b) => [b.id, b.title ?? "Untitled"]));

  /* Codex entries for exactly these books. We match on book_id (scope
   * 'project'); series-scope is excluded because we filtered to standalone
   * books above so there shouldn't be any. */
  const { data: codex, error: codexErr } = await supabase
    .from("codex_entries")
    .select(
      "id, book_id, name, entry_type, aliases, summary, description_md, custom_fields",
    )
    .eq("user_id", user.id)
    .in("book_id", bookIdList);
  if (codexErr) {
    logServerError("previewSeriesConversion.codex", codexErr);
    const pgCode = (codexErr as { code?: string } | null)?.code ?? "";
    const rawMsg = (codexErr as { message?: string } | null)?.message ?? "";
    // Missing relation => migration 030 (codex_entries table) hasn't been run.
    if (pgCode === "42P01" || /relation .* does not exist/i.test(rawMsg)) {
      return {
        ok: false,
        error:
          "The codex_entries table doesn't exist in your database. Run the latest Supabase migrations (codex was introduced by migration 030).",
      };
    }
    if (pgCode === "42501" || /row-level security/i.test(rawMsg)) {
      return {
        ok: false,
        error:
          "Your account isn't authorized to read codex entries (RLS). Try signing out and back in.",
      };
    }
    return {
      ok: false,
      error: rawMsg
        ? `Could not load codex entries: ${rawMsg}`
        : "Could not load codex entries.",
    };
  }

  const { data: chapterCounts } = await supabase
    .from("chapters")
    .select("book_id")
    .in("book_id", bookIdList);

  const chapterCountBy = new Map<string, number>();
  for (const row of chapterCounts ?? []) {
    const id = row.book_id as string;
    chapterCountBy.set(id, (chapterCountBy.get(id) ?? 0) + 1);
  }
  const codexCountBy = new Map<string, number>();
  for (const row of codex ?? []) {
    const id = row.book_id as string;
    codexCountBy.set(id, (codexCountBy.get(id) ?? 0) + 1);
  }

  const previewBooks: ConversionPreviewBook[] = books.map((b) => ({
    id: b.id,
    title: b.title ?? "Untitled",
    subtitle: b.subtitle ?? null,
    cover_url: b.cover_url ?? null,
    status: b.status,
    word_count: b.word_count ?? 0,
    chapterCount: chapterCountBy.get(b.id) ?? 0,
    codexCount: codexCountBy.get(b.id) ?? 0,
  }));

  /* Group by normalized-name + entry-type. We ignore groups that only
   * appear in a single book — nothing to merge there. */
  const buckets = new Map<string, ConversionCodexInstance[]>();
  for (const row of codex ?? []) {
    const entryType = (row.entry_type ?? "character") as CodexEntryTypeDb;
    const displayName = (row.name ?? "").trim();
    if (!displayName) continue;
    const key = `${entryType}::${normalizeName(displayName)}`;
    const inst: ConversionCodexInstance = {
      entryId: row.id,
      bookId: row.book_id as string,
      bookTitle: titleById.get(row.book_id as string) ?? "Untitled",
      summary: (row.summary ?? null) as string | null,
      description_md: (row.description_md ?? null) as string | null,
      aliases: Array.isArray(row.aliases) ? (row.aliases as string[]) : [],
      entryType,
      custom_fields: (row.custom_fields ?? {}) as Record<string, unknown>,
    };
    const bucket = buckets.get(key);
    if (bucket) bucket.push(inst);
    else buckets.set(key, [inst]);
  }

  // Keep the original (non-normalized) display name so the UI shows the
  // casing the author actually used. We look it up on the raw codex row
  // since `ConversionCodexInstance` only keeps normalized metadata.
  const rawNameById = new Map<string, string>();
  for (const row of codex ?? []) {
    rawNameById.set(row.id, ((row.name ?? "") as string).trim());
  }

  const mergeGroups: ConversionCodexGroup[] = [];
  for (const [key, instances] of Array.from(buckets.entries())) {
    if (instances.length < 2) continue;
    const sortedInstances = instances
      .slice()
      .sort((a, b) => a.bookTitle.localeCompare(b.bookTitle));
    const displayName =
      rawNameById.get(sortedInstances[0]!.entryId) ?? sortedInstances[0]!.bookTitle;
    mergeGroups.push({
      groupKey: key,
      displayName,
      entryType: sortedInstances[0]!.entryType,
      instances: sortedInstances,
      diffs: diffForGroup(sortedInstances),
    });
  }
  mergeGroups.sort((a, b) => a.displayName.localeCompare(b.displayName));

  return {
    ok: true,
    preview: {
      books: previewBooks,
      mergeGroups,
      totalCodexEntries: codex?.length ?? 0,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Execute — create series + apply merges + kick off summarization           */
/* -------------------------------------------------------------------------- */

const mergeDecisionSchema = z.object({
  groupKey: z.string().min(1),
  /** 'merge' unifies to a canonical entry + overlays; 'keep' leaves entries per-book. */
  action: z.enum(["merge", "keep"]).default("merge"),
  /** Required when action === 'merge'. Ignored otherwise. */
  canonicalEntryId: z.string().uuid().nullable().optional(),
});

const executeInputSchema = z.object({
  seriesName: z.string().trim().min(1, "Series name is required.").max(200),
  seriesDescription: z.string().trim().max(4000).nullable().optional(),
  /** Ordered list — index 0 becomes series_order = 1. */
  bookIds: z.array(z.string().uuid()).min(2).max(25),
  mergeDecisions: z.array(mergeDecisionSchema).default([]),
});

export type ExecuteConversionInput = z.infer<typeof executeInputSchema>;

export type ExecuteConversionResult =
  | {
      ok: true;
      seriesId: string;
      summary: {
        booksLinked: number;
        entriesMerged: number;
        overlaysCreated: number;
        progressionsRepointed: number;
      };
    }
  | { ok: false; error: string };

/**
 * Apply one "merge" decision for a group: promote the canonical entry to
 * series scope, create per-book overlays for entries that diverge, repoint
 * any `codex_progressions` rows from the secondaries onto the canonical,
 * and delete the now-redundant secondaries.
 *
 * Returns a tally so the caller can report to the user.
 */
async function applyMergeDecision(
  supabase: SupabaseClient,
  params: {
    seriesId: string;
    userId: string;
    group: ConversionCodexGroup;
    canonicalEntryId: string;
  },
): Promise<{
  ok: true;
  overlays: number;
  repointed: number;
  merged: number;
} | { ok: false; error: string }> {
  const { seriesId, userId, group, canonicalEntryId } = params;
  const canonical = group.instances.find((i) => i.entryId === canonicalEntryId);
  if (!canonical) {
    return { ok: false, error: `Canonical entry missing for "${group.displayName}".` };
  }

  // Promote the canonical to series scope. We deliberately clear `book_id`
  // because the CHECK constraint requires series-scoped rows to have a
  // series_id and null book_id (see 030 migration).
  {
    const { error } = await supabase
      .from("codex_entries")
      .update({
        scope: "series",
        series_id: seriesId,
        book_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", canonicalEntryId)
      .eq("user_id", userId);
    if (error) {
      logServerError("convertSeries.promote-canonical", error);
      return { ok: false, error: `Could not promote "${group.displayName}".` };
    }
  }

  const secondaries = group.instances.filter((i) => i.entryId !== canonicalEntryId);
  let overlays = 0;
  let repointed = 0;

  for (const sec of secondaries) {
    /* Decide whether this book version *differs* from canonical enough
     * to warrant an overlay. We compare the raw field values; missing
     * fields are treated as empty so a sparse secondary doesn't produce
     * a noisy overlay. */
    const differsDescription =
      (sec.description_md ?? "").trim() !==
      (canonical.description_md ?? "").trim();
    const differsSummary =
      (sec.summary ?? "").trim() !== (canonical.summary ?? "").trim();
    const canonicalAliases = JSON.stringify([...canonical.aliases].sort());
    const secAliases = JSON.stringify([...sec.aliases].sort());
    const differsAliases = canonicalAliases !== secAliases;
    const differsCustom =
      JSON.stringify(sec.custom_fields ?? {}) !==
      JSON.stringify(canonical.custom_fields ?? {});

    if (differsDescription || differsSummary || differsAliases || differsCustom) {
      const fieldOverrides: Record<string, unknown> = {};
      if (differsSummary) fieldOverrides.summary = sec.summary;
      if (differsAliases) fieldOverrides.aliases = sec.aliases;
      if (differsCustom) fieldOverrides.custom_fields = sec.custom_fields;
      const { error: ovErr } = await supabase
        .from("codex_entry_overlays")
        .upsert(
          {
            codex_entry_id: canonicalEntryId,
            book_id: sec.bookId,
            field_overrides: fieldOverrides as Json,
            description_override: differsDescription
              ? sec.description_md ?? null
              : null,
            notes: "Auto-created during series conversion.",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "codex_entry_id,book_id" },
        );
      if (ovErr) {
        logServerError("convertSeries.overlay", ovErr);
        return {
          ok: false,
          error: `Could not create overlay for "${group.displayName}" in "${sec.bookTitle}".`,
        };
      }
      overlays += 1;
    }

    /* Re-point any progressions the secondary had so the canonical
     * becomes the single source of truth for this character's arc. */
    const { data: progs, error: progErr } = await supabase
      .from("codex_progressions")
      .update({ codex_entry_id: canonicalEntryId })
      .eq("codex_entry_id", sec.entryId)
      .select("id");
    if (progErr) {
      logServerError("convertSeries.repoint-progressions", progErr);
      return {
        ok: false,
        error: `Could not merge progressions for "${group.displayName}".`,
      };
    }
    repointed += progs?.length ?? 0;

    /* Finally drop the now-redundant secondary entry. */
    const { error: delErr } = await supabase
      .from("codex_entries")
      .delete()
      .eq("id", sec.entryId)
      .eq("user_id", userId);
    if (delErr) {
      logServerError("convertSeries.delete-secondary", delErr);
      return {
        ok: false,
        error: `Could not remove duplicate entry for "${group.displayName}".`,
      };
    }
  }

  return { ok: true, overlays, repointed, merged: secondaries.length };
}

export async function executeSeriesConversionAction(
  input: ExecuteConversionInput,
): Promise<ExecuteConversionResult> {
  const parsed = executeInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const pro = await requirePro(supabase, user);
  if (!pro.ok) return pro;

  /* Re-verify ownership + standalone status server-side. The client's
   * selection went through the preview step but we never trust the payload. */
  const { data: books, error: booksErr } = await supabase
    .from("books")
    .select("id, title, series_id, character_bible")
    .in("id", parsed.data.bookIds)
    .eq("user_id", user.id);
  if (booksErr) {
    logServerError("executeSeriesConversion.books", booksErr);
    return { ok: false, error: "Could not load books." };
  }
  if (!books || books.length !== parsed.data.bookIds.length) {
    return { ok: false, error: "Selection changed. Refresh and try again." };
  }
  if (books.some((b) => b.series_id)) {
    return {
      ok: false,
      error: "One or more selected books were added to a series since you started.",
    };
  }

  /* ---- Create the series --------------------------------------------- */
  // Seed the shared bible by merging all book bibles in reading order so the
  // new series starts with the union of everything the author has cataloged.
  let mergedBible: Json = {};
  const booksById = new Map(books.map((b) => [b.id, b]));
  for (const id of parsed.data.bookIds) {
    const b = booksById.get(id);
    if (b?.character_bible) {
      mergedBible = mergeCharacterBibleIntoSeries(
        mergedBible,
        b.character_bible as Json,
      );
    }
  }

  const { data: seriesRow, error: seriesErr } = await supabase
    .from("series")
    .insert({
      user_id: user.id,
      name: parsed.data.seriesName,
      description: parsed.data.seriesDescription ?? null,
      shared_character_bible: mergedBible,
    })
    .select("id")
    .single();
  if (seriesErr || !seriesRow) {
    logServerError("executeSeriesConversion.series-insert", seriesErr);
    return { ok: false, error: "Could not create series." };
  }
  const seriesId = seriesRow.id;

  /* ---- Link books with sequential order ------------------------------ */
  let linkedOrder = 0;
  for (const bookId of parsed.data.bookIds) {
    linkedOrder += 1;
    const prevText = await buildPreviouslyInSeriesText(
      supabase,
      seriesId,
      user.id,
      linkedOrder,
      bookId,
    );
    const { error } = await supabase
      .from("books")
      .update({
        series_id: seriesId,
        series_order: linkedOrder,
        previously_in_series: prevText || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookId)
      .eq("user_id", user.id);
    if (error) {
      logServerError("executeSeriesConversion.link-book", error);
      return { ok: false, error: "Could not attach one of the books to the series." };
    }
  }

  /* ---- Apply merge decisions ----------------------------------------- */
  const preview = await previewSeriesConversionAction(parsed.data.bookIds);
  // The preview is guaranteed to succeed here because we already did the
  // ownership/standalone checks above — but we stay defensive anyway.
  if (!preview.ok) {
    return { ok: false, error: preview.error };
  }
  // NB: the books were flipped into the series between the preview and
  // now, but `previewSeriesConversionAction` filters on user ownership
  // only for the codex fetch. It still correctly groups entries by their
  // now-orphaned book_id. (Re-running the preview also captures the very
  // latest codex state right before we write.)

  const decisionsByKey = new Map(
    parsed.data.mergeDecisions.map((d) => [d.groupKey, d] as const),
  );

  let entriesMerged = 0;
  let overlaysCreated = 0;
  let progressionsRepointed = 0;

  for (const group of preview.preview.mergeGroups) {
    const decision = decisionsByKey.get(group.groupKey);
    // Default to 'keep' when the client didn't send a decision — safer
    // than silently merging entries the user never reviewed.
    const action = decision?.action ?? "keep";
    if (action !== "merge") continue;
    const canonicalEntryId =
      decision?.canonicalEntryId ?? group.instances[0]?.entryId;
    if (!canonicalEntryId) continue;
    const res = await applyMergeDecision(supabase, {
      seriesId,
      userId: user.id,
      group,
      canonicalEntryId,
    });
    if (!res.ok) return { ok: false, error: res.error };
    entriesMerged += res.merged;
    overlaysCreated += res.overlays;
    progressionsRepointed += res.repointed;
  }

  /* ---- Fire-and-forget prior-book summarization ---------------------- *
   * Per spec (§ 355): chapter summaries re-run under series context.    *
   * The book-level summarizer walks every chapter and writes the        *
   * "end-state dossier" + per-character progressions that later books   *
   * will consume. We detach so the wizard's "Convert" click returns     *
   * fast; failures are logged but don't rollback the conversion.        */
  for (const bookId of parsed.data.bookIds) {
    void summarizeBookForSeries(supabase, bookId, user.id).catch((err) => {
      logServerError("executeSeriesConversion.summarize-bg", err);
    });
  }

  await trackEvent(user, "series_converted_from_standalone", null, {
    seriesId,
    bookCount: parsed.data.bookIds.length,
    entriesMerged,
    overlaysCreated,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/series");
  revalidatePath(`/dashboard/series/${seriesId}`);
  for (const bookId of parsed.data.bookIds) {
    revalidatePath(`/projects/${bookId}`);
  }

  return {
    ok: true,
    seriesId,
    summary: {
      booksLinked: parsed.data.bookIds.length,
      entriesMerged,
      overlaysCreated,
      progressionsRepointed,
    },
  };
}
