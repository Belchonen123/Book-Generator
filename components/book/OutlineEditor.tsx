"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
} from "@/lib/lucide-icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { approveOutline } from "@/app/(dashboard)/projects/[id]/outline/actions";
import { ApplyTemplateModal } from "@/components/book/apply-template-modal";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  responsiveModalBackdrop,
  responsiveModalPanel,
  responsiveModalRoot,
} from "@/lib/ui/responsive-modal";
import type { BookTypeDb, Json } from "@/types/database.types";
import {
  getOutlineTemplate,
  listTemplatesForBookType,
  type OutlineTemplateId,
} from "@/lib/outline-templates";
import { persistOutlineWithReconcile } from "@/components/book/outline-editor-persist";
import { useCodexEntries } from "@/components/book/chapter-editor/hooks/use-codex-entries";
import { cn } from "@/lib/utils/cn";

export type OutlineSection = {
  number: number;
  title: string;
  description: string;
  book_canon_digest?: string;
  story_bible_anchors?: string;
  character_state?: string;
  continuity_from_prior_chapters?: string;
  stakes_and_costs?: string;
  motifs_and_restraint?: string;
  tension_level?: number;
  character_moment?: string;
  chapter_ends_with?: string;
  characters_introduced?: string[];
  opening_psychological_move?: string;
  signature_chapter_detail?: string;
  ending_opens_what?: string;
  reader_takeaway?: string;
  content_type?: string;
  evidence_notes?: string;
  opening_hook_move?: string;
  signature_example?: string;
  bridges_to_next?: string;
  manuscript_bible_digest?: string;
  stakes_for_reader?: string;
  counterargument_or_tension?: string;
  every_character_in_this_chapter?: string;
  every_location_and_time?: string;
  every_prop_object_and_key_detail?: string;
  every_concept_term_and_rule?: string;
  mandatory_beats_checklist?: string;
  every_voice_person_or_source?: string;
  every_context_setting_or_timeframe?: string;
  every_example_evidence_or_datum?: string;
  every_term_framework_or_rule?: string;
  forced_codex_entry_ids?: string[];
};

export type OutlineRow = {
  id: string;
  book_id: string;
  sections: Json;
  approved: boolean;
};

type SectionRow = OutlineSection & { id: string };

type SectionPatch = Partial<Omit<SectionRow, "id" | "number">>;

function parseSectionsJson(raw: Json): SectionRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row, i) => {
    const o = row as Record<string, unknown>;
    const title = typeof o.title === "string" ? o.title : "Untitled";
    const description = typeof o.description === "string" ? o.description : "";
    const number = typeof o.number === "number" ? o.number : i + 1;
    const tr = o.tension_level;
    const tension_level =
      typeof tr === "number" && Number.isFinite(tr)
        ? Math.min(10, Math.max(1, Math.round(tr)))
        : undefined;
    const character_moment =
      typeof o.character_moment === "string" ? o.character_moment : undefined;
    const chapter_ends_with =
      typeof o.chapter_ends_with === "string" ? o.chapter_ends_with : undefined;
    const reader_takeaway =
      typeof o.reader_takeaway === "string" ? o.reader_takeaway : undefined;
    const content_type =
      typeof o.content_type === "string" ? o.content_type : undefined;
    const evidence_notes =
      typeof o.evidence_notes === "string" ? o.evidence_notes : undefined;
    const opening_psychological_move =
      typeof o.opening_psychological_move === "string"
        ? o.opening_psychological_move
        : undefined;
    const signature_chapter_detail =
      typeof o.signature_chapter_detail === "string" ? o.signature_chapter_detail : undefined;
    const ending_opens_what =
      typeof o.ending_opens_what === "string" ? o.ending_opens_what : undefined;
    const opening_hook_move =
      typeof o.opening_hook_move === "string" ? o.opening_hook_move : undefined;
    const signature_example =
      typeof o.signature_example === "string" ? o.signature_example : undefined;
    const bridges_to_next =
      typeof o.bridges_to_next === "string" ? o.bridges_to_next : undefined;
    const book_canon_digest =
      typeof o.book_canon_digest === "string" ? o.book_canon_digest : undefined;
    const story_bible_anchors =
      typeof o.story_bible_anchors === "string" ? o.story_bible_anchors : undefined;
    const character_state =
      typeof o.character_state === "string" ? o.character_state : undefined;
    const continuity_from_prior_chapters =
      typeof o.continuity_from_prior_chapters === "string"
        ? o.continuity_from_prior_chapters
        : undefined;
    const stakes_and_costs =
      typeof o.stakes_and_costs === "string" ? o.stakes_and_costs : undefined;
    const motifs_and_restraint =
      typeof o.motifs_and_restraint === "string" ? o.motifs_and_restraint : undefined;
    const manuscript_bible_digest =
      typeof o.manuscript_bible_digest === "string" ? o.manuscript_bible_digest : undefined;
    const stakes_for_reader =
      typeof o.stakes_for_reader === "string" ? o.stakes_for_reader : undefined;
    const counterargument_or_tension =
      typeof o.counterargument_or_tension === "string"
        ? o.counterargument_or_tension
        : undefined;
    const every_character_in_this_chapter =
      typeof o.every_character_in_this_chapter === "string"
        ? o.every_character_in_this_chapter
        : undefined;
    const every_location_and_time =
      typeof o.every_location_and_time === "string" ? o.every_location_and_time : undefined;
    const every_prop_object_and_key_detail =
      typeof o.every_prop_object_and_key_detail === "string"
        ? o.every_prop_object_and_key_detail
        : undefined;
    const every_concept_term_and_rule =
      typeof o.every_concept_term_and_rule === "string"
        ? o.every_concept_term_and_rule
        : undefined;
    const mandatory_beats_checklist =
      typeof o.mandatory_beats_checklist === "string"
        ? o.mandatory_beats_checklist
        : undefined;
    const every_voice_person_or_source =
      typeof o.every_voice_person_or_source === "string"
        ? o.every_voice_person_or_source
        : undefined;
    const every_context_setting_or_timeframe =
      typeof o.every_context_setting_or_timeframe === "string"
        ? o.every_context_setting_or_timeframe
        : undefined;
    const every_example_evidence_or_datum =
      typeof o.every_example_evidence_or_datum === "string"
        ? o.every_example_evidence_or_datum
        : undefined;
    const every_term_framework_or_rule =
      typeof o.every_term_framework_or_rule === "string"
        ? o.every_term_framework_or_rule
        : undefined;
    const ci = o.characters_introduced;
    let characters_introduced: string[] | undefined;
    if (Array.isArray(ci)) {
      const names = ci
        .filter((x): x is string => typeof x === "string")
        .map((s) => s.trim())
        .filter(Boolean);
      if (names.length > 0) characters_introduced = names;
    }
    const forcedCodexRaw = o.forced_codex_entry_ids;
    const forcedCodexIds =
      Array.isArray(forcedCodexRaw)
        ? forcedCodexRaw
            .filter((x): x is string => typeof x === "string")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
    return {
      id: crypto.randomUUID(),
      number,
      title,
      description,
      ...(tension_level !== undefined ? { tension_level } : {}),
      ...(character_moment !== undefined ? { character_moment } : {}),
      ...(chapter_ends_with !== undefined ? { chapter_ends_with } : {}),
      ...(characters_introduced !== undefined ? { characters_introduced } : {}),
      ...(reader_takeaway !== undefined ? { reader_takeaway } : {}),
      ...(content_type !== undefined ? { content_type } : {}),
      ...(evidence_notes !== undefined ? { evidence_notes } : {}),
      ...(opening_psychological_move !== undefined
        ? { opening_psychological_move }
        : {}),
      ...(signature_chapter_detail !== undefined ? { signature_chapter_detail } : {}),
      ...(ending_opens_what !== undefined ? { ending_opens_what } : {}),
      ...(opening_hook_move !== undefined ? { opening_hook_move } : {}),
      ...(signature_example !== undefined ? { signature_example } : {}),
      ...(bridges_to_next !== undefined ? { bridges_to_next } : {}),
      ...(book_canon_digest !== undefined ? { book_canon_digest } : {}),
      ...(story_bible_anchors !== undefined ? { story_bible_anchors } : {}),
      ...(character_state !== undefined ? { character_state } : {}),
      ...(continuity_from_prior_chapters !== undefined
        ? { continuity_from_prior_chapters }
        : {}),
      ...(stakes_and_costs !== undefined ? { stakes_and_costs } : {}),
      ...(motifs_and_restraint !== undefined ? { motifs_and_restraint } : {}),
      ...(manuscript_bible_digest !== undefined ? { manuscript_bible_digest } : {}),
      ...(stakes_for_reader !== undefined ? { stakes_for_reader } : {}),
      ...(counterargument_or_tension !== undefined
        ? { counterargument_or_tension }
        : {}),
      ...(every_character_in_this_chapter !== undefined
        ? { every_character_in_this_chapter }
        : {}),
      ...(every_location_and_time !== undefined ? { every_location_and_time } : {}),
      ...(every_prop_object_and_key_detail !== undefined
        ? { every_prop_object_and_key_detail }
        : {}),
      ...(every_concept_term_and_rule !== undefined
        ? { every_concept_term_and_rule }
        : {}),
      ...(mandatory_beats_checklist !== undefined ? { mandatory_beats_checklist } : {}),
      ...(every_voice_person_or_source !== undefined
        ? { every_voice_person_or_source }
        : {}),
      ...(every_context_setting_or_timeframe !== undefined
        ? { every_context_setting_or_timeframe }
        : {}),
      ...(every_example_evidence_or_datum !== undefined
        ? { every_example_evidence_or_datum }
        : {}),
      ...(every_term_framework_or_rule !== undefined
        ? { every_term_framework_or_rule }
        : {}),
      ...(forcedCodexIds.length > 0
        ? { forced_codex_entry_ids: forcedCodexIds }
        : {}),
    };
  });
}

