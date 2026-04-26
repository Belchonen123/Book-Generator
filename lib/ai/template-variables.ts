/**
 * Template variable registry for the Prompt Template Editor.
 *
 * Every variable the resolver supports lives here, along with the list of
 * tasks it applies to, a UI-facing label + description, and a
 * representative SAMPLE value used for the "Preview with sample data" tab
 * in the editor.
 *
 * The resolver consults `TEMPLATE_VARIABLES` to answer two questions:
 *   1. "Is this variable allowed for this task?" — `isVariableAllowed`
 *   2. "What does this variable look like when rendered?" — `SAMPLE_VARIABLE_VALUES`
 *
 * Keep variable IDs mustache-safe: alphanumeric + `.` + `_` only.
 */

/* ------------------------------------------------------------------ */
/*   Task registry                                                    */
/* ------------------------------------------------------------------ */

/** Stable identifiers used by `prompt_templates.task_id`. */
export const PROMPT_TASK_IDS = [
  "chapter-gen",
  "voice-to-chapter",
  "generate-outline",
  "refine-idea",
  "inline-command",
  "chapter-assist",
  "expand-outline",
  "chat",
  "scene-beat",
] as const;

export type PromptTaskId = (typeof PROMPT_TASK_IDS)[number];

export type PromptTaskDefinition = {
  id: PromptTaskId;
  label: string;
  shortDescription: string;
  longDescription: string;
  /** Which route calls this task. Shown in the UI for "where does this run?" */
  routePath: string;
  /**
   * Variables the resolver will fill in. Anything outside this set renders
   * to an empty string and logs a warning — user-authored templates are
   * supposed to stay within the documented slots.
   */
  allowedVariables: readonly string[];
  /**
   * Variables the UI warns about when the user removes them from a
   * template. Removing `{selection}` from inline-command, for example,
   * breaks the task entirely — so the editor confirms the change before
   * saving. "Critical" is a UX concept only; the resolver does not fail
   * hard on missing critical vars (the downstream AI will).
   */
  criticalVariables: readonly string[];
};

