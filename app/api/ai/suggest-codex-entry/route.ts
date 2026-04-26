import { z } from "zod";

import { buildSuggestCodexEntrySystemPrompt } from "@/lib/ai/prompt-templates";
import { CODEX_TYPE_META, type CodexEntryType, isUiCodexType } from "@/lib/codex/types";
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
import type { CodexEntryTypeDb, Json } from "@/types/database.types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ENTRY_TYPES: [CodexEntryTypeDb, ...CodexEntryTypeDb[]] = [
  "character",
  "location",
  "faction",
  "object",
  "lore",
  "subplot",
  "custom",
];

const requestSchema = z
  .object({
    seriesId: z.string().uuid().nullable().optional(),
    bookId: z.string().uuid().nullable().optional(),
    userHint: z.string().min(1).max(4_000),
    scope: z.enum(["series", "project"]),
    /** If set, the model should prefer this type when it fits. */
    formEntryType: z.enum(ENTRY_TYPES).optional(),
  })
  .refine((v) => Boolean(v.seriesId) || Boolean(v.bookId), {
    message: "Either seriesId or bookId is required.",
  })
  .refine((v) => v.scope === "project" || Boolean(v.seriesId), {
    message: "Series scope requires seriesId.",
  });

const resultSchema = z.object({
  entry_type: z.enum(ENTRY_TYPES),
  name: z.string().min(1).max(200),
  aliases: z.array(z.string().max(120)).max(20).default([]),
  summary: z.string().max(1_000).nullable().optional(),
  description_md: z.string().max(20_000).default(""),
  custom_fields: z
    .record(z.union([z.string(), z.number(), z.boolean()]))
    .optional()
    .default({}),
});

function suggestedFieldNamesForType(t: CodexEntryTypeDb): string[] {
  if (t === "custom" || !isUiCodexType(t)) return [];
  return [...CODEX_TYPE_META[t as CodexEntryType].suggestedFields];
}

function stringifyRefinedExcerpt(raw: Json | null, maxChars = 2_500): string {
  if (raw == null) return "";
  if (typeof raw === "string") {
    return sanitizeText(raw).slice(0, maxChars);
  }
  try {
    return sanitizeText(JSON.stringify(raw)).slice(0, maxChars);
  } catch {
    return "";
  }
}

