"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/utils/errors";
import type {
  CodexEntryScopeDb,
  CodexEntryTypeDb,
  Database,
  Json,
} from "@/types/database.types";

type CodexEntryUpdate = Database["public"]["Tables"]["codex_entries"]["Update"];
type CodexOverlayUpdate =
  Database["public"]["Tables"]["codex_entry_overlays"]["Update"];

/* -------------------------------------------------------------------------- */
/*  Zod schemas (shared)                                                       */
/* -------------------------------------------------------------------------- */

const ENTRY_TYPES: readonly CodexEntryTypeDb[] = [
  "character",
  "location",
  "faction",
  "object",
  "lore",
  "subplot",
  "custom",
] as const;

const codexEntryInputSchema = z.object({
  entry_type: z.enum(ENTRY_TYPES as unknown as [CodexEntryTypeDb, ...CodexEntryTypeDb[]]).default("character"),
  name: z.string().trim().min(1, "Name is required.").max(200),
  aliases: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
  summary: z.string().trim().max(1_000).nullable().optional(),
  description_md: z.string().trim().max(20_000).nullable().optional(),
  custom_fields: z.record(z.unknown()).default({}),
});

export type CodexEntryInput = z.infer<typeof codexEntryInputSchema>;

const progressionInputSchema = z.object({
  codex_entry_id: z.string().uuid(),
  book_id: z.string().uuid(),
  chapter_id: z.string().uuid().nullable().optional(),
  event_type: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(2_000),
  position_hint: z.string().trim().max(120).nullable().optional(),
});

export type ProgressionInput = z.infer<typeof progressionInputSchema>;

const overlayInputSchema = z.object({
  codex_entry_id: z.string().uuid(),
  book_id: z.string().uuid(),
  field_overrides: z.record(z.unknown()).default({}),
  description_override: z.string().trim().max(20_000).nullable().optional(),
  notes: z.string().trim().max(4_000).nullable().optional(),
});

export type OverlayInput = z.infer<typeof overlayInputSchema>;

/* -------------------------------------------------------------------------- */
/*  Internal auth/ownership helpers                                            */
/* -------------------------------------------------------------------------- */

async function getAuthedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

async function ensureSeriesOwnership(
  seriesId: string,
): Promise<
  | { ok: true; userId: string; supabase: Awaited<ReturnType<typeof createClient>> }
  | { ok: false; error: string }