export const PROMPT_TASKS: Record<PromptTaskId, PromptTaskDefinition> = {
  "chapter-gen": {
    id: "chapter-gen",
    label: "Chapter generation",
    shortDescription: "Full chapter drafts (Chapters page → Generate).",
    longDescription:
      "Runs when the author asks the AI to draft a whole chapter. Receives the per-chapter beat, voice anchor, codex, prior-chapter summaries, and the end of the previous chapter for continuity.",
    routePath: "/api/ai/generate-chapter",
    allowedVariables: [
      "project.title",
      "project.genre",
      "project.pov",
      "project.tense",
      "project.premise",
      "chapter.number",
      "chapter.title",
      "chapter.beat",
      "codex",
      "style_examples",
      "style_instructions",
      "recent_prose",
      "prior_summaries",
      "series_context",
      "series_continuity",
    ],
    criticalVariables: ["chapter.title", "chapter.number"],
  },

  "voice-to-chapter": {
    id: "voice-to-chapter",
    label: "Voice to chapter",
    shortDescription: "Convert dictated notes into chapter prose.",
    longDescription:
      "Runs when the author records or uploads a voice memo and asks the app to append, replace, or rewrite chapter prose from the transcript.",
    routePath: "/api/ai/voice-to-chapter",
    allowedVariables: [
      "project.title",
      "project.genre",
      "project.pov",
      "project.tense",
      "project.premise",
      "chapter.number",
      "chapter.title",
      "chapter.beat",
      "style_examples",
      "style_instructions",
      "codex",
      "series_context",
      "series_continuity",
      "prior_summaries",
      "recent_prose",
      "user_instruction",
    ],
    criticalVariables: ["user_instruction"],
  },

  "generate-outline": {
    id: "generate-outline",
    label: "Outline generation",
    shortDescription: "Initial chapter-by-chapter outline from a refined brief.",
    longDescription:
      "Runs when the author clicks Generate outline. Produces the per-chapter skeleton that chapter-gen later expands into prose.",
    routePath: "/api/ai/generate-outline",
    allowedVariables: [
      "project.title",
      "project.genre",
      "project.pov",
      "project.tense",
      "project.premise",
      "style_examples",
      "style_instructions",
      "series_context",
      "series_continuity",
      "codex",
      "user_instruction",
    ],
    criticalVariables: [],
  },

  "refine-idea": {
    id: "refine-idea",
    label: "Idea refinement chat",
    shortDescription: "The Socratic editor that turns a one-liner into a brief.",
    longDescription:
      "Runs in the Idea step. The assistant asks one question at a time and emits a <REFINED_IDEA> JSON blob when the brief is rich enough.",
    routePath: "/api/ai/refine-idea",
    allowedVariables: [
      "project.title",
      "project.genre",
      "project.pov",
      "project.tense",
      "project.premise",
      "series_context",
      "user_instruction",
    ],
    criticalVariables: ["series_context"],
  },

  "inline-command": {
    id: "inline-command",
    label: "Inline editor command",
    shortDescription: "Commands run on a text selection in the chapter editor.",
    longDescription:
      "Runs when the author selects text and invokes an inline AI command (Rewrite, Continue, Polish, Custom). Receives the selection plus the surrounding context window.",
    routePath: "/api/ai/inline-command",
    allowedVariables: [
      "project.title",
      "project.genre",
      "project.pov",
      "project.tense",
      "project.premise",
      "chapter.number",
      "chapter.title",
      "codex",
      "style_examples",
      "style_instructions",
      "series_context",
      "series_continuity",
      "selection",
      "preceding_context",
      "following_context",
      "user_instruction",
    ],
    criticalVariables: ["selection", "user_instruction"],
  },

  "chapter-assist": {
    id: "chapter-assist",
    label: "Chapter assistant",
    shortDescription: "The side-panel chat that rides alongside a chapter.",
    longDescription:
      "Runs when the author asks the assistant a free-form question while editing a chapter (e.g. 'what happens if Rivka doesn't answer?').",
    routePath: "/api/ai/chapter-assist",
    allowedVariables: [
      "project.title",
      "project.genre",
      "project.pov",
      "project.tense",
      "project.premise",
      "chapter.number",
      "chapter.title",
      "codex",
      "style_examples",
      "style_instructions",
      "series_context",
      "series_continuity",
      "prior_summaries",
      "recent_prose",
      "user_instruction",
    ],
    criticalVariables: ["user_instruction"],
  },

  "expand-outline": {
    id: "expand-outline",
    label: "Expand outline beat",
    shortDescription: "Turns one outline beat into a shot list.",
    longDescription:
      "Runs when the author asks the assistant to break a beat into concrete scene moves without committing to prose yet.",
    routePath: "/api/ai/expand-outline",
    allowedVariables: [
      "project.title",
      "project.genre",
      "project.pov",
      "project.tense",
      "project.premise",
      "chapter.number",
      "chapter.title",
      "chapter.beat",
      "codex",
      "style_examples",
      "style_instructions",
      "series_context",
      "series_continuity",
      "prior_summaries",
      "user_instruction",
    ],
    criticalVariables: ["chapter.beat"],
  },

  "scene-beat": {
    id: "scene-beat",
    label: "Scene beat expansion",
    shortDescription:
      "Expands an author-written beat (plain English + [stage directions]) into prose.",
    longDescription:
      "Runs when the author inserts a scene-beat block in the chapter editor and clicks Generate. The beat text (with bracketed stage directions) is streamed back as ~200 / ~400 / ~700 words of prose that extends the current scene. Receives the full chapter-editor context: codex, style, prior-chapter summaries, last ~1,500 words.",
    routePath: "/api/ai/scene-beat",
    allowedVariables: [
      "project.title",
      "project.genre",
      "project.pov",
      "project.tense",
      "project.premise",
      "chapter.number",
      "chapter.title",
      "codex",
      "style_examples",
      "style_instructions",
      "series_context",
      "series_continuity",
      "recent_prose",
      "prior_summaries",
      "user_instruction",
    ],
    criticalVariables: ["user_instruction"],
  },

  chat: {
    id: "chat",
    label: "Story chat",
    shortDescription:
      "Sidebar chat panel that answers questions about the current book.",
    longDescription:
      "Runs whenever the author talks to the chapter-side chat panel. The resolver provides the book context, codex, outline summaries, and the current chapter prose so the assistant can answer grounded questions and brainstorm options.",
    routePath: "/api/ai/chat",
    allowedVariables: [
      "project.title",
      "project.genre",
      "project.pov",
      "project.tense",
      "project.premise",
      "chapter.number",
      "chapter.title",
      "codex",
      "style_examples",
      "style_instructions",
      "series_context",
      "series_continuity",
      "recent_prose",
      "prior_summaries",
      "user_instruction",
    ],
    criticalVariables: [],
  },
};

