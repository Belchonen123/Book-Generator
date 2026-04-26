import { z } from "zod";

import { INLINE_COMMAND_IDS } from "@/lib/ai/inline-commands";

export const RefinementConversationMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(32_000),
});

/** POST /api/ai/refine-idea */
export const RefinementRequestSchema = z.object({
  bookId: z.string().uuid(),
  messages: z.array(RefinementConversationMessageSchema).max(120),
  userMessage: z.string().min(1).max(32_000),
});

/** POST /api/ai/generate-outline */
export const OutlineRequestSchema = z.object({
  bookId: z.string().uuid(),
  rawIdea: z.string().max(50_000).optional(),
  refinedIdeaOverride: z.string().max(50_000).optional(),
  conversation: z.array(RefinementConversationMessageSchema).max(120).optional(),
});

/** POST /api/ai/generate-chapter */
export const ChapterRequestSchema = z.object({
  bookId: z.string().uuid(),
  chapterId: z.string().uuid(),
  /** Optional codex entries to force-include in this generation prompt. */
  selectedCodexEntryIds: z.array(z.string().uuid()).max(50).optional(),
  /** When true, the pre-write revision snapshot is tagged `regenerate_for_outline`. */
  regenerateForOutline: z.boolean().optional(),
});

/** POST /api/ai/polish-replacements — Pro, after bulk find/replace. */
export const PolishReplacementsRequestSchema = z.object({
  bookId: z.string().uuid(),
  chapterId: z.string().uuid(),
  originalText: z.string().max(500_000),
  replacedText: z.string().max(500_000),
  oldPhrase: z.string().max(20_000),
  newPhrase: z.string().max(20_000),
});

/** POST /api/ai/check-consistency — fiction Pro-only continuity checker. */
export const CheckConsistencyRequestSchema = z.object({
  bookId: z.string().uuid(),
  chapterId: z.string().uuid(),
});

/** POST /api/ai/analyze-beats — fiction Pro-only scene-beat / pacing map. */
export const AnalyzeBeatsRequestSchema = z.object({
  bookId: z.string().uuid(),
  chapterId: z.string().uuid(),
});

/** POST /api/ai/slop-scan — regex + optional deep LLM scan for AI-default phrasing. */
export const SlopScanRequestSchema = z.object({
  bookId: z.string().uuid(),
  chapterId: z.string().uuid(),
  /** When set, scan this text instead of loading `chapters.content` (e.g. unsaved buffer). */
  text: z.string().max(500_000).optional(),
  /**
   * When true, also runs a gpt-4o-mini pass for non-regex “AI default prose”
   * tics. Max ~20 items.
   */
  deep: z.boolean().optional(),
});

/** POST /api/ai/rewrite-transitions — Pro-only, after drag-reorder. */
export const RewriteTransitionsRequestSchema = z.object({
  bookId: z.string().uuid(),
  chapterIds: z.array(z.string().uuid()).min(1).max(50),
});

/** POST /api/audio/generate — Pro-only audiobook. */
export const AudioGenerateRequestSchema = z.object({
  bookId: z.string().uuid(),
  voiceId: z.string().min(1).max(120),
  voiceName: z.string().min(1).max(200),
  /** When set, only these chapters are narrated (must be draft/edited/approved with body text). */
  chapterIds: z.array(z.string().uuid()).min(1).max(80).optional(),
});

/** POST /api/ai/generate-cover */
export const CoverRequestSchema = z.object({
  bookId: z.string().uuid(),
  customPrompt: z.string().min(1).max(4000).optional(),
});

/** POST /api/ai/generate-book-metadata */
export const BookMetadataRequestSchema = z.object({
  bookId: z.string().uuid(),
});

/** POST /api/ai/generate-subtitle — brief fields live in client state only. */
export const SubtitleRequestSchema = z.object({
  bookId: z.string().uuid(),
  brief: z.object({
    title: z.string().min(1).max(300),
    genre: z.string().max(200).optional(),
    tone: z.string().max(400).optional(),
    audience: z.string().max(400).optional(),
    premise: z.string().max(12_000).optional(),
    themes: z.string().max(600).optional(),
  }),
});

