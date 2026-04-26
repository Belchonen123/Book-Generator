import { NextResponse } from "next/server";

import { getOpenAI } from "@/lib/openai/client";
import { openAIRequestFailureResponse } from "@/lib/openai/request-errors";
import { buildBriefContext } from "@/lib/openai/brief-context";
import { getAboutAuthorPrompt } from "@/lib/ai/prompt-templates";
import { requireBookOwnedByUser } from "@/lib/api/book-access";
import { createClient } from "@/lib/supabase/server";
import {
  apiJsonError,
  apiJsonRateLimited,
  ApiErrorCode,
  logServerError,
} from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { AboutAuthorRequestSchema } from "@/lib/utils/schemas";
import { sanitizeText } from "@/lib/utils/sanitize";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_ABOUT_CHARS = 1500;

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

    const parsed = AboutAuthorRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const { bookId } = parsed.data;

    const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
    if (denied) return denied;

    const rl = await checkRateLimit(user.id, "generate-about-author");
    if (!rl.allowed) {
      return apiJsonRateLimited(rl.resetAt);
    }

    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("id, title, genre, tone, refined_idea, author_display_name")
      .eq("id", bookId)
      .eq("user_id", user.id)
      .single();

    if (bookError || !book) {
      return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, bio, pen_name, location, website, twitter_handle")
      .eq("id", user.id)
      .maybeSingle();

    const title = sanitizeText(book.title?.trim() || "Untitled");
    const genre = sanitizeText(book.genre?.trim() || "");
    const tone = sanitizeText(book.tone?.trim() || "");
    const briefContext = buildBriefContext(book.refined_idea, title, genre);

    const systemPrompt = getAboutAuthorPrompt({
      bookTitle: title,
      genre,
      tone,
      authorDisplayName: sanitizeText(book.author_display_name?.trim() || ""),
      fullName: sanitizeText(profile?.full_name?.trim() || ""),
      penName: sanitizeText(profile?.pen_name?.trim() || ""),
      profileBio: sanitizeText(profile?.bio?.trim() || ""),
      location: sanitizeText(profile?.location?.trim() || ""),
      website: sanitizeText(profile?.website?.trim() || ""),
      twitterHandle: sanitizeText(profile?.twitter_handle?.trim() || ""),
      briefContext,
    });

    let paragraph: string;
    try {
      const completion = await getOpenAI().chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content:
              "Write the About the Author paragraph now. Plain prose, one paragraph, 60–110 words, no markdown.",
          },
        ],
        temperature: 0.6,
        max_tokens: 400,
      });
      paragraph = completion.choices[0]?.message?.content?.trim() ?? "";
    } catch (e) {
      return openAIRequestFailureResponse(e, "generate-about-author.openai", {
        fallbackMessage: "The assistant is temporarily unavailable.",
      });
    }

    if (!paragraph) {
      return apiJsonError(
        "The model returned an empty bio.",
        ApiErrorCode.UNPROCESSABLE_ENTITY,
        422,
      );
    }

    const cleaned = sanitizeText(paragraph).slice(0, MAX_ABOUT_CHARS);

    await supabase.from("api_usage").insert({
      user_id: user.id,
      route: "/api/ai/generate-about-author",
      tokens_used: Math.ceil((systemPrompt.length + cleaned.length) / 4),
      model: "gpt-4o",
    });

    return NextResponse.json({ aboutAuthor: cleaned });
  } catch (e) {
    logServerError("generate-about-author", e);
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
