"use client";

import type { Message } from "ai";
import { useChat } from "ai/react";
import { ArrowRight, Loader2, Send, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";

import {
  syncIdeaCodexSeedsAction,
  updateBookTypeAction,
} from "@/app/(dashboard)/projects/[id]/idea/actions";
import { Button } from "@/components/ui/button";
import { RefinedIdeaBriefSchema } from "@/lib/refined-idea/schema";
import { REFINED_IDEA_INVALID_USER_MESSAGE } from "@/lib/refined-idea/parse";
import type { BookTypeDb, Json } from "@/types/database.types";
import type { RefinedIdeaBrief } from "@/types/book.types";
import { cn } from "@/lib/utils/cn";

export type { RefinedIdeaBrief } from "@/types/book.types";

const REFINED_IDEA_REGEX = /<REFINED_IDEA>([\s\S]*?)<\/REFINED_IDEA>/i;

type EditableBrief = {
  title: string;
  subtitle: string;
  genre: string;
  audience: string;
  premise: string;
  tone: string;
  themes: string;
  estimated_length: string;
  voice_anchor: string;
  authorial_stance: string;
  cultural_texture: string;
  codex_characters: string;
  codex_locations: string;
  codex_objects: string;
  codex_factions: string;
  codex_lore: string;
  codex_subplots: string;
};

type EditableFieldKey = keyof EditableBrief;

const EMPTY_EDITABLE: EditableBrief = {
  title: "",
  subtitle: "",
  genre: "",
  audience: "",
  premise: "",
  tone: "",
  themes: "",
  estimated_length: "",
  voice_anchor: "",
  authorial_stance: "",
  cultural_texture: "",
  codex_characters: "",
  codex_locations: "",
  codex_objects: "",
  codex_factions: "",
  codex_lore: "",
  codex_subplots: "",
};

function themesToString(t: RefinedIdeaBrief["themes"] | RefinedIdeaBrief["key_themes"]): string {
  if (Array.isArray(t)) return t.join(", ");
  if (typeof t === "string") return t;
  return "";
}

function seedListToMultiline(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter(Boolean)
      .join("\n");
  }
  if (typeof value === "string") return value.trim();
  return "";
}

function multilineToSeedList(value: string): string[] {
  return value
    .split(/\r?\n|,/g)
    .map((line) => line.trim())
    .filter(Boolean);
}

function genreFromRefined(b: RefinedIdeaBrief): string {
  return (
    b.genre?.trim() ||
    b.subgenre?.trim() ||
    b.category?.trim() ||
    b.subcategory?.trim() ||
    ""
  );
}

function audienceFromRefined(b: RefinedIdeaBrief): string {
  return (b.target_audience ?? b.audience ?? b.target_reader ?? "").trim();
}

function toneFromRefined(b: RefinedIdeaBrief): string {
  return (b.tone ?? b.tone_and_style ?? b.dominant_tone ?? "").trim();
}

/** Maps stored brief JSON to the long "premise" field used in the outline / editor. */
function premiseFromRefined(b: RefinedIdeaBrief): string {
  const direct = (b.core_premise ?? b.premise ?? "").trim();
  if (direct) return direct;
  const thesis = b.one_sentence_thesis?.trim();
  if (thesis) {
    const parts: string[] = [thesis];
    const ua = b.unique_angle?.trim();
    if (ua) parts.push(`Unique angle: ${ua}`);
    const ho = b.hardest_objection?.trim();
    if (ho) parts.push(`Hardest reader objection: ${ho}`);
    const sc = b.signature_case_study?.trim();
    if (sc) parts.push(`Anchor case: ${sc}`);
    const gap = b.what_comps_get_wrong?.trim();
    if (gap) parts.push(`What adjacent books miss: ${gap}`);
    return parts.join("\n\n");
  }
  return "";
}

function briefToEditable(b: RefinedIdeaBrief | null): EditableBrief {
  if (!b) return { ...EMPTY_EDITABLE };
  const estimatedLengthFallback = (() => {
    const m = b.estimated_length?.trim();
    if (m) return m;
    const parts = [
      b.chapters != null ? `${b.chapters} chapters` : "",
      b.word_count != null ? `${b.word_count.toLocaleString()} words` : "",
    ].filter(Boolean);
    return parts.join(" · ");
  })();
  return {
    title: (b.title ?? b.suggested_title ?? "").trim(),
    subtitle: (b.subtitle ?? "").trim(),
    genre: genreFromRefined(b),
    audience: audienceFromRefined(b),
    premise: premiseFromRefined(b),
    tone: toneFromRefined(b),
    themes: themesToString(b.themes ?? b.key_themes).trim(),
    estimated_length: estimatedLengthFallback,
    voice_anchor: (b.voice_anchor ?? "").trim(),
    authorial_stance: (b.authorial_stance ?? "").trim(),
    cultural_texture: (b.cultural_texture ?? "").trim(),
    codex_characters: seedListToMultiline(
      b.codex_characters ??
        [b.protagonist?.name, b.antagonist?.name].filter(
          (v): v is string => typeof v === "string" && v.trim().length > 0,
        ),
    ),
    codex_locations: seedListToMultiline(b.codex_locations),
    codex_objects: seedListToMultiline(b.codex_objects),
    codex_factions: seedListToMultiline(b.codex_factions),
    codex_lore: seedListToMultiline(b.codex_lore),
    codex_subplots: seedListToMultiline(b.codex_subplots),
  };
}