const REGENERATE_BRIEF_SNAPSHOT = z.object({
  title: z.string().max(300).optional(),
  subtitle: z.string().max(200).optional(),
  genre: z.string().max(200).optional(),
  audience: z.string().max(400).optional(),
  premise: z.string().max(12_000).optional(),
  tone: z.string().max(400).optional(),
  themes: z.string().max(800).optional(),
  estimated_length: z.string().max(200).optional(),
});

/** POST /api/ai/regenerate-idea-field */
export const RegenerateIdeaFieldRequestSchema = z.object({
  bookId: z.string().uuid(),
  field: z.enum([
    "title",
    "subtitle",
    "genre",
    "audience",
    "premise",
    "tone",
    "themes",
    "estimated_length",
  ]),
  brief: REGENERATE_BRIEF_SNAPSHOT,
  conversation: z.array(RefinementConversationMessageSchema).max(120).optional().default([]),
});

const IdeaCodexSeedBucketsSchema = z.object({
  characters: z.array(z.string().max(300)).max(60).optional().default([]),
  locations: z.array(z.string().max(300)).max(60).optional().default([]),
  objects: z.array(z.string().max(300)).max(60).optional().default([]),
  factions: z.array(z.string().max(300)).max(60).optional().default([]),
  lore: z.array(z.string().max(300)).max(60).optional().default([]),
  subplots: z.array(z.string().max(300)).max(60).optional().default([]),
});

/** POST /api/ai/extract-codex-seeds */
export const ExtractCodexSeedsRequestSchema = z.object({
  bookId: z.string().uuid(),
  brief: REGENERATE_BRIEF_SNAPSHOT.optional().default({}),
  conversation: z.array(RefinementConversationMessageSchema).max(120).optional().default([]),
});

export const ExtractCodexSeedsResponseSchema = IdeaCodexSeedBucketsSchema;

/** POST /api/ai/generate-back-cover */
export const BackCoverRequestSchema = z.object({
  bookId: z.string().uuid(),
});

/** POST /api/ai/generate-about-author */
export const AboutAuthorRequestSchema = z.object({
  bookId: z.string().uuid(),
});

/** Supported book trim sizes for DOCX export. */
export const TrimSizeSchema = z.enum([
  "us-letter",
  "us-trade",
  "digest",
  "executive",
  "a4",
  "a5",
  "pocket",
]);
export type TrimSizeId = z.infer<typeof TrimSizeSchema>;

/** POST /api/compile-book */
export const CompileRequestSchema = z.object({
  bookId: z.string().uuid(),
  trimSize: TrimSizeSchema.optional(),
});

/** POST /api/export-kdp-pack */
export const KdpPackRequestSchema = z.object({
  bookId: z.string().uuid(),
});

/** POST /api/series/compile-boxed-set */
export const SeriesCompileRequestSchema = z.object({
  seriesId: z.string().uuid(),
  trimSize: TrimSizeSchema.optional(),
  /** Explicit inclusion list; omit to default to all books in the series. */
  includedBookIds: z.array(z.string().uuid()).min(1).optional(),
  frontMatter: z
    .object({
      boxedSetTitle: z.string().trim().max(200).nullable().optional(),
      dedicationMd: z.string().trim().max(4_000).nullable().optional(),
      authorNoteMd: z.string().trim().max(8_000).nullable().optional(),
      readingOrderCopyMd: z.string().trim().max(20_000).nullable().optional(),
    })
    .optional(),
  backMatter: z
    .object({
      aboutAuthorMd: z.string().trim().max(8_000).nullable().optional(),
      alsoByAuthorMd: z.string().trim().max(20_000).nullable().optional(),
      newsletterSignupMd: z.string().trim().max(4_000).nullable().optional(),
    })
    .optional(),
});