export const CRITICAL_VARIABLES_BY_TASK: Record<PromptTaskId, string[]> = {
  "chapter-gen": [
    "chapter.beat",
    "codex",
    "series_context",
    "prior_summaries",
    "recent_prose",
  ],
  "voice-to-chapter": ["codex", "series_context", "prior_summaries", "recent_prose"],
  "generate-outline": ["codex", "series_context"],
  "scene-beat": ["codex", "series_context", "prior_summaries", "recent_prose"],
  "inline-command": ["codex", "series_context", "selection", "preceding_context"],
  "chapter-assist": ["codex", "series_context", "recent_prose"],
  "expand-outline": ["codex", "series_context", "prior_summaries"],
  chat: ["codex", "series_context", "prior_summaries"],
  "refine-idea": ["series_context"],
};

/* ------------------------------------------------------------------ */
/*   Variable registry                                                */
/* ------------------------------------------------------------------ */

export type TemplateVariableDefinition = {
  id: string;
  label: string;
  description: string;
  /** Category used to group the palette buttons in the editor UI. */
  category: "project" | "chapter" | "context" | "selection" | "input";
  /** True when the variable's contents are usually multi-paragraph. */
  multiline: boolean;
  /** Value used by the editor's preview tab. */
  sample: string;
};

export const TEMPLATE_VARIABLES: Record<string, TemplateVariableDefinition> = {
  "project.title": {
    id: "project.title",
    label: "Project title",
    description: "Book title as saved on the project.",
    category: "project",
    multiline: false,
    sample: "The Last Cartographer",
  },
  "project.genre": {
    id: "project.genre",
    label: "Project genre",
    description: "Genre + subgenre string.",
    category: "project",
    multiline: false,
    sample: "Literary fiction, quiet speculative",
  },
  "project.pov": {
    id: "project.pov",
    label: "Point of view",
    description: "Narrative POV (first, close-third, etc).",
    category: "project",
    multiline: false,
    sample: "Close third, Aria",
  },
  "project.tense": {
    id: "project.tense",
    label: "Tense",
    description: "Tense of the prose (past, present, mixed).",
    category: "project",
    multiline: false,
    sample: "Past",
  },
  "project.premise": {
    id: "project.premise",
    label: "Project premise",
    description: "2–3 sentence core premise from the refined brief.",
    category: "project",
    multiline: true,
    sample:
      "A mapmaker who can only draw places she has grieved in is commissioned to map a city that isn't lost yet.",
  },

  "chapter.number": {
    id: "chapter.number",
    label: "Chapter number",
    description: "1-indexed chapter number.",
    category: "chapter",
    multiline: false,
    sample: "5",
  },
  "chapter.title": {
    id: "chapter.title",
    label: "Chapter title",
    description: "Title of the current chapter.",
    category: "chapter",
    multiline: false,
    sample: "The Room with the Broken AC",
  },
  "chapter.beat": {
    id: "chapter.beat",
    label: "Chapter beat",
    description:
      "Outline beat / one-line emotional contract for this chapter. What changes by the end.",
    category: "chapter",
    multiline: true,
    sample:
      "Aria returns to the apartment and realises the map she drew last week was of somewhere that hasn't happened yet. Ending: she stops drawing.",
  },

  codex: {
    id: "codex",
    label: "Worldbook (codex)",
    description:
      "Auto-selected codex entries relevant to this generation. Matched on name + aliases against the current text window.",
    category: "context",
    multiline: true,
    sample:
      "<worldbook>\n<entry type=\"character\" name=\"Aria Malka\">A cartographer who maps places of personal grief. 29, left-handed, carries a compass that no longer points north.</entry>\n<entry type=\"place\" name=\"Beit Vaga\">Jerusalem neighbourhood. Dry winds off the wadi, stone houses, a bakery that opens at 4am.</entry>\n</worldbook>",
  },
  style_examples: {
    id: "style_examples",
    label: "Style examples",
    description:
      "Voice-anchor prose sample from the project's Voice & Style page.",
    category: "context",
    multiline: true,
    sample:
      "<style_examples>\nThe AC had been broken since March. Nobody had fixed it. Aria stood by the window and counted the seconds the fan took to come back around.\n</style_examples>",
  },
  style_instructions: {
    id: "style_instructions",
    label: "Style instructions",
    description:
      "One-line steering note paired with the style examples (e.g. 'tighter dialogue, less ornate').",
    category: "context",
    multiline: false,
    sample: "Match this voice but keep the dialogue tighter and less ornate.",
  },
  recent_prose: {
    id: "recent_prose",
    label: "Recent prose",
    description:
      "Last ~1,500 words of prose in the current chapter (for continue/assist) or the end of the previous chapter (for chapter-gen).",
    category: "context",
    multiline: true,
    sample:
      "…and the map was wrong in the specific way maps get wrong when you are the one drawing them.",
  },
  prior_summaries: {
    id: "prior_summaries",
    label: "Prior chapter summaries",
    description:
      "Auto-generated one-paragraph summaries of every prior chapter, newest-last.",
    category: "context",
    multiline: true,
    sample:
      "### Chapter 1: Paper and the Wind\nAria takes a commission from a woman who lost a son she never had.\n\n### Chapter 2: The Compass that Lied\nShe discovers the compass points toward grief, not north.",
  },
  series_context: {
    id: "series_context",
    label: "Series context",
    description:
      "Structured <series> block with prior-book summaries, active multi-book arcs, and series metadata. Empty for standalone books.",
    category: "context",
    multiline: true,
    sample:
      "<series name=\"The Cartographer Sequence\" current_book=\"2 of 3\">\n<description>Three books about a mapmaker who can only draw places she has grieved in.</description>\n<previously_in_series>\n<book position=\"1\" title=\"Paper and the Wind\">\nAria accepts her first commission and discovers the compass points toward grief.\n</book>\n</previously_in_series>\n<active_arcs>\n<arc name=\"The Unbuilt City\" status=\"developing\">\nThe city Aria maps in Book 1 begins appearing in the real world piece by piece.\n</arc>\n</active_arcs>\n</series>",
  },
  series_continuity: {
    id: "series_continuity",
    label: "Series continuity (paragraph)",
    description:
      "Legacy paragraph-form series continuity guidance. Used mainly by chapter-gen and scene-beat templates.",
    category: "context",
    multiline: true,
    sample:
      "Aria remembers the hospital corridor from Book 1 and avoids naming the missing city aloud. Keep the unresolved 'Unbuilt City' arc developing; do not resolve it here.",
  },

  selection: {
    id: "selection",
    label: "Selected text",
    description: "The text the user has selected in the editor.",
    category: "selection",
    multiline: true,
    sample: "She felt a growing sense of unease about the situation.",
  },
  preceding_context: {
    id: "preceding_context",
    label: "Preceding context",
    description: "Prose immediately before the selection (~500 words).",
    category: "selection",
    multiline: true,
    sample:
      "Aria had been staring at the ceiling for an hour. The ceiling stared back.",
  },
  following_context: {
    id: "following_context",
    label: "Following context",
    description: "Prose immediately after the selection (~500 words).",
    category: "selection",
    multiline: true,
    sample:
      "Her phone buzzed. She let it buzz. The second buzz was harder to ignore.",
  },

  user_instruction: {
    id: "user_instruction",
    label: "User instruction",
    description:
      "Free-form prompt from the author. For inline commands this is the command they typed; for chapter-assist it's their question.",
    category: "input",
    multiline: true,
    sample: "Rewrite this tighter — cut adjectives, keep the image.",
  },
};

