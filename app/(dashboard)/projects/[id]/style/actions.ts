"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

/** Mirrors the CHECK constraints in migration 029_book_style_examples.sql. */
const MAX_STYLE_EXAMPLES_CHARS = 20_000;
const MAX_STYLE_INSTRUCTIONS_CHARS = 1_000;

export type UpdateStyleExamplesResult = {
  success: boolean;
  error?: string;
};

/**
 * Persists per-project style anchor (sample prose + optional steering note)
 * used to inject into every prose-generating AI prompt. Validates ownership
 * via Supabase auth; server-side char caps mirror the DB CHECK so a forged
 * client request can't bloat the column.
 *
 * Passing empty strings clears the columns (stored as NULL) so the next AI
 * call falls back to no style anchor — this is intentional, the UI uses it
 * to let authors turn the feature off without an extra "delete" control.
 */
export async function updateStyleExamples(
  projectId: string,
  styleExamples: string,
  styleInstructions: string,
): Promise<UpdateStyleExamplesResult> {
  if (!projectId || typeof projectId !== "string") {
    return { success: false, error: "Missing project id." };
  }

  const trimmedExamples = (styleExamples ?? "").trim();
  const trimmedInstructions = (styleInstructions ?? "").trim();

  if (trimmedExamples.length > MAX_STYLE_EXAMPLES_CHARS) {
    return {
      success: false,
      error: `Style examples must be ${MAX_STYLE_EXAMPLES_CHARS.toLocaleString()} characters or fewer.`,
    };
  }

  if (trimmedInstructions.length > MAX_STYLE_INSTRUCTIONS_CHARS) {
    return {
      success: false,
      error: `Style instructions must be ${MAX_STYLE_INSTRUCTIONS_CHARS.toLocaleString()} characters or fewer.`,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Not signed in." };
  }

  /* Belt-and-suspenders: RLS already restricts `books` to the owning user,
   * but match that row-owner explicitly so a forged projectId fails fast
   * with a clean error instead of a silent 0-row update. */
  const { data: book, error: lookupError } = await supabase
    .from("books")
    .select("id, user_id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (lookupError || !book) {
    return { success: false, error: "Project not found." };
  }

  const { error: updateError } = await supabase
    .from("books")
    .update({
      style_examples: trimmedExamples.length > 0 ? trimmedExamples : null,
      style_instructions: trimmedInstructions.length > 0 ? trimmedInstructions : null,
    })
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (updateError) {
    return { success: false, error: "Could not save voice & style." };
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/style`);
  return { success: true };
}
