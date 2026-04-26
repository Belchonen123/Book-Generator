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
 * For each task, this UPSERTs the platform row and updates `template_text`
 * + `updated_at` so existing environments don't remain on stale defaults.
 */
export async function ensurePlatformDefaults(
  supabase: SupabaseClient<Database>,
): Promise<void> {
  const now = new Date().toISOString();

  for (const taskId of Object.keys(DEFAULT_TEMPLATES) as DefaultTemplateTaskId[]) {
    const templateText = DEFAULT_TEMPLATES[taskId];
    const name = DEFAULT_TEMPLATE_NAMES[taskId];

    const { error } = await supabase.from("prompt_templates").upsert(
      {
        user_id: null,
        project_id: null,
        task_id: taskId,
        name,
        template_text: templateText,
        is_default: true,
        updated_at: now,
      },
      { onConflict: "task_id" },
    );

    if (error) {
      console.error("[prompt-defaults] failed to reconcile", { taskId, error });
      continue;
    }
    console.info("[prompt-defaults] reconciled platform default", { taskId });
  }
}