function renumber(sections: SectionRow[]): SectionRow[] {
  return sections.map((s, i) => ({ ...s, number: i + 1 }));
}

function toDbSections(sections: SectionRow[]): OutlineSection[] {
  return sections.map((s) => {
    const row: OutlineSection = {
      number: s.number,
      title: s.title,
      description: s.description,
    };
    if (typeof s.tension_level === "number") {
      row.tension_level = s.tension_level;
    }
    if (s.character_moment?.trim()) {
      row.character_moment = s.character_moment.trim();
    }
    if (s.chapter_ends_with?.trim()) {
      row.chapter_ends_with = s.chapter_ends_with.trim();
    }
    if (s.reader_takeaway?.trim()) {
      row.reader_takeaway = s.reader_takeaway.trim();
    }
    if (s.content_type?.trim()) {
      row.content_type = s.content_type.trim();
    }
    if (s.evidence_notes?.trim()) {
      row.evidence_notes = s.evidence_notes.trim();
    }
    if (s.characters_introduced && s.characters_introduced.length > 0) {
      row.characters_introduced = s.characters_introduced;
    }
    if (s.opening_psychological_move?.trim()) {
      row.opening_psychological_move = s.opening_psychological_move.trim();
    }
    if (s.signature_chapter_detail?.trim()) {
      row.signature_chapter_detail = s.signature_chapter_detail.trim();
    }
    if (s.ending_opens_what?.trim()) {
      row.ending_opens_what = s.ending_opens_what.trim();
    }
    if (s.opening_hook_move?.trim()) {
      row.opening_hook_move = s.opening_hook_move.trim();
    }
    if (s.signature_example?.trim()) {
      row.signature_example = s.signature_example.trim();
    }
    if (s.bridges_to_next?.trim()) {
      row.bridges_to_next = s.bridges_to_next.trim();
    }
    if (s.book_canon_digest?.trim()) {
      row.book_canon_digest = s.book_canon_digest.trim();
    }
    if (s.story_bible_anchors?.trim()) {
      row.story_bible_anchors = s.story_bible_anchors.trim();
    }
    if (s.character_state?.trim()) {
      row.character_state = s.character_state.trim();
    }
    if (s.continuity_from_prior_chapters?.trim()) {
      row.continuity_from_prior_chapters = s.continuity_from_prior_chapters.trim();
    }
    if (s.stakes_and_costs?.trim()) {
      row.stakes_and_costs = s.stakes_and_costs.trim();
    }
    if (s.motifs_and_restraint?.trim()) {
      row.motifs_and_restraint = s.motifs_and_restraint.trim();
    }
    if (s.manuscript_bible_digest?.trim()) {
      row.manuscript_bible_digest = s.manuscript_bible_digest.trim();
    }
    if (s.stakes_for_reader?.trim()) {
      row.stakes_for_reader = s.stakes_for_reader.trim();
    }
    if (s.counterargument_or_tension?.trim()) {
      row.counterargument_or_tension = s.counterargument_or_tension.trim();
    }
    if (s.every_character_in_this_chapter?.trim()) {
      row.every_character_in_this_chapter = s.every_character_in_this_chapter.trim();
    }
    if (s.every_location_and_time?.trim()) {
      row.every_location_and_time = s.every_location_and_time.trim();
    }
    if (s.every_prop_object_and_key_detail?.trim()) {
      row.every_prop_object_and_key_detail = s.every_prop_object_and_key_detail.trim();
    }
    if (s.every_concept_term_and_rule?.trim()) {
      row.every_concept_term_and_rule = s.every_concept_term_and_rule.trim();
    }
    if (s.mandatory_beats_checklist?.trim()) {
      row.mandatory_beats_checklist = s.mandatory_beats_checklist.trim();
    }
    if (s.every_voice_person_or_source?.trim()) {
      row.every_voice_person_or_source = s.every_voice_person_or_source.trim();
    }
    if (s.every_context_setting_or_timeframe?.trim()) {
      row.every_context_setting_or_timeframe = s.every_context_setting_or_timeframe.trim();
    }
    if (s.every_example_evidence_or_datum?.trim()) {
      row.every_example_evidence_or_datum = s.every_example_evidence_or_datum.trim();
    }
    if (s.every_term_framework_or_rule?.trim()) {
      row.every_term_framework_or_rule = s.every_term_framework_or_rule.trim();
    }
    if (
      Array.isArray(s.forced_codex_entry_ids) &&
      s.forced_codex_entry_ids.length > 0
    ) {
      row.forced_codex_entry_ids = s.forced_codex_entry_ids;
    }
    return row;
  });
}

