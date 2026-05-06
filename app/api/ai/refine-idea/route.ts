import { OpenAIStream, StreamingTextResponse } from "ai";
import type { ChatCompletionChunk } from "openai/resources/chat/completions";
import type { CompletionUsage } from "openai/resources/completions";
import type { Stream } from "openai/streaming";
import { getOpenAI } from "@/lib/openai/client";
import { openAIRequestFailureResponse } from "@/lib/openai/request-errors";
import {
  IDEA_REFINEMENT_DECISIVE_EDITOR_RULES,
  getIdeaRefinementPromptForBookType,
} from "@/lib/ai/prompt-templates";
import { buildGenerationContext } from "@/lib/ai/context-assembler";
import { buildSeriesContextInputForBook } from "@/lib/ai/series-context";
import {
  CRITICAL_VARIABLES_BY_TASK,
  missingRequiredVariables,
} from "@/lib/ai/template-variables";
import { resolveSystemPromptFromTemplate } from "@/lib/ai/templated-system-prompt";
import { requireBookOwnedByUser } from "@/lib/api/book-access";
import { createClient } from "@/lib/supabase/server";
import {
  apiJsonError,
  apiJsonRateLimited,
  ApiErrorCode,
  logServerError,
} from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { RefinementRequestSchema } from "@/lib/utils/schemas";
import { trackEvent } from "@/lib/utils/analytics";
import { RefinedIdeaBriefSchema } from "@/lib/refined-idea/schema";
import { sanitizeText } from "@/lib/utils/sanitize";
import type { Json } from "@/types/database.types";

export const dynamic = "force-dynamic";

const REFINED_IDEA_REGEX = /<REFINED_IDEA>([\s\S]*?)<\/REFINED_IDEA>/i;
const LOW_SIGNAL_IDEA_MESSAGE_REGEX =
  /^(hi|hello|hey|yo|test|testing|asdf|ok|okay|thanks|thank you)[.!?\s]*$/i;
const LOW_SIGNAL_IDEA_REPLY =
  "Ready. Send even a messy one-line book idea and I will turn it into a working premise.";

