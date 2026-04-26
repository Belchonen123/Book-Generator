import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { Stream } from "openai/streaming";
import type { ChatCompletionChunk } from "openai/resources/chat/completions";

import { buildGenerationContext } from "@/lib/ai/context-assembler";
import { buildSeriesContextInputForBook } from "@/lib/ai/series-context";
import {
  CRITICAL_VARIABLES_BY_TASK,
  missingRequiredVariables,
} from "@/lib/ai/template-variables";
import { CHAT_BASE_SYSTEM_PROMPT } from "@/lib/ai/prompt-templates";
import type {
  ChapterMetaForTemplate,
  ProjectMetaForTemplate,
} from "@/lib/ai/context-assembler";
import { resolveSystemPromptFromTemplate } from "@/lib/ai/templated-system-prompt";
import { requireBookOwnedByUser } from "@/lib/api/book-access";
import { refinedIdeaToTemplatePremise } from "@/lib/refined-idea/parse";
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
import { sanitizeText } from "@/lib/utils/sanitize";
import { ChatRequestSchema, type ChatMention } from "@/lib/utils/schemas";

export const dynamic = "force-dynamic";

/**
 * Chapter-grounded sidebar chat — Prompt 7.
 *
 * Flow per request:
 *   1. Auth + rate limit + book ownership.
 *   2. Resolve or create the `chat_threads` row.
 *   3. Load the last N messages on the thread (for continuity).
 *   4. Persist the NEW user message up-front — if the stream dies, the
 *      thread history still reflects what the author asked.
 *   5. Build the context-assembler variables, layering the current
 *      chapter + any mentioned codex entries / chapters as high-priority
 *      codex text overrides so the matcher always pulls them in.
 *   6. Resolve the `chat` template into a system prompt.
 *   7. Stream the OpenAI response to the client. On close, persist the
 *      assistant turn and (if the thread just crossed 3 messages and
 *      still has no title) kick off a cheap auto-title job.
 *
 * The stream uses plain UTF-8 text chunks — dead simple for the client.
 * Metadata (thread id, assistant message id) is passed back in response
 * headers before the body starts.
 */

/* How many previous turns to replay into the model. Keeps the prompt
 * bounded on long threads; older turns are still stored for the UI. */
const CHAT_HISTORY_LIMIT = 20;

/* Max words of mentioned-codex / chapter content we splice into the
 * codex-matcher text window. Generous — the assembler has its own
 * token budget and will trim. */
const MENTION_BIAS_MAX_CHARS = 8_000;

const MODEL = "gpt-4o-mini";
const TITLE_MODEL = "gpt-4o-mini";

type StoredMention = { type: "codex" | "chapter"; id: string; label?: string };

