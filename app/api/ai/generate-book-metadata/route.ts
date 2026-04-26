import { NextResponse } from "next/server";

import { getOpenAI } from "@/lib/openai/client";
import { openAIRequestFailureResponse } from "@/lib/openai/request-errors";
import { buildBriefContext } from "@/lib/openai/brief-context";
import { getBookMetadataPrompt } from "@/lib/ai/prompt-templates";
import { requireBookOwnedByUser } from "@/lib/api/book-access";
import { createClient } from "@/lib/supabase/server";
import {
  apiJsonError,
  apiJsonRateLimited,
  ApiErrorCode,
  logServerError,
} from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { BookMetadataRequestSchema } from "@/lib/utils/schemas";
import { sanitizeText } from "@/lib/utils/sanitize";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const METADATA_REGEX = /<METADATA>([\s\S]*?)<\/METADATA>/i;

type MetadataResult = {
  title: string;
  subtitle: string;
  author_tagline: string;
};

function extractMetadata(raw: string): MetadataResult | null {
  const match = raw.match(METADATA_REGEX);
  const blob = match?.[1]?.trim() ?? raw.trim();
  try {
    const parsed = JSON.parse(blob) as Partial<MetadataResult>;
    const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
    const subtitle = typeof parsed.subtitle === "string" ? parsed.subtitle.trim() : "";
    const tagline =
      typeof parsed.author_tagline === "string" ? parsed.author_tagline.trim() : "";
    if (!title && !subtitle && !tagline) return null;
    return {
      title: sanitizeText(title).slice(0, 160),
      subtitle: sanitizeText(subtitle).slice(0, 240),
      author_tagline: sanitizeText(tagline).slice(0, 160),
    };
  } catch {
    return null;
  }
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

    const parsed = BookMetadataRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const { bookId } = parsed.data;

    const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
    if (denied) return denied;

    const rl = await checkRateLimit(user.id, "generate-book-metadata");
    if (!rl.allowed) {
      return apiJsonRateLimited(rl.resetAt);
    }

    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("id, title, genre, tone, refined_idea")
      .eq("id", bookId)
      .eq("user_id", user.id)
      .single();

    if (bookError || !book) {
      return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    const title = sanitizeText(book.title?.trim() || "Untitled");
    const genre = sanitizeText(book.genre?.trim() || "");
    const tone = sanitizeText(book.tone?.trim() || "");
    const briefContext = buildBriefContext(book.refined_idea, title, genre);

    const systemPrompt = getBookMetadataPrompt(title, genre, tone, briefContext);

    let completionText: string;
    try {
      const completion = await getOpenAI().chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content:
              "Return only the <METADATA>{…}</METADATA> block with valid JSON. Nothing else.",
          },
        ],
        temperature: 0.75,
        max_tokens: 500,
      });
      completionText = completion.choices[0]?.message?.content?.trim() ?? "";
    } catch (e) {
      return openAIRequestFailureResponse(e, "generate-book-metadata.openai", {
        fallbackMessage: "The assistant is temporarily unavailable.",
      });
    }

    if (!completionText) {
      return apiJsonError(
        "The model returned an empty response.",
        ApiErrorCode.UNPROCESSABLE_ENTITY,
        422,
      );
    }

    const result = extractMetadata(completionText);
    if (!result) {
      return apiJsonError(
        "Could not parse metadata from the model response.",
        ApiErrorCode.UNPROCESSABLE_ENTITY,
        422,
      );
    }

    await supabase.from("api_usage").insert({
      user_id: user.id,
      route: "/api/ai/generate-book-metadata",
      tokens_used: Math.ceil((systemPrompt.length + completionText.length) / 4),
      model: "gpt-4o",
    });

    return NextResponse.json(result);
  } catch (e) {
    logServerError("generate-book-metadata", e);
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
