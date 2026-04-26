/**
 * POST /api/ai/brainstorm  — Prompt 8
 *
 * Streams N distinct options for whatever the author wants to brainstorm
 * (character names, chapter titles, plot twists, custom…). Output format
 * is strict: one numbered item per line ("1. …"), no preamble, no
 * explanation. The client parses as bytes arrive and renders each
 * completed item in the list with thumbs-up / thumbs-down controls.
 *
 * Flow per request:
 *   1. Auth, rate limit, book ownership.
 *   2. Pull lightweight project context (genre, premise, top codex
 *      entries) to ground the brainstorm in the book.
 *   3. Create the `brainstorm_sessions` row up-front so the client can
 *      start persisting thumbs-up / thumbs-down the moment items stream
 *      in. The session id + a short list of pre-provisioned item ids
 *      come back in response headers.
 *   4. Stream the model output. On close, parse the final line set,
 *      update each pre-provisioned item's `content` (empty rows that
 *      the model didn't fill are deleted).
 *
 * Why pre-provisioning ids? The UI needs stable ids for thumbs-up BEFORE
 * the stream finishes. Inserting N empty items up-front and streaming
 * back their ids in a header avoids a second round trip per toggle.
 */

import type { ChatCompletionChunk } from "openai/resources/chat/completions";
import type { Stream } from "openai/streaming";
import { APIError } from "openai";

import { buildCodexBlock } from "@/lib/ai/codex-context";
import { buildSeriesContextBlock } from "@/lib/ai/series-context";
import { refinedIdeaToPlainSummary } from "@/lib/refined-idea/parse";
import {
  BRAINSTORM_PRESETS,
  BRAINSTORM_SYSTEM_PROMPT,
  type BrainstormPresetId,
  composeBrainstormUserPrompt,
  isBrainstormPresetId,
} from "@/lib/ai/prompt-templates";
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
import { parseNumberedLines } from "@/lib/ai/brainstorm-parse";
import { BrainstormRequestSchema } from "@/lib/utils/schemas";

export const dynamic = "force-dynamic";

const MODEL_CANDIDATES = ["gpt-4o-mini", "gpt-4o"] as const;

/* Hard ceiling on how many codex entries we splice into the grounding
 * block. The brainstorm UI doesn't @-mention anything, so we just take
 * the first few `always`-scoped / `on_match`-scoped entries that match
 * the prompt text. */
const MAX_CODEX_CONTEXT_TOKENS = 800;

function shouldTryFallbackModel(err: unknown): boolean {
  if (!(err instanceof APIError)) return false;
  return err.status === 400 || err.status === 403 || err.status === 404;
}

