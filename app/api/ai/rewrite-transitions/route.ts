import { NextResponse } from "next/server";
import { z } from "zod";

import { buildRewriteTransitionsSystemPrompt } from "@/lib/ai/prompt-templates";
import { snapshotChapter } from "@/lib/book/revisions";
import { requireBookOwnedByUser } from "@/lib/api/book-access";
import { getOpenAI } from "@/lib/openai/client";
import { classifyOpenAIRequestFailure } from "@/lib/openai/request-errors";
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
import { RewriteTransitionsRequestSchema } from "@/lib/utils/schemas";
import { sanitizeText } from "@/lib/utils/sanitize";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const rewriteResponseSchema = z.object({
  replacementOpening: z.string(),
  replacementClosing: z.string(),
});

function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

function splitBlocks(md: string): string[] {
  return md
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
}

type Segments = {
  firstTwo: string;
  middle: string;
  lastOne: string;
  blockCount: number;
};

function segmentForRewrite(md: string): Segments {
  const blocks = splitBlocks(md);
  if (blocks.length === 0) {
    return { firstTwo: "", middle: "", lastOne: "", blockCount: 0 };
  }
  if (blocks.length === 1) {
    const t = blocks[0]!;
    return { firstTwo: t, middle: "", lastOne: t, blockCount: 1 };
  }
  if (blocks.length === 2) {
    return {
      firstTwo: `${blocks[0]}\n\n${blocks[1]}`,
      middle: "",
      lastOne: blocks[1]!,
      blockCount: 2,
    };
  }
  const firstTwo = `${blocks[0]}\n\n${blocks[1]}`;
  const lastOne = blocks[blocks.length - 1]!;
  const middle = blocks.slice(2, -1).join("\n\n");
  return { firstTwo, middle, lastOne, blockCount: blocks.length };
}

function stitch(
  segs: Segments,
  replacementOpening: string,
  replacementClosing: string,
): string {
  const o = replacementOpening.trim();
  const c = replacementClosing.trim();
  if (segs.blockCount === 0) return o;
  if (segs.blockCount === 1) {
    return o || c || segs.firstTwo;
  }
  if (segs.blockCount === 2) {
    if (c) return [o, c].join("\n\n");
    return o;
  }
  const close = c || segs.lastOne;
  if (segs.middle) {
    return [o, segs.middle, close].join("\n\n");
  }
  return [o, close].filter(Boolean).join("\n\n");
}