type CodexOption = {
  id: string;
  name: string;
  entryType: string;
};

type ChapterCardEditorProps = {
  section: SectionRow;
  onChange: (id: string, patch: SectionPatch) => void;
  onDelete: (id: string) => void;
  bookType?: BookTypeDb;
  disableDelete?: boolean;
  codexOptions: readonly CodexOption[];
};

function ChapterCardEditor({
  section,
  onChange,
  onDelete,
  bookType = "fiction",
  disableDelete = false,
  codexOptions,
}: ChapterCardEditorProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="min-w-0 flex-1 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-gold">
            Ch. {section.number}
          </span>
          {editingTitle ? (
            <input
              autoFocus
              className="min-w-0 flex-1 rounded border border-input bg-background px-2 py-1 font-serif text-lg text-foreground"
              value={section.title}
              onChange={(e) => onChange(section.id, { title: e.target.value })}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setEditingTitle(false);
              }}
            />
          ) : (
            <button
              type="button"
              className="min-w-0 flex-1 text-left font-serif text-lg text-editorial-cream hover:text-gold"
              onClick={() => setEditingTitle(true)}
            >
              {section.title || "Untitled chapter"}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 px-2 text-editorial-muted hover:text-gold"
            onClick={() => {
              if (expanded && editingDesc) {
                setEditingDesc(false);
              }
              setExpanded((prev) => !prev);
            }}
          >
            {expanded ? (
              <>
                <ChevronUp className="mr-1 h-4 w-4" aria-hidden />
                Hide
              </>
            ) : (
              <>
                <ChevronDown className="mr-1 h-4 w-4" aria-hidden />
                Show
              </>
            )}
          </Button>
          <button
            type="button"
            className="min-h-11 min-w-11 rounded-md text-editorial-muted hover:bg-destructive/15 hover:text-destructive md:min-h-0 md:min-w-0 md:p-2"
            aria-label="Delete chapter"
            disabled={disableDelete}
            onClick={() => onDelete(section.id)}
          >
            <Trash2 className="mx-auto h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
      {!expanded ? (
        <label className="block text-xs font-medium text-editorial-muted">
          Chapter outline
          <textarea
            rows={3}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            value={section.description}
            placeholder="Write the chapter outline (key beats, conflict, and ending turn)..."
            onChange={(e) => onChange(section.id, { description: e.target.value })}
          />
        </label>
      ) : editingDesc ? (
        <textarea
          autoFocus
          rows={4}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
          value={section.description}
          onChange={(e) => onChange(section.id, { description: e.target.value })}
          onBlur={() => setEditingDesc(false)}
        />
      ) : (
        <button
          type="button"
          className="w-full rounded-md px-1 py-1 text-left text-sm leading-relaxed text-editorial-muted hover:bg-muted/20 hover:text-editorial-cream"
          onClick={() => setEditingDesc(true)}
        >
          {section.description || "Click to add this chapter's outline…"}
        </button>
      )}
      {expanded && bookType === "non_fiction" ? (
        <div className="space-y-2 rounded-md border border-border/40 bg-card/20 px-3 py-2">
          <label className="block text-xs font-medium text-editorial-muted">
            Reader takeaway
            <textarea
              rows={2}
              className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
              value={section.reader_takeaway ?? ""}
              placeholder="What the reader can do or think differently after this chapter"
              onChange={(e) => onChange(section.id, { reader_takeaway: e.target.value })}
            />
          </label>
          <label className="block text-xs font-medium text-editorial-muted">
            Content focus
            <input
              type="text"
              className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
              value={section.content_type ?? ""}
              placeholder="e.g. framework, story, research, exercise, mixed"
              onChange={(e) => onChange(section.id, { content_type: e.target.value })}
            />
          </label>
        </div>
      ) : null}
      {expanded &&
      bookType === "non_fiction" &&
      (section.manuscript_bible_digest?.trim() ||
        section.every_voice_person_or_source?.trim() ||
        section.every_context_setting_or_timeframe?.trim() ||
        section.every_example_evidence_or_datum?.trim() ||
        section.every_term_framework_or_rule?.trim() ||
        section.mandatory_beats_checklist?.trim() ||
        section.continuity_from_prior_chapters?.trim() ||
        section.stakes_for_reader?.trim() ||
        section.counterargument_or_tension?.trim() ||
        section.opening_hook_move?.trim() ||
        section.signature_example?.trim() ||
        section.bridges_to_next?.trim() ||
        section.evidence_notes?.trim()) ? (
        <div className="space-y-2 rounded-md border border-gold/20 bg-gold/5 px-3 py-2 text-xs text-editorial-muted">
          {section.every_voice_person_or_source?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Voices / sources</span>{" "}
              <span className="text-editorial-cream/90">
                {section.every_voice_person_or_source.trim()}
              </span>
            </p>
          ) : null}
          {section.every_context_setting_or_timeframe?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Context &amp; setting</span>{" "}
              <span className="text-editorial-cream/90">
                {section.every_context_setting_or_timeframe.trim()}
              </span>
            </p>
          ) : null}
          {section.every_example_evidence_or_datum?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Examples / evidence</span>{" "}
              <span className="text-editorial-cream/90">
                {section.every_example_evidence_or_datum.trim()}
              </span>
            </p>
          ) : null}
          {section.every_term_framework_or_rule?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Terms &amp; frameworks</span>{" "}
              <span className="text-editorial-cream/90">
                {section.every_term_framework_or_rule.trim()}
              </span>
            </p>
          ) : null}
          {section.mandatory_beats_checklist?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Mandatory beats</span>{" "}
              <span className="text-editorial-cream/90">
                {section.mandatory_beats_checklist.trim()}
              </span>
            </p>
          ) : null}
          {section.manuscript_bible_digest?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Manuscript bible</span>{" "}
              <span className="text-editorial-cream/90">
                {section.manuscript_bible_digest.trim()}
              </span>
            </p>
          ) : null}
          {section.continuity_from_prior_chapters?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Continuity</span>{" "}
              <span className="text-editorial-cream/90">
                {section.continuity_from_prior_chapters.trim()}
              </span>
            </p>
          ) : null}
          {section.stakes_for_reader?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Reader stakes</span>{" "}
              <span className="text-editorial-cream/90">{section.stakes_for_reader.trim()}</span>
            </p>
          ) : null}
          {section.counterargument_or_tension?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Counterargument / tension</span>{" "}
              <span className="text-editorial-cream/90">
                {section.counterargument_or_tension.trim()}
              </span>
            </p>
          ) : null}
          {section.opening_hook_move?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Opening hook</span>{" "}
              <span className="text-editorial-cream/90">{section.opening_hook_move.trim()}</span>
            </p>
          ) : null}
          {section.signature_example?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Signature example</span>{" "}
              <span className="text-editorial-cream/90">{section.signature_example.trim()}</span>
            </p>
          ) : null}
          {section.bridges_to_next?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Bridges to next</span>{" "}
              <span className="text-editorial-cream/90">{section.bridges_to_next.trim()}</span>
            </p>
          ) : null}
          {section.evidence_notes?.trim() ? (
            <p>
              <span className="font-medium text-gold/95">Evidence (kind)</span>{" "}
              <span className="text-editorial-cream/90">{section.evidence_notes.trim()}</span>
            </p>
          ) : null}
        </div>
      ) : null}
      {expanded && bookType === "fiction" ? (
        <div className="max-h-[28rem] space-y-2 overflow-y-auto rounded-md border border-gold/25 bg-gold/5 px-3 py-2 text-xs text-editorial-muted">
          <label className="block text-[11px] font-medium text-gold/95">
            Codex references to force include in chapter generation
            <select
              className="mt-1 w-full rounded-md border border-border/60 bg-background/70 px-2 py-1.5 text-xs text-editorial-cream"
              value=""
              onChange={(e) => {
                const id = e.target.value;
                if (!id) return;
                const existing = section.forced_codex_entry_ids ?? [];
                if (existing.includes(id)) return;
                onChange(section.id, { forced_codex_entry_ids: [...existing, id] });
              }}
            >
              <option value="">Add codex entry…</option>
              {codexOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name} ({opt.entryType})
                </option>
              ))}
            </select>
          </label>
          {Array.isArray(section.forced_codex_entry_ids) &&
          section.forced_codex_entry_ids.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {section.forced_codex_entry_ids.map((id) => {
                const found = codexOptions.find((opt) => opt.id === id);
                const label = found ? `${found.name}` : "Unknown codex entry";
                return (
                  <button
                    key={id}
                    type="button"
                    className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[10px] text-editorial-cream hover:bg-gold/20"
                    title="Remove codex force-include"
                    onClick={() =>
                      onChange(section.id, {
                        forced_codex_entry_ids: (section.forced_codex_entry_ids ?? []).filter(
                          (x) => x !== id,
                        ),
                      })
                    }
                  >
                    {label} ×
                  </button>
                );
              })}
            </div>
          ) : null}
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gold/90">
            Chapter story bible (feeds chapter generation)
          </p>
          <label className="block text-[11px] font-medium text-gold/95">
            Every character
            <textarea
              rows={2}
              className="mt-1 w-full rounded-md border border-border/60 bg-background/70 px-2 py-1.5 text-xs text-editorial-cream"
              value={section.every_character_in_this_chapter ?? ""}
              placeholder="Characters appearing in this chapter"
              onChange={(e) =>
                onChange(section.id, { every_character_in_this_chapter: e.target.value })
              }
            />
          </label>
          <label className="block text-[11px] font-medium text-gold/95">
            Locations &amp; time
            <textarea
              rows={2}
              className="mt-1 w-full rounded-md border border-border/60 bg-background/70 px-2 py-1.5 text-xs text-editorial-cream"
              value={section.every_location_and_time ?? ""}
              placeholder="Settings and relevant timeline notes"
              onChange={(e) => onChange(section.id, { every_location_and_time: e.target.value })}
            />
          </label>
          <label className="block text-[11px] font-medium text-gold/95">
            Props &amp; key details
            <textarea
              rows={2}
              className="mt-1 w-full rounded-md border border-border/60 bg-background/70 px-2 py-1.5 text-xs text-editorial-cream"
              value={section.every_prop_object_and_key_detail ?? ""}
              placeholder="Objects, symbols, and specific visual details"
              onChange={(e) =>
                onChange(section.id, { every_prop_object_and_key_detail: e.target.value })
              }
            />
          </label>
          <label className="block text-[11px] font-medium text-gold/95">
            Concepts &amp; rules
            <textarea
              rows={2}
              className="mt-1 w-full rounded-md border border-border/60 bg-background/70 px-2 py-1.5 text-xs text-editorial-cream"
              value={section.every_concept_term_and_rule ?? ""}
              placeholder="Lore terms, magic/system constraints, world rules"
              onChange={(e) =>
                onChange(section.id, { every_concept_term_and_rule: e.target.value })
              }
            />
          </label>
          <label className="block text-[11px] font-medium text-gold/95">
            Mandatory beats
            <textarea
              rows={2}
              className="mt-1 w-full rounded-md border border-border/60 bg-background/70 px-2 py-1.5 text-xs text-editorial-cream"
              value={section.mandatory_beats_checklist ?? ""}
              placeholder="Must-hit beats for this chapter"
              onChange={(e) =>
                onChange(section.id, { mandatory_beats_checklist: e.target.value })
              }
            />
          </label>
          <label className="block text-[11px] font-medium text-gold/95">
            Book canon
            <textarea
              rows={2}
              className="mt-1 w-full rounded-md border border-border/60 bg-background/70 px-2 py-1.5 text-xs text-editorial-cream"
              value={section.book_canon_digest ?? ""}
              placeholder="Relevant canon constraints"
              onChange={(e) => onChange(section.id, { book_canon_digest: e.target.value })}
            />
          </label>
          <label className="block text-[11px] font-medium text-gold/95">
            Chapter anchors
            <textarea
              rows={2}
              className="mt-1 w-full rounded-md border border-border/60 bg-background/70 px-2 py-1.5 text-xs text-editorial-cream"
              value={section.story_bible_anchors ?? ""}
              placeholder="Anchor details to weave into prose"
              onChange={(e) => onChange(section.id, { story_bible_anchors: e.target.value })}
            />
          </label>
          <label className="block text-[11px] font-medium text-gold/95">
            Character state
            <textarea
              rows={2}
              className="mt-1 w-full rounded-md border border-border/60 bg-background/70 px-2 py-1.5 text-xs text-editorial-cream"
              value={section.character_state ?? ""}
              placeholder="Emotional/goal state entering this chapter"
              onChange={(e) => onChange(section.id, { character_state: e.target.value })}
            />
          </label>
          <label className="block text-[11px] font-medium text-gold/95">
            Continuity
            <textarea
              rows={2}
              className="mt-1 w-full rounded-md border border-border/60 bg-background/70 px-2 py-1.5 text-xs text-editorial-cream"
              value={section.continuity_from_prior_chapters ?? ""}
              placeholder="Carry-overs from prior chapters"
              onChange={(e) =>
                onChange(section.id, { continuity_from_prior_chapters: e.target.value })
              }
            />
          </label>
          <label className="block text-[11px] font-medium text-gold/95">
            Stakes &amp; costs
            <textarea
              rows={2}
              className="mt-1 w-full rounded-md border border-border/60 bg-background/70 px-2 py-1.5 text-xs text-editorial-cream"
              value={section.stakes_and_costs ?? ""}
              placeholder="What can be won or lost in this chapter"
              onChange={(e) => onChange(section.id, { stakes_and_costs: e.target.value })}
            />
          </label>
          <label className="block text-[11px] font-medium text-gold/95">
            Motifs / restraint
            <textarea
              rows={2}
              className="mt-1 w-full rounded-md border border-border/60 bg-background/70 px-2 py-1.5 text-xs text-editorial-cream"
              value={section.motifs_and_restraint ?? ""}
              placeholder="Motifs to echo and things to avoid"
              onChange={(e) => onChange(section.id, { motifs_and_restraint: e.target.value })}
            />
          </label>
          <label className="block text-[11px] font-medium text-gold/95">
            Reader takeaway
            <textarea
              rows={2}
              className="mt-1 w-full rounded-md border border-border/60 bg-background/70 px-2 py-1.5 text-xs text-editorial-cream"
              value={section.reader_takeaway ?? ""}
              placeholder="Reader-facing emotional or thematic payoff"
              onChange={(e) => onChange(section.id, { reader_takeaway: e.target.value })}
            />
          </label>
          <div className="space-y-1 border-t border-border/30 pt-2">
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <label className="flex items-center gap-2 text-[11px] text-editorial-cream/90">
                <span className="font-medium">Tension</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  className="h-7 w-16 rounded-md border border-border/60 bg-background/70 px-2 text-xs text-editorial-cream"
                  value={typeof section.tension_level === "number" ? section.tension_level : ""}
                  placeholder="1-10"
                  onChange={(e) => {
                    const raw = e.target.value.trim();
                    if (!raw) {
                      onChange(section.id, { tension_level: undefined });
                      return;
                    }
                    const n = Number(raw);
                    if (!Number.isFinite(n)) return;
                    onChange(section.id, {
                      tension_level: Math.min(10, Math.max(1, Math.round(n))),
                    });
                  }}
                />
              </label>
            </div>
            <label className="block text-[11px] font-medium text-editorial-cream/90">
              Ends with
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-border/60 bg-background/70 px-2 py-1.5 text-xs text-editorial-cream"
                value={section.chapter_ends_with ?? ""}
                placeholder="Final beat of this chapter"
                onChange={(e) => onChange(section.id, { chapter_ends_with: e.target.value })}
              />
            </label>
            <label className="block text-[11px] font-medium text-editorial-cream/90">
              Opening (psych)
              <textarea
                rows={2}
                className="mt-1 w-full rounded-md border border-border/60 bg-background/70 px-2 py-1.5 text-xs text-editorial-cream"
                value={section.opening_psychological_move ?? ""}
                placeholder="Emotional/psychological opening move"
                onChange={(e) =>
                  onChange(section.id, { opening_psychological_move: e.target.value })
                }
              />
            </label>
            <label className="block text-[11px] font-medium text-editorial-cream/90">
              Signature detail
              <textarea
                rows={2}
                className="mt-1 w-full rounded-md border border-border/60 bg-background/70 px-2 py-1.5 text-xs text-editorial-cream"
                value={section.signature_chapter_detail ?? ""}
                placeholder="Memorable detail this chapter must include"
                onChange={(e) =>
                  onChange(section.id, { signature_chapter_detail: e.target.value })
                }
              />
            </label>
            <label className="block text-[11px] font-medium text-editorial-cream/90">
              Ending opens
              <textarea
                rows={2}
                className="mt-1 w-full rounded-md border border-border/60 bg-background/70 px-2 py-1.5 text-xs text-editorial-cream"
                value={section.ending_opens_what ?? ""}
                placeholder="What thread does this ending open next"
                onChange={(e) => onChange(section.id, { ending_opens_what: e.target.value })}
              />
            </label>
            <label className="block text-[11px] font-medium text-editorial-cream/90">
              Character beat
              <textarea
                rows={2}
                className="mt-1 w-full rounded-md border border-border/60 bg-background/70 px-2 py-1.5 text-xs text-editorial-cream"
                value={section.character_moment ?? ""}
                placeholder="Key character moment to hit"
                onChange={(e) => onChange(section.id, { character_moment: e.target.value })}
              />
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SortableChapterCard({
  section,
  onChange,
  onDelete,
  bookType = "fiction",
  disableDelete = false,
  codexOptions,
}: ChapterCardEditorProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable(
    {
      id: section.id,
      disabled: disableDelete,
    },
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex w-full gap-3 rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm",
        isDragging && "z-10 opacity-90 ring-2 ring-gold/40",
      )}
    >
      <button
        type="button"
        className={cn(
          "mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border/60 text-editorial-muted",
          disableDelete
            ? "cursor-not-allowed opacity-50"
            : "cursor-grab hover:bg-muted/30 hover:text-gold active:cursor-grabbing",
        )}
        aria-label="Drag to reorder"
        disabled={disableDelete}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" aria-hidden />
      </button>
      <ChapterCardEditor
        section={section}
        onChange={onChange}
        onDelete={onDelete}
        bookType={bookType}
        disableDelete={disableDelete}
        codexOptions={codexOptions}
      />
    </div>
  );
}