/** POST /api/ai/expand-outline */
export const ExpandOutlineRequestSchema = z.object({
  bookId: z.string().uuid(),
  chapterId: z.string().uuid(),
  // Optional author direction that steers the outline expansion
  // (e.g. "focus more on the antagonist's motivations").
  prompt: z.string().max(2_000).optional(),
});

/**
 * Supported inline-assist slash-command actions. Keep in sync with the
 * menu items in `components/book/editor/SlashCommandMenu.tsx` and the
 * per-action prompts in `app/api/ai/inline-assist/route.ts`.
 */
export const INLINE_ASSIST_ACTIONS = [
  "rewrite",
  "expand",
  "beat",
  "describe",
  "dialogue",
  "summary",
] as const;

export type InlineAssistAction = (typeof INLINE_ASSIST_ACTIONS)[number];

/** POST /api/ai/inline-assist — slash-command inline AI commands. */
export const InlineAssistRequestSchema = z.object({
  action: z.enum(INLINE_ASSIST_ACTIONS),
  bookId: z.string().uuid(),
  chapterId: z.string().uuid(),
  /** Text at the cursor range being replaced. Empty for commands like `beat` where the menu is invoked on a fresh line. */
  selectedText: z.string().max(40_000).default(""),
  /** Up to 500 chars of chapter text preceding the cursor, for voice continuity. */
  contextBefore: z.string().max(2_000).optional(),
  /** Up to 300 chars of chapter text following the cursor, so the replacement flows back into existing prose. */
  contextAfter: z.string().max(1_500).optional(),
});

/**
 * POST /api/ai/inline-command — bubble-menu multi-alternative rewriter.
 *
 * The route streams 2–3 rewrites of the selected passage, separated by the
 * literal delimiter `---ALTERNATIVE---` on its own line. Context windows are
 * clamped here (server re-clamps too) so the client can't balloon the prompt
 * with the whole chapter.
 */
export const InlineCommandRequestSchema = z.object({
  chapterId: z.string().uuid(),
  command: z.enum(INLINE_COMMAND_IDS),
  /** The highlighted passage to rewrite. Hard-capped well below the 2_000-word soft UI limit. */
  selection: z.string().min(1).max(40_000),
  /** ~500 words before the selection; sanitized and trimmed to sentence boundaries client-side. */
  precedingContext: z.string().max(8_000).optional().default(""),
  /** ~300 words after the selection. */
  followingContext: z.string().max(6_000).optional().default(""),
  /** Required when `command === "custom"`; ignored otherwise. */
  customInstruction: z.string().max(2_000).optional(),
  /** Number of distinct rewrites to stream. Hard cap matches the card-stack UI. */
  alternativeCount: z.number().int().min(1).max(4).optional().default(3),
});

/** POST /api/ai/chapter-assist */
export const ChapterAssistRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("expand"),
    bookId: z.string().uuid(),
    chapterId: z.string().uuid(),
    selectedText: z.string().min(1).max(80_000),
    selectedCodexEntryIds: z.array(z.string().uuid()).max(50).optional(),
    // Optional author instruction that steers the expansion (e.g.
    // "add a vivid sensory description of the storm"). Kept short so prompts
    // stay focused and predictable.
    prompt: z.string().max(2_000).optional(),
  }),
  z.object({
    action: z.literal("tone"),
    bookId: z.string().uuid(),
    chapterId: z.string().uuid(),
    selectedText: z.string().min(1).max(80_000),
    selectedCodexEntryIds: z.array(z.string().uuid()).max(50).optional(),
    tone: z.enum(["formal", "casual", "dramatic"]),
  }),
  z.object({
    action: z.literal("rewrite"),
    bookId: z.string().uuid(),
    chapterId: z.string().uuid(),
    selectedText: z.string().min(1).max(80_000),
    selectedCodexEntryIds: z.array(z.string().uuid()).max(50).optional(),
    // Required for rewrite: free-form direction ("make this more tense").
    prompt: z.string().min(1).max(2_000),
  }),
  z.object({
    action: z.literal("shorten"),
    bookId: z.string().uuid(),
    chapterId: z.string().uuid(),
    selectedText: z.string().min(1).max(80_000),
    selectedCodexEntryIds: z.array(z.string().uuid()).max(50).optional(),
  }),
  z.object({
    action: z.literal("proofread"),
    bookId: z.string().uuid(),
    chapterId: z.string().uuid(),
    selectedText: z.string().min(1).max(80_000),
    selectedCodexEntryIds: z.array(z.string().uuid()).max(50).optional(),
  }),
  z.object({
    action: z.literal("continue"),
    bookId: z.string().uuid(),
    chapterId: z.string().uuid(),
    selectedCodexEntryIds: z.array(z.string().uuid()).max(50).optional(),
  }),
]);

