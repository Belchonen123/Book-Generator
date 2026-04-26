import { NextResponse } from "next/server";

import { getOpenAI } from "@/lib/openai/client";
import { openAIRequestFailureResponse } from "@/lib/openai/request-errors";
import { getSubtitlePrompt } from "@/lib/ai/prompt-templates";
import { requireBookOwnedByUser } from "@/lib/api/book-access";
import { createClient } from "@/lib/supabase/server";
import {
  apiJsonError,
  apiJsonRateLimited,
  ApiErrorCode,
  logServerError,
} from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { sanitizeText } from "@/lib/utils/sanitize";
import { SubtitleRequestSchema } from "@/lib/utils/schemas";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Upper bound so the model can't return a paragraph dressed up as a subtitle. */
const MAX_SUBTITLE_CHARS = 140;

function cleanSubtitle(raw: string): string {
  if (!raw) return "";
  // Take the first non-empty line — the model occasionally prefixes with
  // "Subtitle:" or wraps the output in quotes; strip both.
  const firstLine = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine) return "";

  let out = firstLine.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "").trim();
  out = out.replace(/^subtitle\s*[:\-—]\s*/i, "");
  out = sanitizeText(out);
  // Collapse internal whitespace and drop any trailing sentence-ending
  // punctuation so the field reads like a real retail subtitle.
  out = out.replace(/\s+/g, " ").replace(/[.!?,;:]+$/g, "").trim();
  return out.slice(0, MAX_SUBTITLE_CHARS);
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

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return apiJsonError("Invalid JSON body.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const parsed = SubtitleRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const { bookId, brief } = parsed.data;

    const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
    if (denied) return denied;

    const rl = await checkRateLimit(user.id, "generate-subtitle");
    if (!rl.allowed) {
      return apiJsonRateLimited(rl.resetAt);
    }

    const systemPrompt = getSubtitlePrompt({
      title: sanitizeText(brief.title),
      genre: brief.genre ? sanitizeText(brief.genre) : null,
      tone: brief.tone ? sanitizeText(brief.tone) : null,
      audience: brief.audience ? sanitizeText(brief.audience) : null,
      premise: brief.premise ? sanitizeText(brief.premise) : null,
      themes: brief.themes ? sanitizeText(brief.themes) : null,
    });

    let completionText: string;
    try {
      const completion = await getOpenAI().chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content:
              "Write the subtitle. Reply with a single line, no quotes, no prefix.",
          },
        ],
        temperature: 0.8,
        max_tokens: 80,
      });
      completionText = completion.choices[0]?.message?.content?.trim() ?? "";
    } catch (e) {
      return openAIRequestFailureResponse(e, "generate-subtitle.openai", {
        fallbackMessage: "The assistant is temporarily unavailable.",
      });
    }

    const subtitle = cleanSubtitle(completionText);
    if (!subtitle) {
      return apiJsonError(
        "The model returned an empty subtitle. Try again.",
        ApiErrorCode.UNPROCESSABLE_ENTITY,
        422,
      );
    }

    await supabase.from("api_usage").insert({
      user_id: user.id,
      route: "/api/ai/generate-subtitle",
      tokens_used: Math.ceil((systemPrompt.length + completionText.length) / 4),
      model: "gpt-4o",
    });

    return NextResponse.json({ subtitle });
  } catch (e) {
    logServerError("generate-subtitle", e);
    const devDetail =
      process.env.NODE_ENV !== "production" && e instanceof Error
        ? `: ${e.message}`
        : "";
    return apiJsonError(
      `Something went wrong. Please try again.${devDetail}`,
      ApiErrorCode.INTERNAL,
      500,
    );
  }
}
