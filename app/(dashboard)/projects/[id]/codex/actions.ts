"use server";

/**
 * Codex server actions.
 *
 * This module is the entire write-path for the per-project codex. All actions
 * are scoped to `scope='project'` + a specific `book_id` — series-scoped and
 * shared-scoped entries are owned by Prompt 16 (Series Expansion) and are
 * intentionally NOT surfaced or mutated here.
 *
 * Every action double-checks ownership even though RLS already constrains
 * the query; the explicit check gives us a clean error string instead of a
 * silent 0-row update, and makes forged-id attempts fail fast.
 *
 * All mutations call `revalidatePath` on the codex page so the server
 * component re-renders with fresh data after the client optimistically
 * reconciles.
 */

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type {
  CodexEntryAiScopeDb,
  CodexEntryRelationDb,
  CodexEntryScopeDb,
  CodexEntryTypeDb,
  Database,
  Json,
} from "@/types/database.types";

type CodexEntryUpdate = Database["public"]["Tables"]["codex_entries"]["Update"];

/**
 * Entry types surfaced in the Codex UI. The DB allows an additional 'custom'
 * value (from migration 030) but we deliberately don't expose it — authors
 * should add custom FIELDS on the six structured types instead.
 */
const CODEX_UI_TYPES: readonly CodexEntryTypeDb[] = [
  "character",
  "location",
  "object",
  "lore",
  "faction",
  "subplot",
] as const;

const CODEX_AI_SCOPES: readonly CodexEntryAiScopeDb[] = [
  "always",
  "on_match",
  "never",
] as const;

const MAX_NAME_LENGTH = 200;
const MAX_ALIAS_LENGTH = 200;
const MAX_ALIASES_PER_ENTRY = 32;
const MAX_DESCRIPTION_CHARS = 20_000;
const MAX_SUMMARY_CHARS = 1_000;
const MAX_IMAGE_URL_CHARS = 2_048;
const MAX_CUSTOM_KEYS = 64;
const MAX_CUSTOM_KEY_LENGTH = 100;
const MAX_CUSTOM_VALUE_CHARS = 4_000;
const MAX_RELATIONS = 64;
const MAX_RELATION_LABEL_CHARS = 200;

type ActionError = { success: false; error: string };
type ActionOk<T> = { success: true; data: T };
type ActionResult<T> = ActionOk<T> | ActionError;