/** POST /api/ai/chat body schema. */
export const ChatMentionSchema = z.object({
  type: z.enum(["codex", "chapter"]),
  id: z.string().uuid(),
  label: z.string().max(200).optional(),
});

export const ChatRequestSchema = z.object({
  bookId: z.string().uuid(),
  /** Thread to append to. `null` means "start a new thread on submit". */
  threadId: z.string().uuid().nullable().optional(),
  /** Chapter pinning — lets the assembler bias context toward this chapter. */
  chapterId: z.string().uuid().nullable().optional(),
  /** The new user message. */
  userMessage: z.string().min(1).max(16_000),
  mentions: z.array(ChatMentionSchema).max(20).optional().default([]),
});

export type ChatMention = z.infer<typeof ChatMentionSchema>;
export type ChatRequestBody = z.infer<typeof ChatRequestSchema>;

/** POST /api/ai/brainstorm body schema. */
export const BrainstormRequestSchema = z.object({
  bookId: z.string().uuid(),
  /** Preset id. UI validates against `BRAINSTORM_PRESET_IDS`. */
  topic: z.string().min(1).max(64),
  /** Final composer text (may have been edited post-preset). */
  prompt: z.string().trim().min(1).max(4_000),
  /** Number of options to generate. Model obeys as a hard constraint. */
  count: z.number().int().min(3).max(20).optional().default(10),
  /**
   * Keepers from previous sessions to use as "more like these" examples.
   * Empty/missing = fresh brainstorm.
   */
  keepers: z.array(z.string().trim().min(1).max(2_000)).max(30).optional().default([]),
});

export type BrainstormRequestBody = z.infer<typeof BrainstormRequestSchema>;

/**
 * Length hints for scene-beat expansions. Mapped to a target word count on
 * the server (see `SCENE_BEAT_LENGTH_WORDS`). The model obeys these as a
 * soft target; server-side `max_tokens` is sized to allow the `long` path
 * without truncation.
 */
export const SCENE_BEAT_LENGTHS = ["short", "medium", "long"] as const;
export type SceneBeatLength = (typeof SCENE_BEAT_LENGTHS)[number];

/** Target word counts advertised to the model for each length hint. */
export const SCENE_BEAT_LENGTH_WORDS: Record<SceneBeatLength, number> = {
  short: 200,
  medium: 400,
  long: 700,
};

/**
 * POST /api/ai/scene-beat — scene-beat block expansion (Prompt 9).
 *
 * The editor owns a custom TipTap node that holds the `beatText` the
 * author wrote (plain English + bracketed stage directions). On Generate,
 * that text + the `chapterId` + a length hint are POSTed here, and the
 * route streams back raw prose bytes which the node renders live.
 *
 * The 8,000-char beat cap is intentionally generous — authors sometimes
 * paste whole outline paragraphs into a beat. The server still re-clamps
 * before hitting the model.
 */
export const SceneBeatRequestSchema = z.object({
  chapterId: z.string().uuid(),
  beatText: z.string().trim().min(1).max(8_000),
  lengthHint: z.enum(SCENE_BEAT_LENGTHS).optional().default("medium"),
});

export type SceneBeatRequestBody = z.infer<typeof SceneBeatRequestSchema>;
