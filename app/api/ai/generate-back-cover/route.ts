import { NextResponse } from "next/server";

import { getOpenAI } from "@/lib/openai/client";
import { openAIRequestFailureResponse } from "@/lib/openai/request-errors";
import { buildBriefContext, buildOutlineDigest } from "@/lib/openai/brief-context";
import { getBackCoverPrompt } from "@/lib/ai/prompt-templates";
import { requireBookOwnedByUser } from "@/lib/api/book-access";
import { createClient } from "@/lib/supabase/server";
import {
  apiJsonError,
  apiJsonRateLimited,
  ApiErrorCode,
  logServerError,
} from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { BackCoverRequestSchema } from "@/lib/utils/schemas";
import { sanitizeText } from "@/lib/utils/sanitize";
import type { BookTypeDb } from "@/types/database.types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BLURB_CHARS = 3000;

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

    const parsed = BackCoverRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const { bookId } = parsed.data;

    const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
    if (denied) return denied;

    const rl = await checkRateLimit(user.id, "generate-back-cover");
    if (!rl.allowed) {
      return apiJsonRateLimited(rl.resetAt);
    }

    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("id, title, book_type, genre, tone, target_audience, refined_idea")
      .eq("id", bookId)
      .eq("user_id", user.id)
      .single();

    if (bookError || !book) {
      return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    const bookType = (book.book_type ?? "fiction") as BookTypeDb;
    const title = sanitizeText(book.title?.trim() || "Untitled");
    const genre = sanitizeText(book.genre?.trim() || "");
    const tone = sanitizeText(book.tone?.trim() || "");
    const audience = sanitizeText(book.target_audience?.trim() || "");
    const briefContext = buildBriefContext(book.refined_idea, title, genre);

    const { data: outline } = await supabase
      .from("outlines")
      .select("sections")
      .eq("book_id", bookId)
      .maybeSingle();

    const outlineDigest = buildOutlineDigest(outline?.sections ?? null);

    const systemPrompt = getBackCoverPrompt(
      bookType,
      title,
      genre,
      tone,
      audience,
      briefContext,
      outlineDigest,
    );

    let blurb: string;
    try {
      const completion = await getOpenAI().chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content:
              "Write the back cover blurb now. Prose only, 150–200 words, no headings, no markdown.",
          },
        ],
        temperature: 0.75,
        max_tokens: 600,
      });
      blurb = completion.choices[0]?.message?.content?.trim() ?? "";
    } catch (e) {
      return openAIRequestFailureResponse(e, "generate-back-cover.openai", {
        fallbackMessage: "The assistant is temporarily unavailable.",
      });
    }

    if (!blurb) {
      return apiJsonError(
        "The model returned an empty blurb.",
        ApiErrorCode.UNPROCESSABLE_ENTITY,
        422,
      );
    }

    const cleaned = sanitizeText(blurb).slice(0, MAX_BLURB_CHARS);

    await supabase.from("api_usage").insert({
      user_id: user.id,
      route: "/api/ai/generate-back-cover",
      tokens_used: Math.ceil((systemPrompt.length + cleaned.length) / 4),
      model: "gpt-4o",
    });

    return NextResponse.json({ blurb: cleaned });
  } catch (e) {
    logServerError("generate-back-cover", e);
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
