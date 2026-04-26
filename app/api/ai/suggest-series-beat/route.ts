import { z } from "zod";

import { buildSuggestSeriesBeatSystemPrompt } from "@/lib/ai/prompt-templates";
import { getOpenAI, isOpenAIConfigError } from "@/lib/openai/client";
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
import type {
  SeriesArcBeatStatusDb,
  SeriesArcBeatTypeDb,
} from "@/types/database.types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BEAT_TYPES: [SeriesArcBeatTypeDb, ...SeriesArcBeatTypeDb[]] = [
  "setup",
  "foreshadow",
  "development",
  "complication",
  "payoff",
  "resolution",
];

const BEAT_STATUSES: [SeriesArcBeatStatusDb, ...SeriesArcBeatStatusDb[]] = [
  "planned",
  "drafted",
  "complete",
];

const requestSchema = z.object({
  arcId: z.string().uuid(),
  userHint: z.string().min(1).max(3_000),
  formBeatType: z.enum(BEAT_TYPES).optional(),
});

const resultSchema = z.object({
  beat_type: z.enum(BEAT_TYPES),
  description: z.string().min(1).max(2_000),
  status: z.enum(BEAT_STATUSES).default("planned"),
  book_id: z.string().uuid().nullable().optional(),
  chapter_id: z.string().uuid().nullable().optional(),
});

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

    const parsed = requestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const { arcId, userHint, formBeatType } = parsed.data;

    const { data: arc, error: arcErr } = await supabase
      .from("series_arcs")
      .select(
        "id, name, description_md, arc_type, status, starts_book_id, ends_book_id, series_id, linked_codex_entry_ids",
      )
      .eq("id", arcId)
      .maybeSingle();

    if (arcErr || !arc) {
      return apiJsonError("Arc not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    const { data: ser, error: serErr } = await supabase
      .from("series")
      .select("id, name, tagline, genre, description, shared_world_notes")
      .eq("id", arc.series_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (serErr || !ser) {
      return apiJsonError("Series not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    const { data: bookRows, error: booksErr } = await supabase
      .from("books")
      .select("id, title, series_order")
      .eq("series_id", arc.series_id)
      .eq("user_id", user.id)
      .order("series_order", { ascending: true });

    if (booksErr) {
      logServerError("suggest-series-beat:books", booksErr);
      return apiJsonError("Could not load books.", ApiErrorCode.INTERNAL, 500);
    }

    const books = bookRows ?? [];
    const bookIdSet = new Set(books.map((b) => b.id));
    const bookIdList = books.map((b) => b.id);

    const { data: existingBeats } = await supabase
      .from("series_arc_beats")
      .select("description, book_id, beat_type")
      .eq("arc_id", arcId)
      .order("position", { ascending: true })
      .limit(30);

    const rl = await checkRateLimit(user.id, "suggest-series-beat");
    if (!rl.allowed) {
      return apiJsonRateLimited(rl.resetAt);
    }

    let chapters: { id: string; book_id: string; chapter_number: number; title: string }[] = [];
    if (bookIdList.length > 0) {
      const { data: ch } = await supabase
        .from("chapters")
        .select("id, book_id, chapter_number, title")
        .in("book_id", bookIdList)
        .order("chapter_number", { ascending: true });
      chapters = ch ?? [];
    }

    const booksBlock = books
      .map((b) => `id=${b.id} | #${b.series_order ?? "?"} | ${b.title}`)
      .join("\n");
    const chapterBlock = chapters
      .map((c) => {
        const bookTitle = books.find((b) => b.id === c.book_id)?.title ?? "";
        return `id=${c.id} | book_id=${c.book_id} | Ch${c.chapter_number}: ${c.title} (${bookTitle})`;
      })
      .join("\n");

    const priorBeats = (existingBeats ?? [])
      .map((b) => `- [${b.beat_type ?? "?"}] ${b.description?.slice(0, 200) ?? ""}…`)
      .join("\n");

    const typeBias = formBeatType
      ? `The author has beat type "${formBeatType}" selected; prefer that if it fits.`
      : "Choose the most appropriate beat_type for the story moment.";

    const system = buildSuggestSeriesBeatSystemPrompt({
      beatTypes: BEAT_TYPES,
      typeBias,
    });

    const userContent = `## Series
${ser.name} — ${(ser.genre ?? "").trim() || "fiction"}
${(ser.tagline ?? "").trim()}

## Parent arc
Name: ${arc.name}
Type: ${arc.arc_type ?? "—"} | Status: ${arc.status}
Description:
${(arc.description_md ?? "").trim().slice(0, 3_000) || "(empty)"}
Starts book id: ${arc.starts_book_id ?? "null"} | Ends book id: ${arc.ends_book_id ?? "null"}
Linked codex id count: ${Array.isArray(arc.linked_codex_entry_ids) ? arc.linked_codex_entry_ids.length : 0}

## Books
${booksBlock || "(no books — book_id and chapter_id should be null)"}

## Chapters (for optional chapter_id)
${chapterBlock || "(no chapters found — chapter_id should be null)"}

## Beats already in this arc (do not repeat; advance the thread)
${priorBeats || "(none yet)"}

## Author request
${sanitizeText(userHint)}

Return JSON only.`;

    let completionText: string;
    try {
      const completion = await getOpenAI().chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        temperature: 0.6,
        max_tokens: 1_200,
      });
      completionText = completion.choices[0]?.message?.content?.trim() ?? "";
    } catch (err) {
      if (isOpenAIConfigError(err)) {
        return apiJsonError("AI is not configured.", ApiErrorCode.CONFIGURATION, 503);
      }
      return openAIRequestFailureResponse(err, "suggest-series-beat", {
        fallbackMessage: "We could not generate a suggestion. Try again.",
      });
    }

    if (!completionText) {
      return apiJsonError("Empty AI response.", ApiErrorCode.UPSTREAM, 502);
    }

    let obj: unknown;
    try {
      obj = JSON.parse(completionText) as unknown;
    } catch (e) {
      logServerError("suggest-series-beat:json", e, { details: { sample: completionText.slice(0, 200) } });
      return apiJsonError("Could not parse AI response.", ApiErrorCode.UPSTREAM, 502);
    }

    const out = resultSchema.safeParse(obj);
    if (!out.success) {
      logServerError("suggest-series-beat:schema", out.error, { details: { obj } });
      return apiJsonError("AI returned an invalid shape. Try a clearer hint or retry.", ApiErrorCode.UNPROCESSABLE_ENTITY, 422);
    }

    const d = out.data;
    let bookId = d.book_id && bookIdSet.has(d.book_id) ? d.book_id : null;
    if (!bookId && books.length === 1) {
      bookId = books[0]!.id;
    }

    let chapterId: string | null = d.chapter_id && bookId ? d.chapter_id : null;
    if (chapterId) {
      const ch = chapters.find((c) => c.id === chapterId);
      if (!ch || ch.book_id !== bookId) {
        chapterId = null;
      }
    }

    return Response.json({
      beat_type: d.beat_type,
      description: sanitizeText(d.description).trim().slice(0, 2_000),
      status: d.status,
      book_id: bookId,
      chapter_id: chapterId,
    });
  } catch (e) {
    logServerError("suggest-series-beat", e);
    return apiJsonError("Something went wrong.", ApiErrorCode.INTERNAL, 500);
  }
}
