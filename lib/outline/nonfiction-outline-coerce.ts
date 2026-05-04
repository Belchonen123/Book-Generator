/**
 * Normalizes non-fiction outline JSON before Zod — alternate roots, stringly
 * numbers, missing reader_takeaway/content_type, and common key aliases.
 */

const MAX_NONFICTION_CHAPTERS = 40;

function firstNonEmptyString(...values: unknown[]): string {
  for (const v of values) {
    if (typeof v === "string") {
      const t = v.trim();
      if (t.length > 0 && !/^tbd\b/i.test(t)) return t;
    }
  }
  return "";
}

function coerceChapterNumber(raw: unknown, index: number): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const n = Math.trunc(raw);
    return n > 0 ? n : index + 1;
  }
  const p = parseInt(String(raw ?? "").replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(p) && p > 0 ? p : index + 1;
}

function defaultReaderTakeaway(description: string): string {
  const d = description.trim();
  if (!d) {
    return "The reader gains a clearer understanding of this chapter's core idea.";
  }
  const sentenceEnd = d.search(/[.!?](\s|$)/);
  const first =
    sentenceEnd > 0 ? d.slice(0, sentenceEnd + 1).trim() : d.slice(0, 280).trim();
  return first.length > 0
    ? first
    : "The reader gains a clearer understanding of this chapter's core idea.";
}

const ALLOWED_CONTENT_TYPES = new Set([
  "concept",
  "narrative",
  "framework",
  "counterargument",
  "synthesis",
  "story",
  "research",
  "exercise",
  "mixed",
]);

function normalizeContentType(raw: unknown): string {
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (s && ALLOWED_CONTENT_TYPES.has(s)) return s;
  return "mixed";
}

function fallbackDescriptionFromOutlineFields(c: Record<string, unknown>): string {
  const claim = firstNonEmptyString(c.reader_takeaway, c.readerTakeaway, c.takeaway, c.key_takeaway);
  const hook = firstNonEmptyString(c.opening_hook_move, c.openingHookMove);
  const signature = firstNonEmptyString(c.signature_example, c.signatureExample);
  const evidence = firstNonEmptyString(c.evidence_notes, c.evidenceNotes);
  const bridge = firstNonEmptyString(c.bridges_to_next, c.bridgesToNext);
  const tension = firstNonEmptyString(c.counterargument_or_tension, c.counterargumentOrTension);
  const parts = [
    claim ? `The chapter argues this claim: ${claim}` : "",
    hook ? `Open with this hook: ${hook}` : "",
    signature ? `Build around this concrete anchor: ${signature}` : "",
    evidence ? `Use this evidence pattern: ${evidence}` : "",
    tension ? `Overcome this objection or tension: ${tension}` : "",
    bridge ? `End by leaving this next tension unresolved: ${bridge}` : "",
  ].filter(Boolean);
  return parts.length >= 2 ? parts.join(" ") : "";
}

export function coerceNonFictionOutlinePayload(input: unknown): unknown {
  if (input == null || typeof input !== "object" || Array.isArray(input)) {
    return input;
  }
  const root = input as Record<string, unknown>;
  let chapters: unknown = root.chapters;
  if (!Array.isArray(chapters) && root.outline && typeof root.outline === "object") {
    chapters = (root.outline as Record<string, unknown>).chapters;
  }
  if (!Array.isArray(chapters) && root.data && typeof root.data === "object") {
    chapters = (root.data as Record<string, unknown>).chapters;
  }
  if (!Array.isArray(chapters) && root.result && typeof root.result === "object") {
    chapters = (root.result as Record<string, unknown>).chapters;
  }
  if (!Array.isArray(chapters)) {
    return input;
  }

  const slice = chapters.slice(0, MAX_NONFICTION_CHAPTERS);
  const out = slice.map((ch, i) => {
    if (ch == null || typeof ch !== "object" || Array.isArray(ch)) {
      return {
        number: i + 1,
        title: "",
        description: "",
        reader_takeaway: defaultReaderTakeaway(""),
        content_type: "mixed",
      };
    }
    const c = ch as Record<string, unknown>;
    const num = coerceChapterNumber(c.number, i);
    const title =
      firstNonEmptyString(c.title, c.chapter_title, c.name) || `Chapter ${num}`;
    const description = firstNonEmptyString(
      c.description,
      c.summary,
      c.chapter_summary,
      c.synopsis,
    );
    const descFinal = description || fallbackDescriptionFromOutlineFields(c);
    const reader_takeaway = firstNonEmptyString(
      c.reader_takeaway,
      c.readerTakeaway,
      c.takeaway,
      c.key_takeaway,
    );
    const content_type = normalizeContentType(
      c.content_type ?? c.contentType ?? c.type ?? c.chapter_type,
    );

    const row: Record<string, unknown> = {
      number: num,
      title,
      description: descFinal,
      reader_takeaway:
        reader_takeaway.trim().length > 0
          ? reader_takeaway.trim()
          : defaultReaderTakeaway(descFinal),
      content_type,
    };

    const opt = (k: string) => firstNonEmptyString(c[k]);
    const evidence = opt("evidence_notes");
    if (evidence) row.evidence_notes = evidence;
    const hook = opt("opening_hook_move");
    if (hook) row.opening_hook_move = hook;
    const sig = opt("signature_example");
    if (sig) row.signature_example = sig;
    const bridge = opt("bridges_to_next");
    if (bridge) row.bridges_to_next = bridge;

    const digestKeys = [
      "manuscript_bible_digest",
      "continuity_from_prior_chapters",
      "stakes_for_reader",
      "counterargument_or_tension",
      "every_voice_person_or_source",
      "every_context_setting_or_timeframe",
      "every_example_evidence_or_datum",
      "every_term_framework_or_rule",
      "mandatory_beats_checklist",
    ] as const;
    for (const k of digestKeys) {
      const v = opt(k);
      if (v) row[k] = v;
    }

    return row;
  });

  return { chapters: out };
}
