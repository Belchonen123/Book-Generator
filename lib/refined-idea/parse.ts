import { RefinedIdeaBriefSchema, type RefinedIdeaBrief } from "./schema";
import type { Json } from "@/types/database.types";
import { logServerError } from "@/lib/utils/errors";
import { sanitizeText } from "@/lib/utils/sanitize";

export const REFINED_IDEA_INVALID_USER_MESSAGE =
  "Your book's refined idea has an invalid format. Re-open the idea chat to regenerate.";

export type ParseRefinedIdeaFromDbResult =
  | { ok: true; data: RefinedIdeaBrief | null; invalid: false }
  | { ok: false; data: null; invalid: true };

type JsonParseStep =
  | { kind: "absent" }
  | { kind: "string_parse_failed" }
  | { kind: "ok"; value: unknown };

function jsonParseStep(value: Json | null | undefined): JsonParseStep {
  if (value === null || value === undefined) {
    return { kind: "absent" };
  }
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) {
      return { kind: "absent" };
    }
    try {
      return { kind: "ok", value: JSON.parse(t) as unknown };
    } catch {
      return { kind: "string_parse_failed" };
    }
  }
  return { kind: "ok", value };
}

/**
 * Zod-validate `books.refined_idea` (jsonb) at boundaries. No logging — safe for
 * client components. Prefer {@link parseRefinedIdeaFromDb} in server routes
 * (logs on failure).
 */
export function parseRefinedIdeaValue(
  value: Json | null | undefined,
):
  | { success: true; data: RefinedIdeaBrief | null }
  | { success: false; error: "shape" | "json_string" } {
  const step = jsonParseStep(value);
  if (step.kind === "absent") {
    return { success: true, data: null };
  }
  if (step.kind === "string_parse_failed") {
    return { success: false, error: "json_string" };
  }
  const o = step.value;
  if (o === null || typeof o !== "object" || Array.isArray(o)) {
    return { success: false, error: "shape" };
  }
  const r = RefinedIdeaBriefSchema.safeParse(o);
  if (!r.success) {
    return { success: false, error: "shape" };
  }
  return { success: true, data: r.data };
}

/**
 * Read `refined_idea` with Zod, log invalid rows server-side. Use for all DB reads.
 */
export function parseRefinedIdeaFromDb(
  value: Json | null | undefined,
  context: string,
  options?: { bookId?: string; logFailure?: boolean },
): ParseRefinedIdeaFromDbResult {
  const logFailure = options?.logFailure !== false;
  const step = jsonParseStep(value);
  if (step.kind === "absent") {
    return { ok: true, data: null, invalid: false };
  }
  if (step.kind === "string_parse_failed") {
    if (logFailure) {
      logServerError(
        context,
        new Error("refined_idea text is not valid JSON"),
        { details: { bookId: options?.bookId } },
      );
    }
    return { ok: false, data: null, invalid: true };
  }
  const o = step.value;
  if (o === null || typeof o !== "object" || Array.isArray(o)) {
    if (logFailure) {
      logServerError(
        context,
        new Error("refined_idea must be a JSON object"),
        { details: { bookId: options?.bookId } },
      );
    }
    return { ok: false, data: null, invalid: true };
  }
  const r = RefinedIdeaBriefSchema.safeParse(o);
  if (!r.success) {
    if (logFailure) {
      logServerError(context, r.error, { details: { bookId: options?.bookId } });
    }
    return { ok: false, data: null, invalid: true };
  }
  return { ok: true, data: r.data, invalid: false };
}

/** One-line / short text for series continuity, codex, and template `project.premise`. */
export function refinedIdeaToPlainSummary(
  value: Json | null | undefined,
  context: string,
  maxLen: number,
  options?: { bookId?: string },
): string {
  const p = parseRefinedIdeaFromDb(value, context, { bookId: options?.bookId });
  if (!p.ok || !p.data) {
    return "";
  }
  const b = p.data;
  const line =
    (b.core_premise ?? b.premise ?? b.one_sentence_thesis ?? "").trim() ||
    [b.suggested_title ?? b.title, b.subgenre ? `${b.genre} / ${b.subgenre}` : b.genre]
      .map((s) => (typeof s === "string" ? s.trim() : ""))
      .filter(Boolean)
      .join(" — ");
  const raw = line || JSON.stringify(b);
  if (raw.length <= maxLen) {
    return raw;
  }
  return `${raw.slice(0, maxLen).trimEnd()}…`;
}

/** Template variable: premise string (never a raw object). */
export function refinedIdeaToTemplatePremise(
  value: Json | null | undefined,
  context: string,
  options?: { bookId?: string },
): string {
  return refinedIdeaToPlainSummary(value, context, 4_000, options);
}

