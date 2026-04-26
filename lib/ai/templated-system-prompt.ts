/**
 * Thin helper that AI routes use to turn the context-assembler's
 * `variables` dict into a final system prompt, respecting the user's
 * editable template when one exists.
 *
 * Usage:
 *
 *   const context = await buildGenerationContext({...});
 *   const { systemPrompt, active } = await resolveSystemPromptFromTemplate({
 *     supabase,
 *     userId: user.id,
 *     projectId: book.id,
 *     taskId: "inline-command",
 *     variables: context.variables,
 *     fallbackPrompt: context.systemPrompt,
 *   });
 *
 * If template lookup or resolution fails, we return `fallbackPrompt` —
 * usually the legacy concatenated prompt that the route used to produce.
 * This keeps every route resilient: a deleted platform-default row or a
 * corrupted user template never takes down generation.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getActiveTemplate,
  type ActiveTemplate,
} from "@/lib/ai/prompt-templates";
import { resolveTemplate } from "@/lib/ai/template-resolver";
import type { PromptTaskId } from "@/lib/ai/template-variables";
import type { Database } from "@/types/database.types";

export type ResolveSystemPromptFromTemplateResult = {
  /** The system prompt to pass to the model. */
  systemPrompt: string;
  /**
   * Metadata about which template the resolver picked — useful for
   * observability and for the "why did it generate this?" debug panel.
   */
  active: ActiveTemplate;
  /**
   * Unknown variables referenced by the template that weren't in the
   * dict. They're logged server-side, but routes can surface them in
   * response headers for debug builds if they care.
   */
  unknownVariables: string[];
  /**
   * True when we fell back to `fallbackPrompt`. Set when the template
   * lookup threw or the resolved text was empty.
   */
  usedFallback: boolean;
};

export async function resolveSystemPromptFromTemplate(params: {
  supabase: SupabaseClient<Database>;
  userId: string | null;
  projectId: string | null;
  taskId: PromptTaskId;
  variables: Readonly<Record<string, unknown>>;
  /**
   * Legacy system prompt used when template lookup fails, the resolver
   * throws, or the result is empty.
   */
  fallbackPrompt: string;
}): Promise<ResolveSystemPromptFromTemplateResult> {
  const { supabase, userId, projectId, taskId, variables, fallbackPrompt } =
    params;

  let active: ActiveTemplate;
  try {
    active = await getActiveTemplate(supabase, {
      userId,
      projectId,
      taskId,
    });
  } catch (e) {
    console.error("[templated-system-prompt] lookup failed", {
      taskId,
      error: (e as Error)?.message,
    });
    return {
      systemPrompt: fallbackPrompt,
      active: {
        source: "builtin",
        id: null,
        taskId,
        name: `${taskId} (fallback)`,
        templateText: "",
        isDefault: true,
      },
      unknownVariables: [],
      usedFallback: true,
    };
  }

  let resolved: ReturnType<typeof resolveTemplate>;
  try {
    resolved = resolveTemplate(active.templateText, variables);
  } catch (e) {
    console.error("[templated-system-prompt] resolve failed", {
      taskId,
      error: (e as Error)?.message,
    });
    return {
      systemPrompt: fallbackPrompt,
      active,
      unknownVariables: [],
      usedFallback: true,
    };
  }

  const trimmed = resolved.text.trim();
  if (trimmed.length === 0) {
    console.warn(
      "[templated-system-prompt] resolved template is empty, using fallback",
      { taskId, templateId: active.id },
    );
    return {
      systemPrompt: fallbackPrompt,
      active,
      unknownVariables: resolved.unknownVariables,
      usedFallback: true,
    };
  }

  try {
    console.info("[templated-system-prompt] resolved", {
      taskId,
      source: active.source,
      templateId: active.id,
      templateLength: resolved.text.length,
      unknownVariables: resolved.unknownVariables,
    });
  } catch {
    /* logging must never break generation */
  }

  return {
    systemPrompt: resolved.text,
    active,
    unknownVariables: resolved.unknownVariables,
    usedFallback: false,
  };
}
