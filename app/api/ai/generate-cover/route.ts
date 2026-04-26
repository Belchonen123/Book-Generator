import { NextResponse } from "next/server";

import { getOpenAI } from "@/lib/openai/client";
import { openAIRequestFailureResponse } from "@/lib/openai/request-errors";
import { getCoverPromptSystemPrompt } from "@/lib/ai/prompt-templates";
import { requireBookOwnedByUser } from "@/lib/api/book-access";
import { createClient } from "@/lib/supabase/server";
import {
  apiJsonError,
  apiJsonRateLimited,
  ApiErrorCode,
  logServerError,
} from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { CoverRequestSchema } from "@/lib/utils/schemas";
import { trackEvent } from "@/lib/utils/analytics";
import { coverPremiseFromRefinedIdea } from "@/lib/refined-idea/parse";
import { sanitizeText } from "@/lib/utils/sanitize";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const DALLE_MAX_PROMPT = 4000;

function clampPrompt(text: string): string {
  const t = text.trim();
  if (t.length <= DALLE_MAX_PROMPT) return t;
  return t.slice(0, DALLE_MAX_PROMPT);
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

    const parsed = CoverRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const { bookId, customPrompt: rawCustom } = parsed.data;

    const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
    if (denied) {
      return denied;
    }

    const rl = await checkRateLimit(user.id, "generate-cover");
    if (!rl.allowed) {
      return apiJsonRateLimited(rl.resetAt);
    }

    const customPrompt =
      rawCustom !== undefined ? sanitizeText(rawCustom) : undefined;
    if (rawCustom !== undefined && !customPrompt?.trim()) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const { data: book, error: bookError } = await supabase
      .from("books")
      .select(
        "id, user_id, title, subtitle, author_display_name, genre, refined_idea, tone",
      )
      .eq("id", bookId)
      .eq("user_id", user.id)
      .single();

    if (bookError || !book) {
      return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    const title = sanitizeText(book.title?.trim() || "Untitled");
    const genre = sanitizeText(book.genre?.trim() || "General fiction");
    const tone = sanitizeText(book.tone?.trim() || "Engaging and readable");
    const premise = sanitizeText(
      coverPremiseFromRefinedIdea(
        book.refined_idea,
        "generate-cover.premise",
        { bookId: bookId },
      ),
    );
    const subtitle = book.subtitle?.trim() ? sanitizeText(book.subtitle.trim()) : "";
    const authorDisplayName = book.author_display_name?.trim()
      ? sanitizeText(book.author_display_name.trim())
      : "";

    let imagePrompt: string;
    if (customPrompt !== undefined) {
      imagePrompt = clampPrompt(customPrompt);
    } else {
      const systemPrompt = getCoverPromptSystemPrompt(
        title,
        genre,
        premise,
        tone,
        subtitle,
        authorDisplayName,
      );
      let metaText: string;
      try {
        const completion = await getOpenAI().chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content:
                "Write the single DALL-E 3 image prompt only. No quotes, no preamble, no markdown.",
            },
          ],
          temperature: 0.75,
          max_tokens: 1200,
        });
        metaText = completion.choices[0]?.message?.content?.trim() ?? "";
      } catch (e) {
        return openAIRequestFailureResponse(e, "generate-cover.meta-prompt", {
          fallbackMessage: "Could not prepare the cover prompt. Try again.",
        });
      }
      if (!metaText) {
        return apiJsonError(
          "The model returned an empty cover prompt.",
          ApiErrorCode.UNPROCESSABLE_ENTITY,
          422,
        );
      }
      imagePrompt = clampPrompt(metaText.replace(/^["']|["']$/g, ""));
    }

    /* Reinforce KDP-style flat artwork + required text for every request (including custom prompts). */
    const textRequirements: string[] = [
      `the title "${title}" rendered as the largest, dominant typography`,
    ];
    if (subtitle) {
      textRequirements.push(
        `the subtitle "${subtitle}" in smaller type directly below the title`,
      );
    }
    if (authorDisplayName) {
      textRequirements.push(
        `the author by-line "${authorDisplayName}" in the smallest type, placed where author names traditionally sit on a book cover`,
      );
    }
    const textSentence = `The image MUST include ${textRequirements.join(
      ", and ",
    )}, all spelled exactly as written and clearly legible. Do not add any other text (no taglines, reviews, series labels, logos, or barcodes).`;

    imagePrompt = clampPrompt(
      `${imagePrompt.trim()} ${textSentence} Flat 2D full-bleed front-cover artwork only — the entire image IS the cover. No 3D book, no paperback or hardcover mockup, no spine, no back cover, no device, no hands, no bookshelf, no photograph of a physical book.`,
    );

    let imageUrlRemote: string;
    let revisedFromApi: string | undefined;
    try {
      const img = await getOpenAI().images.generate({
        model: "dall-e-3",
        prompt: imagePrompt,
        n: 1,
        size: "1024x1792",
        quality: "hd",
        /* "natural" tends to reduce glossy illustrative mockup / product-shot looks vs vivid */
        style: "natural",
      });
      const first = img.data?.[0];
      imageUrlRemote = first?.url ?? "";
      revisedFromApi = first?.revised_prompt ?? undefined;
    } catch (e) {
      return openAIRequestFailureResponse(e, "generate-cover.dalle", {
        fallbackMessage:
          "Image generation failed. Try a different prompt or try again later.",
      });
    }

    if (!imageUrlRemote) {
      return apiJsonError(
        "Image generation did not return a usable URL.",
        ApiErrorCode.UNPROCESSABLE_ENTITY,
        502,
      );
    }

    let imageBuffer: ArrayBuffer;
    try {
      const imgRes = await fetch(imageUrlRemote);
      if (!imgRes.ok) {
        return apiJsonError(
          "Could not download generated image.",
          ApiErrorCode.UPSTREAM,
          502,
        );
      }
      imageBuffer = await imgRes.arrayBuffer();
    } catch (e) {
      logServerError("generate-cover.fetch-image", e);
      return apiJsonError(
        "Could not download generated image.",
        ApiErrorCode.UPSTREAM,
        502,
      );
    }

    const storagePath = `${user.id}/${bookId}/cover.png`;

    const { error: uploadError } = await supabase.storage
      .from("covers")
      .upload(storagePath, imageBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      logServerError("generate-cover.storage-upload", uploadError);
      return apiJsonError(
        "Could not upload cover to storage.",
        ApiErrorCode.INTERNAL,
        500,
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("covers").getPublicUrl(storagePath);

    const storedPrompt = revisedFromApi?.trim() || imagePrompt;

    const { error: updateError } = await supabase
      .from("books")
      .update({
        cover_url: publicUrl,
        cover_prompt: storedPrompt,
      })
      .eq("id", bookId)
      .eq("user_id", user.id);

    if (updateError) {
      logServerError("generate-cover.book-update", updateError);
      return apiJsonError(
        "Could not save cover metadata.",
        ApiErrorCode.INTERNAL,
        500,
      );
    }

    await supabase.from("api_usage").insert({
      user_id: user.id,
      route: "/api/ai/generate-cover",
      tokens_used: Math.ceil((imagePrompt.length + 500) / 4),
      model: "dall-e-3",
    });

    await trackEvent(user, "cover_generated", bookId);

    return NextResponse.json({
      coverUrl: publicUrl,
      prompt: storedPrompt,
    });
  } catch (e) {
    logServerError("generate-cover", e);
    return apiJsonError(
      "Something went wrong. Please try again.",
      ApiErrorCode.INTERNAL,
      500,
    );
  }
}
