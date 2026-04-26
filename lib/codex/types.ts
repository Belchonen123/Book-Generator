/**
 * Codex shared types + per-entry-type UI metadata (icon, color, suggested
 * custom fields). Kept framework-agnostic so the matcher, TipTap extension,
 * AI context builder, and UI all consume the same source of truth.
 */
import type {
  CodexEntryAiScopeDb,
  CodexEntryRelationDb,
  CodexEntryScopeDb,
  CodexEntryTypeDb,
} from "@/types/database.types";

/**
 * Flat entry shape used everywhere in the client. The server actions
 * return the same shape — see `CodexEntryDto` in actions.ts. Keep this in
 * sync with that DTO; divergence shows up as "undefined" on the UI for
 * newly added columns.
 *
 * Scope fields
 * ------------
 *  - `scope`      : 'project' | 'series' | 'shared'. For 'project' entries
 *                   `book_id` is set; for 'series'/'shared' entries `book_id`
 *                   is the empty string (or the current viewer's book id when
 *                   the client has augmented it for UI convenience — see
 *                   `is_series_scoped` + `series_id`).
 *  - `series_id`  : non-null for series/shared entries.
 *  - `is_series_scoped`     : convenience flag (`scope !== 'project'`). Used
 *                   heavily by the sidebar grouping code.
 *  - `is_modified_here`     : true when a per-book overlay exists for the
 *                   CURRENT book and this entry. Drives the "modified here"
 *                   dot in the sidebar. Always false for project-scoped
 *                   entries.
 *  - `overlay_for_book`     : the actual overlay row (if any) for the
 *                   current book. Embedded in the entry so the editor
 *                   doesn't need a separate lookup.
 *  - `owning_book_id`       : for series entries, the book id the viewer is
 *                   currently looking at the entry FROM — used to route
 *                   overlay writes to the right book.
 */
export type CodexEntryOverlay = {
  id: string;
  book_id: string;
  description_override: string | null;
  notes: string | null;
  field_overrides: Record<string, unknown>;
};

export type CodexEntry = {
  id: string;
  book_id: string;
  entry_type: CodexEntryTypeDb;
  name: string;
  aliases: string[];
  summary: string | null;
  description_md: string;
  custom_fields: Record<string, unknown>;
  ai_scope: CodexEntryAiScopeDb;
  relations: CodexEntryRelationDb[];
  image_url: string | null;
  created_at: string;
  updated_at: string;
  /* Series metadata. Optional so pre-16.3 call sites that don't populate
   * these still typecheck — consumers should treat missing `scope` as
   * `'project'` and missing flags as `false`. Code on the project-side codex
   * page populates these from the page loader and the useCodexEntries hook. */
  scope?: CodexEntryScopeDb;
  series_id?: string | null;
  is_series_scoped?: boolean;
  is_modified_here?: boolean;
  overlay_for_book?: CodexEntryOverlay | null;
  owning_book_id?: string | null;
};

/** Narrow helper: true iff an entry is stored at series or shared scope. */
export function isSeriesScoped(e: Pick<CodexEntry, "scope">): boolean {
  return e.scope === "series" || e.scope === "shared";
}

/**
 * The 6 entry types surfaced in the Codex UI. Matches CODEX_UI_TYPES in
 * actions.ts (enforced via shared import in any component that needs it).
 */
export const CODEX_ENTRY_TYPES = [
  "character",
  "location",
  "object",
  "lore",
  "faction",
  "subplot",
] as const satisfies readonly CodexEntryTypeDb[];

export type CodexEntryType = (typeof CODEX_ENTRY_TYPES)[number];

/**
 * Color palette for decorations and UI chips. Each type gets a pair of
 * Tailwind-ready hex values — a subtle underline for the editor decoration
 * and a matching text tint for the chip/icon. The values are picked to
 * read on the editorial-bg dark theme without stealing focus from prose.
 */
export type CodexTypeMeta = {
  id: CodexEntryType;
  label: string;
  labelPlural: string;
  /** Short helper shown in the empty state + entry picker. */
  helper: string;
  /** Hex used by the TipTap CodexHighlight extension for the underline. */
  underlineColor: string;
  /** Tailwind classes for chips/badges in the codex page UI. */
  chipClass: string;
  /** Tailwind class for the type icon tint. */
  iconClass: string;
  /** Suggested custom field keys surfaced as quick-add buttons. */
  suggestedFields: readonly string[];
};

export const CODEX_TYPE_META: Record<CodexEntryType, CodexTypeMeta> = {
  character: {
    id: "character",
    label: "Character",
    labelPlural: "Characters",
    helper: "People, creatures, POV anchors.",
    underlineColor: "#d4af37",
    chipClass: "bg-amber-500/12 text-amber-200 border-amber-400/25",
    iconClass: "text-amber-300",
    suggestedFields: ["age", "occupation", "voice_notes", "secrets", "want", "need"],
  },
  location: {
    id: "location",
    label: "Location",
    labelPlural: "Locations",
    helper: "Places, settings, regions.",
    underlineColor: "#60a5fa",
    chipClass: "bg-sky-500/12 text-sky-200 border-sky-400/25",
    iconClass: "text-sky-300",
    suggestedFields: ["climate", "notable_features", "inhabitants"],
  },
  object: {
    id: "object",
    label: "Object",
    labelPlural: "Objects",
    helper: "Items, artifacts, tools, tech.",
    underlineColor: "#34d399",
    chipClass: "bg-emerald-500/12 text-emerald-200 border-emerald-400/25",
    iconClass: "text-emerald-300",
    suggestedFields: ["appearance", "function", "history"],
  },
  lore: {
    id: "lore",
    label: "Lore",
    labelPlural: "Lore",
    helper: "History, myths, rules of the world.",
    underlineColor: "#a78bfa",
    chipClass: "bg-violet-500/12 text-violet-200 border-violet-400/25",
    iconClass: "text-violet-300",
    suggestedFields: ["scope", "era"],
  },
  faction: {
    id: "faction",
    label: "Faction",
    labelPlural: "Factions",
    helper: "Groups, organizations, families.",
    underlineColor: "#f87171",
    chipClass: "bg-rose-500/12 text-rose-200 border-rose-400/25",
    iconClass: "text-rose-300",
    suggestedFields: ["goals", "allies", "enemies"],
  },
  subplot: {
    id: "subplot",
    label: "Subplot",
    labelPlural: "Subplots",
    helper: "Secondary story threads and arcs.",
    underlineColor: "#fb923c",
    chipClass: "bg-orange-500/12 text-orange-200 border-orange-400/25",
    iconClass: "text-orange-300",
    suggestedFields: ["chapters", "status"],
  },
};

export function isUiCodexType(value: string): value is CodexEntryType {
  return (CODEX_ENTRY_TYPES as readonly string[]).includes(value);
}

export function codexUnderlineColor(type: CodexEntryTypeDb): string {
  if (isUiCodexType(type)) return CODEX_TYPE_META[type].underlineColor;
  return "#94a3b8"; /* slate-400 fallback for legacy 'custom' rows */
}