function estimateTokensFromText(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function isLowSignalIdeaMessage(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length <= 24 && LOW_SIGNAL_IDEA_MESSAGE_REGEX.test(trimmed);
}

function textToStream(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
}

async function* streamWithUsageCapture(
  stream: Stream<ChatCompletionChunk>,
  onUsage: (usage: CompletionUsage) => void,
): AsyncIterable<ChatCompletionChunk> {
  for await (const chunk of stream) {
    if (chunk.usage) {
      onUsage(chunk.usage);
    }
    yield chunk;
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

    const parsed = RefinementRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const { bookId, messages, userMessage: rawUserMessage } = parsed.data;

    const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
    if (denied) {
      return denied;
    }

    const { data: bookRow, error: bookRowError } = await supabase
      .from("books")
      .select("title, genre, book_type, style_examples, style_instructions, series_id, series_order")
      .eq("id", bookId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (bookRowError || !bookRow) {
      return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
    }
    const seriesContextInput = buildSeriesContextInputForBook(bookRow, user.id);

    const rl = await checkRateLimit(user.id, "refine-idea");
    if (!rl.allowed) {
      return apiJsonRateLimited(rl.resetAt);
    }

    const userMessage = sanitizeText(rawUserMessage);
    if (!userMessage.trim()) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }
    const history = [
      ...messages.map((m) => ({
        role: m.role,
        content: sanitizeText(m.content),
      })),
      { role: "user" as const, content: userMessage },
    ];

    if (isLowSignalIdeaMessage(userMessage)) {
      const assistantMessage = {
        role: "assistant" as const,
        content: LOW_SIGNAL_IDEA_REPLY,
      };
      const { error: updateError } = await supabase
        .from("books")
        .update({
          idea_conversation: [...history, assistantMessage] as unknown as Json,
        })
        .eq("id", bookId)
        .eq("user_id", user.id);

      if (updateError) {
        logServerError("refine-idea.low-signal-save", updateError, {
          details: { bookId },
        });
      }

      return new StreamingTextResponse(textToStream(LOW_SIGNAL_IDEA_REPLY), {
        status: 200,
        headers: {
          "Cache-Control": "no-cache, no-transform",
        },
      });
    }

    /* Idea refinement is conversational, but the editor should draft
     * useful structure before asking for more. Style examples mostly shape
     * the TEXTURE of the questions and the final <REFINED_IDEA> summary. The assembler
     * still injects so the eventual voice_anchor field inherits the
     * author's chosen register when they haven't explicitly set one,
     * and codex matches from the running conversation catch any
     * cast-rearrangement the author is circling back on. Refinement has
     * no chapter context, so chapter-summary / recent-prose blocks
     * short-circuit to empty. */
    const context = await buildGenerationContext({
      supabase,
      projectId: bookId,
      taskType: "refine-idea",
      baseSystemPrompt: getIdeaRefinementPromptForBookType(
        bookRow.book_type ?? "fiction",
      ),
      styleInput: {
        style_examples: bookRow.style_examples,
        style_instructions: bookRow.style_instructions,
      },
      codexTextOverride: history.map((m) => m.content).join("\n"),
      seriesContextInput,
      priorChapters: [],
      currentChapterContent: "",
      projectMeta: {
        title: bookRow.title ?? "",
        genre: bookRow.genre ?? "",
      },
      userInstruction: userMessage,
    });

    const resolvedPrompt = await resolveSystemPromptFromTemplate({
      supabase,
      userId: user.id,
      projectId: bookId,
      taskId: "refine-idea",
      variables: context.variables,
      fallbackPrompt: context.systemPrompt,
    });
    const systemPrompt = [
      resolvedPrompt.systemPrompt,
      IDEA_REFINEMENT_DECISIVE_EDITOR_RULES,
    ].join("\n\n");
    const missingCriticalVars = missingRequiredVariables(
      resolvedPrompt.active.templateText,
      CRITICAL_VARIABLES_BY_TASK["refine-idea"],
    );
    if (missingCriticalVars.length > 0) {
      console.warn("[prompt-template] critical variables missing", {
        taskId: "refine-idea",
        templateSource: resolvedPrompt.active.source,
        templateId: resolvedPrompt.active.id,
        missingVariables: missingCriticalVars,
      });
    }
    const missingVarsHeader = process.env.NODE_ENV !== "production" &&
        missingCriticalVars.length > 0
      ? missingCriticalVars.join(",")
      : null;
    const openaiMessages: {
      role: "system" | "user" | "assistant";
      content: string;
    }[] = [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
    ];

    let lastUsage: CompletionUsage | undefined;

    let completionStream: Stream<ChatCompletionChunk>;
    try {
      completionStream = await getOpenAI().chat.completions.create({
        model: "gpt-4o",
        messages: openaiMessages,
        stream: true,
        stream_options: { include_usage: true },
        temperature: 0.7,
      });
    } catch (err: unknown) {
      return openAIRequestFailureResponse(err, "refine-idea.openai");
    }

    const wrapped = streamWithUsageCapture(completionStream, (u) => {
      lastUsage = u;
    });

    /* `ai` OpenAIStream expects a slightly older ChatCompletionChunk shape than openai@4 — runtime is compatible. */
    const stream = OpenAIStream(wrapped as never, {
      onFinal: async (completion) => {
        try {
          const sb = await createClient();
          const assistantMessage = {
            role: "assistant" as const,
            content: completion,
          };
          const nextConversation = [...history, assistantMessage];

          const match = completion.match(REFINED_IDEA_REGEX);
          let refinedPayload: Json | null = null;
          if (match?.[1]) {
            const inner = match[1].trim();
            try {
              const parsedJson = JSON.parse(inner) as unknown;
              const z = RefinedIdeaBriefSchema.safeParse(parsedJson);
              if (z.success) {
                refinedPayload = z.data as unknown as Json;
              } else {
                logServerError("refine-idea.refined-zod", z.error, { details: { bookId } });
              }
            } catch (e) {
              logServerError("refine-idea.refined-json", e, { details: { bookId } });
            }
          }

          const update: {
            idea_conversation: Json;
            refined_idea?: Json | null;
            status?: "refining";
          } = {
            idea_conversation: nextConversation as unknown as Json,
          };

          if (refinedPayload) {
            update.refined_idea = refinedPayload;
            update.status = "refining";
          }

          const { error: updateError } = await sb
            .from("books")
            .update(update)
            .eq("id", bookId)
            .eq("user_id", user.id);

          if (updateError) {
            return;
          }

          const tokensUsed =
            lastUsage?.total_tokens ??
            estimateTokensFromText(systemPrompt) +
              estimateTokensFromText(
                history.map((m) => m.content).join("\n"),
              ) +
              estimateTokensFromText(completion);

          await sb.from("api_usage").insert({
            user_id: user.id,
            route: "/api/ai/refine-idea",
            tokens_used: tokensUsed,
            model: "gpt-4o",
          });

          if (refinedPayload) {
            await trackEvent(user, "idea_refined", bookId, {
              hasStructuredRefinement: true,
            });
          }
        } catch {
          /* Response already streamed; swallow post-stream errors */
        }
      },
    });

    return new StreamingTextResponse(stream, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-transform",
        ...(missingVarsHeader
          ? { "X-ChapterAI-Missing-Vars": missingVarsHeader }
          : {}),
      },
    });
  } catch (e) {
    logServerError("refine-idea", e);
    return apiJsonError(
      "Something went wrong. Please try again.",
      ApiErrorCode.INTERNAL,
      500,
    );
  }
}
