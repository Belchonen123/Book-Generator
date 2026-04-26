import { AnthropicStream, StreamingTextResponse } from "ai";
import { toFile } from "openai/uploads";

import { snapshotChapter } from "@/lib/book/revisions";
import {
  anthropicMessagesCreateStreaming,
  getChapterTextForPersistence,
} from "@/lib/anthropic/message-attempts";
import { toVercelAnthropicStreamInput } from "@/lib/anthropic/vercel-anthropic-bridge";
import { anthropicTextModelsToTry } from "@/lib/anthropic/text-model";
import { anthropicRequestFailureResponse } from "@/lib/anthropic/request-errors";
import { getOpenAI } from "@/lib/openai/client";
import { openAIRequestFailureResponse } from "@/lib/openai/request-errors";
import { buildGenerationContext } from "@/lib/ai/context-assembler";
import {
  VOICE_TO_CHAPTER_APPEND_USER_INSTRUCTION,
  VOICE_TO_CHAPTER_MERGE_USER_INSTRUCTION,
  VOICE_TO_CHAPTER_REPLACE_USER_INSTRUCTION,
} from "@/lib/ai/prompt-templates";
import { buildSeriesContextInputForBook } from "@/lib/ai/series-context";
import { resolveSystemPromptFromTemplate } from "@/lib/ai/templated-system-prompt";
import {
  CRITICAL_VARIABLES_BY_TASK,
  missingRequiredVariables,
} from "@/lib/ai/template-variables";
import { requireBookOwnedByUser } from "@/lib/api/book-access";
import { ensureProfileRowForUser } from "@/lib/supabase/ensure-profile-row";
import { createClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/utils/analytics";
import {
  apiJsonError,
  apiJsonRateLimited,
  ApiErrorCode,
  logServerError,
} from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { refinedIdeaToTemplatePremise } from "@/lib/refined-idea/parse";
import { sanitizeText } from "@/lib/utils/sanitize";
import type { ChapterStatusDb } from "@/types/database.types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_BYTES = 15 * 1024 * 1024;
const FIVE_MIN_MS = 5 * 60 * 1000;

type VoiceMode = "append" | "replace" | "rewrite";

function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

export async function POST(request: Request) {
  let priorStatus: ChapterStatusDb | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiJsonError("Please sign in to continue.", ApiErrorCode.UNAUTHORIZED, 401);
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch (e) {
      logServerError("voice-to-chapter.formData", e);
      return apiJsonError(
        "Request body is too large or invalid.",
        ApiErrorCode.VALIDATION_ERROR,
        413,
      );
    }

    const audio = form.get("audio");
    const bookId = form.get("bookId");
    const chapterId = form.get("chapterId");
    const modeRaw = form.get("mode");
    const durationRaw = form.get("durationMs");

    if (
      !audio ||
      typeof audio === "string" ||
      !bookId ||
      typeof bookId !== "string" ||
      !chapterId ||
      typeof chapterId !== "string" ||
      !modeRaw ||
      typeof modeRaw !== "string"
    ) {
      return apiJsonError(
        "Missing audio, bookId, chapterId, or mode.",
        ApiErrorCode.VALIDATION_ERROR,
        400,
      );
    }

    const size =
      "size" in audio && typeof (audio as { size?: number }).size === "number"
        ? (audio as Blob).size
        : 0;
    if (size > MAX_BYTES) {
      return apiJsonError(
        "Audio file is too large (max 15MB).",
        ApiErrorCode.VALIDATION_ERROR,
        413,
      );
    }
    if (size === 0) {
      return apiJsonError("Empty audio file.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const mode = modeRaw as VoiceMode;
    if (mode !== "append" && mode !== "replace" && mode !== "rewrite") {
      return apiJsonError("Invalid mode.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const durationMs =
      typeof durationRaw === "string" && /^\d+$/.test(durationRaw)
        ? Number.parseInt(durationRaw, 10)
        : 0;
    if (durationMs > FIVE_MIN_MS) {
      return apiJsonError(
        "Recording too long (max 5 minutes).",
        ApiErrorCode.VALIDATION_ERROR,
        400,
      );
    }

    const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
    if (denied) {
      return denied;
    }

    const rl = await checkRateLimit(user.id, "voice-to-chapter");
    if (!rl.allowed) {
      return apiJsonRateLimited(rl.resetAt);
    }

    let { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      logServerError("voice-to-chapter.profile", profileError);
      return apiJsonError("Could not load profile.", ApiErrorCode.INTERNAL, 500);
    }

    if (!profile) {
      const ensured = await ensureProfileRowForUser(supabase, user);
      if (!ensured.ok) {
        logServerError(
          "voice-to-chapter.profile-create",
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
        "Voice memo drafting is a Pro feature.",
        ApiErrorCode.UPGRADE_REQUIRED,
        403,
      );
    }

    const { data: book, error: bookError } = await supabase
      .from("books")
      .select(
        "id, user_id, title, genre, refined_idea, style_examples, style_instructions, series_id, series_order",
      )
      .eq("id", bookId)
      .eq("user_id", user.id)
      .single();

    if (bookError || !book) {
      return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    const { data: chapter, error: chapterError } = await supabase
      .from("chapters")
      .select(
        "id, book_id, title, outline_summary, author_notes, chapter_number, content, status, generation_count, target_word_count",
      )
      .eq("id", chapterId)
      .eq("book_id", bookId)
      .single();

    if (chapterError || !chapter) {
      return apiJsonError("Chapter not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    priorStatus = chapter.status as ChapterStatusDb;

    const buf = Buffer.from(await (audio as Blob).arrayBuffer());
    const file = await toFile(buf, "memo.webm", { type: "audio/webm" });

    let transcript: string;
    try {
      const tr = await getOpenAI().audio.transcriptions.create({
        file,
        model: "whisper-1",
        language: "en",
      });
      transcript = typeof tr === "string" ? tr : tr.text ?? "";
    } catch (e) {
      return openAIRequestFailureResponse(e, "voice-to-chapter.whisper", {
        fallbackMessage: "Transcription failed.",
      });
    }

    if (!transcript.trim()) {
      return apiJsonError("Could not understand the recording.", ApiErrorCode.UNPROCESSABLE_ENTITY, 422);
    }

    const seriesContextInput = buildSeriesContextInputForBook(
      {
        series_id: book.series_id,
        series_order: book.series_order,
      },
      user.id,
    );
    const modeDirective =
      mode === "append"
        ? VOICE_TO_CHAPTER_APPEND_USER_INSTRUCTION
        : mode === "replace"
          ? VOICE_TO_CHAPTER_REPLACE_USER_INSTRUCTION
          : VOICE_TO_CHAPTER_MERGE_USER_INSTRUCTION;
    const context = await buildGenerationContext({
      supabase,
      projectId: bookId,
      currentChapterId: chapterId,
      taskType: "chapter-gen",
      baseSystemPrompt: "",
      styleInput: {
        style_examples: book.style_examples,
        style_instructions: book.style_instructions,
      },
      seriesContextInput,
      codexTextOverride: `${chapter.title}\n${chapter.outline_summary ?? ""}\n${transcript}`,
      projectMeta: {
        title: book.title,
        genre: book.genre,
        premise: refinedIdeaToTemplatePremise(
          book.refined_idea,
          "voice-to-chapter.projectMeta",
          { bookId },
        ),
      },
      chapterMeta: {
        number: chapter.chapter_number,
        title: chapter.title,
        beat: chapter.outline_summary,
      },
      userInstruction: modeDirective,
    });
    const resolved = await resolveSystemPromptFromTemplate({
      supabase,
      userId: user.id,
      projectId: bookId,
      taskId: "voice-to-chapter",
      variables: context.variables,
      fallbackPrompt: context.systemPrompt,
    });
    const missingCriticalVars = missingRequiredVariables(
      resolved.active.templateText,
      CRITICAL_VARIABLES_BY_TASK["voice-to-chapter"],
    );
    if (missingCriticalVars.length > 0) {
      console.warn("[prompt-template] critical variables missing", {
        taskId: "voice-to-chapter",
        templateSource: resolved.active.source,
        templateId: resolved.active.id,
        missingVariables: missingCriticalVars,
      });
    }

    const systemPrompt = resolved.systemPrompt;
    const existingMd = chapter.content ?? "";
    const userMessage =
      mode === "rewrite"
        ? `## Transcript of spoken notes (English)\n${sanitizeText(transcript)}\n\n## Current chapter draft (markdown)\n${
            existingMd.trim() || "(empty)"
          }`
        : `## Transcript of spoken notes (English)\n${sanitizeText(transcript)}`;
    const missingVarsHeader = missingCriticalVars.join(",");
    const responseHeaders: Record<string, string> = {
      "X-Voice-Model": "",
      "X-Voice-Mode": mode,
    };
    if (process.env.NODE_ENV !== "production" && missingVarsHeader) {
      responseHeaders["X-ChapterAI-Missing-Vars"] = missingVarsHeader;
    }

    const { error: statusError } = await supabase
      .from("chapters")
      .update({ status: "generating" })
      .eq("id", chapterId)
      .eq("book_id", bookId);

    if (statusError) {
      return apiJsonError("Could not start voice draft.", ApiErrorCode.INTERNAL, 500);
    }

    const models = anthropicTextModelsToTry();
    let streamResult: Awaited<ReturnType<typeof anthropicMessagesCreateStreaming>>;
    try {
      streamResult = await anthropicMessagesCreateStreaming(
        {
          systemPrompt,
          max_tokens: 16_000,
          temperature: 0.7,
          messages: [{ role: "user", content: userMessage }],
        },
        models,
      );
    } catch (e) {
      const sb2 = await createClient();
      await sb2
        .from("chapters")
        .update({ status: priorStatus })
        .eq("id", chapterId)
        .eq("book_id", bookId);
      return anthropicRequestFailureResponse(e, "voice-to-chapter.anthropic");
    }

    const { stream, modelUsed } = streamResult;

    const outStream = AnthropicStream(toVercelAnthropicStreamInput(stream), {
      onFinal: async (completion) => {
        try {
          const sb = await createClient();
          const trimmed = await getChapterTextForPersistence(stream, completion);
          if (!trimmed) {
            await sb
              .from("chapters")
              .update({ status: priorStatus ?? "draft" })
              .eq("id", chapterId)
              .eq("book_id", bookId);
            return;
          }

          let newMd: string;
          if (mode === "append") {
            const pre = (existingMd ?? "").trim();
            newMd = pre ? `${pre}\n\n${trimmed}` : trimmed;
            if (pre) {
              await snapshotChapter(sb, {
                chapterId,
                userId: user.id,
                source: "manual_save",
              });
            }
          } else {
            const { data: freshChapter, error: freshErr } = await sb
              .from("chapters")
              .select("generation_count")
              .eq("id", chapterId)
              .eq("book_id", bookId)
              .single();
            if (freshErr || !freshChapter) {
              await sb
                .from("chapters")
                .update({ status: priorStatus ?? "draft" })
                .eq("id", chapterId)
                .eq("book_id", bookId);
              return;
            }
            const nextGen = (freshChapter.generation_count ?? 0) + 1;
            const snap = nextGen > 1 ? "regenerate" : "generation";
            await snapshotChapter(sb, { chapterId, userId: user.id, source: snap });
            newMd = trimmed;
            await sb
              .from("chapters")
              .update({
                content: newMd,
                status: "draft" as const,
                word_count: countWords(newMd),
                generation_count: nextGen,
              })
              .eq("id", chapterId)
              .eq("book_id", bookId);

            const { data: allCh, error: sumError } = await sb
              .from("chapters")
              .select("word_count")
              .eq("book_id", bookId);
            if (!sumError && allCh) {
              const total = allCh.reduce((a, c) => a + (c.word_count ?? 0), 0);
              await sb
                .from("books")
                .update({ word_count: total })
                .eq("id", bookId)
                .eq("user_id", user.id);
            }
            await trackEvent(user, "voice_memo_used", bookId, {
              durationMs,
              mode,
              model: modelUsed,
            });
            return;
          }

          const words = countWords(newMd);
          const { data: gRow } = await sb
            .from("chapters")
            .select("generation_count")
            .eq("id", chapterId)
            .eq("book_id", bookId)
            .single();
          const nextGen2 = (gRow?.generation_count ?? 0) + 1;

          await sb
            .from("chapters")
            .update({
              content: newMd,
              status: "draft" as const,
              word_count: words,
              generation_count: nextGen2,
            })
            .eq("id", chapterId)
            .eq("book_id", bookId);

          const { data: allCh2, error: sum2 } = await sb
            .from("chapters")
            .select("word_count")
            .eq("book_id", bookId);
          if (!sum2 && allCh2) {
            const total = allCh2.reduce((a, c) => a + (c.word_count ?? 0), 0);
            await sb
              .from("books")
              .update({ word_count: total })
              .eq("id", bookId)
              .eq("user_id", user.id);
          }

          await trackEvent(user, "voice_memo_used", bookId, {
            durationMs,
            mode,
            model: modelUsed,
          });
        } catch (err) {
          logServerError("voice-to-chapter.onFinal", err);
        }
      },
    });

    return new StreamingTextResponse(outStream, {
      headers: {
        ...responseHeaders,
        "X-Voice-Model": modelUsed,
      },
    });
  } catch (e) {
    logServerError("voice-to-chapter", e);
    return apiJsonError("Something went wrong.", ApiErrorCode.INTERNAL, 500);
  }
}