/** Derive numeric outline targets from the estimated-length line so JSON matches what the author typed. */
function parseEstimatedLengthToBudget(text: string): {
  chapters?: number;
  word_count?: number;
} {
  const t = text.trim();
  if (!t) return {};
  const out: { chapters?: number; word_count?: number } = {};
  const ch = t.match(/(\d+)\s*chapters?/i);
  if (ch) {
    const n = parseInt(ch[1], 10);
    if (!Number.isNaN(n) && n > 0 && n <= 200) out.chapters = n;
  }
  const wc =
    t.match(/([\d,]+)\s*words?\b/i) || t.match(/\b([\d,]+)\s*wk\b/i);
  if (wc) {
    const n = parseInt(wc[1].replace(/,/g, ""), 10);
    if (!Number.isNaN(n) && n > 0) out.word_count = n;
  }
  if (out.word_count == null) {
    const wk = t.match(/(\d+(?:\.\d+)?)\s*k\s*words?\b/i);
    if (wk) {
      const n = parseFloat(wk[1]);
      if (!Number.isNaN(n) && n > 0) out.word_count = Math.round(n * 1000);
    }
  }
  return out;
}

function editableToBrief(e: EditableBrief, preserve?: RefinedIdeaBrief | null): RefinedIdeaBrief {
  const themesArr = e.themes
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const out: RefinedIdeaBrief = preserve ? { ...preserve } : {};
  out.title = e.title.trim() || "Untitled";
  out.genre = e.genre.trim();
  out.target_audience = e.audience.trim();
  out.core_premise = e.premise.trim();
  out.tone = e.tone.trim();
  out.tone_and_style = e.tone.trim();
  if (themesArr.length > 0) {
    out.key_themes = themesArr;
    out.themes = themesArr;
  }
  if (e.subtitle.trim()) out.subtitle = e.subtitle.trim();
  if (e.estimated_length.trim()) {
    out.estimated_length = e.estimated_length.trim();
    const budget = parseEstimatedLengthToBudget(e.estimated_length);
    if (budget.chapters != null) out.chapters = budget.chapters;
    else delete out.chapters;
    if (budget.word_count != null) out.word_count = budget.word_count;
    else delete out.word_count;
  }
  if (e.voice_anchor.trim()) out.voice_anchor = e.voice_anchor.trim();
  else delete out.voice_anchor;
  if (e.authorial_stance.trim()) out.authorial_stance = e.authorial_stance.trim();
  else delete out.authorial_stance;
  if (e.cultural_texture.trim()) out.cultural_texture = e.cultural_texture.trim();
  else delete out.cultural_texture;
  const codexCharacters = multilineToSeedList(e.codex_characters);
  if (codexCharacters.length > 0) out.codex_characters = codexCharacters;
  else delete out.codex_characters;
  const codexLocations = multilineToSeedList(e.codex_locations);
  if (codexLocations.length > 0) out.codex_locations = codexLocations;
  else delete out.codex_locations;
  const codexObjects = multilineToSeedList(e.codex_objects);
  if (codexObjects.length > 0) out.codex_objects = codexObjects;
  else delete out.codex_objects;
  const codexFactions = multilineToSeedList(e.codex_factions);
  if (codexFactions.length > 0) out.codex_factions = codexFactions;
  else delete out.codex_factions;
  const codexLore = multilineToSeedList(e.codex_lore);
  if (codexLore.length > 0) out.codex_lore = codexLore;
  else delete out.codex_lore;
  const codexSubplots = multilineToSeedList(e.codex_subplots);
  if (codexSubplots.length > 0) out.codex_subplots = codexSubplots;
  else delete out.codex_subplots;
  return out;
}

function parseRefinedBrief(jsonStr: string): RefinedIdeaBrief | null {
  try {
    const v = JSON.parse(jsonStr) as unknown;
    const r = RefinedIdeaBriefSchema.safeParse(v);
    if (r.success) {
      return r.data;
    }
    console.warn("[IdeaChat] invalid <REFINED_IDEA> JSON from assistant", r.error);
    toast.error(REFINED_IDEA_INVALID_USER_MESSAGE);
  } catch (e) {
    console.warn("[IdeaChat] unparseable <REFINED_IDEA> block", e);
    toast.error(REFINED_IDEA_INVALID_USER_MESSAGE);
  }
  return null;
}

function extractRefinedFromAssistantContent(content: string): RefinedIdeaBrief | null {
  const match = content.match(REFINED_IDEA_REGEX);
  if (!match?.[1]) return null;
  return parseRefinedBrief(match[1].trim());
}

function conversationToMessages(raw: Json): Message[] {
  if (!Array.isArray(raw)) return [];
  const out: Message[] = [];
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i] as { role?: string; content?: string };
    if (row.role !== "user" && row.role !== "assistant") continue;
    out.push({
      id: `loaded-${i}`,
      role: row.role,
      content: typeof row.content === "string" ? row.content : "",
    });
  }
  return out;
}

const briefInputClass =
  "w-full rounded-md border border-border/70 bg-background/70 px-3 py-2 text-sm text-editorial-cream placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 disabled:opacity-60";

function BriefField({
  label,
  hint,
  className,
  action,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("block", className)}>
      <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-editorial-muted">
          {label}
        </span>
        {action}
      </div>
      {hint ? (
        <span className="mb-2 block text-xs leading-relaxed text-editorial-muted/90">
          {hint}
        </span>
      ) : null}
      {children}
    </div>
  );
}

