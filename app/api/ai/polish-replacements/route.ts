import { NextResponse } from "next/server";

import { buildPolishReplacementsSystemPrompt } from "@/lib/ai/prompt-templates";
import { getOpenAI } from "@/lib/openai/client";
import { openAIRequestFailureResponse } from "@/lib/openai/request-errors";
import { buildStyleExamplesBlock } from "@/lib/openai/style-examples";
import { ensureProfileRowForUser } from "@/lib/supabase/ensure-profile-row";
import { createClient } from "@/lib/supabase/server";
import {
  apiJsonError,
  apiJsonRateLimited,
  ApiErrorCode,
  logServerError,
} from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { PolishReplacementsRequestSchema } from "@/lib/utils/schemas";
import { sanitizeText } from "@/lib/utils/sanitize";

export const dynamic = "force-dynamic";

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

    const parsed = PolishReplacementsRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const { bookId, chapterId, originalText, replacedText, oldPhrase, newPhrase } =
      parsed.data;

    if (replacedText === originalText) {
      return apiJsonError("Nothing to polish.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const rl = await checkRateLimit(user.id, "polish-bulk");
    if (!rl.allowed) {
      return apiJsonRateLimited(rl.resetAt);
    }

    let { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      logServerError("polish-replacements.profile-fetch", profileError);
      return apiJsonError("Could not load profile.", ApiErrorCode.INTERNAL, 500);
    }

    if (!profile) {
      const ensured = await ensureProfileRowForUser(supabase, user);
      if (!ensured.ok) {
        logServerError(
          "polish-replacements.profile-create",
          new Error(
            `${ensured.error}${ensured.code ? ` (code ${ensured.code})` : ""}${ensured.hint ? ` | ${ensured.hint}` : ""}`,
          ),
        );
        return apiJsonError(
          `Could not initialize profile.${ensured.code ? ` (code ${ensured.code})` : ""}${ensured.hint ? ` ${ensured.hint}` : ""}`,
          ApiErrorCode.INTERNAL,
          500,
        );
      }
      profile = { subscription_tier: "free" };
    }

    if (profile.subscription_tier !== "pro") {
      return apiJsonError(
        "Polish after replace is a Pro feature.",
        ApiErrorCode.UPGRADE_REQUIRED,
        403,
      );
    }

    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("id, user_id, style_examples, style_instructions")
      .eq("id", bookId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (bookError || !book) {
      return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    const { data: ch, error: chError } = await supabase
      .from("chapters")
      .select("id, book_id")
      .eq("id", chapterId)
      .eq("book_id", bookId)
      .maybeSingle();

    if (chError || !ch) {
      return apiJsonError("Chapter not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    const safeOld = sanitizeText(oldPhrase).slice(0, 20_000);
    const safeNew = sanitizeText(newPhrase).slice(0, 20_000);
    const _beforeFull = sanitizeText(originalText).slice(0, 500_000);
    const after = sanitizeText(replacedText).slice(0, 500_000);

    /* Style block keeps the narrow fixups consistent with the author's
     * established voice — especially important because the rest of the
     * manuscript will still read at that register. */
    const system = buildPolishReplacementsSystemPrompt(
      buildStyleExamplesBlock({
        style_examples: book.style_examples,
        style_instructions: book.style_instructions,
      }),
    );

    const beforeExcerpt = _beforeFull.length > 4_000 ? `${_beforeFull.slice(0, 4_000)}…` : _beforeFull;
    const userMsg = [
      `Replaced (find): \`${safeOld.replace(/`/g, "'")}\``,
      `With (replace): \`${safeNew.replace(/`/g, "'")}\``,
      "",
      "Excerpt of chapter before replace (for subtle awkwardness that only shows in context; do not revert the replace):",
      beforeExcerpt,
      "",
      "POST-REPLACE CHAPTER (edit only awkward sentences; otherwise return verbatim):",
      after,
    ].join("\n");

    let content: string;
    try {
      const completion = await getOpenAI().chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
        temperature: 0.3,
        max_tokens: 16_000,
      });
      content = completion.choices[0]?.message?.content?.trim() ?? "";
    } catch (e) {
      return openAIRequestFailureResponse(e, "polish-replacements.openai");
    }

    if (!content) {
      return apiJsonError(
        "The assistant returned an empty response.",
        ApiErrorCode.UNPROCESSABLE_ENTITY,
        502,
      );
    }

    return NextResponse.json({ content });
  } catch (e) {
    logServerError("polish-replacements", e);
    return apiJsonError(
      "Something went wrong. Please try again.",
      ApiErrorCode.INTERNAL,
      500,
    );
  }
}
