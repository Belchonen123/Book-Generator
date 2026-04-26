import { afterEach, describe, expect, it, vi } from "vitest";

import { characterBibleToPromptText } from "@/lib/ai/character-bible-prompt";
import {
  CHECK_CONSISTENCY_SYSTEM_PROMPT,
  DEFAULT_TEMPLATES,
  getBookMetadataPrompt,
  getChapterSystemPrompt,
  getCoverPromptSystemPrompt,
} from "@/lib/ai/prompt-templates";
import {
  resolveSystemPromptFromTemplate,
} from "@/lib/ai/templated-system-prompt";
import {
  PROMPT_TASKS,
  TEMPLATE_VARIABLES,
  type PromptTaskId,
} from "@/lib/ai/template-variables";
import { makeMockSupabase } from "@/lib/ai/__tests__/fixtures/ai-fixtures";

afterEach(() => {
  vi.restoreAllMocks();
});

function promptTemplateRow(args: {
  taskId: PromptTaskId;
  templateText: string;
  id?: string;
}) {
  return {
    id: args.id ?? `template-${args.taskId}`,
    user_id: null,
    project_id: null,
    task_id: args.taskId,
    name: `${args.taskId} test template`,
    template_text: args.templateText,
    is_default: true,
  };
}

describe("resolveSystemPromptFromTemplate", () => {
  it("resolves every registered template variable when values are provided", async () => {
    const variableNames = Object.keys(TEMPLATE_VARIABLES);
    const variables = Object.fromEntries(
      variableNames.map((name, index) => [name, `VALUE_${index}_${name}`]),
    );
    const templateText = variableNames
      .map((name) => `${name}={${name}}`)
      .join("\n");
    const supabase = makeMockSupabase({
      prompt_templates: [
        promptTemplateRow({ taskId: "chapter-gen", templateText }),
      ],
    });

    const result = await resolveSystemPromptFromTemplate({
      supabase,
      userId: "user-1",
      projectId: "book-main",
      taskId: "chapter-gen",
      variables,
      fallbackPrompt: "fallback",
    });

    expect(result.usedFallback).toBe(false);
    expect(result.unknownVariables).toEqual([]);
    for (const [name, value] of Object.entries(variables)) {
      expect(result.systemPrompt).toContain(`${name}=${value}`);
    }
  });

  it("logs unresolved single-brace variables and preserves escaped double-brace text per current resolver behavior", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const supabase = makeMockSupabase({
      prompt_templates: [
        promptTemplateRow({
          taskId: "chapter-gen",
          templateText:
            "Known {project.title}; Missing {missing_var}; Escaped {{missing_var}}.",
        }),
      ],
    });

    const result = await resolveSystemPromptFromTemplate({
      supabase,
      userId: "user-1",
      projectId: "book-main",
      taskId: "chapter-gen",
      variables: { "project.title": "The Glass Orchard" },
      fallbackPrompt: "fallback",
    });

    expect(result.usedFallback).toBe(false);
    expect(result.systemPrompt).toContain("Known The Glass Orchard");
    expect(result.systemPrompt).toContain("Missing ;");
    // TODO: Desired behavior from the request is to preserve unresolved
    // variables as literal "{{variable_name}}". Current resolver treats
    // double braces as escaping and returns a single-brace literal.
    expect(result.systemPrompt).toContain("Escaped {missing_var}.");
    expect(result.unknownVariables).toEqual(["missing_var"]);
    expect(warnSpy).toHaveBeenCalledWith(
      '[template-resolver] unknown variable "{missing_var}" — rendered empty',
    );
  });

  it("falls back instead of throwing when template lookup fails", async () => {
    const supabase = {
      from: () => {
        throw new Error("database unavailable");
      },
    };
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await resolveSystemPromptFromTemplate({
      supabase: supabase as never,
      userId: "user-1",
      projectId: "book-main",
      taskId: "chapter-gen",
      variables: {},
      fallbackPrompt: "fallback prompt body",
    });

    expect(result.usedFallback).toBe(true);
    expect(result.systemPrompt).toBe("fallback prompt body");
    expect(errorSpy).toHaveBeenCalledWith(
      "[templated-system-prompt] lookup failed",
      expect.objectContaining({ taskId: "chapter-gen" }),
    );
  });

  it("uses the fallback prompt when the resolved template is empty", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const supabase = makeMockSupabase({
      prompt_templates: [
        promptTemplateRow({ taskId: "chapter-gen", templateText: "   " }),
      ],
    });

    const result = await resolveSystemPromptFromTemplate({
      supabase,
      userId: "user-1",
      projectId: "book-main",
      taskId: "chapter-gen",
      variables: {},
      fallbackPrompt: "non-empty fallback",
    });

    expect(result.usedFallback).toBe(true);
    expect(result.systemPrompt).toBe("non-empty fallback");
    expect(warnSpy).toHaveBeenCalledWith(
      "[templated-system-prompt] resolved template is empty, using fallback",
      expect.objectContaining({ taskId: "chapter-gen" }),
    );
  });
});

