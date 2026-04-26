"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { RefinedIdeaBrief } from "@/types/book.types";
import type { BookTypeDb, Json } from "@/types/database.types";

/**
 * Persists the author's fiction / non-fiction choice to `books.book_type`.
 * Called from the idea page's BookTypeSelector so downstream prompts
 * (chapter generation in particular) branch correctly.
 */
export async function updateBookTypeAction(
  bookId: string,
  bookType: BookTypeDb,
): Promise<{ ok: boolean; error?: string }> {
  if (bookType !== "fiction" && bookType !== "non_fiction") {
    return { ok: false, error: "Invalid book type." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  const { error } = await supabase
    .from("books")
    .update({ book_type: bookType })
    .eq("id", bookId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: "Could not save book type." };
  }

  revalidatePath(`/projects/${bookId}`);
  revalidatePath(`/projects/${bookId}/idea`);
  revalidatePath(`/projects/${bookId}/outline`);
  return { ok: true };
}

type CodexSyncSummary = {
  created: number;
  skipped: number;
};

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/\r?\n|,/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function splitSeedLine(raw: string): { name: string; note: string } {
  const line = raw.trim();
  if (!line) return { name: "", note: "" };
  const separators = [" - ", " — ", ": "];
  for (const sep of separators) {
    const idx = line.indexOf(sep);
    if (idx > 0) {
      return {
        name: line.slice(0, idx).trim(),
        note: line.slice(idx + sep.length).trim(),
      };
    }
  }
  return { name: line, note: "" };
}

export async function syncIdeaCodexSeedsAction(
  bookId: string,
  brief: RefinedIdeaBrief,
): Promise<{ ok: boolean; summary?: CodexSyncSummary; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("id")
    .eq("id", bookId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (bookError || !book) {
    return { ok: false, error: "Project not found." };
  }

  const { error: saveBriefError } = await supabase
    .from("books")
    .update({ refined_idea: brief as unknown as Json })
    .eq("id", bookId)
    .eq("user_id", user.id);
  if (saveBriefError) {
    return { ok: false, error: "Could not save idea brief." };
  }

  const buckets: Array<{
    key:
      | "codex_characters"
      | "codex_locations"
      | "codex_objects"
      | "codex_factions"
      | "codex_lore"
      | "codex_subplots";
    entryType: "character" | "location" | "object" | "faction" | "lore" | "subplot";
  }> = [
    { key: "codex_characters", entryType: "character" },
    { key: "codex_locations", entryType: "location" },
    { key: "codex_objects", entryType: "object" },
    { key: "codex_factions", entryType: "faction" },
    { key: "codex_lore", entryType: "lore" },
    { key: "codex_subplots", entryType: "subplot" },
  ];

  const { data: existingRows } = await supabase
    .from("codex_entries")
    .select("id, name, entry_type")
    .eq("book_id", bookId)
    .eq("scope", "project")
    .eq("user_id", user.id);

  const existing = new Set(
    (existingRows ?? []).map((r) => `${r.entry_type}:${r.name.trim().toLowerCase()}`),
  );

  const inserts: Array<{
    user_id: string;
    book_id: string;
    scope: "project";
    entry_type: "character" | "location" | "object" | "faction" | "lore" | "subplot";
    name: string;
    description_md: string;
    ai_scope: "on_match";
  }> = [];

  let skipped = 0;
  for (const bucket of buckets) {
    const lines = asStringList(brief[bucket.key]);
    for (const line of lines) {
      const { name, note } = splitSeedLine(line);
      const cleanName = name.trim().slice(0, 200);
      if (!cleanName) continue;
      const key = `${bucket.entryType}:${cleanName.toLowerCase()}`;
      if (existing.has(key)) {
        skipped += 1;
        continue;
      }
      existing.add(key);
      inserts.push({
        user_id: user.id,
        book_id: bookId,
        scope: "project",
        entry_type: bucket.entryType,
        name: cleanName,
        description_md: note.slice(0, 20_000),
        ai_scope: "on_match",
      });
    }
  }

  if (inserts.length > 0) {
    const { error: insertError } = await supabase.from("codex_entries").insert(inserts);
    if (insertError) {
      return { ok: false, error: "Could not sync codex entries." };
    }
  }

  revalidatePath(`/projects/${bookId}/idea`);
  revalidatePath(`/projects/${bookId}/codex`);
  revalidatePath(`/projects/${bookId}`);
  return {
    ok: true,
    summary: {
      created: inserts.length,
      skipped,
    },
  };
}
