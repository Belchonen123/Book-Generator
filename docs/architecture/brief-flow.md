# Refined idea → AI prompts (brief field flow)

Idea refinement stores structured JSON in `books.refined_idea` (Zod: `RefinedIdeaBrief` in `lib/refined-idea/schema.ts`).

## Fields that must reach downstream without being dropped

| Field(s) | Source | Where used |
| --- | --- | --- |
| `voice_anchor`, `authorial_stance`, `cultural_texture`, `forbidden_moves` | `refined_idea` | `extractBriefCraftFromRefined` in `app/api/ai/generate-chapter/route.ts` → `bookContext` (voice block) |
| `emotional_contract`, `arc_shape`, `reader_before_state`, `reader_after_state` (legacy: `before_state`, `after_state`) | `refined_idea` | Same extraction via `pickReaderArcFieldsFromBrief` → `bookContext` (reader-arc lines after voice block) |
| Full brief | `refinedIdeaToPositioningBlock` / `briefSourceForBookRow` | Chapter `refined brief` string; outline user message (JSON); voice-to-chapter context |

**Helpers:** `lib/refined-idea/reader-arc.ts` centralizes reader-arc line formatting. When adding a new refinement field, thread it into `RefinedIdeaBrief`, `extractBriefCraftFromRefined` (or a dedicated extractor), and the relevant prompt assemblers — do not only append to the JSON if nothing reads it.

## Routes

- **Generate outline** (`app/api/ai/generate-outline/route.ts`): `brief` is the string from `briefSourceForBookRow`; a **Reader arc** section is appended when those fields are non-empty.
- **Generate chapter** (`app/api/ai/generate-chapter/route.ts`): `buildBookContext` injects craft targets, voice block, then reader-arc lines, then title/genre and the rest.
- **Voice-to-chapter** (`app/api/ai/voice-to-chapter/route.ts`): `buildBookContextForVoice` prepends reader-arc lines when present.

## System prompts

- **Fiction craft** (`lib/openai/chapter-system-prompt-sections.ts`, `FICTION_CRAFT_REQUIREMENTS`): includes **Serve the emotional contract and reader arc**.
- **Non-fiction** (`getChapterSystemPromptForBookType` in `lib/openai/prompts.ts`): **Reader in the chapter** paragraph ties chapter endings to before/after reader state.

When extending refinement, update this file and the Zod schema in the same change.
