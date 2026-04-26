"use server";

/**
 * CRUD actions for the Prompt Template Editor.
 *
 * Two surfaces share the same helpers:
 *   - `/dashboard/settings/prompts`   — user-wide overrides (project_id is null)
 *   - `/projects/[id]/prompts`        — project-scoped overrides
 *
 * All writes go through `saveTemplate`; the `projectId` argument is the
 * only difference between the two surfaces. Reset clears the row entirely
 * (so the resolver's fallback chain surfaces the next-scoped template or
 * the platform default).
 */
import { revalidatePath } from "next/cache";

import { MAX_TEMPLATE_LENGTH } from "@/lib/ai/prompt-templates";
import { listTemplatesForUser } from "@/lib/ai/prompt-templates";
import {
  extractVariables,
  missingRequiredVariables,
} from "@/lib/ai/template-resolver";
import {
  getPromptTask,
  isKnownTaskId,
  type PromptTaskId,
} from "@/lib/ai/template-variables";
import { createClient } from "@/lib/supabase/server";

export type SaveTemplateResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export type ResetTemplateResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Upsert the user's override for `taskId`. When `projectId` is null we
 * target the user-wide row; otherwise we target the project-scoped row.
 *
 * `acknowledgedCriticalRemovals` is the list of critical variables the UI
 * asked the user to confirm removing. If the template is missing OTHER
 * critical variables that were NOT acknowledged, the save is rejected.
 * This mirrors the confirmation dialog in the editor — the server is the
 * source of truth for "you actually confirmed."
 */
export async function saveTemplate(params: {
  taskId: string;
  projectId: string | null;
  templateText: string;
  name?: string;
  acknowledgedCriticalRemovals?: string[];
}): Promise<SaveTemplateResult> {
  const { taskId, projectId, templateText, acknowledgedCriticalRemovals } =
    params;

  if (!isKnownTaskId(taskId)) {
    return { ok: false, error: "Unknown prompt task." };
  }

  const trimmed = (templateText ?? "").trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Template cannot be empty." };
  }
  if (trimmed.length > MAX_TEMPLATE_LENGTH) {
    return {
      ok: false,
      error: `Template is over the ${MAX_TEMPLATE_LENGTH.toLocaleString()} character cap.`,
    };
  }

  /* Syntactic + allow-list check. We warn on unknown variables but don't
   * block the save — power users might reference variables a future
   * migration will add. Critical-variable removal IS blocking, but the
   * UI asks for acknowledgement first; we just re-check here. */
  const task = getPromptTask(taskId);
  const missingCritical = missingRequiredVariables(trimmed, task.criticalVariables);
  const acked = new Set(acknowledgedCriticalRemovals ?? []);
  const unacknowledgedCritical = missingCritical.filter((v) => !acked.has(v));
  if (unacknowledgedCritical.length > 0) {
    return {
      ok: false,
      error: `Template is missing critical variables: ${unacknowledgedCritical
        .map((v) => `{${v}}`)
        .join(", ")}. Open the editor and acknowledge the warning to save.`,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { ok: false, error: "Not signed in." };
  }

  /* For project-scoped saves, double-check book ownership even though
   * RLS also enforces it — a clean error beats a silent 0-row insert. */
  if (projectId) {
    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (bookError || !book) {
      return { ok: false, error: "Project not found." };
    }
  }

  const defaultName = `${task.label} — ${projectId ? "project override" : "my override"}`;
  const name = (params.name ?? "").trim() || defaultName;

  /* Upsert on (user_id, project_id, task_id). There can only be one row
   * per (user, project, task); we either update it in place or insert.
   * Two branches because the supabase-js filter builder treats
   * `.is(col, null)` and `.eq(col, x)` as incompatible overloads. */
  let existingRowId: string | null = null;
  if (projectId === null) {
    const { data: nullScoped } = await supabase
      .from("prompt_templates")
      .select("id")
      .eq("user_id", user.id)
      .eq("task_id", taskId)
      .is("project_id", null)
      .maybeSingle();
    existingRowId = nullScoped?.id ?? null;
  } else {
    const { data: scoped } = await supabase
      .from("prompt_templates")
      .select("id")
      .eq("user_id", user.id)
      .eq("task_id", taskId)
      .eq("project_id", projectId)
      .maybeSingle();
    existingRowId = scoped?.id ?? null;
  }

  if (existingRowId) {
    const { error: updateError } = await supabase
      .from("prompt_templates")
      .update({
        template_text: trimmed,
        name,
      })
      .eq("id", existingRowId)
      .eq("user_id", user.id);
    if (updateError) {
      return { ok: false, error: "Could not save template." };
    }
    revalidatePaths(projectId);
    return { ok: true, id: existingRowId };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("prompt_templates")
    .insert({
      user_id: user.id,
      project_id: projectId,
      task_id: taskId,
      name,
      template_text: trimmed,
      is_default: false,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { ok: false, error: "Could not save template." };
  }

  revalidatePaths(projectId);
  return { ok: true, id: inserted.id };
}

/**
 * Delete the user's override for `taskId`, so the resolver falls back to
 * the next tier (user-wide → platform default → built-in).
 */
export async function resetTemplate(params: {
  taskId: string;
  projectId: string | null;
}): Promise<ResetTemplateResult> {
  const { taskId, projectId } = params;

  if (!isKnownTaskId(taskId)) {
    return { ok: false, error: "Unknown prompt task." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { ok: false, error: "Not signed in." };
  }

  /* Supabase builder fragments can't combine `.is(col, null)` cleanly
   * with other `.eq`s in all versions; run two separate branches to
   * avoid deleting the wrong scope. */
  let deleteError: { message: string } | null = null;
  if (projectId === null) {
    const { error } = await supabase
      .from("prompt_templates")
      .delete()
      .eq("user_id", user.id)
      .eq("task_id", taskId)
      .is("project_id", null);
    deleteError = error;
  } else {
    const { error } = await supabase
      .from("prompt_templates")
      .delete()
      .eq("user_id", user.id)
      .eq("task_id", taskId)
      .eq("project_id", projectId);
    deleteError = error;
  }

  if (deleteError) {
    return { ok: false, error: "Could not reset template." };
  }

  revalidatePaths(projectId);
  return { ok: true };
}

/** Server-safe listing for the settings page loader. */
export async function loadTemplatesForEditor(params: {
  projectId: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  return listTemplatesForUser(supabase, {
    userId: user.id,
    projectId: params.projectId,
  });
}

/**
 * Parse the variables a proposed template references, for client-side
 * "your template uses these vars" display. Exposed as a server action so
 * the client doesn't have to import the resolver regex directly.
 */
export async function analyzeTemplate(params: {
  taskId: string;
  templateText: string;
}): Promise<{
  variables: string[];
  missingCritical: string[];
}> {
  if (!isKnownTaskId(params.taskId)) {
    return { variables: [], missingCritical: [] };
  }
  const task = getPromptTask(params.taskId);
  return {
    variables: extractVariables(params.templateText),
    missingCritical: missingRequiredVariables(
      params.templateText,
      task.criticalVariables,
    ),
  };
}

function revalidatePaths(projectId: string | null): void {
  revalidatePath("/dashboard/settings/prompts");
  if (projectId) {
    revalidatePath(`/projects/${projectId}/prompts`);
  }
}
