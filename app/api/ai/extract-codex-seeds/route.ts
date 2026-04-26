import { NextResponse } from "next/server";

import { EXTRACT_CODEX_SEEDS_SYSTEM_PROMPT } from "@/lib/ai/prompt-templates";
import { requireBookOwnedByUser } from "@/lib/api/book-access";
import { getOpenAI } from "@/lib/openai/client";
import { openAIRequestFailureResponse } from "@/lib/openai/request-errors";
import { createClient } from "@/lib/supabase/server";
import {
  apiJsonError,
  apiJsonRateLimited,
  ApiErrorCode,
  logServerError,
} from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import {
  ExtractCodexSeedsRequestSchema,
  ExtractCodexSeedsResponseSchema,
} from "@/lib/utils/schemas";
import { sanitizeText } from "@/lib/utils/sanitize";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ConversationTurn = { role: "user" | "assistant"; content: string };

function conversationToTranscript(messages: ConversationTurn[]): string {
  if (messages.length === 0) return "";
  return messages
    .map((m) => `${m.role === "user" ? "Author" : "Editor"}: ${sanitizeText(m.content).trim()}`)
    .filter((line) => line.length > "Author: ".length)
    .join("\n\n");
}

function trimSeeds(values: string[]): string[] {
  const out: string[] = [];
  for (const raw of values) {
    const v = sanitizeText(raw).replace(/\s+/g, " ").trim().slice(0, 300);
    if (!v) continue;
    if (!out.includes(v)) out.push(v);
    if (out.length >= 40) break;
  }
  return out;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiJsonError("Please sign in to continue.", ApiErrorCode.UNAUTHORIZED, 401);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiJsonError("Invalid JSON body.", ApiErrorCode.VALIDATION_ERROR, 400);
    }
    const parsed = ExtractCodexSeedsRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const { bookId, brief, conversation } = parsed.data;
    const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
    if (denied) return denied;

    const rl = await checkRateLimit(user.id, "suggest-codex-entry");
    if (!rl.allowed) {
      return apiJsonRateLimited(rl.resetAt);
    }

    const userPrompt = [
      "Extract codex-ready entities from this ideation context.",
      "",
      "Return JSON with keys: characters, locations, objects, factions, lore, subplots.",
      "Each array item should be either just a name or `Name - short note`.",
      "Do not invent major entities that are not supported by the text.",
      "Use concise entries and deduplicate near-identical items.",
      "",
      "## Current brief fields",
      `Title: ${sanitizeText(brief.title ?? "")}`,
      `Genre: ${sanitizeText(brief.genre ?? "")}`,
      `Audience: ${sanitizeText(brief.audience ?? "")}`,
      `Premise: ${sanitizeText(brief.premise ?? "")}`,
      `Tone: ${sanitizeText(brief.tone ?? "")}`,
      `Themes: ${sanitizeText(brief.themes ?? "")}`,
      "",
      "## Ideation transcript",
      conversationToTranscript(conversation as ConversationTurn[]),
    ]
      .join("\n")
      .trim();

    let completionText = "";
    try {
      const completion = await getOpenAI().chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: EXTRACT_CODEX_SEEDS_SYSTEM_PROMPT,
          },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 2_000,
      });
      completionText = completion.choices[0]?.message?.content?.trim() ?? "";
    } catch (e) {
      return openAIRequestFailureResponse(e, "extract-codex-seeds.openai", {
        fallbackMessage: "Could not extract codex ideas right now.",
      });
    }

    if (!completionText) {
      return apiJsonError("Model returned no data.", ApiErrorCode.UPSTREAM, 502);
    }

    let parsedObj: unknown;
    try {
      parsedObj = JSON.parse(completionText) as unknown;
    } catch (e) {
      logServerError("extract-codex-seeds.parse", e);
      return apiJsonError("Could not parse extraction result.", ApiErrorCode.UPSTREAM, 502);
    }

    const seedResult = ExtractCodexSeedsResponseSchema.safeParse(parsedObj);
    if (!seedResult.success) {
      logServerError("extract-codex-seeds.shape", seedResult.error);
      return apiJsonError(
        "Could not shape extracted codex seeds.",
        ApiErrorCode.UNPROCESSABLE_ENTITY,
        422,
      );
    }

    const data = seedResult.data;
    const payload = {
      characters: trimSeeds(data.characters),
      locations: trimSeeds(data.locations),
      objects: trimSeeds(data.objects),
      factions: trimSeeds(data.factions),
      lore: trimSeeds(data.lore),
      subplots: trimSeeds(data.subplots),
    };

    return NextResponse.json(payload);
  } catch (e) {
    logServerError("extract-codex-seeds", e);
    return apiJsonError(
      "Something went wrong. Please try again.",
      ApiErrorCode.INTERNAL,
      500,
    );
  }
}