function RegenerateFieldControl({
  busy,
  disabled,
  hasValue,
  onClick,
  compact,
}: {
  busy: boolean;
  disabled: boolean;
  hasValue: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      aria-label={hasValue ? "Regenerate from chat" : "Generate from chat"}
      className={cn(
        "inline-flex flex-shrink-0 items-center gap-1 rounded-md border border-gold/40 bg-gold/15 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-gold transition hover:bg-gold/25 disabled:cursor-not-allowed disabled:opacity-60",
        compact ? "" : "self-start",
      )}
    >
      {busy ? (
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
      ) : (
        <Sparkles className="h-3 w-3" aria-hidden />
      )}
      {hasValue ? "Regenerate" : "From chat"}
    </button>
  );
}

export type IdeaChatProps = {
  bookId: string;
  bookTitle: string;
  initialConversation: Json;
  initialRefinedIdea: RefinedIdeaBrief | null;
  refinedIdeaFromDbInvalid?: boolean;
  initialBookType: BookTypeDb;
};

export function IdeaChat({
  bookId,
  bookTitle,
  initialConversation,
  initialRefinedIdea,
  refinedIdeaFromDbInvalid = false,
  initialBookType,
}: IdeaChatProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [skipOpen, setSkipOpen] = useState(false);
  const [skipText, setSkipText] = useState("");
  const [outlineBusy, setOutlineBusy] = useState(false);
  const [bookType, setBookType] = useState<BookTypeDb>(initialBookType);
  const [bookTypePending, startBookTypeTransition] = useTransition();

  const handleBookTypeChange = useCallback(
    (next: BookTypeDb) => {
      if (next === bookType) return;
      const prev = bookType;
      setBookType(next);
      startBookTypeTransition(async () => {
        const result = await updateBookTypeAction(bookId, next);
        if (!result.ok) {
          setBookType(prev);
          toast.error(result.error ?? "Could not save book type.");
        }
      });
    },
    [bookId, bookType],
  );

  const initialFromDb = useMemo(() => initialRefinedIdea, [initialRefinedIdea]);

  const [lockedBrief, setLockedBrief] = useState<RefinedIdeaBrief | null>(initialFromDb);
  const [editable, setEditable] = useState<EditableBrief>(() =>
    briefToEditable(initialFromDb),
  );
  const userTouchedFieldsRef = useRef<Set<EditableFieldKey>>(new Set());
  const lastSyncedBriefJsonRef = useRef<string | null>(
    initialFromDb ? JSON.stringify(initialFromDb) : null,
  );
  const [regeneratingField, setRegeneratingField] = useState<EditableFieldKey | null>(null);
  const autoSubtitleDoneRef = useRef<string | null>(null);
  const [extractingCodexSeeds, setExtractingCodexSeeds] = useState(false);
  const [syncingCodexSeeds, startCodexSyncTransition] = useTransition();
  const autoExtractCodexDoneRef = useRef<string | null>(null);

  const initialMessages = useMemo(
    () => conversationToMessages(initialConversation),
    [initialConversation],
  );

  const applyRefinedFromAssistant = useCallback((parsed: RefinedIdeaBrief) => {
    const json = JSON.stringify(parsed);
    if (lastSyncedBriefJsonRef.current === json) {
      return;
    }
    lastSyncedBriefJsonRef.current = json;
    setLockedBrief(parsed);
    setEditable((prev) => {
      const next = briefToEditable(parsed);
      const merged: EditableBrief = { ...next };
      userTouchedFieldsRef.current.forEach((k: EditableFieldKey) => {
        merged[k] = prev[k];
      });
      return merged;
    });
  }, []);

  const { messages, input, handleInputChange, handleSubmit, isLoading, stop } = useChat({
    api: "/api/ai/refine-idea",
    initialMessages,
    experimental_prepareRequestBody: ({ messages: chatMessages }) => {
      const last = chatMessages[chatMessages.length - 1];
      if (!last || last.role !== "user") {
        return {
          bookId,
          messages: [],
          userMessage: "",
        };
      }
      const prior = chatMessages
        .slice(0, -1)
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));
      return {
        bookId,
        messages: prior,
        userMessage: last.content,
      };
    },
    onError(err) {
      toast.error(err.message || "Something went wrong. Please try again.");
    },
    onFinish(message) {
      const parsed = extractRefinedFromAssistantContent(message.content);
      if (parsed) {
        applyRefinedFromAssistant(parsed);
      }
    },
  });

  useEffect(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant?.content || isLoading) return;
    const parsed = extractRefinedFromAssistantContent(lastAssistant.content);
    if (!parsed) return;
    applyRefinedFromAssistant(parsed);
  }, [messages, isLoading, applyRefinedFromAssistant]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const goToOutline = useCallback(
    async (opts?: { rawIdea?: string; refinedIdeaOverride?: RefinedIdeaBrief | null }) => {
      setOutlineBusy(true);
      try {
        const raw = opts?.rawIdea;
        const refined = opts?.refinedIdeaOverride;
        const body: {
          bookId: string;
          rawIdea?: string;
          refinedIdeaOverride?: string;
          conversation?: { role: "user" | "assistant"; content: string }[];
        } = { bookId };
        if (raw !== undefined && raw.trim().length > 0) {
          body.rawIdea = raw.trim();
        } else if (refined && Object.keys(refined).length > 0) {
          body.refinedIdeaOverride = JSON.stringify(refined);
        }
        const transcript = messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }))
          .filter((m) => m.content.trim().length > 0);
        if (transcript.length > 0) {
          body.conversation = transcript;
        }
        const res = await fetch("/api/ai/generate-outline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error ?? "Could not start outline.");
        }
        router.push(`/projects/${bookId}/outline`);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not start outline.");
      } finally {
        setOutlineBusy(false);
      }
    },
    [bookId, router, messages],
  );

  const onSkipSubmit = async () => {
    await goToOutline({ rawIdea: skipText });
    setSkipOpen(false);
    setSkipText("");
  };

  const setEditableField = useCallback(
    <K extends keyof EditableBrief>(key: K, value: EditableBrief[K]) => {
      userTouchedFieldsRef.current.add(key);
      setEditable((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const resetEditableToAI = useCallback(() => {
    userTouchedFieldsRef.current.clear();
    setEditable(briefToEditable(lockedBrief));
    lastSyncedBriefJsonRef.current = lockedBrief ? JSON.stringify(lockedBrief) : null;
  }, [lockedBrief]);

  const hasIdeaChatTranscript = useMemo(
    () =>
      messages.some(
        (m) =>
          (m.role === "user" || m.role === "assistant") && m.content.trim().length > 0,
      ),
    [messages],
  );

  const hasBriefTextBasis = useCallback(
    (b: EditableBrief) => {
      return (
        b.title.trim().length > 0 ||
        b.subtitle.trim().length > 0 ||
        b.genre.trim().length > 0 ||
        b.audience.trim().length > 0 ||
        b.premise.trim().length > 0 ||
        b.tone.trim().length > 0 ||
        b.themes.trim().length > 0 ||
        b.estimated_length.trim().length > 0 ||
        b.voice_anchor.trim().length > 0 ||
        b.authorial_stance.trim().length > 0 ||
        b.cultural_texture.trim().length > 0 ||
        b.codex_characters.trim().length > 0 ||
        b.codex_locations.trim().length > 0 ||
        b.codex_objects.trim().length > 0 ||
        b.codex_factions.trim().length > 0 ||
        b.codex_lore.trim().length > 0 ||
        b.codex_subplots.trim().length > 0
      );
    },
    [],
  );

  const regenerateBriefField = useCallback(
    async (field: EditableFieldKey, opts?: { silent?: boolean }) => {
      if (field === "subtitle" && !editable.title.trim()) {
        if (!opts?.silent) {
          toast.info("Add a working title first, then we can add a subtitle.");
        }
        return;
      }
      if (field === "title" && !editable.title.trim() && !hasIdeaChatTranscript) {
        if (!opts?.silent) {
          toast.info("Add a few messages in the chat or type a working title, then try again.");
        }
        return;
      }
      if (!hasIdeaChatTranscript && !hasBriefTextBasis(editable)) {
        if (!opts?.silent) {
          toast.info("Type something in the idea chat or the brief, then we can help.");
        }
        return;
      }

      setRegeneratingField(field);
      try {
        const res = await fetch("/api/ai/regenerate-idea-field", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookId,
            field,
            brief: {
              title: editable.title,
              subtitle: editable.subtitle,
              genre: editable.genre,
              audience: editable.audience,
              premise: editable.premise,
              tone: editable.tone,
              themes: editable.themes,
              estimated_length: editable.estimated_length,
            },
            conversation: messages
              .filter((m) => m.role === "user" || m.role === "assistant")
              .slice(-120)
              .map((m) => ({
                role: m.role as "user" | "assistant",
                content: m.content,
              })),
          }),
        });
        const data = (await res.json().catch(() => null)) as
          | { value?: string; error?: string }
          | null;
        if (!res.ok || !data?.value) {
          throw new Error(data?.error ?? "Could not regenerate this field.");
        }
        userTouchedFieldsRef.current.delete(field);
        setEditable((prev) => ({ ...prev, [field]: data.value ?? "" }));
        if (!opts?.silent) {
          toast.success(
            field === "premise"
              ? "Premise expanded from the chat and your draft — you can still edit it."
              : "Field refreshed from the chat and your current draft.",
          );
        }
      } catch (e) {
        if (!opts?.silent) {
          toast.error(
            e instanceof Error ? e.message : "Could not regenerate this field.",
          );
        }
      } finally {
        setRegeneratingField(null);
      }
    },
    [bookId, editable, hasBriefTextBasis, hasIdeaChatTranscript, messages],
  );

  type ExtractedCodexSeeds = {
    characters?: string[];
    locations?: string[];
    objects?: string[];
    factions?: string[];
    lore?: string[];
    subplots?: string[];
  };

  const applyExtractedCodexSeeds = useCallback((seeds: ExtractedCodexSeeds) => {
    const toText = (values: string[] | undefined): string =>
      (values ?? [])
        .map((v) => v.trim())
        .filter(Boolean)
        .join("\n");
    setEditable((prev) => {
      const next = { ...prev };
      if (!userTouchedFieldsRef.current.has("codex_characters")) {
        next.codex_characters = toText(seeds.characters);
      }
      if (!userTouchedFieldsRef.current.has("codex_locations")) {
        next.codex_locations = toText(seeds.locations);
      }
      if (!userTouchedFieldsRef.current.has("codex_objects")) {
        next.codex_objects = toText(seeds.objects);
      }
      if (!userTouchedFieldsRef.current.has("codex_factions")) {
        next.codex_factions = toText(seeds.factions);
      }
      if (!userTouchedFieldsRef.current.has("codex_lore")) {
        next.codex_lore = toText(seeds.lore);
      }
      if (!userTouchedFieldsRef.current.has("codex_subplots")) {
        next.codex_subplots = toText(seeds.subplots);
      }
      return next;
    });
  }, []);

  const syncCurrentCodexSeeds = useCallback(
    (opts?: { silent?: boolean; briefOverride?: RefinedIdeaBrief }) => {
      startCodexSyncTransition(async () => {
        const brief = opts?.briefOverride ?? editableToBrief(editable, lockedBrief);
        const result = await syncIdeaCodexSeedsAction(bookId, brief);
        if (!result.ok) {
          if (!opts?.silent) {
            toast.error(result.error ?? "Could not sync codex seeds.");
          }
          return;
        }
        if (!opts?.silent) {
          const created = result.summary?.created ?? 0;
          const skipped = result.summary?.skipped ?? 0;
          toast.success(`Codex synced: ${created} created, ${skipped} already existed.`);
        }
      });
    },
    [bookId, editable, lockedBrief, startCodexSyncTransition],
  );

  const extractCodexFromIdeation = useCallback(
    async (opts?: { silent?: boolean; autoSync?: boolean }) => {
      if (!hasIdeaChatTranscript && !hasBriefTextBasis(editable)) {
        if (!opts?.silent) {
          toast.info("Add some idea details first, then extract codex seeds.");
        }
        return;
      }
      setExtractingCodexSeeds(true);
      try {
        const response = await fetch("/api/ai/extract-codex-seeds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookId,
            brief: {
              title: editable.title,
              subtitle: editable.subtitle,
              genre: editable.genre,
              audience: editable.audience,
              premise: editable.premise,
              tone: editable.tone,
              themes: editable.themes,
              estimated_length: editable.estimated_length,
            },
            conversation: messages
              .filter((m) => m.role === "user" || m.role === "assistant")
              .map((m) => ({
                role: m.role as "user" | "assistant",
                content: m.content,
              })),
          }),
        });
        const data = (await response.json().catch(() => null)) as
          | (ExtractedCodexSeeds & { error?: string })
          | null;
        if (!response.ok || !data) {
          throw new Error(data?.error ?? "Could not extract codex seeds.");
        }
        applyExtractedCodexSeeds(data);
        const pick = (
          key: EditableFieldKey,
          values: string[] | undefined,
          existing: string,
        ): string => {
          if (userTouchedFieldsRef.current.has(key)) return existing;
          if (!values || values.length === 0) return existing;
          return values.join("\n");
        };
        const mergedEditable: EditableBrief = {
          ...editable,
          codex_characters: pick("codex_characters", data.characters, editable.codex_characters),
          codex_locations: pick("codex_locations", data.locations, editable.codex_locations),
          codex_objects: pick("codex_objects", data.objects, editable.codex_objects),
          codex_factions: pick("codex_factions", data.factions, editable.codex_factions),
          codex_lore: pick("codex_lore", data.lore, editable.codex_lore),
          codex_subplots: pick("codex_subplots", data.subplots, editable.codex_subplots),
        };
        const mergedBrief = editableToBrief(mergedEditable, lockedBrief);
        if (opts?.autoSync) {
          syncCurrentCodexSeeds({ silent: opts?.silent, briefOverride: mergedBrief });
        } else if (!opts?.silent) {
          toast.success("Codex seed fields refreshed from ideation.");
        }
      } catch (e) {
        if (!opts?.silent) {
          toast.error(e instanceof Error ? e.message : "Could not extract codex seeds.");
        }
      } finally {
        setExtractingCodexSeeds(false);
      }
    },
    [
      applyExtractedCodexSeeds,
      bookId,
      editable,
      hasBriefTextBasis,
      hasIdeaChatTranscript,
      messages,
      syncCurrentCodexSeeds,
    ],
  );

  // Whenever a new brief locks in without a subtitle, quietly ask the model
  // for one so the field is never left blank.
  useEffect(() => {
    if (!lockedBrief) return;
    const titleSig = (editable.title.trim() || "").toLowerCase();
    if (!titleSig) return;
    if (editable.subtitle.trim()) return;
    if (regeneratingField === "subtitle") return;
    if (autoSubtitleDoneRef.current === titleSig) return;
    autoSubtitleDoneRef.current = titleSig;
    void regenerateBriefField("subtitle", { silent: true });
  }, [
    lockedBrief,
    editable.title,
    editable.subtitle,
    regeneratingField,
    regenerateBriefField,
  ]);

  useEffect(() => {
    if (!lockedBrief) return;
    const sig = JSON.stringify(lockedBrief);
    if (autoExtractCodexDoneRef.current === sig) return;
    const hasAnyCodexSeed =
      editable.codex_characters.trim().length > 0 ||
      editable.codex_locations.trim().length > 0 ||
      editable.codex_objects.trim().length > 0 ||
      editable.codex_factions.trim().length > 0 ||
      editable.codex_lore.trim().length > 0 ||
      editable.codex_subplots.trim().length > 0;
    if (hasAnyCodexSeed) {
      autoExtractCodexDoneRef.current = sig;
      return;
    }
    autoExtractCodexDoneRef.current = sig;
    void extractCodexFromIdeation({ silent: true, autoSync: true });
  }, [
    editable.codex_characters,
    editable.codex_factions,
    editable.codex_locations,
    editable.codex_lore,
    editable.codex_objects,
    editable.codex_subplots,
    extractCodexFromIdeation,
    lockedBrief,
  ]);

  const hasEdits = useMemo(() => {
    const base = briefToEditable(lockedBrief);
    return (Object.keys(base) as (keyof EditableBrief)[]).some(
      (k) => base[k] !== editable[k],
    );
  }, [editable, lockedBrief]);

  const canRegenerate = useMemo(
    () => hasIdeaChatTranscript || hasBriefTextBasis(editable),
    [editable, hasBriefTextBasis, hasIdeaChatTranscript],
  );

  return (
    <div className="flex min-h-[calc(100vh-120px)] flex-col">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <h1 className="font-serif text-2xl font-medium text-gold sm:text-3xl">{bookTitle}</h1>
          <p className="mt-1 text-sm text-editorial-muted">
            Refine your concept with the editor — or jump ahead when you are ready.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSkipOpen(true)}
          className="text-sm text-gold/90 underline-offset-4 transition-colors hover:text-gold hover:underline"
        >
          Skip to outline
        </button>
      </div>

      {refinedIdeaFromDbInvalid ? (
        <div
          className="mb-4 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-sm text-editorial-cream/95"
          role="alert"
        >
          {REFINED_IDEA_INVALID_USER_MESSAGE}
        </div>
      ) : null}

      <div className="mb-6 rounded-xl border border-border/60 bg-card/40 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold">
              Book type
            </p>
            <p className="mt-1 text-sm text-editorial-muted">
              Tells the AI how to write your chapters — novel-style prose vs.
              structured nonfiction with claims, evidence, and takeaways.
            </p>
          </div>
          <div
            role="radiogroup"
            aria-label="Book type"
            className="inline-flex self-start overflow-hidden rounded-lg border border-border/70 bg-background/60 p-1 sm:self-auto"
          >
            {(
              [
                { value: "fiction", label: "Fiction" },
                { value: "non_fiction", label: "Non-fiction" },
              ] as const
            ).map((opt) => {
              const selected = bookType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => handleBookTypeChange(opt.value)}
                  disabled={bookTypePending}
                  className={cn(
                    "rounded-md px-4 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
                    selected
                      ? "bg-gold text-editorial-bg shadow-sm"
                      : "text-editorial-cream hover:bg-card",
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex flex-1 flex-col gap-4 overflow-y-auto rounded-lg border border-border/50 bg-card/30 px-3 py-4 sm:px-5"
      >
        {messages.length === 0 ? (
          <p className="text-center text-sm text-editorial-muted">
            Share what you are writing about. The editor will ask a few focused questions.
          </p>
        ) : null}

        {messages.map((m) => (
          <div
            key={m.id}
            className={cn("flex w-full", m.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[min(100%,42rem)] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                m.role === "user"
                  ? "bg-gold text-editorial-bg"
                  : "bg-editorial-cream/95 text-editorial-bg",
                m.role === "assistant" && "font-serif text-[15px]",
              )}
            >
              <p className="whitespace-pre-wrap break-words">{m.content}</p>
            </div>
          </div>
        ))}

        {isLoading ? (
          <div className="flex justify-start">
            <div
              className="flex items-center gap-1.5 rounded-2xl border border-border/40 bg-editorial-cream/10 px-4 py-3"
              aria-live="polite"
              aria-label="Assistant is typing"
            >
              <span className="sr-only">Assistant is typing</span>
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold/80 [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold/80 [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold/80" />
              </span>
              <span className="text-xs text-editorial-muted">Writing…</span>
            </div>
          </div>
        ) : null}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim() || isLoading) return;
          void handleSubmit(e);
        }}
        className="mt-4 flex gap-2 border-t border-border/50 pt-4"
      >
        <textarea
          value={input}
          onChange={handleInputChange}
          placeholder="Reply to the editor…"
          rows={2}
          disabled={isLoading}
          className="min-h-[48px] flex-1 resize-y rounded-lg border border-input bg-background/80 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        />
        <div className="flex flex-col gap-2">
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="h-full min-h-[48px] bg-gold px-4 text-editorial-bg hover:bg-gold/90"
            aria-label="Send message"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <Send className="h-5 w-5" aria-hidden />
            )}
          </Button>
          {isLoading ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => stop()}
            >
              Stop
            </Button>
          ) : null}
        </div>
      </form>

      {lockedBrief ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-gold/35 bg-gradient-to-br from-gold/10 to-card/80 p-5 shadow-[0_0_40px_rgba(201,168,76,0.08)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gold">
                  Idea locked in — edit freely before generating the outline
                </p>
                <p className="mt-1 text-xs text-editorial-muted">
                  These fields (plus the full idea chat) feed the chapter outline. Use Regenerate on
                  any field to fold the latest chat and your draft into fresh copy — the premise
                  regen in particular is built to produce a long, outline-ready brief.
                </p>
              </div>
              {hasEdits ? (
                <button
                  type="button"
                  onClick={resetEditableToAI}
                  className="text-xs text-gold/90 underline-offset-4 transition-colors hover:text-gold hover:underline"
                >
                  {"Reset to assistant's version"}
                </button>
              ) : null}
            </div>

            <div className="mt-4 rounded-lg border border-gold/25 bg-card/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-gold">
                Voice and texture (drives chapter quality)
              </p>
              <p className="mt-1 text-xs text-editorial-muted">
                Pulled from the interview. Edit so downstream outlines and chapters match the prose
                you want — not guesswork.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-1">
                <BriefField
                  label="Voice anchor"
                  hint="A comparison book, pasted sample, or how the sentences should feel on the page."
                >
                  <textarea
                    rows={3}
                    value={editable.voice_anchor}
                    onChange={(e) => setEditableField("voice_anchor", e.target.value)}
                    placeholder="e.g. Sentence rhythm from a named book, or a short pasted paragraph…"
                    className={cn(briefInputClass, "min-h-[80px] resize-y leading-relaxed")}
                  />
                </BriefField>
                <BriefField
                  label="Authorial stance"
                  hint="Neutral camera, wry, intimate, or how much the narrator judges or knows."
                >
                  <textarea
                    rows={2}
                    value={editable.authorial_stance}
                    onChange={(e) => setEditableField("authorial_stance", e.target.value)}
                    placeholder="e.g. Close third, dry humor about the kids, rare omniscient asides…"
                    className={cn(briefInputClass, "min-h-[64px] resize-y leading-relaxed")}
                  />
                </BriefField>
                <BriefField
                  label="Cultural / world texture"
                  hint="Insider details, jargon, or setting markers used without explanation."
                >
                  <textarea
                    rows={2}
                    value={editable.cultural_texture}
                    onChange={(e) => setEditableField("cultural_texture", e.target.value)}
                    placeholder="e.g. Phrases, rituals, or trade terms the story assumes…"
                    className={cn(briefInputClass, "min-h-[64px] resize-y leading-relaxed")}
                  />
                </BriefField>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-gold/25 bg-card/30 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gold">
                    Codex seeds from ideation
                  </p>
                  <p className="mt-1 text-xs text-editorial-muted">
                    Auto-extract characters, locations, objects, and canon from the idea chat.
                    Edit these lists, then sync to codex.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void extractCodexFromIdeation()}
                    disabled={extractingCodexSeeds}
                    className="h-7 border-gold/45 text-gold hover:bg-gold/10"
                  >
                    {extractingCodexSeeds ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden />
                    )}
                    Extract
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => syncCurrentCodexSeeds()}
                    disabled={syncingCodexSeeds}
                    className="h-7 border-gold/45 text-gold hover:bg-gold/10"
                  >
                    {syncingCodexSeeds ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : null}
                    Sync to codex
                  </Button>
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <BriefField label="Characters">
                  <textarea
                    rows={4}
                    value={editable.codex_characters}
                    onChange={(e) => setEditableField("codex_characters", e.target.value)}
                    placeholder="One per line: Name - short note"
                    className={cn(briefInputClass, "min-h-[110px] resize-y leading-relaxed")}
                  />
                </BriefField>
                <BriefField label="Locations">
                  <textarea
                    rows={4}
                    value={editable.codex_locations}
                    onChange={(e) => setEditableField("codex_locations", e.target.value)}
                    placeholder="One per line: Place - why it matters"
                    className={cn(briefInputClass, "min-h-[110px] resize-y leading-relaxed")}
                  />
                </BriefField>
                <BriefField label="Objects">
                  <textarea
                    rows={4}
                    value={editable.codex_objects}
                    onChange={(e) => setEditableField("codex_objects", e.target.value)}
                    placeholder="One per line: Item - function"
                    className={cn(briefInputClass, "min-h-[110px] resize-y leading-relaxed")}
                  />
                </BriefField>
                <BriefField label="Factions / groups">
                  <textarea
                    rows={4}
                    value={editable.codex_factions}
                    onChange={(e) => setEditableField("codex_factions", e.target.value)}
                    placeholder="One per line: Group - role in story"
                    className={cn(briefInputClass, "min-h-[110px] resize-y leading-relaxed")}
                  />
                </BriefField>
                <BriefField label="Lore / rules">
                  <textarea
                    rows={4}
                    value={editable.codex_lore}
                    onChange={(e) => setEditableField("codex_lore", e.target.value)}
                    placeholder="One per line: Canon rule - implication"
                    className={cn(briefInputClass, "min-h-[110px] resize-y leading-relaxed")}
                  />
                </BriefField>
                <BriefField label="Subplots">
                  <textarea
                    rows={4}
                    value={editable.codex_subplots}
                    onChange={(e) => setEditableField("codex_subplots", e.target.value)}
                    placeholder="One per line: Arc - unresolved tension"
                    className={cn(briefInputClass, "min-h-[110px] resize-y leading-relaxed")}
                  />
                </BriefField>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <BriefField
                label="Title"
                className="sm:col-span-2"
                action={
                  <RegenerateFieldControl
                    busy={regeneratingField === "title"}
                    disabled={
                      !canRegenerate ||
                      (!editable.title.trim() && !hasIdeaChatTranscript)
                    }
                    hasValue={Boolean(editable.title.trim())}
                    onClick={() => void regenerateBriefField("title")}
                    compact
                  />
                }
              >
                <input
                  type="text"
                  value={editable.title}
                  onChange={(e) => setEditableField("title", e.target.value)}
                  placeholder="Working title"
                  className={briefInputClass}
                />
              </BriefField>
              <BriefField
                label="Subtitle"
                className="sm:col-span-2"
                action={
                  <RegenerateFieldControl
                    busy={regeneratingField === "subtitle"}
                    disabled={!canRegenerate || !editable.title.trim()}
                    hasValue={Boolean(editable.subtitle.trim())}
                    onClick={() => void regenerateBriefField("subtitle")}
                    compact
                  />
                }
              >
                <input
                  type="text"
                  value={editable.subtitle}
                  onChange={(e) => setEditableField("subtitle", e.target.value)}
                  placeholder={
                    regeneratingField === "subtitle"
                      ? "Crafting a subtitle…"
                      : "Subtitle under the title — auto-generated"
                  }
                  disabled={regeneratingField === "subtitle"}
                  className={briefInputClass}
                />
              </BriefField>
              <BriefField
                label="Genre"
                action={
                  <RegenerateFieldControl
                    busy={regeneratingField === "genre"}
                    disabled={!canRegenerate}
                    hasValue={Boolean(editable.genre.trim())}
                    onClick={() => void regenerateBriefField("genre")}
                    compact
                  />
                }
              >
                <input
                  type="text"
                  value={editable.genre}
                  onChange={(e) => setEditableField("genre", e.target.value)}
                  placeholder="e.g. Literary fiction"
                  className={briefInputClass}
                />
              </BriefField>
              <BriefField
                label="Audience"
                action={
                  <RegenerateFieldControl
                    busy={regeneratingField === "audience"}
                    disabled={!canRegenerate}
                    hasValue={Boolean(editable.audience.trim())}
                    onClick={() => void regenerateBriefField("audience")}
                    compact
                  />
                }
              >
                <input
                  type="text"
                  value={editable.audience}
                  onChange={(e) => setEditableField("audience", e.target.value)}
                  placeholder="Who is this for?"
                  className={briefInputClass}
                />
              </BriefField>
              <BriefField
                label="Premise"
                hint="This is the main fuel for the chapter outline. Aim for a long, detailed narrative: hook, full arc, turning points, setting and world, main characters, stakes, conflict, and themes. Use Regenerate to fold everything from the chat (plus your other fields) into a single rich draft; edit until it matches your vision."
                className="sm:col-span-2"
                action={
                  <RegenerateFieldControl
                    busy={regeneratingField === "premise"}
                    disabled={!canRegenerate}
                    hasValue={Boolean(editable.premise.trim())}
                    onClick={() => void regenerateBriefField("premise")}
                  />
                }
              >
                <textarea
                  rows={14}
                  value={editable.premise}
                  onChange={(e) => setEditableField("premise", e.target.value)}
                  placeholder="Write a long, concrete brief (multiple paragraphs) — the outline generator will lean heavily on this. When you are ready, use Regenerate to pull every detail you shared in the idea chat (and the fields above) into one cohesive, outline-ready document. The more you put here, the truer the book and structure will be to your idea."
                  className={cn(
                    briefInputClass,
                    "min-h-[320px] resize-y leading-relaxed",
                  )}
                />
              </BriefField>
              <BriefField
                label="Tone"
                action={
                  <RegenerateFieldControl
                    busy={regeneratingField === "tone"}
                    disabled={!canRegenerate}
                    hasValue={Boolean(editable.tone.trim())}
                    onClick={() => void regenerateBriefField("tone")}
                    compact
                  />
                }
              >
                <input
                  type="text"
                  value={editable.tone}
                  onChange={(e) => setEditableField("tone", e.target.value)}
                  placeholder="e.g. Warm, observational, slow-burn"
                  className={briefInputClass}
                />
              </BriefField>
              <BriefField
                label="Themes (comma-separated)"
                action={
                  <RegenerateFieldControl
                    busy={regeneratingField === "themes"}
                    disabled={!canRegenerate}
                    hasValue={Boolean(editable.themes.trim())}
                    onClick={() => void regenerateBriefField("themes")}
                    compact
                  />
                }
              >
                <input
                  type="text"
                  value={editable.themes}
                  onChange={(e) => setEditableField("themes", e.target.value)}
                  placeholder="e.g. Memory, belonging, resilience"
                  className={briefInputClass}
                />
              </BriefField>
              <BriefField
                label="Estimated length"
                className="sm:col-span-2"
                action={
                  <RegenerateFieldControl
                    busy={regeneratingField === "estimated_length"}
                    disabled={!canRegenerate}
                    hasValue={Boolean(editable.estimated_length.trim())}
                    onClick={() => void regenerateBriefField("estimated_length")}
                    compact
                  />
                }
              >
                <input
                  type="text"
                  value={editable.estimated_length}
                  onChange={(e) => setEditableField("estimated_length", e.target.value)}
                  placeholder="e.g. 12 chapters · 60,000 words"
                  className={briefInputClass}
                />
              </BriefField>
            </div>
          </div>

          <Button
            type="button"
            disabled={outlineBusy || isLoading}
            className="h-auto w-full gap-2 bg-gold py-4 text-base font-semibold text-editorial-bg hover:bg-gold/90"
            onClick={() =>
              void goToOutline({ refinedIdeaOverride: editableToBrief(editable, lockedBrief) })
            }
          >
            {outlineBusy ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <>
                Generate outline
                <ArrowRight className="h-5 w-5" aria-hidden />
              </>
            )}
          </Button>
        </div>
      ) : null}

      {skipOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="skip-outline-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSkipOpen(false);
          }}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="skip-outline-title" className="font-serif text-xl text-gold">
              Skip to outline
            </h2>
            <p className="mt-2 text-sm text-editorial-muted">
              Paste your concept, logline, or notes. We will save them and open the outline step.
            </p>
            <textarea
              value={skipText}
              onChange={(e) => setSkipText(e.target.value)}
              rows={6}
              placeholder="Your book in a paragraph or two…"
              className="mt-4 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setSkipOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-gold text-editorial-bg hover:bg-gold/90"
                disabled={outlineBusy || !skipText.trim()}
                onClick={() => void onSkipSubmit()}
              >
                {outlineBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  "Continue to outline"
                )}
              </Button>
            </div>
            <p className="mt-3 text-center text-xs text-editorial-muted">
              Prefer the guided chat?{" "}
              <button
                type="button"
                className="text-gold underline-offset-4 hover:underline"
                onClick={() => setSkipOpen(false)}
              >
                Close and keep refining
              </button>
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
