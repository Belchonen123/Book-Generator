import { z } from "zod";

import { buildSuggestSeriesArcSystemPrompt } from "@/lib/ai/prompt-templates";
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
import type { SeriesArcStatusDb, SeriesArcTypeDb } from "@/types/database.types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ARC_TYPES: [SeriesArcTypeDb, ...SeriesArcTypeDb[]] = [
  "character",
  "plot",
  "thematic",
  "romance",
  "mystery",
  "world",
  "custom",
];

const ARC_STATUSES: [SeriesArcStatusDb, ...SeriesArcStatusDb[]] = [
  "setup",
  "developing",
  "climax",
  "resolved",
  "abandoned",
];

const requestSchema = z.object({
  seriesId: z.string().uuid(),
  userHint: z.string().min(1).max(4_000),
  formArcType: z.enum(ARC_TYPES).optional(),
  formStatus: z.enum(ARC_STATUSES).optional(),
});

const resultSchema = z.object({
  name: z.string().min(1).max(200),
  description_md: z.string().max(20_000).default(""),
  arc_type: z.enum(ARC_TYPES),
  status: z.enum(ARC_STATUSES),
  starts_book_id: z.string().uuid().nullable().optional(),
  ends_book_id: z.string().uuid().nullable().optional(),
  linked_codex_entry_ids: z.array(z.string().uuid()).max(50).default([]),
});

function orderIndex(
  books: { id: string; series_order: number | null }[],
  id: string | null,
): number {
  if (!id) return -1;
  const b = books.find((x) => x.id === id);
  return b?.series_order ?? 999;
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

    const parsed = requestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const { seriesId, userHint, formArcType, formStatus } = parsed.data;

    const { data: ser, error: serErr } = await supabase
      .from("series")
      .select("id, name, description, tagline, genre, shared_world_notes")
      .eq("id", seriesId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (serErr || !ser) {
      return apiJsonError("Series not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    const { data: bookRows, error: booksErr } = await supabase
      .from("books")
      .select("id, title, series_order")
      .eq("series_id", seriesId)
      .eq("user_id", user.id)
      .order("series_order", { ascending: true });

    if (booksErr) {
      logServerError("suggest-series-arc:books", booksErr);
      return apiJsonError("Could not load books.", ApiErrorCode.INTERNAL, 500);
    }

    const books = bookRows ?? [];
    const bookIdSet = new Set(books.map((b) => b.id));
    const bookIdList = books.map((b) => b.id);

    const rl = await checkRateLimit(user.id, "suggest-series-arc");
    if (!rl.allowed) {
      return apiJsonRateLimited(rl.resetAt);
    }

    const { data: arcRows } = await supabase
      .from("series_arcs")
      .select("name, arc_type, status")
      .eq("series_id", seriesId)
      .limit(60);

    const { data: seriesCodex } = await supabase
      .from("codex_entries")
      .select("id, name, entry_type")
      .eq("series_id", seriesId)
      .eq("user_id", user.id)
      .limit(200);

    const projectCodexRes =
      bookIdList.length > 0
        ? await supabase
            .from("codex_entries")
            .select("id, name, entry_type")
            .in("book_id", bookIdList)
            .eq("user_id", user.id)
            .limit(200)
        : null;
    const projectCodex = projectCodexRes?.data;

    const byId = new Map<string, { id: string; name: string; entry_type: string }>();
    for (const c of seriesCodex ?? []) byId.set(c.id, c);
    for (const c of projectCodex ?? []) byId.set(c.id, c);
    const combinedCodex = Array.from(byId.values());

    const booksBlock = books
      .map((b) => `id=${b.id} | #${b.series_order ?? "?"} | ${b.title}`)
      .join("\n");
    const codexBlock = combinedCodex
      .map((c) => `id=${c.id} | type=${c.entry_type} | ${c.name}`)
      .join("\n");
    const arcsBlock = (arcRows ?? [])
      .map((a) => `- ${a.name} (${a.arc_type ?? "?"}, ${a.status})`)
      .join("\n");

    const typeBias = formArcType
      ? `The author has arc type "${formArcType}" selected; prefer that if it fits.`
      : "Pick the best arc_type for the user hint.";
    const statusBias = formStatus
      ? `The author has status "${formStatus}" selected; prefer that if it fits.`
      : "Pick a credible status for how far the arc has progressed in the story.";

    const system = buildSuggestSeriesArcSystemPrompt({
      arcTypes: ARC_TYPES,
      arcStatuses: ARC_STATUSES,
      typeBias,
      statusBias,
    });

    const userContent = `## Series
Name: ${ser.name}
Tagline: ${(ser.tagline ?? "").trim() || "(none)"}
Genre: ${(ser.genre ?? "").trim() || "(unspecified)"}
Description:
${(ser.description ?? "").trim().slice(0, 3_000) || "(none)"}
World/notes:
${(ser.shared_world_notes ?? "").trim().slice(0, 2_000) || "(none)"}

## Books (use these exact ids for starts/ends)
${booksBlock || "(no books in series — use nulls for book ids)"}

## Codex (for linked_codex_entry_ids only)
${codexBlock || "(no codex entries)"}

## Existing arcs
${arcsBlock || "(none yet)"}

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
        temperature: 0.65,
        max_tokens: 3_500,
      });
      completionText = completion.choices[0]?.message?.content?.trim() ?? "";
    } catch (err) {
      if (isOpenAIConfigError(err)) {
        return apiJsonError("AI is not configured.", ApiErrorCode.CONFIGURATION, 503);
      }
      return openAIRequestFailureResponse(err, "suggest-series-arc", {
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
      logServerError("suggest-series-arc:json", e, { details: { sample: completionText.slice(0, 200) } });
      return apiJsonError("Could not parse AI response.", ApiErrorCode.UPSTREAM, 502);
    }

    const out = resultSchema.safeParse(obj);
    if (!out.success) {
      logServerError("suggest-series-arc:schema", out.error, { details: { obj } });
      return apiJsonError("AI returned an invalid shape. Try a clearer hint or retry.", ApiErrorCode.UNPROCESSABLE_ENTITY, 422);
    }

    const d = out.data;
    let starts = d.starts_book_id && bookIdSet.has(d.starts_book_id) ? d.starts_book_id : null;
    let ends = d.ends_book_id && bookIdSet.has(d.ends_book_id) ? d.ends_book_id : null;
    if (starts && ends) {
      const oS = orderIndex(books, starts);
      const oE = orderIndex(books, ends);
      if (oS > oE) {
        const t = starts;
        starts = ends;
        ends = t;
      }
    }

    const allowedCodex = new Set(combinedCodex.map((c) => c.id));
    const linked = d.linked_codex_entry_ids.filter((id) => allowedCodex.has(id)).slice(0, 50);

    return Response.json({
      name: sanitizeText(d.name).trim().slice(0, 200),
      description_md: sanitizeText(d.description_md).trim().slice(0, 20_000),
      arc_type: d.arc_type,
      status: d.status,
      starts_book_id: starts,
      ends_book_id: ends,
      linked_codex_entry_ids: linked,
    });
  } catch (e) {
    logServerError("suggest-series-arc", e);
    return apiJsonError("Something went wrong.", ApiErrorCode.INTERNAL, 500);
  }
}