type TouchReorderChapterCardProps = ChapterCardEditorProps & {
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  lockStructuralEdits?: boolean;
};

function TouchReorderChapterCard({
  section,
  onChange,
  onDelete,
  bookType = "fiction",
  codexOptions,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  lockStructuralEdits = false,
}: TouchReorderChapterCardProps) {
  return (
    <div className="flex w-full gap-2 rounded-xl border border-border/70 bg-card/60 p-3 shadow-sm sm:gap-3 sm:p-4">
      <div className="flex shrink-0 flex-col justify-center gap-1">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-11 w-11 shrink-0 border-border/60"
          disabled={!canMoveUp}
          aria-label="Move chapter up"
          onClick={onMoveUp}
        >
          <ChevronUp className="h-5 w-5" aria-hidden />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-11 w-11 shrink-0 border-border/60"
          disabled={!canMoveDown}
          aria-label="Move chapter down"
          onClick={onMoveDown}
        >
          <ChevronDown className="h-5 w-5" aria-hidden />
        </Button>
      </div>
      <ChapterCardEditor
        section={section}
        onChange={onChange}
        onDelete={onDelete}
        bookType={bookType}
        disableDelete={lockStructuralEdits}
        codexOptions={codexOptions}
      />
    </div>
  );
}

function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(hover: none), (pointer: coarse)");
    const apply = () => setCoarse(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return coarse;
}