function sanitizeMentions(input: ChatMention[]): StoredMention[] {
  const seen = new Set<string>();
  const out: StoredMention[] = [];
  for (const m of input) {
    const key = `${m.type}:${m.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      type: m.type,
      id: m.id,
      label: m.label?.slice(0, 200),
    });
  }
  return out;
}

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

    const parsed = ChatRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError(
        "Invalid request.",
        ApiErrorCode.VALIDATION_ERROR,
        400,
      );
    }
    const body = parsed.data;

    const denied = await requireBookOwnedByUser(supabase, body.bookId, user.id);
    if (denied) return denied;

    const rl = await checkRateLimit(user.id, "chat");
    if (!rl.allowed) return apiJsonRateLimited(rl.resetAt);

    /* ------------------------------------------------------------ *
     * 1. Book + (optional) pinned chapter metadata.                *
     * ------------------------------------------------------------ */
    const { data: book, error: bookError } = await supabase
      .from("books")
      .select(
        "id, user_id, title, genre, tone, refined_idea, style_examples, style_instructions, series_id, series_order",
      )
      .eq("id", body.bookId)
      .eq("user_id", user.id)
      .single();

    if (bookError || !book) {
      return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
    }
    const seriesContextInput = buildSeriesContextInputForBook(book, user.id);

    let chapter: {
      id: string;
      title: string;
      chapter_number: number;
      content: string | null;
    } | null = null;

    if (body.chapterId) {
      const { data: chapterRow, error: chapterError } = await supabase
        .from("chapters")
        .select("id, book_id, title, chapter_number, content")
        .eq("id", body.chapterId)
        .eq("book_id", body.bookId)
        .maybeSingle();
      if (chapterError) {
        logServerError("chat.chapter-fetch", chapterError);
      }
      if (chapterRow) {
        chapter = {
          id: chapterRow.id,
          title: chapterRow.title,
          chapter_number: chapterRow.chapter_number,
          content: chapterRow.content,
        };
      }
    }

    /* ------------------------------------------------------------ *
     * 2. Resolve or create the thread.                             *
     * ------------------------------------------------------------ */
    let threadId: string | null = body.threadId ?? null;
    if (threadId) {
      const { data: threadRow, error: threadErr } = await supabase
        .from("chat_threads")
        .select("id, project_id")
        .eq("id", threadId)
        .eq("project_id", body.bookId)
        .maybeSingle();
      if (threadErr || !threadRow) {
        return apiJsonError(
          "Chat thread not found.",
          ApiErrorCode.NOT_FOUND,
          404,
        );
      }
    } else {
      const { data: created, error: createErr } = await supabase
        .from("chat_threads")
        .insert({
          project_id: body.bookId,
          chapter_id: body.chapterId ?? null,
          title: null,
        })
        .select("id")
        .single();
      if (createErr || !created) {
        logServerError("chat.thread-create", createErr);
        return apiJsonError(
          "Could not start a new chat.",
          ApiErrorCode.INTERNAL,
          500,
        );
      }
      threadId = created.id;
    }

    /* ------------------------------------------------------------ *
     * 3. Load thread history and persist the new user message.    *
     * ------------------------------------------------------------ */
    const { data: prior, error: priorErr } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(CHAT_HISTORY_LIMIT);

    if (priorErr) {
      logServerError("chat.history-fetch", priorErr);
    }

    const mentions = sanitizeMentions(body.mentions ?? []);

    const { data: userRow, error: userInsertErr } = await supabase
      .from("chat_messages")
      .insert({
        thread_id: threadId,
        role: "user",
        content: body.userMessage,
        mentions: mentions,
      })
      .select("id")
      .single();

    if (userInsertErr || !userRow) {
      logServerError("chat.user-insert", userInsertErr);
      return apiJsonError(
        "Could not save your message.",
        ApiErrorCode.INTERNAL,
        500,
      );
    }

    /* ------------------------------------------------------------ *
     * 4. Build context. Mentioned codex entries / chapters are      *
     *    spliced into the text window that drives codex matching    *
     *    so the assembler pulls them in even when the message text  *
     *    doesn't name them directly.                                *
     * ------------------------------------------------------------ */
    const mentionIds = {
      codex: mentions.filter((m) => m.type === "codex").map((m) => m.id),
      chapter: mentions.filter((m) => m.type === "chapter").map((m) => m.id),
    };

    let mentionedCodexText = "";
    if (mentionIds.codex.length > 0) {
      const { data: codexRows } = await supabase
        .from("codex_entries")
        .select("id, name, aliases, summary, description_md")
        .eq("book_id", body.bookId)
        .in("id", mentionIds.codex);
      if (codexRows && codexRows.length > 0) {
        mentionedCodexText = codexRows
          .map((c) => {
            const aliases = Array.isArray(c.aliases) ? c.aliases : [];
            return [c.name, ...aliases].filter(Boolean).join(" ");
          })
          .join("\n");
      }
    }

    let mentionedChapterText = "";
    if (mentionIds.chapter.length > 0) {
      const { data: chapRows } = await supabase
        .from("chapters")
        .select("id, title, chapter_number, content")
        .eq("book_id", body.bookId)
        .in("id", mentionIds.chapter);
      if (chapRows && chapRows.length > 0) {
        mentionedChapterText = chapRows
          .map((c) => {
            const body = (c.content ?? "").trim();
            /* Give the assembler the title + a slice of content so
             * codex matching across the reference surface still fires
             * even on long chapters. The assembler applies its own
             * budget after. */
            const slice = body.length > 4_000 ? body.slice(0, 4_000) : body;
            return `Chapter ${c.chapter_number}: ${c.title}\n${slice}`;
          })
          .join("\n\n");
      }
    }

    /* Combine the message + mentions + pinned chapter title into the
     * codex matcher window. Cap to guard against absurd inputs. */
    const combinedCodexText = [
      body.userMessage,
      mentionedCodexText,
      mentionedChapterText,
      chapter?.title ?? "",
    ]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, MENTION_BIAS_MAX_CHARS);

    const projectMeta: ProjectMetaForTemplate = {
      title: book.title,
      genre: book.genre,
      premise: refinedIdeaToTemplatePremise(
        book.refined_idea,
        "chat.projectMeta",
        { bookId: body.bookId },
      ),
    };
    const chapterMeta: ChapterMetaForTemplate | undefined = chapter
      ? {
          number: chapter.chapter_number,
          title: chapter.title,
        }
      : undefined;

    const context = await buildGenerationContext({
      supabase,
      projectId: body.bookId,
      currentChapterId: chapter?.id ?? null,
      taskType: "chat",
      baseSystemPrompt: CHAT_BASE_SYSTEM_PROMPT,
      styleInput: {
        style_examples: book.style_examples,
        style_instructions: book.style_instructions,
      },
      precedingProse: chapter?.content ?? "",
      currentChapterContent: "",
      codexTextOverride: combinedCodexText,
      seriesContextInput,
      projectMeta,
      chapterMeta,
      userInstruction: body.userMessage,
    });

    const resolvedPrompt = await resolveSystemPromptFromTemplate({
      supabase,
      userId: user.id,
      projectId: body.bookId,
      taskId: "chat",
      variables: context.variables,
      fallbackPrompt: context.systemPrompt,
    });
    const systemPrompt = resolvedPrompt.systemPrompt;
    const missingCriticalVars = missingRequiredVariables(
      resolvedPrompt.active.templateText,
      CRITICAL_VARIABLES_BY_TASK.chat,
    );
    if (missingCriticalVars.length > 0) {
      console.warn("[prompt-template] critical variables missing", {
        taskId: "chat",
        templateSource: resolvedPrompt.active.source,
        templateId: resolvedPrompt.active.id,
        missingVariables: missingCriticalVars,
      });
    }
    const missingVarsHeader = process.env.NODE_ENV !== "production" &&
        missingCriticalVars.length > 0
      ? missingCriticalVars.join(",")
      : null;

    /* ------------------------------------------------------------ *
     * 5. Replay conversation history + new user message.           *
     * ------------------------------------------------------------ */
    const history: ChatCompletionMessageParam[] = (prior ?? [])
      .filter((m): m is { role: "user" | "assistant"; content: string } => {
        return (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string";
      })
      .map((m) => ({ role: m.role, content: sanitizeText(m.content) }));

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: sanitizeText(body.userMessage) },
    ];

    /* ------------------------------------------------------------ *
     * 6. Stream.                                                    *
     * ------------------------------------------------------------ */
    let completionStream: Stream<ChatCompletionChunk>;
    try {
      completionStream = await getOpenAI().chat.completions.create({
        model: MODEL,
        stream: true,
        temperature: 0.6,
        max_tokens: 2_048,
        messages,
      });
    } catch (e) {
      return openAIRequestFailureResponse(e, "chat.openai", {
        fallbackMessage: "The assistant is temporarily unavailable.",
      });
    }

    const encoder = new TextEncoder();
    const accumulated: string[] = [];
    const threadIdForStream = threadId;
    const userMessageIdForStream = userRow.id;
    const isNewThread = !body.threadId;

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const part of completionStream) {
            const delta = part.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              accumulated.push(delta);
              controller.enqueue(encoder.encode(delta));
            }
          }
        } catch (err) {
          logServerError("chat.stream", err);
          try {
            controller.enqueue(
              encoder.encode(
                "\n\n[The assistant stopped mid-stream. Please retry.]",
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
          /* Persist the assistant turn + maybe auto-title. Fire-and-
           * forget: the stream is already closed for the author. */
          void finalizeAssistantTurn({
            threadId: threadIdForStream,
            projectId: body.bookId,
            assistantText: accumulated.join("").trim(),
            isNewThread,
          }).catch((e) => logServerError("chat.finalize", e));
        }
      },
      cancel() {
        /* Client aborted (closed the panel). Persist whatever we got so
         * the author can see their partial answer next time. */
        void finalizeAssistantTurn({
          threadId: threadIdForStream,
          projectId: body.bookId,
          assistantText: accumulated.join("").trim(),
          isNewThread,
        }).catch((e) => logServerError("chat.finalize-cancel", e));
      },
    });

    return new Response(readable, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
        "X-Chat-Thread-Id": threadIdForStream,
        "X-Chat-User-Message-Id": userMessageIdForStream,
        ...(missingVarsHeader
          ? { "X-ChapterAI-Missing-Vars": missingVarsHeader }
          : {}),
        /* Expose custom headers to the browser — otherwise fetch()
         * cannot read them in some configurations. */
        "Access-Control-Expose-Headers":
          missingVarsHeader
            ? "X-Chat-Thread-Id, X-Chat-User-Message-Id, X-ChapterAI-Missing-Vars"
            : "X-Chat-Thread-Id, X-Chat-User-Message-Id",
      },
    });
  } catch (e) {
    logServerError("chat", e);
    return apiJsonError(
      "Something went wrong. Please try again.",
      ApiErrorCode.INTERNAL,
      500,
    );
  }
}

/* ================================================================ *
 * Helpers                                                          *
 * ================================================================ */

async function finalizeAssistantTurn(params: {
  threadId: string;
  projectId: string;
  assistantText: string;
  isNewThread: boolean;
}): Promise<void> {
  const supabase = await createClient();

  if (params.assistantText.length > 0) {
    const { error } = await supabase.from("chat_messages").insert({
      thread_id: params.threadId,
      role: "assistant",
      content: params.assistantText,
      mentions: [],
    });
    if (error) {
      logServerError("chat.assistant-insert", error);
    }
  }

  /* Auto-title: run only once per thread, after there are >=3 messages
   * AND the title is still null. Cheap GPT call, non-blocking. */
  const { data: thread } = await supabase
    .from("chat_threads")
    .select("title")
    .eq("id", params.threadId)
    .maybeSingle();

  if (thread && !thread.title) {
    const { count } = await supabase
      .from("chat_messages")
      .select("*", { count: "exact", head: true })
      .eq("thread_id", params.threadId);

    if ((count ?? 0) >= 3) {
      await autoTitleThread(params.threadId).catch((e) =>
        logServerError("chat.auto-title", e),
      );
    }
  }
}

async function autoTitleThread(threadId: string): Promise<void> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(6);

  if (!rows || rows.length === 0) return;

  const transcript = rows
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n\n")
    .slice(0, 4_000);

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: TITLE_MODEL,
      temperature: 0.4,
      max_tokens: 24,
      messages: [
        {
          role: "system",
          content:
            "You title chat threads. Read the conversation and return ONLY a 2–6 word title that captures the topic. No quotes, no punctuation at the end, no prefix like 'Title:'.",
        },
        {
          role: "user",
          content: transcript,
        },
      ],
    });
    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const cleaned = raw.replace(/^["'`]+|["'`]+$/g, "").slice(0, 120);
    if (!cleaned) return;

    await supabase
      .from("chat_threads")
      .update({ title: cleaned })
      .eq("id", threadId);
  } catch (e) {
    logServerError("chat.auto-title-openai", e);
  }
}