/* ------------------------------------------------------------------ *
 * Handler                                                            *
 * ------------------------------------------------------------------ */

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiJsonError(
        "Please sign in to continue.",
        ApiErrorCode.UNAUTHORIZED,
        401,
      );
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return apiJsonError(
        "Invalid JSON body.",
        ApiErrorCode.VALIDATION_ERROR,
        400,
      );
    }

    const parsed = BrainstormRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError(
        "Invalid request.",
        ApiErrorCode.VALIDATION_ERROR,
        400,
      );
    }
    const body = parsed.data;

    if (!isBrainstormPresetId(body.topic)) {
      return apiJsonError(
        "Unknown topic.",
        ApiErrorCode.VALIDATION_ERROR,
        400,
      );
    }
    const topic: BrainstormPresetId = body.topic;
    const preset = BRAINSTORM_PRESETS[topic];

    const denied = await requireBookOwnedByUser(supabase, body.bookId, user.id);
    if (denied) return denied;

    const rl = await checkRateLimit(user.id, "brainstorm");
    if (!rl.allowed) return apiJsonRateLimited(rl.resetAt);

    /* ------------------------------------------------------------ *
     * Pull project grounding.                                      *
     * ------------------------------------------------------------ */
    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("id, title, genre, refined_idea, series_id, series_order")
      .eq("id", body.bookId)
      .eq("user_id", user.id)
      .single();
    if (bookError || !book) {
      return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    const premiseLine = refinedIdeaToPlainSummary(
      book.refined_idea,
      "brainstorm.codex-window",
      8_000,
      { bookId: book.id },
    );
    const codexTextWindow = `${book.title ?? ""}\n${book.genre ?? ""}\n${premiseLine}\n${body.prompt}\n${body.keepers.join("\n")}`;
    const codex = await buildCodexBlock(supabase, body.bookId, codexTextWindow, {
      tokenBudget: MAX_CODEX_CONTEXT_TOKENS,
    });
    const seriesContextBlock =
      book.series_id && typeof book.series_order === "number"
        ? (
            await buildSeriesContextBlock({
              supabase,
              seriesId: book.series_id,
              currentBookId: body.bookId,
              currentBookPosition: book.series_order,
              userId: user.id,
              tokenBudget: 1500,
            })
          ).block
        : "";

    /* ------------------------------------------------------------ *
     * Create the session + N empty items.                          *
     * ------------------------------------------------------------ */
    const sessionTitle = buildSessionTitle(preset.label, body.prompt);
    const { data: sessionRow, error: sessionErr } = await supabase
      .from("brainstorm_sessions")
      .insert({
        project_id: body.bookId,
        topic,
        prompt: body.prompt,
        title: sessionTitle,
      })
      .select("id")
      .single();
    if (sessionErr || !sessionRow) {
      logServerError("brainstorm.session-create", sessionErr);
      return apiJsonError(
        "Could not start the brainstorm.",
        ApiErrorCode.INTERNAL,
        500,
      );
    }
    const sessionId = sessionRow.id;

    /* Placeholder items are spaces (not empty — CHECK constraint
     * requires content length >= 1). They get overwritten with real
     * content as soon as each numbered line finishes streaming. */
    const placeholderRows = Array.from({ length: body.count }, (_, i) => ({
      session_id: sessionId,
      content: " ",
      position: i,
    }));
    const { data: itemRows, error: itemsErr } = await supabase
      .from("brainstorm_items")
      .insert(placeholderRows)
      .select("id, position")
      .order("position", { ascending: true });
    if (itemsErr || !itemRows) {
      logServerError("brainstorm.items-create", itemsErr);
      /* Roll back the session so we don't leave an empty shell. */
      await supabase.from("brainstorm_sessions").delete().eq("id", sessionId);
      return apiJsonError(
        "Could not initialise the brainstorm.",
        ApiErrorCode.INTERNAL,
        500,
      );
    }

    const itemIdsByPosition = itemRows
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((r) => r.id);

    /* ------------------------------------------------------------ *
     * Stream.                                                      *
     * ------------------------------------------------------------ */
    const userPrompt = composeBrainstormUserPrompt({
      topic,
      userPrompt: body.prompt,
      count: body.count,
      keepers: body.keepers,
      projectTitle: book.title,
      projectGenre: book.genre,
      projectPremise: refinedIdeaToPlainSummary(
        book.refined_idea,
        "brainstorm.user-prompt",
        12_000,
        { bookId: book.id },
      ),
      seriesContextBlock,
      codexBlock: codex.block,
    });

    let completionStream: Stream<ChatCompletionChunk> | null = null;
    let completionErr: unknown;
    try {
      for (let i = 0; i < MODEL_CANDIDATES.length; i++) {
        const model = MODEL_CANDIDATES[i];
        try {
          completionStream = await getOpenAI().chat.completions.create({
            model,
            stream: true,
            temperature: preset.temperature,
            /* ~60 tokens per short option × 20 items max + framing headroom. */
            max_tokens: 2_048,
            messages: [
              { role: "system", content: BRAINSTORM_SYSTEM_PROMPT },
              { role: "user", content: userPrompt },
            ],
          });
          break;
        } catch (e) {
          completionErr = e;
          if (i === MODEL_CANDIDATES.length - 1 || !shouldTryFallbackModel(e)) {
            throw e;
          }
        }
      }
    } catch (e) {
      /* Clean up the shell rows before bailing — otherwise the sidebar
       * will show an empty session. */
      await supabase.from("brainstorm_sessions").delete().eq("id", sessionId);
      return openAIRequestFailureResponse(completionErr ?? e, "brainstorm.openai", {
        fallbackMessage:
          "The brainstorm engine is temporarily unavailable right now. Please retry in a moment.",
      });
    }
    if (!completionStream) {
      await supabase.from("brainstorm_sessions").delete().eq("id", sessionId);
      return apiJsonError(
        "Could not start brainstorm generation.",
        ApiErrorCode.UPSTREAM,
        502,
      );
    }

    const encoder = new TextEncoder();
    let accumulated = "";

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const part of completionStream) {
            const delta = part.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              accumulated += delta;
              controller.enqueue(encoder.encode(delta));
            }
          }
        } catch (err) {
          logServerError("brainstorm.stream", err);
          try {
            controller.enqueue(
              encoder.encode(
                "\n\n[The brainstorm engine stopped mid-stream. Your items above are saved — thumb them up, or re-run.]",
              ),
            );
          } catch {
            /* ignore */
          }
        } finally {
          try {
            controller.close();
          } catch {
            /* ignore */
          }
          void finalizeSession({
            sessionId,
            itemIdsByPosition,
            raw: accumulated,
          }).catch((e) => logServerError("brainstorm.finalize", e));
        }
      },
      cancel() {
        void finalizeSession({
          sessionId,
          itemIdsByPosition,
          raw: accumulated,
        }).catch((e) => logServerError("brainstorm.finalize-cancel", e));
      },
    });

    return new Response(readable, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
        "X-Brainstorm-Session-Id": sessionId,
        "X-Brainstorm-Item-Ids": itemIdsByPosition.join(","),
        "Access-Control-Expose-Headers":
          "X-Brainstorm-Session-Id, X-Brainstorm-Item-Ids",
      },
    });
  } catch (e) {
    logServerError("brainstorm", e);
    return apiJsonError(
      "Something went wrong. Please try again.",
      ApiErrorCode.INTERNAL,
      500,
    );
  }
}

/* ------------------------------------------------------------------ *
 * Helpers                                                            *
 * ------------------------------------------------------------------ */

async function finalizeSession(params: {
  sessionId: string;
  itemIdsByPosition: string[];
  raw: string;
}): Promise<void> {
  const supabase = await createClient();
  const parsed = parseNumberedLines(params.raw);

  /* Overwrite placeholder rows in position order. If the model only
   * produced K<N items, delete the trailing placeholders. If it
   * produced more than N (rare), ignore the overflow — the UI promised
   * the author N. */
  for (let i = 0; i < params.itemIdsByPosition.length; i++) {
    const id = params.itemIdsByPosition[i];
    const content = parsed[i];
    if (content && content.length > 0) {
      await supabase
        .from("brainstorm_items")
        .update({ content: content.slice(0, 4_000) })
        .eq("id", id);
    } else {
      /* Trailing placeholder the model didn't fill — drop it so the UI
       * doesn't show empty slots. */
      await supabase.from("brainstorm_items").delete().eq("id", id);
    }
  }
}

function buildSessionTitle(
  presetLabel: string,
  prompt: string,
): string {
  const snippet = prompt.split(/\r?\n/)[0]?.trim() ?? "";
  const truncated =
    snippet.length > 80 ? `${snippet.slice(0, 77)}…` : snippet;
  return truncated ? `${presetLabel} · ${truncated}` : presetLabel;
}
