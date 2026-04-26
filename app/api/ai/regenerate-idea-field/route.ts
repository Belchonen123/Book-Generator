import { NextResponse } from "next/server";

import { getOpenAI } from "@/lib/openai/client";
import { openAIRequestFailureResponse } from "@/lib/openai/request-errors";
import {
  getRegenerateIdeaFieldSystemPrompt,
  getRegenerateIdeaFieldUserPayload,
  type RegenerateIdeaFieldKey,
} from "@/lib/ai/prompt-templates";
import { requireBookOwnedByUser } from "@/lib/api/book-access";
import { createClient } from "@/lib/supabase/server";
import {
  apiJsonError,
  apiJsonRateLimited,
  ApiErrorCode,
  logServerError,
} from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { RegenerateIdeaFieldRequestSchema } from "@/lib/utils/schemas";
import { sanitizeText } from "@/lib/utils/sanitize";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_SUBTITLE_CHARS = 140;
const MAX_TITLE_CHARS = 120;
const MAX_PREMISE_CHARS = 12_000;
const REFINED_IDEA_OMITTED_NOTE =
  "[Structured brief JSON omitted for premise expansion — use conversational Q&A and Author messages.]";
const MAX_CONVERSATION_MESSAGES = 120;

type ConversationTurn = { role: "user" | "assistant"; content: string };

function cleanSubtitleLine(raw: string): string {
  if (!raw) return "";
  const firstLine = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine) return "";
  let out = firstLine.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "").trim();
  out = out.replace(/^subtitle\s*[:\-—]\s*/i, "");
  out = sanitizeText(out);
  out = out.replace(/\s+/g, " ").replace(/[.!?,;:]+$/g, "").trim();
  return out.slice(0, MAX_SUBTITLE_CHARS);
}

function cleanTitleLine(raw: string): string {
  if (!raw) return "";
  const first = raw
    .split(/\r?\n/)[0]
    ?.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .replace(/^title\s*[:\-—]\s*/i, "")
    .trim();
  if (!first) return "";
  return sanitizeText(first).replace(/\s+/g, " ").trim().slice(0, MAX_TITLE_CHARS);
}