function buildSuggestPromptForStandalone(
  book: {
    title: string | null;
    genre: string | null;
    raw_idea: string | null;
    refined_idea: Json | null;
  },
  userHint: string,
  formEntryType?: CodexEntryTypeDb,
): string {
  const title = sanitizeText(book.title?.trim() || "Untitled");
  const genre = sanitizeText(book.genre?.trim() || "unspecified");
  const refined = stringifyRefinedExcerpt(book.refined_idea);
  const raw = sanitizeText((book.raw_idea ?? "").trim()).slice(0, 2_000);
  const typeLine = formEntryType
    ? `Selected form type: ${formEntryType}`
    : "Selected form type: (none)";
  return `## Book
Title: ${title}
Genre: ${genre}
${typeLine}

Refined brief excerpt:
${refined || "(none)"}

Raw idea excerpt:
${raw || "(none)"}

## Author request
${sanitizeText(userHint)}

Return the JSON now.`;
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

    const { seriesId, userHint, scope, bookId, formEntryType } = parsed.data;
    const isStandalone = !seriesId && Boolean(bookId);
    const effectiveScope: "series" | "project" = isStandalone ? "project" : scope;

    let existingList = "";
    let seriesUserContent = "";

    if (seriesId) {
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
        .select("id, title, series_order, genre, raw_idea, refined_idea")
        .eq("series_id", seriesId)
        .eq("user_id", user.id)
        .order("series_order", { ascending: true });

      if (booksErr) {
        logServerError("suggest-codex-entry:books", booksErr);
        return apiJsonError("Could not load books.", ApiErrorCode.INTERNAL, 500);
      }

      const bookList = bookRows ?? [];
      const bookIds = bookList.map((b) => b.id);
      if (bookId && !bookList.some((b) => b.id === bookId)) {
        return apiJsonError("Book not in this series.", ApiErrorCode.VALIDATION_ERROR, 400);
      }

      const { data: seriesEntries } = await supabase
        .from("codex_entries")
        .select("name, entry_type")
        .eq("series_id", seriesId)
        .eq("user_id", user.id)
        .limit(120);

      const { data: projectEntries } =
        bookIds.length > 0
          ? await supabase
              .from("codex_entries")
              .select("name, entry_type")
              .in("book_id", bookIds)
              .eq("user_id", user.id)
              .limit(120)
          : { data: null };

      const nameLines = new Set<string>();
      for (const r of seriesEntries ?? []) {
        nameLines.add(`- ${r.name} (${r.entry_type})`);
      }
      for (const r of projectEntries ?? []) {
        nameLines.add(`- ${r.name} (${r.entry_type})`);
      }
      existingList = Array.from(nameLines).slice(0, 100).join("\n");

      const booksBlock = bookList
        .map(
          (b) =>
            `- Book #${b.series_order ?? "?"}: ${b.title} (${(b.genre ?? "").trim() || "no genre"})`,
        )
        .join("\n");
      const focusBook =
        effectiveScope === "project" && bookId
          ? bookList.find((b) => b.id === bookId)
          : null;
      const bookDetailBlock = focusBook
        ? `\n## Focus book (this entry is book-scoped)\nTitle: ${focusBook.title}\nRaw idea excerpt:\n${sanitizeText(String(focusBook.raw_idea ?? "")).slice(0, 2_000) || "(none)"}\n\nRefined brief (JSON fragment):\n${stringifyRefinedExcerpt(focusBook.refined_idea) || "(none)"}\n`
        : "";

      seriesUserContent = `## Series
Name: ${ser.name}
Tagline: ${(ser.tagline ?? "").trim() || "(none)"}
Genre: ${(ser.genre ?? "").trim() || "(unspecified)"}
Description:
${(ser.description ?? "").trim() || "(none)"}

World / notes:
${(ser.shared_world_notes ?? "").trim().slice(0, 4_000) || "(none)"}

## Books in reading order
${booksBlock || "(no books in series yet)"}
${bookDetailBlock}
## Existing codex entry names (avoid near-duplicates)
${existingList || "(none yet)"}

## Author request
${sanitizeText(userHint)}

Return the JSON now.`;
    } else if (bookId) {
      const { data: standaloneBook, error: standaloneErr } = await supabase
        .from("books")
        .select("id, title, raw_idea, refined_idea, genre")
        .eq("id", bookId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (standaloneErr || !standaloneBook) {
        return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
      }

      const { data: projectEntries } = await supabase
        .from("codex_entries")
        .select("name, entry_type")
        .eq("book_id", bookId)
        .eq("scope", "project")
        .eq("user_id", user.id)
        .limit(120);
      const names = new Set<string>();
      for (const r of projectEntries ?? []) {
        names.add(`- ${r.name} (${r.entry_type})`);
      }
      existingList = Array.from(names).slice(0, 100).join("\n");
      seriesUserContent = `${buildSuggestPromptForStandalone(
        standaloneBook,
        userHint,
        formEntryType,
      )}

## Existing codex entry names (avoid near-duplicates)
${existingList || "(none yet)"}`;
    }

    const rl = await checkRateLimit(user.id, "suggest-codex-entry");
    if (!rl.allowed) {
      return apiJsonRateLimited(rl.resetAt);
    }

    const typeGuidance = formEntryType
      ? `The author has "${formEntryType}" selected in the form. Prefer that entry_type if it matches the user hint; if another type clearly fits better, you may use it.`
      : "Choose the best entry_type for the hint.";

    const typeHints = ENTRY_TYPES.map((t) => {
      if (t === "custom") {
        return `- custom: catch-all. Use when nothing else fits. Suggested custom_fields: freeform snake_case keys.`;
      }
      const meta = CODEX_TYPE_META[t as CodexEntryType];
      const sugg = suggestedFieldNamesForType(t);
      return `- ${t}: ${meta.helper} Suggested custom_fields when relevant: ${sugg.length ? sugg.join(", ") : "(use freeform keys)"}.`;
    }).join("\n");

    const system = buildSuggestCodexEntrySystemPrompt({
      typeGuidance,
      typeHints,
    });

    const userContent = seriesUserContent;

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
        max_tokens: 4_096,
      });
      completionText = completion.choices[0]?.message?.content?.trim() ?? "";
    } catch (err) {
      if (isOpenAIConfigError(err)) {
        return apiJsonError("AI is not configured.", ApiErrorCode.CONFIGURATION, 503);
      }
      const r = openAIRequestFailureResponse(err, "suggest-codex-entry", {
        fallbackMessage: "We could not generate a suggestion. Try again.",
      });
      return r;
    }

    if (!completionText) {
      return apiJsonError("Empty AI response.", ApiErrorCode.UPSTREAM, 502);
    }

    let obj: unknown;
    try {
      obj = JSON.parse(completionText) as unknown;
    } catch (e) {
      logServerError("suggest-codex-entry:json", e, { details: { sample: completionText.slice(0, 200) } });
      return apiJsonError("Could not parse AI response.", ApiErrorCode.UPSTREAM, 502);
    }

    const out = resultSchema.safeParse(obj);
    if (!out.success) {
      logServerError("suggest-codex-entry:schema", out.error, { details: { obj } });
      return apiJsonError("AI returned an invalid shape. Try a clearer hint or retry.", ApiErrorCode.UNPROCESSABLE_ENTITY, 422);
    }

    const d = out.data;
    return Response.json({
      entry_type: d.entry_type,
      name: sanitizeText(d.name).trim().slice(0, 200),
      aliases: d.aliases
        .map((a) => sanitizeText(a).trim())
        .filter(Boolean)
        .slice(0, 20),
      summary: d.summary == null || d.summary === "" ? null : sanitizeText(d.summary).trim().slice(0, 1_000),
      description_md: sanitizeText(d.description_md).trim().slice(0, 20_000),
      custom_fields: d.custom_fields ?? {},
    });
  } catch (e) {
    logServerError("suggest-codex-entry", e);
    return apiJsonError("Something went wrong.", ApiErrorCode.INTERNAL, 500);
  }
}