describe("prompt template context guarantees", () => {
  it("keeps style example variables available to prose-generating prompt tasks", () => {
    const proseTasks = [
      "chapter-gen",
      "voice-to-chapter",
      "generate-outline",
      "inline-command",
      "chapter-assist",
      "expand-outline",
      "chat",
      "scene-beat",
    ] satisfies PromptTaskId[];

    for (const taskId of proseTasks) {
      expect(PROMPT_TASKS[taskId].allowedVariables).toContain("style_examples");
      expect(PROMPT_TASKS[taskId].allowedVariables).toContain(
        "style_instructions",
      );
    }
  });

  it("does not inject style examples into metadata, cover, or analysis prompts", () => {
    const coverPrompt = getCoverPromptSystemPrompt(
      "The Glass Orchard",
      "Fantasy",
      "A town trades memories for fruit.",
      "Lyrical",
      "A Memory Fable",
      "A. Vale",
    );
    const metadataPrompt = getBookMetadataPrompt(
      "The Glass Orchard",
      "Fantasy",
      "Lyrical",
      "A town trades memories for fruit.",
    );

    expect(coverPrompt).not.toContain("style_examples");
    expect(coverPrompt).not.toContain("<style_examples>");
    expect(metadataPrompt).not.toContain("style_examples");
    expect(metadataPrompt).not.toContain("<style_examples>");
    expect(CHECK_CONSISTENCY_SYSTEM_PROMPT).not.toContain("style_examples");
    expect(CHECK_CONSISTENCY_SYSTEM_PROMPT).not.toContain("<style_examples>");
  });

  it("includes style placeholders in default prose templates that rely on template resolution", () => {
    expect(DEFAULT_TEMPLATES["chapter-gen"]).toContain("{style_examples}");
    expect(DEFAULT_TEMPLATES["chapter-gen"]).toContain("{style_instructions}");
    expect(DEFAULT_TEMPLATES["voice-to-chapter"]).toContain("{style_examples}");
    expect(DEFAULT_TEMPLATES["inline-command"]).toContain("{style_examples}");
    expect(DEFAULT_TEMPLATES["scene-beat"]).toContain("{style_instructions}");
  });

  it("includes banned-phrase guidance in the full chapter generation prompt", () => {
    const prompt = getChapterSystemPrompt(
      4,
      "The Bell Tree",
      2_500,
      "Mara follows the chime.",
      "Mara inherited the orchard.",
      null,
      "fiction",
      null,
      false,
    );

    expect(prompt).toContain("SLOP FILTERS");
    expect(prompt).toContain("Her eyes twinkled / widened");
    expect(prompt).toContain("AVOID AT ALL COSTS");
  });

  it("stringifies character bible JSON cleanly without trailing commas", () => {
    const text = characterBibleToPromptText({
      characters: [
        {
          name: "Mara Vale",
          role: "orchardist",
          physical_description: "Always carries pruning shears.",
        },
      ],
      setting_anchors: "The orchard is made of glass trees.",
    });

    expect(text).toContain('"characters": [');
    expect(text).toContain('"name": "Mara Vale"');
    expect(text).not.toMatch(/,\s*[}\]]/);
    expect(() => JSON.parse(text ?? "")).not.toThrow();
  });
});