function cleanPremiseProse(raw: string): string {
  let t = raw.trim();
  t = t.replace(/^```[a-z]*\s*/i, "").replace(/\s*```$/i, "");
  t = t.replace(/^["'“”]+|["'“”]+$/g, "").trim();
  t = t.replace(/^(core\s*)?premise\s*[:\-—]\s*/i, "").trim();
  return sanitizeText(t).slice(0, MAX_PREMISE_CHARS);
}

function cleanSingleLineField(raw: string, max: number): string {
  const line = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (!line) return "";
  return sanitizeText(line.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")).replace(/\s+/g, " ").trim().slice(0, max);
}

function formatBriefForPrompt(brief: {
  title?: string;
  subtitle?: string;
  genre?: string;
  audience?: string;
  premise?: string;
  tone?: string;
  themes?: string;
  estimated_length?: string;
}): string {
  const parts: string[] = [];
  if (brief.title?.trim()) parts.push(`Title: ${brief.title.trim()}`);
  if (brief.subtitle?.trim()) parts.push(`Subtitle: ${brief.subtitle.trim()}`);
  if (brief.genre?.trim()) parts.push(`Genre: ${brief.genre.trim()}`);
  if (brief.audience?.trim()) parts.push(`Audience: ${brief.audience.trim()}`);
  if (brief.premise?.trim()) parts.push(`Core premise (draft):\n${brief.premise.trim()}`);
  if (brief.tone?.trim()) parts.push(`Tone: ${brief.tone.trim()}`);
  if (brief.themes?.trim()) parts.push(`Themes: ${brief.themes.trim()}`);
  if (brief.estimated_length?.trim()) {
    parts.push(`Estimated length: ${brief.estimated_length.trim()}`);
  }
  return parts.join("\n\n");
}

function normalizeIdeaConversation(raw: unknown): ConversationTurn[] {
  if (!Array.isArray(raw)) return [];
  const out: ConversationTurn[] = [];
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i] as { role?: string; content?: string };
    if (row.role !== "user" && row.role !== "assistant") continue;
    out.push({
      role: row.role,
      content: typeof row.content === "string" ? row.content : "",
    });
  }
  return out;
}

function nonEmptyMessageCount(messages: ConversationTurn[]): number {
  return messages.filter((m) => m.content.trim().length > 0).length;
}

function conversationCharCount(messages: ConversationTurn[]): number {
  return messages.reduce((n, m) => n + m.content.length, 0);
}

/** Prefer more complete history: non-empty turns first, then total characters. */
function pickRicherConversation(a: ConversationTurn[], b: ConversationTurn[]): ConversationTurn[] {
  const countA = nonEmptyMessageCount(a);
  const countB = nonEmptyMessageCount(b);
  if (countB > countA) return b;
  if (countA > countB) return a;
  return conversationCharCount(b) > conversationCharCount(a) ? b : a;
}

function capConversationTail(messages: ConversationTurn[], max: number): ConversationTurn[] {
  if (messages.length <= max) return messages;
  return messages.slice(-max);
}

/** Remove `<REFINED_IDEA>` from assistant turns so the model does not anchor on short JSON premise. */
function stripRefinedIdeaBlocksForPremise(messages: ConversationTurn[]): ConversationTurn[] {
  return messages.map((m) =>
    m.role === "assistant"
      ? {
          ...m,
          content: m.content.replace(
            /<REFINED_IDEA>([\s\S]*?)<\/REFINED_IDEA>/gi,
            REFINED_IDEA_OMITTED_NOTE,
          ),
        }
      : m,
  );
}

function conversationToTranscript(messages: ConversationTurn[]): string {
  if (messages.length === 0) return "";
  return messages
    .map((m) => {
      const who = m.role === "user" ? "Author" : "Editor";
      const body = sanitizeText(m.content).trim();
      return `**${who}**
${body}`;
    })
    .join("\n\n");
}

function postProcessField(
  field: RegenerateIdeaFieldKey,
  raw: string,
): string {
  if (field === "subtitle") return cleanSubtitleLine(raw);
  if (field === "title") return cleanTitleLine(raw);
  if (field === "premise") return cleanPremiseProse(raw);
  if (field === "tone") return cleanSingleLineField(raw, 400);
  if (field === "genre") return cleanSingleLineField(raw, 200);
  if (field === "audience") return cleanSingleLineField(raw, 400);
  if (field === "themes") return cleanSingleLineField(raw, 500);
  if (field === "estimated_length") return cleanSingleLineField(raw, 80);
  const _e: never = field;
  return _e;
}

function maxTokensForField(field: RegenerateIdeaFieldKey): number {
  if (field === "premise") return 3_800;
  if (field === "subtitle" || field === "title") return 100;
  if (field === "audience" || field === "tone") return 150;
  return 200;
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

    const parsed = RegenerateIdeaFieldRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const { bookId, field, brief, conversation } = parsed.data;

    const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
    if (denied) return denied;

    const { data: bookRow } = await supabase
      .from("books")
      .select("idea_conversation")
      .eq("id", bookId)
      .eq("user_id", user.id)
      .maybeSingle();

    const fromDb = normalizeIdeaConversation(bookRow?.idea_conversation);
    const merged = capConversationTail(
      pickRicherConversation(conversation, fromDb),
      MAX_CONVERSATION_MESSAGES,
    );

    const rl = await checkRateLimit(user.id, "regenerate-idea-field");
    if (!rl.allowed) {
      return apiJsonRateLimited(rl.resetAt);
    }

    if (field === "title" && !brief.title?.trim() && nonEmptyMessageCount(merged) === 0) {
      return apiJsonError(
        "Add a working title in the field or a few chat messages, then try again.",
        ApiErrorCode.VALIDATION_ERROR,
        400,
      );
    }

    const transcriptSource =
      field === "premise" ? stripRefinedIdeaBlocksForPremise(merged) : merged;

    const systemPrompt = getRegenerateIdeaFieldSystemPrompt(field);
    const payload = getRegenerateIdeaFieldUserPayload({
      field,
      conversationTranscript: conversationToTranscript(transcriptSource),
      currentBrief: formatBriefForPrompt(brief),
    });

    let rawOut: string;
    try {
      const completion = await getOpenAI().chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: payload.content },
        ],
        temperature: field === "premise" ? 0.6 : 0.75,
        max_tokens: maxTokensForField(field),
      });
      rawOut = completion.choices[0]?.message?.content?.trim() ?? "";
    } catch (e) {
      return openAIRequestFailureResponse(e, "regenerate-idea-field.openai", {
        fallbackMessage: "The assistant is temporarily unavailable.",
      });
    }

    const value = postProcessField(field, rawOut);
    if (!value.trim()) {
      return apiJsonError(
        "The model returned an empty value. Try again, or add more in the chat first.",
        ApiErrorCode.UNPROCESSABLE_ENTITY,
        422,
      );
    }

    const approxTokens = Math.ceil((systemPrompt.length + payload.content.length + value.length) / 4);
    await supabase.from("api_usage").insert({
      user_id: user.id,
      route: "/api/ai/regenerate-idea-field",
      tokens_used: Math.max(1, approxTokens),
      model: "gpt-4o",
    });

    return NextResponse.json({ value, field });
  } catch (e) {
    logServerError("regenerate-idea-field", e);
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