export type CodexEntryDto = {
  id: string;
  book_id: string;
  entry_type: CodexEntryTypeDb;
  name: string;
  aliases: string[];
  summary: string | null;
  description_md: string;
  custom_fields: Record<string, unknown>;
  ai_scope: CodexEntryAiScopeDb;
  relations: CodexEntryRelationDb[];
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

/* -------------------------------------------------------------------------- */
/* Ownership / coercion                                                       */
/* -------------------------------------------------------------------------- */

async function requireOwnedBook(projectId: string): Promise<
  | { ok: true; userId: string; supabase: Awaited<ReturnType<typeof createClient>> }
  | { ok: false; error: string }
> {
  if (!projectId || typeof projectId !== "string") {
    return { ok: false, error: "Missing project id." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: book, error } = await supabase
    .from("books")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !book) return { ok: false, error: "Project not found." };
  return { ok: true, userId: user.id, supabase };
}

/**
 * Resolve an entry plus its scope, rejecting non-owners.
 *
 * Prior to Prompt 16.3 this required `book_id != null` because the project
 * codex surface only touched project-scoped entries. With series entries
 * now rendered alongside project ones (same sidebar, same editor) we accept
 * any scope and hand the caller enough metadata to revalidate the right
 * Next.js route and respect scope-specific rules. Ownership is still
 * enforced via `user_id`.
 */
async function requireOwnedEntry(entryId: string): Promise<
  | {
      ok: true;
      userId: string;
      entry: {
        id: string;
        book_id: string | null;
        series_id: string | null;
        scope: CodexEntryScopeDb;
      };
      supabase: Awaited<ReturnType<typeof createClient>>;
    }
  | { ok: false; error: string }
> {
  if (!entryId || typeof entryId !== "string") {
    return { ok: false, error: "Missing entry id." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: entry, error } = await supabase
    .from("codex_entries")
    .select("id, book_id, series_id, scope, user_id")
    .eq("id", entryId)
    .maybeSingle();
  if (error || !entry) return { ok: false, error: "Entry not found." };
  if (entry.user_id !== user.id) {
    return { ok: false, error: "Entry not found." };
  }
  return {
    ok: true,
    userId: user.id,
    entry: {
      id: entry.id,
      book_id: entry.book_id,
      series_id: entry.series_id,
      scope: (entry.scope ?? "project") as CodexEntryScopeDb,
    },
    supabase,
  };
}

/**
 * Every mutation on a codex entry revalidates the routes that render that
 * entry. For project-scoped entries that's the single book's codex page;
 * for series-scoped entries we also revalidate the series page AND every
 * book in the series' codex page so overlays and demotes show up wherever
 * the author happens to be.
 */
async function revalidateForEntry(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entry: { book_id: string | null; series_id: string | null; scope: CodexEntryScopeDb },
): Promise<void> {
  if (entry.book_id) {
    revalidatePath(`/projects/${entry.book_id}/codex`);
  }
  if (entry.series_id) {
    revalidatePath(`/dashboard/series/${entry.series_id}`);
    // Best-effort: revalidate every sibling book's codex page so series
    // entries surface there. If the fan-out query fails we still
    // revalidate the source — stale other-book pages are a soft issue.
    const { data: siblingBooks } = await supabase
      .from("books")
      .select("id")
      .eq("series_id", entry.series_id);
    for (const b of siblingBooks ?? []) {
      revalidatePath(`/projects/${b.id}/codex`);
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Coercers                                                                   */
/* -------------------------------------------------------------------------- */

function coerceEntryType(value: unknown): CodexEntryTypeDb | null {
  if (typeof value !== "string") return null;
  return (CODEX_UI_TYPES as readonly string[]).includes(value)
    ? (value as CodexEntryTypeDb)
    : null;
}

function coerceAiScope(value: unknown): CodexEntryAiScopeDb | null {
  if (typeof value !== "string") return null;
  return (CODEX_AI_SCOPES as readonly string[]).includes(value)
    ? (value as CodexEntryAiScopeDb)
    : null;
}

function coerceAliases(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const raw of value) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (trimmed.length > MAX_ALIAS_LENGTH) continue;
    if (!out.includes(trimmed)) out.push(trimmed);
    if (out.length >= MAX_ALIASES_PER_ENTRY) break;
  }
  return out;
}

function coerceCustomFields(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, unknown> = {};
  let keys = 0;
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (keys >= MAX_CUSTOM_KEYS) break;
    const k = key.trim();
    if (!k || k.length > MAX_CUSTOM_KEY_LENGTH) continue;
    if (raw === null || raw === undefined) continue;
    if (typeof raw === "string") {
      if (raw.length > MAX_CUSTOM_VALUE_CHARS) {
        out[k] = raw.slice(0, MAX_CUSTOM_VALUE_CHARS);
      } else {
        out[k] = raw;
      }
    } else if (typeof raw === "number" || typeof raw === "boolean") {
      out[k] = raw;
    } else if (Array.isArray(raw)) {
      /* Only arrays of primitives — nested objects are not surfaced by the
       * UI and sneaking them in via an API call only bloats the payload. */
      out[k] = raw
        .filter(
          (v) =>
            typeof v === "string" ||
            typeof v === "number" ||
            typeof v === "boolean",
        )
        .slice(0, 64);
    }
    keys += 1;
  }
  return out;
}

function coerceRelations(value: unknown): CodexEntryRelationDb[] {
  if (!Array.isArray(value)) return [];
  const out: CodexEntryRelationDb[] = [];
  for (const raw of value) {
    if (out.length >= MAX_RELATIONS) break;
    if (!raw || typeof raw !== "object") continue;
    const r = raw as { targetId?: unknown; label?: unknown };
    if (typeof r.targetId !== "string" || !r.targetId.trim()) continue;
    const label =
      typeof r.label === "string"
        ? r.label.trim().slice(0, MAX_RELATION_LABEL_CHARS)
        : "";
    out.push({ targetId: r.targetId, label });
  }
  return out;
}

function dtoFromRow(row: {
  id: string;
  book_id: string | null;
  entry_type: CodexEntryTypeDb;
  name: string;
  aliases: string[];
  summary: string | null;
  description_md: string;
  custom_fields: Json;
  ai_scope: CodexEntryAiScopeDb;
  relations: Json;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}): CodexEntryDto {
  return {
    id: row.id,
    book_id: row.book_id ?? "",
    entry_type: row.entry_type,
    name: row.name,
    aliases: row.aliases ?? [],
    summary: row.summary,
    description_md: row.description_md ?? "",
    custom_fields:
      row.custom_fields && typeof row.custom_fields === "object" && !Array.isArray(row.custom_fields)
        ? (row.custom_fields as Record<string, unknown>)
        : {},
    ai_scope: row.ai_scope,
    relations: Array.isArray(row.relations)
      ? (row.relations as CodexEntryRelationDb[]).filter(
          (r) => r && typeof r === "object" && typeof r.targetId === "string",
        )
      : [],
    image_url: row.image_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const SELECT_COLS =
  "id, book_id, entry_type, name, aliases, summary, description_md, custom_fields, ai_scope, relations, image_url, created_at, updated_at";

/* -------------------------------------------------------------------------- */
/* Actions                                                                    */
/* -------------------------------------------------------------------------- */

export async function listCodexEntries(
  projectId: string,
  typeFilter?: CodexEntryTypeDb,
): Promise<ActionResult<CodexEntryDto[]>> {
  const owner = await requireOwnedBook(projectId);
  if (!owner.ok) return { success: false, error: owner.error };

  let query = owner.supabase
    .from("codex_entries")
    .select(SELECT_COLS)
    .eq("book_id", projectId)
    .eq("scope", "project")
    .order("name", { ascending: true });

  if (typeFilter) {
    query = query.eq("entry_type", typeFilter);
  }

  const { data, error } = await query;
  if (error) return { success: false, error: "Failed to load codex entries." };
  return { success: true, data: (data ?? []).map(dtoFromRow) };
}

export type CreateCodexEntryInput = {
  entry_type: CodexEntryTypeDb;
  name: string;
  aliases?: string[];
  ai_scope?: CodexEntryAiScopeDb;
  summary?: string;
  description_md?: string;
  custom_fields?: Record<string, unknown>;
  relations?: CodexEntryRelationDb[];
  image_url?: string | null;
  /**
   * Scope to persist. When omitted we default to 'project' so pre-16.3
   * callers keep working unchanged. 'series' REQUIRES the caller's book
   * (`projectId`) to be in a series — otherwise we reject the create rather
   * than silently create a dangling series entry.
   */
  scope?: Extract<CodexEntryScopeDb, "project" | "series">;
};

export async function createCodexEntry(
  projectId: string,
  input: CreateCodexEntryInput,
): Promise<ActionResult<CodexEntryDto>> {
  const owner = await requireOwnedBook(projectId);
  if (!owner.ok) return { success: false, error: owner.error };

  const entryType = coerceEntryType(input.entry_type);
  if (!entryType) {
    return { success: false, error: "Invalid entry type." };
  }
  const name = (input.name ?? "").trim();
  if (!name) return { success: false, error: "Name is required." };
  if (name.length > MAX_NAME_LENGTH) {
    return { success: false, error: `Name must be ${MAX_NAME_LENGTH} characters or fewer.` };
  }

  const scope: Extract<CodexEntryScopeDb, "project" | "series"> =
    input.scope === "series" ? "series" : "project";

  // Series creates need to know the book's series so the row has a valid
  // series_id column. We look it up here rather than trust a client-sent
  // id — any mismatch is a forged request.
  let seriesId: string | null = null;
  if (scope === "series") {
    const { data: book } = await owner.supabase
      .from("books")
      .select("series_id")
      .eq("id", projectId)
      .eq("user_id", owner.userId)
      .maybeSingle();
    if (!book?.series_id) {
      return {
        success: false,
        error: "This book isn't in a series, so it can't have series-scoped entries.",
      };
    }
    seriesId = book.series_id;
  }

  const aliases = coerceAliases(input.aliases ?? []);
  const aiScope = coerceAiScope(input.ai_scope ?? "on_match") ?? "on_match";
  const summary =
    typeof input.summary === "string"
      ? input.summary.trim().slice(0, MAX_SUMMARY_CHARS) || null
      : null;
  const description =
    typeof input.description_md === "string"
      ? input.description_md.slice(0, MAX_DESCRIPTION_CHARS)
      : "";
  const customFields = coerceCustomFields(input.custom_fields);
  const relations = coerceRelations(input.relations);
  const imageUrl =
    typeof input.image_url === "string" && input.image_url.trim()
      ? input.image_url.trim().slice(0, MAX_IMAGE_URL_CHARS)
      : null;

  const { data, error } = await owner.supabase
    .from("codex_entries")
    .insert({
      user_id: owner.userId,
      // Series-scoped rows carry series_id and null book_id (per the DB
      // scope invariant from migration 030).
      book_id: scope === "project" ? projectId : null,
      series_id: seriesId,
      scope,
      entry_type: entryType,
      name,
      aliases,
      summary,
      description_md: description,
      custom_fields: customFields as Json,
      ai_scope: aiScope,
      relations: relations as unknown as Json,
      image_url: imageUrl,
    })
    .select(SELECT_COLS)
    .single();

  if (error || !data) {
    return { success: false, error: "Failed to create codex entry." };
  }

  revalidatePath(`/projects/${projectId}/codex`);
  if (seriesId) {
    revalidatePath(`/dashboard/series/${seriesId}`);
    // Sibling books need revalidation too so the new series entry surfaces
    // in their codex page next render.
    const { data: siblings } = await owner.supabase
      .from("books")
      .select("id")
      .eq("series_id", seriesId)
      .neq("id", projectId);
    for (const b of siblings ?? []) {
      revalidatePath(`/projects/${b.id}/codex`);
    }
  }
  return { success: true, data: dtoFromRow(data) };
}

export type UpdateCodexEntryPatch = Partial<CreateCodexEntryInput>;

export async function updateCodexEntry(
  entryId: string,
  patch: UpdateCodexEntryPatch,
): Promise<ActionResult<CodexEntryDto>> {
  const owner = await requireOwnedEntry(entryId);
  if (!owner.ok) return { success: false, error: owner.error };

  const update: CodexEntryUpdate = {};

  if (patch.entry_type !== undefined) {
    const coerced = coerceEntryType(patch.entry_type);
    if (!coerced) return { success: false, error: "Invalid entry type." };
    update.entry_type = coerced;
  }
  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (!name) return { success: false, error: "Name is required." };
    if (name.length > MAX_NAME_LENGTH) {
      return { success: false, error: `Name must be ${MAX_NAME_LENGTH} characters or fewer.` };
    }
    update.name = name;
  }
  if (patch.aliases !== undefined) {
    update.aliases = coerceAliases(patch.aliases);
  }
  if (patch.ai_scope !== undefined) {
    const coerced = coerceAiScope(patch.ai_scope);
    if (!coerced) return { success: false, error: "Invalid AI scope." };
    update.ai_scope = coerced;
  }
  if (patch.summary !== undefined) {
    update.summary =
      typeof patch.summary === "string" && patch.summary.trim()
        ? patch.summary.trim().slice(0, MAX_SUMMARY_CHARS)
        : null;
  }
  if (patch.description_md !== undefined) {
    update.description_md =
      typeof patch.description_md === "string"
        ? patch.description_md.slice(0, MAX_DESCRIPTION_CHARS)
        : "";
  }
  if (patch.custom_fields !== undefined) {
    update.custom_fields = coerceCustomFields(patch.custom_fields) as Json;
  }
  if (patch.relations !== undefined) {
    update.relations = coerceRelations(patch.relations);
  }
  if (patch.image_url !== undefined) {
    update.image_url =
      typeof patch.image_url === "string" && patch.image_url.trim()
        ? patch.image_url.trim().slice(0, MAX_IMAGE_URL_CHARS)
        : null;
  }

  if (Object.keys(update).length === 0) {
    /* No-op patch: return the row as-is instead of a pointless write. */
    const { data, error } = await owner.supabase
      .from("codex_entries")
      .select(SELECT_COLS)
      .eq("id", entryId)
      .maybeSingle();
    if (error || !data) return { success: false, error: "Entry not found." };
    return { success: true, data: dtoFromRow(data) };
  }

  const { data, error } = await owner.supabase
    .from("codex_entries")
    .update(update)
    .eq("id", entryId)
    .eq("user_id", owner.userId)
    .select(SELECT_COLS)
    .single();

  if (error || !data) {
    return { success: false, error: "Failed to update codex entry." };
  }

  await revalidateForEntry(owner.supabase, owner.entry);
  return { success: true, data: dtoFromRow(data) };
}

export async function deleteCodexEntry(
  entryId: string,
): Promise<ActionResult<{ id: string }>> {
  const owner = await requireOwnedEntry(entryId);
  if (!owner.ok) return { success: false, error: owner.error };

  const { error } = await owner.supabase
    .from("codex_entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", owner.userId);
  if (error) return { success: false, error: "Failed to delete codex entry." };

  /* Sweep relations on sibling entries — foreign keys are client-maintained
   * (see migration 031 comment), so deleting the entry leaves dangling
   * targetIds on everybody that referenced it. For project-scoped deletes
   * we sweep entries in the same book; for series-scoped deletes we sweep
   * every entry in the series (project-scoped entries in sibling books
   * could reference the deleted series entry too). */
  let siblingsQuery = owner.supabase
    .from("codex_entries")
    .select("id, relations, book_id, series_id");
  if (owner.entry.scope === "project" && owner.entry.book_id) {
    siblingsQuery = siblingsQuery.eq("book_id", owner.entry.book_id);
  } else if (owner.entry.series_id) {
    siblingsQuery = siblingsQuery.eq("user_id", owner.userId);
  }
  const { data: siblings } = await siblingsQuery;
  if (siblings) {
    const toFix = siblings.filter((s) => {
      if (!Array.isArray(s.relations)) return false;
      return (s.relations as Array<{ targetId?: string }>).some(
        (r) => r && r.targetId === entryId,
      );
    });
    await Promise.all(
      toFix.map((s) =>
        owner.supabase
          .from("codex_entries")
          .update({
            relations: ((s.relations as Array<{ targetId?: string }>) ?? [])
              .filter((r) => r && r.targetId !== entryId) as unknown as Json,
          })
          .eq("id", s.id)
          .eq("user_id", owner.userId),
      ),
    );
  }

  await revalidateForEntry(owner.supabase, owner.entry);
  return { success: true, data: { id: entryId } };
}

/**
 * Reorder codex entries by accepting an ordered list of ids. The DB schema
 * doesn't currently have a `sort_order` column — we fake it by stamping
 * `updated_at` in reverse so default-desc ordering matches the input. If
 * the UI later demands a real persistent sort we'll add a column; for v1
 * this is good enough and avoids a migration.
 */
export async function reorderCodexEntries(
  projectId: string,
  orderedIds: string[],
): Promise<ActionResult<{ count: number }>> {
  const owner = await requireOwnedBook(projectId);
  if (!owner.ok) return { success: false, error: owner.error };
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return { success: true, data: { count: 0 } };
  }

  const now = Date.now();
  /* Stamp each row with a descending offset from now so the "most recent"
   * first-order output preserves the input order. 100ms apart is enough to
   * dominate any realistic clock skew but still under a second total. */
  const updates = orderedIds.slice(0, 500).map((id, idx) => ({
    id,
    updated_at: new Date(now - idx * 100).toISOString(),
  }));

  await Promise.all(
    updates.map((u) =>
      owner.supabase
        .from("codex_entries")
        .update({ updated_at: u.updated_at })
        .eq("id", u.id)
        .eq("user_id", owner.userId)
        .eq("book_id", projectId),
    ),
  );

  revalidatePath(`/projects/${projectId}/codex`);
  return { success: true, data: { count: updates.length } };
}
