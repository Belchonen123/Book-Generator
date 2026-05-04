import type { SupabaseClient } from "@supabase/supabase-js";

import { DEFAULT_TEMPLATES, type DefaultTemplateTaskId } from "@/lib/ai/prompt-templates";
import type { Database } from "@/types/database.types";

const DEFAULT_TEMPLATE_NAMES: Record<DefaultTemplateTaskId, string> = {
  "chapter-gen": "Chapter generation (default)",
  "voice-to-chapter": "Voice to chapter (default)",
  "generate-outline": "Outline generation (default)",
  "refine-idea": "Idea refinement (default)",
  "inline-command": "Inline editor command (default)",
  "chapter-assist": "Chapter assistant (default)",
  "expand-outline": "Expand outline beat (default)",
  chat: "Story chat (default)",
  "scene-beat": "Scene beat expansion (default)",
};

/**
 * Reconcile platform prompt defaults against in-repo defaults.
 *
 * Supabase/PostgREST cannot target this table's partial platform-default
 * unique index via `onConflict`, so use an explicit read followed by update
 * or insert. That keeps older environments from logging 42P10 on startup.
 */
export async function ensurePlatformDefaults(
  supabase: SupabaseClient<Database>,
): Promise<void> {
  const now = new Date().toISOString();

  for (const taskId of Object.keys(DEFAULT_TEMPLATES) as DefaultTemplateTaskId[]) {
    const templateText = DEFAULT_TEMPLATES[taskId];
    const name = DEFAULT_TEMPLATE_NAMES[taskId];

    const { data: existing, error: readError } = await supabase
      .from("prompt_templates")
      .select("id")
      .eq("task_id", taskId)
      .eq("is_default", true)
      .is("user_id", null)
      .is("project_id", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (readError) {
      console.error("[prompt-defaults] failed to read", { taskId, error: readError });
      continue;
    }

    const { error } = existing
      ? await supabase
          .from("prompt_templates")
          .update({
            name,
            template_text: templateText,
            updated_at: now,
          })
          .eq("id", existing.id)
      : await supabase.from("prompt_templates").insert({
          user_id: null,
          project_id: null,
          task_id: taskId,
          name,
          template_text: templateText,
          is_default: true,
          updated_at: now,
        });

    if (error) {
      console.error("[prompt-defaults] failed to reconcile", { taskId, error });
      continue;
    }

    console.info("[prompt-defaults] reconciled platform default", { taskId });
  }
}