function formatRefinedBriefAsLines(b: RefinedIdeaBrief): string {
  const o = b as unknown as Record<string, unknown>;
  const s = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const arr = (v: unknown) =>
    Array.isArray(v) ? (v as unknown[]).map(String).filter(Boolean).join(", ") : null;
  const lines: string[] = [];
  if (s(o.suggested_title ?? o.title)) {
    lines.push(`Title: ${s(o.suggested_title ?? o.title)}`);
  }
  if (s(o.genre)) {
    lines.push(`Genre: ${s(o.genre)}${s(o.subgenre) ? ` / ${s(o.subgenre)}` : ""}`);
  }
  if (s(o.target_audience ?? o.audience)) {
    lines.push(`Target audience: ${s(o.target_audience ?? o.audience)}`);
  }
  if (s(o.core_premise ?? o.premise ?? o.core_promise)) {
    lines.push(
      `Premise: ${s(o.core_premise ?? o.premise ?? o.core_promise)}`,
    );
  }
  if (s(o.emotional_contract)) {
    lines.push(`Emotional contract: ${s(o.emotional_contract)}`);
  }
  if (s(o.tone ?? o.tone_and_style)) {
    lines.push(`Voice/style: ${s(o.tone ?? o.tone_and_style)}`);
  }
  if (arr(o.comparable_titles)) {
    lines.push(`Comparable titles: ${arr(o.comparable_titles)}`);
  }
  if (arr(o.key_themes ?? o.themes)) {
    lines.push(`Themes: ${arr(o.key_themes ?? o.themes)}`);
  }
  if (s(o.world_specific_detail)) {
    lines.push(`World detail: ${s(o.world_specific_detail)}`);
  }
  if (s(o.protagonist_core_wound)) {
    lines.push(`Protagonist wound: ${s(o.protagonist_core_wound)}`);
  }
  if (s(o.must_have_scene)) {
    lines.push(`Key image: ${s(o.must_have_scene)}`);
  }
  if (s(o.arc_shape)) {
    lines.push(`Arc: ${s(o.arc_shape)}`);
  }
  if (s(o.unique_angle)) {
    lines.push(`Unique angle: ${s(o.unique_angle)}`);
  }
  if (s(o.reader_before_state ?? o.before_state)) {
    lines.push(`Reader before: ${s(o.reader_before_state ?? o.before_state)}`);
  }
  if (s(o.reader_after_state ?? o.after_state)) {
    lines.push(`Reader after: ${s(o.reader_after_state ?? o.after_state)}`);
  }
  return lines.length > 0 ? lines.join("\n") : JSON.stringify(b, null, 2);
}

/** Full labelled block for prompts (same field coverage as `buildBriefContext`). */
export function refinedIdeaToBriefLabelledText(b: RefinedIdeaBrief): string {
  return formatRefinedBriefAsLines(b);
}

/** Chapter / voice prompts: long block of labelled brief text (not title/genre header). */
export function refinedIdeaToPositioningBlock(
  value: Json | null | undefined,
  context: string,
  options?: { bookId?: string },
): string | null {
  const p = parseRefinedIdeaFromDb(value, context, { bookId: options?.bookId });
  if (!p.ok) {
    return null;
  }
  if (!p.data) {
    return null;
  }
  return refinedIdeaToBriefLabelledText(p.data);
}

/**
 * For outline + approve-outline: a non-empty string for the model when a structured
 * brief exists; fall back to raw idea / title. If JSON exists but is invalid, logs
 * and prefers raw idea.
 */
export function briefSourceForBookRow(params: {
  refined_idea: Json | null;
  raw_idea: string | null;
  title: string | null;
  bookId?: string;
  logContext: string;
}): string {
  const title = params.title?.trim() ?? "";
  const workingTitle =
    title && title !== "Untitled Book" ? `Working title: ${title}` : "";
  if (params.refined_idea != null) {
    const step = jsonParseStep(params.refined_idea);
    if (step.kind === "ok" && step.value !== null && typeof step.value === "object" && !Array.isArray(step.value)) {
      const r = RefinedIdeaBriefSchema.safeParse(step.value);
      if (r.success) {
        return JSON.stringify(r.data, null, 2);
      }
    }
    logServerError(
      `${params.logContext}.refined-brief`,
      new Error("refined_idea invalid; falling back to raw idea or title"),
      { details: { bookId: params.bookId } },
    );
  }
  const raw = params.raw_idea?.trim() ?? "";
  if (raw) {
    return raw;
  }
  return workingTitle;
}

/** DALL-E + UI: first usable premise / title string for cover. */
export function coverPremiseFromRefinedIdea(
  value: Json | null | undefined,
  context: string,
  options?: { bookId?: string },
): string {
  const p = parseRefinedIdeaFromDb(value, context, { bookId: options?.bookId });
  if (!p.ok) {
    return "A commercially viable book with broad reader appeal.";
  }
  if (!p.data) {
    return "A commercially viable book with broad reader appeal.";
  }
  const b = p.data;
  const pick = (b.core_premise ?? b.premise ?? b.suggested_title ?? b.title ?? "").trim();
  if (pick) {
    return sanitizeText(pick).slice(0, 1500);
  }
  return "A commercially viable book with broad reader appeal.";
}

/** KDP / export: JSON text for the listing model. */
export function refinedIdeaToKdpText(
  value: Json | null | undefined,
  context: string,
  options?: { bookId?: string; maxLen?: number },
): string {
  const p = parseRefinedIdeaFromDb(value, context, { bookId: options?.bookId });
  const cap = options?.maxLen ?? 12_000;
  if (!p.ok || !p.data) {
    return "";
  }
  return JSON.stringify(p.data, null, 2).slice(0, cap);
}
