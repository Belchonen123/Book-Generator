import { z } from "zod";

import { getOpenAI } from "@/lib/openai/client";
import { getCharacterBiblePromptForBookType } from "@/lib/ai/prompt-templates";
import type { BookTypeDb, Json } from "@/types/database.types";
import { logServerError } from "@/lib/utils/errors";
import { sanitizeText } from "@/lib/utils/sanitize";

const characterEntrySchema = z.object({
  name: z.string().min(1),
  role: z.string().optional(),
  physical_description: z.string().optional(),
  voice_and_speech: z.string().optional(),
  motivation_or_wound: z.string().optional(),
  relationships: z.string().optional(),
  nervous_habit: z.string().optional(),
  contradiction: z.string().optional(),
});

export const characterBibleResponseSchema = z.object({
  characters: z.array(characterEntrySchema).min(1),
  setting_anchors: z.string().optional(),
  continuity_rules: z.string().optional(),
});

export type CharacterBiblePayload = z.infer<typeof characterBibleResponseSchema>;

function stripJsonFence(text: string): string {
  const t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/i;
  const m = t.match(fence);
  if (m?.[1]) return m[1].trim();
  return t;
}

/** Plain text block for the chapter system prompt (JSON is readable and unambiguous for the model). */
export function characterBibleToPromptBlock(bible: Json | null): string | null {
  if (bible === null || bible === undefined) return null;
  if (typeof bible === "string") {
    const t = bible.trim();
    return t.length > 0 ? sanitizeText(t) : null;
  }
  if (typeof bible !== "object") return null;
  try {
    const s = JSON.stringify(bible, null, 2).trim();
    return s.length > 0 ? s : null;
  } catch {
    return null;
  }
}

export async function generateCharacterBiblePayload(params: {
  bookTitle: string;
  bookType: BookTypeDb;
  genre: string | null;
  tone: string | null;
  brief: string;
  outlineSections: Json;
}): Promise<{ payload: CharacterBiblePayload; tokensUsed: number } | null> {
  const systemPrompt = getCharacterBiblePromptForBookType(params.bookType);
  const userContent = [
    `Book title: ${sanitizeText(params.bookTitle.trim() || "Untitled")}`,
    params.genre ? `Genre: ${sanitizeText(params.genre)}` : null,
    params.tone ? `Tone: ${sanitizeText(params.tone)}` : null,
    "",
    "Author brief (refined idea and/or raw concept):",
    sanitizeText(params.brief.trim()) || "(No brief text — infer only from outline.)",
    "",
    "Approved outline (JSON array of chapter sections):",
    JSON.stringify(params.outlineSections ?? []),
  ]
    .filter((l) => l !== null)
    .join("\n");

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
      temperature: 0.35,
    });

    const tokensUsed =
      completion.usage?.total_tokens ??
      Math.ceil((systemPrompt.length + userContent.length) / 4);

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return null;

    const completionText = stripJsonFence(raw);
    let obj: unknown;
    try {
      obj = JSON.parse(completionText) as unknown;
    } catch {
      logServerError("character-bible.json-parse", new Error("invalid JSON"));
      return null;
    }

    const zResult = characterBibleResponseSchema.safeParse(obj);
    if (!zResult.success) {
      logServerError("character-bible.zod", zResult.error);
      return null;
    }

    return { payload: zResult.data, tokensUsed };
  } catch (e) {
    logServerError("character-bible.openai", e);
    return null;
  }
}