export type OutlineEditorProps = {
  bookId: string;
  bookTitle: string;
  bookType?: BookTypeDb;
  initialOutline: OutlineRow | null;
  lockStructuralEdits?: boolean;
  /**
   * Fired after a drag (or touch) reorder, once the in-memory list has been
   * renumbered. Section ids are client-side (not `chapters` PKs) until the
   * outline is saved / approved — this is for analytics or future automations.
   */
  onSectionReorder?: (detail: { chapterId: string; newPosition: number; orderedSectionIds: string[] }) => void;
};

export function OutlineEditor({
  bookId,
  bookTitle,
  bookType = "fiction",
  initialOutline,
  lockStructuralEdits = false,
  onSectionReorder,
}: OutlineEditorProps) {
  const router = useRouter();
  const coarsePointer = useCoarsePointer();
  const [outlineId, setOutlineId] = useState<string | null>(initialOutline?.id ?? null);
  const [sections, setSections] = useState<SectionRow[]>(() =>
    initialOutline ? renumber(parseSectionsJson(initialOutline.sections)) : [],
  );
  const [loading, setLoading] = useState(!initialOutline);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [approveBusy, setApproveBusy] = useState(false);
  const [regenDialogOpen, setRegenDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateApplying, setTemplateApplying] = useState(false);
  const { entries: codexEntries } = useCodexEntries(bookId);
  const codexOptions = useMemo<CodexOption[]>(
    () =>
      [...codexEntries]
        .map((entry) => ({
          id: entry.id,
          name: entry.name,
          entryType: entry.entry_type,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [codexEntries],
  );

  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;
  const outlineIdRef = useRef(outlineId);
  outlineIdRef.current = outlineId;

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 8 } });
  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });
  const sensors = useSensors(
    ...(coarsePointer ? [keyboardSensor] : [pointerSensor, keyboardSensor]),
  );

  const persist = useCallback(
    async (toSave: SectionRow[]) => {
      const oid = outlineIdRef.current;
      if (!oid) return;
      setSaving(true);
      try {
        const supabase = createClient();
        const dbSections = toDbSections(renumber(toSave));
        await persistOutlineWithReconcile({
          sections: dbSections,
          deps: {
            updateOutlineSections: async (sections) => {
              const { error } = await supabase
                .from("outlines")
                .update({ sections: sections as unknown as Json })
                .eq("id", oid)
                .eq("book_id", bookId);
              if (error) throw error;
            },
            loadExistingChapters: async () => {
              const { data, error } = await supabase
                .from("chapters")
                .select("id, chapter_number, title, outline_summary, content, status, word_count")
                .eq("book_id", bookId)
                .order("chapter_number", { ascending: true });
              if (error) throw error;
              return data ?? [];
            },
            updateChapterTitleAndSummary: async (chapterId, update) => {
              const { error } = await supabase
                .from("chapters")
                .update(update)
                .eq("id", chapterId);
              if (error) throw error;
            },
            insertChapter: async (payload) => {
              const { error } = await supabase.from("chapters").insert({
                book_id: bookId,
                chapter_number: payload.chapter_number,
                title: payload.title,
                outline_summary: payload.outline_summary,
                status: payload.status,
              });
              if (error) throw error;
            },
            deleteChaptersByIds: async (ids) => {
              const { error } = await supabase.from("chapters").delete().in("id", ids);
              if (error) throw error;
            },
            updateBookChapterCount: async (count) => {
              const { error } = await supabase
                .from("books")
                .update({ chapter_count: count })
                .eq("id", bookId);
              if (error) throw error;
            },
            refresh: () => router.refresh(),
            confirmDestructiveDelete: (message) =>
              typeof window !== "undefined" ? window.confirm(message) : false,
            onDeleteCancelled: () => {
              toast.message(
                "Outline save cancelled to protect written chapters. Undo the section removal, or delete the chapter explicitly from the chapter list.",
              );
            },
          },
        });
      } catch {
        toast.error("Could not save outline. Please try again.");
      } finally {
        setSaving(false);
      }
    },
    [bookId, router],
  );

  const scheduleSave = useCallback(
    (snapshot: SectionRow[]) => {
      sectionsRef.current = snapshot;
      if (!outlineIdRef.current) return;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        void persist(sectionsRef.current);
      }, 500);
    },
    [persist],
  );

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  useEffect(() => {
    if (initialOutline) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("outlines")
          .select("id, book_id, sections, approved")
          .eq("book_id", bookId)
          .maybeSingle();

        if (cancelled) return;
        if (error) {
          toast.error("Could not load outline.");
          return;
        }
        if (data) {
          setOutlineId(data.id);
          setSections(renumber(parseSectionsJson(data.sections)));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId, initialOutline]);

  const applySectionsFromApi = useCallback((apiSections: OutlineSection[], newOutlineId: string) => {
    setOutlineId(newOutlineId);
    setSections(
      renumber(
        apiSections.map((s) => ({
          ...s,
          id: crypto.randomUUID(),
        })),
      ),
    );
  }, []);

  const runGenerateOutline = useCallback(async () => {
    setRegenerating(true);
    try {
      const res = await fetch("/api/ai/generate-outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        sections?: OutlineSection[];
        outlineId?: string;
        error?: string;
      } | null;
      if (!res.ok || !data?.ok || !data.sections || !data.outlineId) {
        throw new Error(data?.error ?? "Outline generation failed.");
      }
      applySectionsFromApi(data.sections, data.outlineId);
      toast.success("Outline updated.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Outline generation failed.");
    } finally {
      setRegenerating(false);
      setRegenDialogOpen(false);
    }
  }, [applySectionsFromApi, bookId, router]);

  const handleDragEnd = (event: DragEndEvent) => {
    if (lockStructuralEdits) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSections((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return items;
      const next = renumber(arrayMove(items, oldIndex, newIndex));
      sectionsRef.current = next;
      scheduleSave(next);
      onSectionReorder?.({
        chapterId: String(active.id),
        newPosition: newIndex + 1,
        orderedSectionIds: next.map((s) => s.id),
      });
      return next;
    });
  };

  const moveSectionByIndex = useCallback(
    (id: string, delta: -1 | 1) => {
      if (lockStructuralEdits) return;
      setSections((items) => {
        const i = items.findIndex((s) => s.id === id);
        const j = i + delta;
        if (i < 0 || j < 0 || j >= items.length) return items;
        const next = renumber(arrayMove(items, i, j));
        sectionsRef.current = next;
        scheduleSave(next);
        return next;
      });
    },
    [lockStructuralEdits, scheduleSave],
  );

  const updateSection = useCallback(
    (id: string, patch: SectionPatch) => {
      setSections((prev) => {
        const next = prev.map((s) => (s.id === id ? { ...s, ...patch } : s));
        sectionsRef.current = next;
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  const deleteSection = useCallback(
    (id: string) => {
      if (lockStructuralEdits) return;
      setSections((prev) => {
        const next = renumber(prev.filter((s) => s.id !== id));
        sectionsRef.current = next;
        scheduleSave(next);
        return next;
      });
    },
    [lockStructuralEdits, scheduleSave],
  );

  const addChapter = useCallback(() => {
    if (lockStructuralEdits) return;
    setSections((prev) => {
      const next = renumber([
        ...prev,
        {
          id: crypto.randomUUID(),
          number: prev.length + 1,
          title: "New chapter",
          description: "",
          ...(bookType === "non_fiction"
            ? { reader_takeaway: "", content_type: "" }
            : {}),
        },
      ]);
      sectionsRef.current = next;
      scheduleSave(next);
      return next;
    });
  }, [bookType, lockStructuralEdits, scheduleSave]);

  /* Appends a structural template's beats as new chapter sections. We
   * deliberately APPEND (never replace) so existing chapters survive —
   * the modal warns the author when existing chapters are present.
   *
   * We also skip the debounce: authors who apply a template almost
   * always then click a chapter to start editing, so paying the save
   * latency here avoids a flash of "Saving changes…" right after they
   * navigate away. */
  const applyTemplate = useCallback(
    async (templateId: OutlineTemplateId) => {
      if (!outlineIdRef.current) {
        toast.error("Outline is still loading. Try again in a moment.");
        return;
      }
      const template = getOutlineTemplate(templateId);
      if (!template) {
        toast.error("Unknown template.");
        return;
      }

      setTemplateApplying(true);
      try {
        const prev = sectionsRef.current;
        const newSections: SectionRow[] = template.beats.map((beat, i) => ({
          id: crypto.randomUUID(),
          number: prev.length + i + 1,
          title: beat.title,
          description: beat.summary,
          ...(bookType === "non_fiction"
            ? { reader_takeaway: "", content_type: "" }
            : {}),
        }));
        const next = renumber([...prev, ...newSections]);
        sectionsRef.current = next;
        setSections(next);

        /* Cancel any in-flight debounce — we're going to persist now
         * so the chapter inserts land before the page refresh runs. */
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
          debounceTimer.current = null;
        }
        await persist(next);

        toast.success(
          `Added ${newSections.length} chapter${newSections.length === 1 ? "" : "s"} from "${template.name}".`,
        );
        setTemplateDialogOpen(false);
      } catch {
        toast.error("Could not apply template. Please try again.");
      } finally {
        setTemplateApplying(false);
      }
    },
    [bookType, persist],
  );

  const availableTemplates = useMemo(
    () => listTemplatesForBookType(bookType),
    [bookType],
  );

  const sortableIds = useMemo(() => sections.map((s) => s.id), [sections]);

  const handleApprove = async () => {
    setApproveBusy(true);
    try {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      await persist(sectionsRef.current);

      const result = await approveOutline(bookId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Outline approved — happy writing.");
      router.push(`/projects/${bookId}/chapters/${result.firstChapterId}`);
      router.refresh();
    } catch {
      toast.error("Could not approve outline.");
    } finally {
      setApproveBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-editorial-muted">
        <Loader2 className="h-8 w-8 animate-spin text-gold" aria-hidden />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-gold sm:text-3xl">{bookTitle}</h1>
          <p className="mt-1 text-sm text-editorial-muted">
            {coarsePointer
              ? "Use the arrows to reorder on touch devices. Click titles and descriptions to edit. Changes save automatically."
              : "Drag to reorder, click titles and descriptions to edit. Changes save automatically."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="ghost" className="text-editorial-muted hover:text-gold">
            <Link href={`/projects/${bookId}/codex`}>
              <BookOpen className="mr-2 h-4 w-4" aria-hidden />
              Open Codex
            </Link>
          </Button>
          {availableTemplates.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              className="text-editorial-muted hover:text-gold"
              disabled={regenerating || !outlineId}
              onClick={() => setTemplateDialogOpen(true)}
              title="Scaffold your outline from a classic structural template (Save the Cat, Hero's Journey, …)"
            >
              <Sparkles className="mr-2 h-4 w-4" aria-hidden />
              Apply structural template
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="border-gold/40 text-gold hover:bg-gold/10"
            disabled={regenerating || !outlineId}
            onClick={() => setRegenDialogOpen(true)}
          >
            {regenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" aria-hidden />
            )}
            Regenerate entire outline
          </Button>
        </div>
      </div>

      {lockStructuralEdits ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Chapters have been written. Structural outline changes are locked — edit chapter
          titles from the chapter list, or delete chapters there first, then come back here to
          add new ones.
        </div>
      ) : null}

      {sections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gold/30 bg-gradient-to-b from-card/60 to-editorial-bg/80 px-6 py-12 text-center sm:px-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">Outline</p>
          <h2 className="mt-2 font-serif text-2xl text-editorial-cream sm:text-3xl">
            No outline yet
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-editorial-muted">
            Once your idea feels solid, we&apos;ll propose chapter titles and beat-by-beat
            summaries. You can drag to reorder, edit every line, and regenerate anytime.
          </p>
          <ol className="mx-auto mt-8 max-w-lg space-y-3 text-left text-sm text-editorial-muted">
            <li className="flex gap-3 rounded-lg border border-border/50 bg-editorial-bg/40 px-4 py-3">
              <span className="font-semibold text-gold">1.</span>
              Finish refining your idea on the Idea tab (or paste a brief below via generate).
            </li>
            <li className="flex gap-3 rounded-lg border border-border/50 bg-editorial-bg/40 px-4 py-3">
              <span className="font-semibold text-gold">2.</span>
              Generate a structured outline from your book brief in one pass.
            </li>
            <li className="flex gap-3 rounded-lg border border-border/50 bg-editorial-bg/40 px-4 py-3">
              <span className="font-semibold text-gold">3.</span>
              Approve when it feels right—then jump into chapter writing.
            </li>
          </ol>
          <Button
            type="button"
            className="mt-10 bg-gold px-8 text-base font-semibold text-editorial-bg hover:bg-gold/90"
            disabled={regenerating}
            onClick={() => void runGenerateOutline()}
          >
            {regenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" aria-hidden />
            )}
            Generate outline from brief
          </Button>
          {availableTemplates.length > 0 ? (
            <p className="mt-4 text-xs text-editorial-muted">
              Not sure where to start?{" "}
              <button
                type="button"
                className="font-medium text-gold underline-offset-4 transition hover:underline disabled:opacity-50"
                disabled={regenerating || !outlineId}
                onClick={() => setTemplateDialogOpen(true)}
              >
                Try a structural template →
              </button>
            </p>
          ) : null}
        </div>
      ) : coarsePointer ? (
        <div className="space-y-3">
          {sections.map((section, idx) => (
            <TouchReorderChapterCard
              key={section.id}
              section={section}
              onChange={updateSection}
              onDelete={deleteSection}
              bookType={bookType}
              codexOptions={codexOptions}
              lockStructuralEdits={lockStructuralEdits}
              canMoveUp={idx > 0 && !lockStructuralEdits}
              canMoveDown={idx < sections.length - 1 && !lockStructuralEdits}
              onMoveUp={() => moveSectionByIndex(section.id, -1)}
              onMoveDown={() => moveSectionByIndex(section.id, 1)}
            />
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {sections.map((section) => (
                <SortableChapterCard
                  key={section.id}
                  section={section}
                  onChange={updateSection}
                  onDelete={deleteSection}
                  bookType={bookType}
                  codexOptions={codexOptions}
                  disableDelete={lockStructuralEdits}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {sections.length > 0 ? (
        <Button
          type="button"
          variant="secondary"
          className="w-full border border-border/60 sm:w-auto"
          onClick={addChapter}
          disabled={!outlineId || lockStructuralEdits}
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          Add chapter
        </Button>
      ) : null}

      {sections.length > 0 ? (
        <div className="pt-4">
          <Button
            type="button"
            className="h-auto w-full gap-2 bg-gold py-4 text-base font-semibold text-editorial-bg hover:bg-gold/90"
            disabled={approveBusy || saving || regenerating || !outlineId}
            onClick={() => void handleApprove()}
          >
            {approveBusy ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : null}
            Approve Outline & Start Writing
          </Button>
          {saving ? (
            <p className="mt-2 text-center text-xs text-editorial-muted">Saving changes…</p>
          ) : null}
        </div>
      ) : null}

      {regenDialogOpen ? (
        <div
          className={responsiveModalRoot("z-50")}
          role="dialog"
          aria-modal="true"
          aria-labelledby="regen-outline-title"
        >
          <button
            type="button"
            className={responsiveModalBackdrop()}
            aria-label="Close dialog"
            disabled={regenerating}
            onClick={() => {
              if (!regenerating) setRegenDialogOpen(false);
            }}
          />
          <div
            className={responsiveModalPanel("max-w-md p-6")}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="regen-outline-title" className="font-serif text-xl text-gold">
              Regenerate entire outline?
            </h2>
            <p className="mt-2 text-sm text-editorial-muted">
              This replaces all chapters with a fresh AI outline. Your current structure and
              edits will be lost.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={regenerating}
                onClick={() => setRegenDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={regenerating}
                onClick={() => void runGenerateOutline()}
              >
                {regenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                Regenerate
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <ApplyTemplateModal
        open={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        bookType={bookType}
        templates={availableTemplates}
        existingChapterCount={sections.length}
        applying={templateApplying}
        onApply={(id) => applyTemplate(id)}
      />
    </div>
  );
}