> {
  const { supabase, user } = await getAuthedUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const { data } = await supabase
    .from("series")
    .select("id")
    .eq("id", seriesId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return { ok: false, error: "Series not found." };
  return { ok: true, userId: user.id, supabase };
}

async function ensureBookOwnership(
  bookId: string,
): Promise<
  | { ok: true; userId: string; supabase: Awaited<ReturnType<typeof createClient>>; seriesId: string | null }
  | { ok: false; error: string }
> {
  const { supabase, user } = await getAuthedUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const { data } = await supabase
    .from("books")
    .select("id, series_id")
    .eq("id", bookId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return { ok: false, error: "Book not found." };
  return { ok: true, userId: user.id, supabase, seriesId: data.series_id };
}

function revalSeries(seriesId: string | null): void {
  revalidatePath("/dashboard");
  if (seriesId) revalidatePath(`/dashboard/series/${seriesId}`);
}

/* -------------------------------------------------------------------------- */
/*  Create: project-scoped or series-scoped                                   */
/* -------------------------------------------------------------------------- */

export async function createCodexEntryAction(args: {
  scope: Extract<CodexEntryScopeDb, "project" | "series">;
  book_id?: string | null;
  series_id?: string | null;
  input: CodexEntryInput;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = codexEntryInputSchema.safeParse(args.input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { supabase, user } = await getAuthedUser();
  if (!user) return { ok: false, error: "Not signed in." };

  let seriesId: string | null = null;
  let bookId: string | null = null;

  if (args.scope === "series") {
    if (!args.series_id) return { ok: false, error: "Series id required." };
    const owner = await ensureSeriesOwnership(args.series_id);
    if (!owner.ok) return owner;
    seriesId = args.series_id;
  } else {
    if (!args.book_id) return { ok: false, error: "Book id required." };
    const owner = await ensureBookOwnership(args.book_id);
    if (!owner.ok) return owner;
    bookId = args.book_id;
    seriesId = owner.seriesId;
  }

  const { data, error } = await supabase
    .from("codex_entries")
    .insert({
      user_id: user.id,
      book_id: bookId,
      series_id: seriesId && args.scope === "series" ? seriesId : null,
      scope: args.scope,
      entry_type: parsed.data.entry_type,
      name: parsed.data.name,
      aliases: parsed.data.aliases,
      summary: parsed.data.summary ?? null,
      description_md: parsed.data.description_md ?? "",
      custom_fields: (parsed.data.custom_fields ?? {}) as Json,
    })
    .select("id")
    .single();
  if (error || !data) {
    logServerError("createCodexEntry", error);
    return { ok: false, error: "Could not create codex entry." };
  }

  revalSeries(seriesId);
  return { ok: true, id: data.id };
}

/* -------------------------------------------------------------------------- */
/*  Update / delete                                                            */
/* -------------------------------------------------------------------------- */

export async function updateCodexEntryAction(
  entryId: string,
  patch: Partial<CodexEntryInput>,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await getAuthedUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // user_id column is RLS-protected, so .eq here is belt-and-suspenders.
  const { data: row } = await supabase
    .from("codex_entries")
    .select("id, series_id")
    .eq("id", entryId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!row) return { ok: false, error: "Entry not found." };

  const update: CodexEntryUpdate = { updated_at: new Date().toISOString() };
  if (patch.entry_type !== undefined) update.entry_type = patch.entry_type;
  if (patch.name !== undefined) update.name = patch.name.trim() || "Untitled";
  if (patch.aliases !== undefined) update.aliases = patch.aliases;
  if (patch.summary !== undefined) update.summary = patch.summary;
  if (patch.description_md !== undefined)
    update.description_md = patch.description_md ?? "";
  if (patch.custom_fields !== undefined)
    update.custom_fields = patch.custom_fields as Json;

  const { error } = await supabase
    .from("codex_entries")
    .update(update)
    .eq("id", entryId)
    .eq("user_id", user.id);
  if (error) {
    logServerError("updateCodexEntry", error);
    return { ok: false, error: "Could not update entry." };
  }
  revalSeries(row.series_id);
  return { ok: true };
}

export async function deleteCodexEntryAction(
  entryId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await getAuthedUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: row } = await supabase
    .from("codex_entries")
    .select("series_id")
    .eq("id", entryId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("codex_entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", user.id);
  if (error) {
    logServerError("deleteCodexEntry", error);
    return { ok: false, error: "Could not delete entry." };
  }
  revalSeries(row?.series_id ?? null);
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/*  Scope changes                                                              */
/* -------------------------------------------------------------------------- */

export async function promoteCodexEntryToSeriesAction(
  entryId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await getAuthedUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: row } = await supabase
    .from("codex_entries")
    .select("id, book_id, series_id, scope")
    .eq("id", entryId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!row) return { ok: false, error: "Entry not found." };
  if (row.scope === "series") return { ok: true };
  if (!row.book_id) return { ok: false, error: "Entry is not attached to a book." };

  const { data: book } = await supabase
    .from("books")
    .select("series_id")
    .eq("id", row.book_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!book?.series_id) {
    return { ok: false, error: "Book is not part of a series." };
  }

  const { error } = await supabase
    .from("codex_entries")
    .update({
      scope: "series",
      series_id: book.series_id,
      book_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId)
    .eq("user_id", user.id);
  if (error) {
    logServerError("promoteCodexEntry", error);
    return { ok: false, error: "Could not promote entry." };
  }
  revalSeries(book.series_id);
  return { ok: true };
}

/**
 * Promote multiple project-scoped codex entries to series scope in a single
 * round-trip. Rejects entries the caller doesn't own, entries not attached to
 * a book, and books that aren't part of a series. Per-entry failures are
 * surfaced in the returned `failed` array so the UI can explain which rows
 * couldn't be promoted without rolling back the whole batch.
 */
export async function bulkPromoteCodexEntriesToSeriesAction(
  entryIds: string[],
): Promise<
  | {
      ok: true;
      promoted: number;
      failed: { id: string; reason: string }[];
    }
  | { ok: false; error: string }
> {
  if (!entryIds.length) return { ok: true, promoted: 0, failed: [] };
  const { supabase, user } = await getAuthedUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: rows } = await supabase
    .from("codex_entries")
    .select("id, book_id, scope")
    .in("id", entryIds)
    .eq("user_id", user.id);
  if (!rows?.length) return { ok: false, error: "No entries found." };

  // Group by book_id so we only fetch each book's series once.
  const bookIds = Array.from(
    new Set(
      rows
        .filter((r) => r.scope === "project" && r.book_id)
        .map((r) => r.book_id as string),
    ),
  );
  const seriesByBook = new Map<string, string | null>();
  if (bookIds.length > 0) {
    const { data: books } = await supabase
      .from("books")
      .select("id, series_id")
      .in("id", bookIds)
      .eq("user_id", user.id);
    for (const b of books ?? []) seriesByBook.set(b.id, b.series_id ?? null);
  }

  let promoted = 0;
  const failed: { id: string; reason: string }[] = [];
  const seriesIdsTouched = new Set<string>();

  for (const r of rows) {
    if (r.scope === "series") {
      promoted += 1;
      continue;
    }
    if (!r.book_id) {
      failed.push({ id: r.id, reason: "Not attached to a book." });
      continue;
    }
    const sid = seriesByBook.get(r.book_id);
    if (!sid) {
      failed.push({ id: r.id, reason: "Book is not in a series." });
      continue;
    }
    const { error } = await supabase
      .from("codex_entries")
      .update({
        scope: "series",
        series_id: sid,
        book_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", r.id)
      .eq("user_id", user.id);
    if (error) {
      logServerError("bulkPromoteCodexEntry", error);
      failed.push({ id: r.id, reason: "Write failed." });
      continue;
    }
    promoted += 1;
    seriesIdsTouched.add(sid);
  }

  for (const sid of Array.from(seriesIdsTouched)) revalSeries(sid);
  return { ok: true, promoted, failed };
}

/**
 * Demote a series-scoped entry back to a single book.
 *
 * We can't just flip `scope` because the entry has been accumulating per-book
 * overlays that are meaningful ONLY in series scope. Per the spec's demote
 * contract (Prompt 16.3), we:
 *   1. Locate the target book's overlay (if any) and merge it INTO the base
 *      entry — `field_overrides` shallow-merge over `custom_fields`, and any
 *      `description_override` is appended to `description_md` with a
 *      separator so the author doesn't lose writing they did at the overlay
 *      layer. Notes are also appended (in a separate paragraph) since they're
 *      author-visible state.
 *   2. Delete EVERY overlay for this entry (other books' overlays are no
 *      longer addressable — the entry only lives in one book now).
 *   3. Flip scope → 'project', clear series_id, set book_id to the target.
 *
 * If step 1 fetches fail we bail rather than silently lose data; the demote
 * is skipped so the author can retry. Step 2 best-effort: if the cascade
 * fails we still flip scope, since stale overlays on a project-scoped entry
 * are invisible to the UI but shouldn't block the demote.
 */
export async function demoteCodexEntryToBookAction(
  entryId: string,
  targetBookId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await getAuthedUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: entry } = await supabase
    .from("codex_entries")
    .select(
      "id, scope, series_id, description_md, custom_fields",
    )
    .eq("id", entryId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!entry) return { ok: false, error: "Entry not found." };
  if (entry.scope === "project") return { ok: true };

  const { data: book } = await supabase
    .from("books")
    .select("id, series_id")
    .eq("id", targetBookId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!book) return { ok: false, error: "Target book not found." };

  // Step 1: fold the target book's overlay (if any) back into base fields
  // so the demoted entry retains the author's book-specific work.
  const { data: targetOverlay } = await supabase
    .from("codex_entry_overlays")
    .select("id, field_overrides, description_override, notes")
    .eq("codex_entry_id", entryId)
    .eq("book_id", book.id)
    .maybeSingle();

  let mergedDescription = entry.description_md ?? "";
  const baseCustom =
    entry.custom_fields &&
    typeof entry.custom_fields === "object" &&
    !Array.isArray(entry.custom_fields)
      ? (entry.custom_fields as Record<string, unknown>)
      : {};
  let mergedCustom: Record<string, unknown> = { ...baseCustom };

  if (targetOverlay) {
    const overrides =
      targetOverlay.field_overrides &&
      typeof targetOverlay.field_overrides === "object" &&
      !Array.isArray(targetOverlay.field_overrides)
        ? (targetOverlay.field_overrides as Record<string, unknown>)
        : {};
    mergedCustom = { ...mergedCustom, ...overrides };

    const extraSections: string[] = [];
    if (
      typeof targetOverlay.description_override === "string" &&
      targetOverlay.description_override.trim()
    ) {
      // Append rather than replace — the base may still be useful context.
      // The separator makes it clear the appended block came from an overlay
      // during demote; authors can reshape prose after the fact.
      extraSections.push(
        `---\n\nBook-specific context (merged in on demote):\n\n${targetOverlay.description_override.trim()}`,
      );
    }
    if (
      typeof targetOverlay.notes === "string" &&
      targetOverlay.notes.trim()
    ) {
      extraSections.push(
        `---\n\nBook-specific notes:\n\n${targetOverlay.notes.trim()}`,
      );
    }
    if (extraSections.length > 0) {
      mergedDescription =
        [mergedDescription.trim(), ...extraSections]
          .filter((s) => s.length > 0)
          .join("\n\n");
    }
  }

  // Step 2: drop EVERY overlay on this entry — project-scoped entries can't
  // have overlays by design, and leaving stragglers would only confuse future
  // promote cycles.
  const { error: overlayDeleteError } = await supabase
    .from("codex_entry_overlays")
    .delete()
    .eq("codex_entry_id", entryId);
  if (overlayDeleteError) {
    logServerError("demoteCodexEntry.dropOverlays", overlayDeleteError);
    // Non-fatal: the base entry already captured the target book's data.
  }

  // Step 3: flip scope + persist the merged base fields atomically.
  const { error } = await supabase
    .from("codex_entries")
    .update({
      scope: "project",
      series_id: null,
      book_id: book.id,
      description_md: mergedDescription,
      custom_fields: mergedCustom as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId)
    .eq("user_id", user.id);
  if (error) {
    logServerError("demoteCodexEntry", error);
    return { ok: false, error: "Could not demote entry." };
  }
  revalSeries(entry.series_id);
  // Revalidate the target book's codex page so the newly-project-scoped entry
  // appears there immediately.
  revalidatePath(`/projects/${book.id}/codex`);
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/*  Overlays (per-book variations of series-scoped entries)                    */
/* -------------------------------------------------------------------------- */

export async function upsertCodexEntryOverlayAction(
  input: OverlayInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = overlayInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { supabase, user } = await getAuthedUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // Ownership check on the book (RLS also enforces via policy, but we return
  // clear errors early).
  const bookOwner = await ensureBookOwnership(parsed.data.book_id);
  if (!bookOwner.ok) return bookOwner;

  const { data: entry } = await supabase
    .from("codex_entries")
    .select("id, scope, series_id")
    .eq("id", parsed.data.codex_entry_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!entry) return { ok: false, error: "Entry not found." };
  if (entry.scope !== "series") {
    return { ok: false, error: "Overlays only apply to series-scoped entries." };
  }
  if (entry.series_id !== bookOwner.seriesId) {
    return { ok: false, error: "Book is not part of this entry's series." };
  }

  const { data, error } = await supabase
    .from("codex_entry_overlays")
    .upsert(
      {
        codex_entry_id: parsed.data.codex_entry_id,
        book_id: parsed.data.book_id,
        field_overrides: (parsed.data.field_overrides ?? {}) as Json,
        description_override: parsed.data.description_override ?? null,
        notes: parsed.data.notes ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "codex_entry_id,book_id" },
    )
    .select("id")
    .single();
  if (error || !data) {
    logServerError("upsertCodexOverlay", error);
    return { ok: false, error: "Could not save overlay." };
  }
  revalSeries(entry.series_id);
  return { ok: true, id: data.id };
}

export async function deleteCodexEntryOverlayAction(
  overlayId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await getAuthedUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // Read the overlay (RLS-scoped) to grab series_id for revalidation.
  const { data: row } = await supabase
    .from("codex_entry_overlays")
    .select("id, codex_entry_id")
    .eq("id", overlayId)
    .maybeSingle();
  let seriesId: string | null = null;
  if (row) {
    const { data: entry } = await supabase
      .from("codex_entries")
      .select("series_id")
      .eq("id", row.codex_entry_id)
      .maybeSingle();
    seriesId = entry?.series_id ?? null;
  }

  const { error } = await supabase
    .from("codex_entry_overlays")
    .delete()
    .eq("id", overlayId);
  if (error) {
    logServerError("deleteCodexOverlay", error);
    return { ok: false, error: "Could not delete overlay." };
  }
  revalSeries(seriesId);
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/*  Progressions                                                               */
/* -------------------------------------------------------------------------- */

export async function createProgressionAction(
  input: ProgressionInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = progressionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { supabase, user } = await getAuthedUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const bookOwner = await ensureBookOwnership(parsed.data.book_id);
  if (!bookOwner.ok) return bookOwner;

  const { data: entry } = await supabase
    .from("codex_entries")
    .select("id, series_id, scope, book_id")
    .eq("id", parsed.data.codex_entry_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!entry) return { ok: false, error: "Entry not found." };
  if (entry.scope === "project") {
    if (entry.book_id !== parsed.data.book_id) {
      return {
        ok: false,
        error: "Project-scoped entries can only log progressions in their owning book.",
      };
    }
  } else {
    if (!bookOwner.seriesId || entry.series_id !== bookOwner.seriesId) {
      return {
        ok: false,
        error: "Book is not part of this entry's series.",
      };
    }
  }

  const { data, error } = await supabase
    .from("codex_progressions")
    .insert({
      codex_entry_id: parsed.data.codex_entry_id,
      book_id: parsed.data.book_id,
      chapter_id: parsed.data.chapter_id ?? null,
      event_type: parsed.data.event_type,
      description: parsed.data.description,
      position_hint: parsed.data.position_hint ?? null,
    })
    .select("id")
    .single();
  if (error || !data) {
    logServerError("createProgression", error);
    return { ok: false, error: "Could not create progression." };
  }
  revalidatePath(`/projects/${parsed.data.book_id}/codex`);
  revalSeries(entry.series_id);
  return { ok: true, id: data.id };
}

/**
 * Edit an existing progression. Only the fields listed in `patch` are
 * written; missing keys are treated as "leave alone" (NOT "set to null")
 * because the codex UI sends partial updates for each field the author
 * touches.
 *
 * `chapter_id` accepts `null` explicitly (to detach a progression from a
 * specific chapter), distinguished from `undefined` (no change). The Zod
 * schema below enforces that only valid UUIDs land in the chapter_id column.
 */
const updateProgressionInputSchema = z
  .object({
    event_type: z.string().trim().min(1).max(80).optional(),
    description: z.string().trim().min(1).max(2_000).optional(),
    position_hint: z.string().trim().max(120).nullable().optional(),
    chapter_id: z.string().uuid().nullable().optional(),
  })
  .strict();

export type UpdateProgressionInput = z.infer<typeof updateProgressionInputSchema>;

export async function updateProgressionAction(
  progressionId: string,
  patch: UpdateProgressionInput,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = updateProgressionInputSchema.safeParse(patch);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  if (Object.keys(parsed.data).length === 0) {
    return { ok: true };
  }

  const { supabase, user } = await getAuthedUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // Ownership check via the parent codex entry (which is user-scoped). We
  // also need the series_id for revalidation.
  const { data: row } = await supabase
    .from("codex_progressions")
    .select("codex_entry_id")
    .eq("id", progressionId)
    .maybeSingle();
  if (!row) return { ok: false, error: "Progression not found." };

  const { data: entry } = await supabase
    .from("codex_entries")
    .select("series_id")
    .eq("id", row.codex_entry_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!entry) return { ok: false, error: "Progression not found." };

  // If the caller is moving the progression to a different chapter, verify
  // the chapter belongs to the progression's book. Supabase doesn't let us
  // do multi-row FK checks in a single statement, so we fetch it inline.
  if (parsed.data.chapter_id) {
    const { data: prog } = await supabase
      .from("codex_progressions")
      .select("book_id")
      .eq("id", progressionId)
      .maybeSingle();
    const { data: chapter } = await supabase
      .from("chapters")
      .select("book_id")
      .eq("id", parsed.data.chapter_id)
      .maybeSingle();
    if (!prog || !chapter || prog.book_id !== chapter.book_id) {
      return {
        ok: false,
        error: "Chapter must belong to the same book as the progression.",
      };
    }
  }

  type ProgressionUpdate =
    Database["public"]["Tables"]["codex_progressions"]["Update"];
  const update: ProgressionUpdate = {};
  if (parsed.data.event_type !== undefined)
    update.event_type = parsed.data.event_type;
  if (parsed.data.description !== undefined)
    update.description = parsed.data.description;
  if (parsed.data.position_hint !== undefined)
    update.position_hint = parsed.data.position_hint;
  if (parsed.data.chapter_id !== undefined)
    update.chapter_id = parsed.data.chapter_id;

  const { error } = await supabase
    .from("codex_progressions")
    .update(update)
    .eq("id", progressionId);
  if (error) {
    logServerError("updateProgression", error);
    return { ok: false, error: "Could not update progression." };
  }
  revalSeries(entry.series_id ?? null);
  return { ok: true };
}

export async function deleteProgressionAction(
  progressionId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await getAuthedUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: row } = await supabase
    .from("codex_progressions")
    .select("codex_entry_id")
    .eq("id", progressionId)
    .maybeSingle();
  let seriesId: string | null = null;
  if (row) {
    const { data: entry } = await supabase
      .from("codex_entries")
      .select("series_id")
      .eq("id", row.codex_entry_id)
      .maybeSingle();
    seriesId = entry?.series_id ?? null;
  }

  const { error } = await supabase
    .from("codex_progressions")
    .delete()
    .eq("id", progressionId);
  if (error) {
    logServerError("deleteProgression", error);
    return { ok: false, error: "Could not delete progression." };
  }
  revalSeries(seriesId);
  return { ok: true };
}