/* ------------------------------------------------------------------ */
/*   Lookups                                                          */
/* ------------------------------------------------------------------ */

export function isKnownTaskId(id: unknown): id is PromptTaskId {
  return (
    typeof id === "string" &&
    (PROMPT_TASK_IDS as readonly string[]).includes(id)
  );
}

export function getPromptTask(id: PromptTaskId): PromptTaskDefinition {
  return PROMPT_TASKS[id];
}

export function getAllowedVariables(id: PromptTaskId): readonly string[] {
  return PROMPT_TASKS[id].allowedVariables;
}

export function isVariableAllowed(
  taskId: PromptTaskId,
  variableName: string,
): boolean {
  return (
    PROMPT_TASKS[taskId].allowedVariables.includes(variableName) &&
    variableName in TEMPLATE_VARIABLES
  );
}

/** Sample variable dict for the "Preview with sample data" tab. */
export function getSampleVariableValues(
  taskId: PromptTaskId,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of PROMPT_TASKS[taskId].allowedVariables) {
    const def = TEMPLATE_VARIABLES[name];
    out[name] = def?.sample ?? "";
  }
  return out;
}

/**
 * Return the variables from `required` that are missing from a template.
 * Double braces (`{{` / `}}`) are treated as escaped literals and ignored.
 */
export function missingRequiredVariables(
  templateText: string,
  required: readonly string[],
): string[] {
  if (required.length === 0) return [];
  if (!templateText) return [...required];
  const normalized = templateText.replace(/\{\{|\}\}/g, "");
  const used = new Set<string>();
  const tokenRe = /\{([A-Za-z0-9_.\-]+)\}/g;
  let m: RegExpExecArray | null = tokenRe.exec(normalized);
  while (m) {
    used.add(m[1]);
    m = tokenRe.exec(normalized);
  }
  return required.filter((name) => !used.has(name));
}