function edgeExcerptMd(md: string, fromStart: boolean, maxChars: number): string {
  const t = md.trim();
  if (!t) return "";
  if (fromStart) {
    return t.length <= maxChars ? t : t.slice(0, maxChars) + "…";
  }
  return t.length <= maxChars ? t : "…" + t.slice(-maxChars);
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

    const parsed = RewriteTransitionsRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const { bookId, chapterIds } = parsed.data;

    const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
    if (denied) {
      return denied;
    }

    const rl = await checkRateLimit(user.id, "rewrite-transitions");
    if (!rl.allowed) {
      return apiJsonRateLimited(rl.resetAt);
    }

    let { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) {
      logServerError("rewrite-transitions.profile", profileError);
      return apiJsonError("Could not load profile.", ApiErrorCode.INTERNAL, 500);
    }
    if (!profile) {
      const ensured = await ensureProfileRowForUser(supabase, user);
      if (!ensured.ok) {
        logServerError(
          "rewrite-transitions.profile-create",
          new Error(
            `${ensured.error}${ensured.code ? ` (code ${ensured.code})` : ""}${ensured.hint ? ` | ${ensured.hint}` : ""}`,
          ),
        );
        return apiJsonError(
          `Could not load profile.${ensured.code ? ` (code ${ensured.code})` : ""}${ensured.hint ? ` ${ensured.hint}` : ""}`,
          ApiErrorCode.INTERNAL,
          500,
        );
      }
      profile = { subscription_tier: "free" };
    }
    if (profile.subscription_tier !== "pro") {
      return apiJsonError("Transition rewrites are a Pro feature.", ApiErrorCode.UPGRADE_REQUIRED, 403);
    }

    const { data: bookRow } = await supabase
      .from("books")
      .select("id, user_id, title, style_examples, style_instructions")
      .eq("id", bookId)
      .eq("user_id", user.id)
      .single();
    if (!bookRow) {
      return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    const { data: allChapters, error: chErr } = await supabase
      .from("chapters")
      .select("id, book_id, title, chapter_number, content, word_count")
      .eq("book_id", bookId)
      .order("chapter_number", { ascending: true });
    if (chErr || !allChapters?.length) {
      return apiJsonError("Could not load chapters.", ApiErrorCode.INTERNAL, 500);
    }

    const byId = new Map(allChapters.map((c) => [c.id, c]));
    const orderList = allChapters;

    const results: {
      chapterId: string;
      title: string;
      ok: boolean;
      error?: string;
    }[] = [];

    for (const chapterId of chapterIds) {
      const chapter = byId.get(chapterId);
      if (!chapter || chapter.book_id !== bookId) {
        results.push({
          chapterId,
          title: "Unknown",
          ok: false,
          error: "Chapter not in book",
        });
        continue;
      }

      const contentRaw = chapter.content?.trim() ?? "";
      if (!contentRaw) {
        results.push({
          chapterId,
          title: chapter.title,
          ok: false,
          error: "Empty chapter",
        });
        continue;
      }

      const idx = orderList.findIndex((c) => c.id === chapterId);
      const prev = idx > 0 ? orderList[idx - 1]! : null;
      const next = idx < orderList.length - 1 ? orderList[idx + 1]! : null;

      const segs = segmentForRewrite(sanitizeText(contentRaw));
      if (segs.blockCount === 0) {
        results.push({
          chapterId,
          title: chapter.title,
          ok: false,
          error: "No paragraphs to adjust",
        });
        continue;
      }

      const prevTail = prev?.content
        ? edgeExcerptMd(sanitizeText(prev.content), false, 500)
        : "";
      const nextHead = next?.content
        ? edgeExcerptMd(sanitizeText(next.content), true, 500)
        : "";
      const userPrompt = `Book: ${sanitizeText(bookRow.title?.trim() || "Untitled")}

## Previous chapter
Title: ${prev ? sanitizeText(prev.title) : "None (this is the first chapter)"}
Ending excerpt (from prior chapter body):
${prevTail || "N/A"}

## Next chapter
Title: ${next ? sanitizeText(next.title) : "None (this is the last chapter)"}
Opening excerpt (from following chapter body):
${nextHead || "N/A"}

## This chapter
Title: ${sanitizeText(chapter.title)} — chapter ${idx + 1} of ${orderList.length}

The following blocks are the **opening** of this chapter (first 1–2 blocks) and the **closing** (last block). The middle of the chapter (if any) is omitted here — you must not reference hidden middle in your rewrites, only smooth handoffs with neighbors.

OPENING (rewrite for continuity from previous chapter, keep voice):
---
${segs.firstTwo}
---

${segs.middle ? `MIDDLE (unchanged, do not output — for context only):\n---\n${segs.middle}\n---\n` : ""}

CLOSING (rewrite for continuity into the next chapter, keep voice):
---
${segs.lastOne}
---

Return JSON only: {"replacementOpening": "markdown", "replacementClosing": "markdown"}
- For a **single-paragraph** chapter, put the full new paragraph in replacementOpening and use "" for replacementClosing.
- For a **two-block** chapter, replacementOpening and replacementClosing are the two rewritten blocks in order; do not add extra blocks.
- For **3+ blocks**, replacementOpening rewrites the first two blocks, replacementClosing rewrites the last block only. Keep middle content unchanged.`;

      /* Rewriting transitions literally means matching the author's
       * established prose voice — this is exactly the case style_examples
       * was designed for. Block goes after the JSON-shape instruction so
       * the model keeps emitting the required JSON keys. */
      const systemPrompt = buildRewriteTransitionsSystemPrompt(
        buildStyleExamplesBlock({
          style_examples: bookRow.style_examples,
          style_instructions: bookRow.style_instructions,
        }),
      );

      let newBody: string;
      try {
        const completion = await getOpenAI().chat.completions.create({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          temperature: 0.45,
          max_tokens: 3_000,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });
        const raw = completion.choices[0]?.message?.content?.trim() ?? "";
        if (!raw) {
          throw new Error("empty completion");
        }
        const asJson = JSON.parse(raw) as unknown;
        const v = rewriteResponseSchema.safeParse(asJson);
        if (!v.success) {
          throw new Error("invalid json shape");
        }
        newBody = stitch(segs, v.data.replacementOpening, v.data.replacementClosing);
      } catch (e) {
        const classified = classifyOpenAIRequestFailure(e);
        if (
          classified &&
          (classified.code === ApiErrorCode.CONFIGURATION ||
            classified.code === ApiErrorCode.RATE_LIMITED)
        ) {
          logServerError("rewrite-transitions.llm", e);
          return apiJsonError(classified.message, classified.code, classified.status);
        }
        logServerError("rewrite-transitions.llm", e);
        results.push({
          chapterId,
          title: chapter.title,
          ok: false,
          error: "Model failed to rewrite this chapter",
        });
        continue;
      }

      const newWords = countWords(newBody);
      if (newWords < 1) {
        results.push({
          chapterId,
          title: chapter.title,
          ok: false,
          error: "Empty rewrite",
        });
        continue;
      }

      const snap = await snapshotChapter(supabase, {
        chapterId: chapter.id,
        userId: user.id,
        source: "rewrite_transition",
      });
      if (!snap.ok && snap.code !== "empty") {
        logServerError("rewrite-transitions.snapshot", new Error(snap.error));
        results.push({
          chapterId,
          title: chapter.title,
          ok: false,
          error: "Could not save revision backup",
        });
        continue;
      }

      const { error: upErr } = await supabase
        .from("chapters")
        .update({
          content: newBody,
          word_count: newWords,
          status: "edited",
        })
        .eq("id", chapter.id)
        .eq("book_id", bookId);
      if (upErr) {
        logServerError("rewrite-transitions.update", upErr);
        results.push({
          chapterId,
          title: chapter.title,
          ok: false,
          error: "Could not save chapter",
        });
        continue;
      }

      results.push({ chapterId, title: chapter.title, ok: true });
    }

    const updated = results.filter((r) => r.ok).length;
    return NextResponse.json({
      results,
      summary: { updated, total: results.length },
    });
  } catch (e) {
    logServerError("rewrite-transitions", e);
    return apiJsonError("Unexpected error.", ApiErrorCode.INTERNAL, 500);
  }
}
