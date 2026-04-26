"use client";

/**
 * Right pane of the Codex page: the entry edit form.
 *
 * Every input mutates state locally and fires `onPatch` with the diff — the
 * parent owns the autosave debounce so typing in two fields back-to-back
 * coalesces into one save, and so we can render a saving indicator above
 * the whole form without threading state per-field.
 *
 * The form is ENTIRELY controlled — no `defaultValue`. Switching to a
 * different entry remounts via the outer component's `key` prop (we pass
 * `entry.id`) so React cleanly drops any unsaved buffer on select-change.
 *
 * Series awareness (Prompt 16.3)
 * ------------------------------
 * When the current entry is series-scoped, the editor renders two extra
 * panels below the standard form:
 *
 *   - SeriesContextPanel: promote/demote controls + a per-book overlay
 *     editor (description_override + notes) keyed on the current book.
 *   - ProgressionsPanel:  inline list of progressions across the series
 *     plus an "Add event" form. Reuses the server actions defined on the
 *     series-side codex surface (upsertCodexEntryOverlayAction /
 *     createProgressionAction / etc.) so there's a single source of
 *     truth for overlay + progression mutations.
 *
 * Progressions rendered here intentionally show the ENTIRE series history
 * (any book, any chapter), not the no-future-spoilers subset that the AI
 * context builder uses. Authors need the full view to edit / dedupe.
 */
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createProgressionAction,
  deleteCodexEntryOverlayAction,
  deleteProgressionAction,
  demoteCodexEntryToBookAction,
  promoteCodexEntryToSeriesAction,
  updateProgressionAction,
  upsertCodexEntryOverlayAction,
} from "@/app/(dashboard)/dashboard/series/codex/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { markdownToHtml } from "@/components/book/chapter-editor/markdown";
import {
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  FileText,
  Info,
  Link2 as LinkIcon,
  Loader2,
  Plus,
  Trash2,
} from "@/lib/lucide-icons";
import {
  CODEX_TYPE_META,
  type CodexEntry,
  type CodexEntryType,
} from "@/lib/codex/types";
import type {
  CodexEntryAiScopeDb,
  CodexEntryRelationDb,
  CodexEntryTypeDb,
} from "@/types/database.types";

import { TagInput } from "./tag-input";

/** Sibling book info needed for the demote picker + progression forms. */
export type SeriesBookRef = {
  id: string;
  title: string;
  series_order: number | null;
};

/** Client-facing shape of a codex_progressions row; mirrors the columns the
 * page loader projects. Lives here (not in types.ts) because it's only
 * surfaced by the codex editor and we want the import graph to stay
 * tightly scoped. */
export type ProgressionPreviewRow = {
  id: string;
  codex_entry_id: string;
  book_id: string;
  chapter_id: string | null;
  event_type: string;
  description: string;
  position_hint: string | null;
  created_at: string;
};

export type CodexChapterRef = {
  id: string;
  chapter_number: number;
  title: string;
};

export type EntryEditorProps = {
  entry: CodexEntry;
  availableRelationTargets: Array<{ id: string; name: string; entry_type: CodexEntryTypeDb }>;
  saveState: "idle" | "saving" | "saved" | "error";
  errorMessage?: string;
  onPatch: (patch: Partial<CodexEntry>) => void;
  onDelete: () => void;
  /** Non-null iff the current book is in a series. Required to render the
   * scope panel, demote picker, and progression add form. */
  seriesContext?:
    | {
        seriesId: string;
        seriesName: string;
        currentBookId: string;
        books: SeriesBookRef[];
      }
    | null;
  /** Pre-loaded progressions for THIS entry across the whole series. Parent
   * refetches on mutation. */
  progressions?: ProgressionPreviewRow[];
  currentBook: SeriesBookRef;
  chapters?: CodexChapterRef[];
  /** Called after any server mutation (promote/demote/overlay/progression)
   * so the parent can re-fetch the authoritative state. */
  onSeriesMutation?: () => void;
};

const AI_SCOPE_OPTIONS: Array<{
  value: CodexEntryAiScopeDb;
  label: string;
  helper: string;
}> = [
  {
    value: "always",
    label: "Always include",
    helper: "Injected into every AI prose call for this project.",
  },
  {
    value: "on_match",
    label: "Include when mentioned",
    helper: "Only injected when the name or an alias appears in the text context.",
  },
  {
    value: "never",
    label: "Never include automatically",
    helper: "Hidden from AI prompts. Still shown in the codex + editor underlines.",
  },
];

function SaveIndicator({
  state,
  errorMessage,
}: {
  state: "idle" | "saving" | "saved" | "error";
  errorMessage?: string;
}) {
  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-editorial-muted">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Saving…
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300">
        <CheckCircle2 className="h-3 w-3" aria-hidden /> Saved
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className="text-xs text-red-300">
        {errorMessage ?? "Failed to save."}
      </span>
    );
  }
  return null;
}

export function EntryEditor({
  entry,
  availableRelationTargets,
  saveState,
  errorMessage,
  onPatch,
  onDelete,
  seriesContext = null,
  progressions = [],
  currentBook,
  chapters = [],
  onSeriesMutation,
}: EntryEditorProps) {
  const typeMeta = CODEX_TYPE_META[entry.entry_type as CodexEntryType];
  const suggestedFields = typeMeta?.suggestedFields ?? [];

  const [descriptionTab, setDescriptionTab] = useState<"write" | "preview">("write");
  const [newFieldKey, setNewFieldKey] = useState("");
  const [relationPickerOpen, setRelationPickerOpen] = useState(false);

  const customEntries = useMemo(
    () => Object.entries(entry.custom_fields ?? {}),
    [entry.custom_fields],
  );

  const descriptionHtml = useMemo(
    () => (entry.description_md ? markdownToHtml(entry.description_md) : ""),
    [entry.description_md],
  );

  const addCustomField = (key: string) => {
    const trimmed = key.trim();
    if (!trimmed) return;
    if (entry.custom_fields && trimmed in entry.custom_fields) return;
    onPatch({
      custom_fields: { ...(entry.custom_fields ?? {}), [trimmed]: "" },
    });
  };

  const updateCustomField = (key: string, value: string) => {
    const next = { ...(entry.custom_fields ?? {}) };
    next[key] = value;
    onPatch({ custom_fields: next });
  };

  const removeCustomField = (key: string) => {
    const next = { ...(entry.custom_fields ?? {}) };
    delete next[key];
    onPatch({ custom_fields: next });
  };

  const addRelation = (targetId: string) => {
    if (!targetId || targetId === entry.id) return;
    if (entry.relations.some((r) => r.targetId === targetId)) return;
    const next: CodexEntryRelationDb[] = [...entry.relations, { targetId, label: "" }];
    onPatch({ relations: next });
    setRelationPickerOpen(false);
  };

  const updateRelationLabel = (targetId: string, label: string) => {
    const next = entry.relations.map((r) =>
      r.targetId === targetId ? { ...r, label } : r,
    );
    onPatch({ relations: next });
  };

  const removeRelation = (targetId: string) => {
    onPatch({ relations: entry.relations.filter((r) => r.targetId !== targetId) });
  };

  /* When descriptionTab flips to write we want the cursor back on the
   * textarea so keyboard users don't have to tab through the tabs. */
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (descriptionTab === "write" && descriptionRef.current) {
      const el = descriptionRef.current;
      const length = el.value.length;
      el.setSelectionRange(length, length);
    }
  }, [descriptionTab]);

  const isSeriesScoped = entry.scope === "series" || entry.scope === "shared";
  const canPromote = !isSeriesScoped && Boolean(seriesContext);
  const isAnyEntryLinkedBook = Boolean(entry.book_id) || Boolean(seriesContext && isSeriesScoped);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b border-border/60 px-5 py-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-editorial-muted">
            Editing {typeMeta?.label ?? entry.entry_type}
            {isSeriesScoped && seriesContext ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-1.5 py-0.5 normal-case text-gold">
                <LinkIcon className="h-3 w-3" aria-hidden />
                Series-wide
              </span>
            ) : null}
            {entry.is_modified_here ? (
              <span
                className="inline-flex items-center rounded-full border border-sky-400/50 bg-sky-400/10 px-1.5 py-0.5 normal-case text-sky-200"
                title="This entry has a per-book overlay in this book."
              >
                Modified here
              </span>
            ) : null}
          </p>
          <h2 className="mt-0.5 truncate font-serif text-lg text-editorial-cream">
            {entry.name || "Untitled entry"}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <SaveIndicator state={saveState} errorMessage={errorMessage} />
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-red-300 hover:bg-red-500/10 hover:text-red-200"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Delete
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="space-y-6">
          <div>
            <Label htmlFor="codex-name" className="mb-1.5 block">
              Name <span className="text-red-300">*</span>
            </Label>
            <Input
              id="codex-name"
              value={entry.name}
              onChange={(e) => onPatch({ name: e.target.value })}
              placeholder={`e.g. "${typeMeta?.label === "Character" ? "Faiga" : typeMeta?.label === "Location" ? "Gamma-7 Station" : "Sunstone"}"`}
              maxLength={200}
            />
          </div>

          <div>
            <Label htmlFor="codex-aliases" className="mb-1.5 block">
              Aliases
            </Label>
            <TagInput
              id="codex-aliases"
              value={entry.aliases}
              onChange={(next) => onPatch({ aliases: next })}
              placeholder="e.g. Faigaleh, the little one…"
              ariaDescribedBy="codex-aliases-help"
            />
            <p id="codex-aliases-help" className="mt-1.5 text-xs text-editorial-muted">
              Enter or comma to add. Aliases under 3 characters are ignored by the name matcher.
            </p>
          </div>

          <div>
            <Label className="mb-2 block">AI scope</Label>
            <div className="space-y-2">
              {AI_SCOPE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-border/50 bg-muted/20 px-3 py-2 transition hover:border-border"
                >
                  <input
                    type="radio"
                    name="codex-ai-scope"
                    value={opt.value}
                    checked={entry.ai_scope === opt.value}
                    onChange={() => onPatch({ ai_scope: opt.value })}
                    className="mt-1 h-3.5 w-3.5 accent-gold"
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-editorial-cream">
                      {opt.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-editorial-muted">
                      {opt.helper}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <Label htmlFor="codex-description">Description</Label>
              <div
                role="tablist"
                aria-label="Description mode"
                className="inline-flex rounded-md border border-border/60 bg-muted/30 p-0.5 text-xs"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={descriptionTab === "write"}
                  onClick={() => setDescriptionTab("write")}
                  className={`rounded px-2.5 py-1 transition ${
                    descriptionTab === "write"
                      ? "bg-editorial-bg text-editorial-cream"
                      : "text-editorial-muted hover:text-editorial-cream"
                  }`}
                >
                  Write
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={descriptionTab === "preview"}
                  onClick={() => setDescriptionTab("preview")}
                  className={`rounded px-2.5 py-1 transition ${
                    descriptionTab === "preview"
                      ? "bg-editorial-bg text-editorial-cream"
                      : "text-editorial-muted hover:text-editorial-cream"
                  }`}
                >
                  Preview
                </button>
              </div>
            </div>
            {descriptionTab === "write" ? (
              <Textarea
                id="codex-description"
                ref={descriptionRef}
                value={entry.description_md}
                onChange={(e) => onPatch({ description_md: e.target.value })}
                className="min-h-[220px] font-mono text-[13px]"
                placeholder="Markdown supported. Character voice, key traits, physical description, notable relationships."
              />
            ) : descriptionHtml ? (
              <div
                className="prose prose-sm min-h-[220px] max-w-none rounded-md border border-border/60 bg-muted/10 px-4 py-3 text-editorial-cream [&_a]:text-gold [&_code]:rounded [&_code]:bg-muted/40 [&_code]:px-1 [&_code]:py-0.5 [&_h1]:font-serif [&_h2]:font-serif [&_h3]:font-serif"
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            ) : (
              <div className="flex min-h-[220px] items-center justify-center rounded-md border border-dashed border-border/60 text-sm text-editorial-muted">
                <span className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5" aria-hidden />
                  Nothing to preview yet.
                </span>
              </div>
            )}
          </div>

          <div>
            <Label className="mb-2 block">Custom fields</Label>
            <div className="space-y-2">
              {customEntries.length === 0 ? (
                <p className="rounded-md border border-dashed border-border/50 bg-muted/10 px-3 py-2 text-xs text-editorial-muted">
                  No custom fields yet. Add a suggested one or type your own.
                </p>
              ) : (
                customEntries.map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2">
                    <div className="flex w-32 shrink-0 items-center rounded-md border border-border/60 bg-muted/30 px-2.5 py-1.5 text-xs uppercase tracking-wide text-editorial-muted">
                      {key.replace(/_/g, " ")}
                    </div>
                    <Input
                      className="flex-1"
                      value={
                        typeof value === "string"
                          ? value
                          : typeof value === "number" || typeof value === "boolean"
                            ? String(value)
                            : JSON.stringify(value)
                      }
                      onChange={(e) => updateCustomField(key, e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-editorial-muted hover:text-red-300"
                      onClick={() => removeCustomField(key)}
                      aria-label={`Remove ${key}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </div>
                ))
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {suggestedFields
                .filter((f) => !(f in (entry.custom_fields ?? {})))
                .map((f) => (
                  <Button
                    key={f}
                    variant="outline"
                    size="sm"
                    onClick={() => addCustomField(f)}
                    className="h-7 border-border/60 text-xs font-medium capitalize"
                  >
                    <Plus className="mr-1 h-3 w-3" aria-hidden />
                    {f.replace(/_/g, " ")}
                  </Button>
                ))}
              <form
                className="flex items-center gap-1.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  addCustomField(newFieldKey);
                  setNewFieldKey("");
                }}
              >
                <Input
                  value={newFieldKey}
                  onChange={(e) => setNewFieldKey(e.target.value)}
                  placeholder="Custom key…"
                  className="h-7 w-32 text-xs"
                  maxLength={100}
                />
                <Button type="submit" variant="ghost" size="sm" className="h-7 px-2 text-xs">
                  Add
                </Button>
              </form>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Relations</Label>
            <div className="space-y-2">
              {entry.relations.length === 0 ? (
                <p className="rounded-md border border-dashed border-border/50 bg-muted/10 px-3 py-2 text-xs text-editorial-muted">
                  No relations yet. Link this entry to siblings with a label like “rival” or “owns”.
                </p>
              ) : (
                entry.relations.map((rel) => {
                  const target = availableRelationTargets.find((t) => t.id === rel.targetId);
                  return (
                    <div
                      key={rel.targetId}
                      className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-2 py-1.5"
                    >
                      <span className="flex-1 truncate text-sm text-editorial-cream">
                        {target?.name ?? "Deleted entry"}
                        {target ? (
                          <span className="ml-1.5 text-xs text-editorial-muted">
                            ({CODEX_TYPE_META[target.entry_type as CodexEntryType]?.label ?? target.entry_type})
                          </span>
                        ) : null}
                      </span>
                      <Input
                        value={rel.label}
                        onChange={(e) => updateRelationLabel(rel.targetId, e.target.value)}
                        placeholder="e.g. sister"
                        className="h-8 w-40 text-xs"
                        maxLength={200}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-editorial-muted hover:text-red-300"
                        onClick={() => removeRelation(rel.targetId)}
                        aria-label="Remove relation"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
            {availableRelationTargets.length > 0 ? (
              <div className="mt-2">
                {relationPickerOpen ? (
                  <select
                    autoFocus
                    className="h-8 rounded-md border border-border/70 bg-background px-2 text-xs text-editorial-cream"
                    defaultValue=""
                    onChange={(e) => addRelation(e.target.value)}
                    onBlur={() => setRelationPickerOpen(false)}
                  >
                    <option value="" disabled>
                      Pick an entry…
                    </option>
                    {availableRelationTargets
                      .filter(
                        (t) =>
                          t.id !== entry.id &&
                          !entry.relations.some((r) => r.targetId === t.id),
                      )
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                          {" — "}
                          {CODEX_TYPE_META[t.entry_type as CodexEntryType]?.label ?? t.entry_type}
                        </option>
                      ))}
                  </select>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRelationPickerOpen(true)}
                    className="h-7 text-xs"
                  >
                    <Plus className="mr-1 h-3 w-3" aria-hidden />
                    Link to entry
                  </Button>
                )}
              </div>
            ) : null}
          </div>

          <div>
            <Label htmlFor="codex-image-url" className="mb-1.5 block">
              Image URL
            </Label>
            <Input
              id="codex-image-url"
              type="url"
              value={entry.image_url ?? ""}
              onChange={(e) => onPatch({ image_url: e.target.value })}
              placeholder="https://…"
            />
            <p className="mt-1.5 flex items-start gap-1.5 text-xs text-editorial-muted">
              <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
              Portraits and reference images live as URLs for now. Storage uploads coming soon.
            </p>
          </div>

          {/* Series-scope panel: shown when the current book is in a series.
             * For project-scoped entries it renders a "promote" button; for
             * series-scoped entries it renders demote targets + the overlay
             * editor. */}
          {seriesContext ? (
            <SeriesContextPanel
              entry={entry}
              seriesContext={seriesContext}
              canPromote={canPromote}
              onMutation={onSeriesMutation}
            />
          ) : null}

          {/* Progressions are useful for standalone books too; when not in a
             * series we scope events to the current book only. */}
          {isAnyEntryLinkedBook ? (
            <ProgressionsPanel
              entry={entry}
              seriesContext={seriesContext}
              currentBook={currentBook}
              chapters={chapters}
              progressions={progressions}
              onMutation={onSeriesMutation}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Series-scope panel                                                         */
/* -------------------------------------------------------------------------- */

function SeriesContextPanel({
  entry,
  seriesContext,
  canPromote,
  onMutation,
}: {
  entry: CodexEntry;
  seriesContext: NonNullable<EntryEditorProps["seriesContext"]>;
  canPromote: boolean;
  onMutation?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const isSeriesScoped = entry.scope === "series" || entry.scope === "shared";

  /* Overlay editor — only surfaced for series-scoped entries. We keep local
   * draft state (description / notes) and flush to the server on blur +
   * a short debounce, mirroring the series tab's pattern. */
  const [descDraft, setDescDraft] = useState(
    entry.overlay_for_book?.description_override ?? "",
  );
  const [notesDraft, setNotesDraft] = useState(
    entry.overlay_for_book?.notes ?? "",
  );
  /* Re-sync local drafts whenever the server-authoritative overlay changes
   * (e.g. after `onSeriesMutation` → parent refetch). Not doing this would
   * leave the drafts stale after a save. */
  useEffect(() => {
    setDescDraft(entry.overlay_for_book?.description_override ?? "");
    setNotesDraft(entry.overlay_for_book?.notes ?? "");
  }, [entry.overlay_for_book?.id, entry.overlay_for_book?.description_override, entry.overlay_for_book?.notes]);

  const promote = () => {
    startTransition(async () => {
      const res = await promoteCodexEntryToSeriesAction(entry.id);
      if (!res.ok) {
        toast.error(res.error ?? "Could not promote.");
        return;
      }
      toast.success("Promoted to series scope.");
      onMutation?.();
    });
  };

  const demote = (targetBookId: string) => {
    startTransition(async () => {
      const res = await demoteCodexEntryToBookAction(entry.id, targetBookId);
      if (!res.ok) {
        toast.error(res.error ?? "Could not demote.");
        return;
      }
      toast.success("Demoted to single book. Overlay merged into base entry.");
      onMutation?.();
    });
  };

  const saveOverlay = () => {
    startTransition(async () => {
      const desc = descDraft.trim();
      const notes = notesDraft.trim();
      // Empty payload + no existing overlay → nothing to do.
      if (!desc && !notes && !entry.overlay_for_book) return;
      // Empty payload + existing overlay → delete the overlay row so the
      // entry falls back to base fields. Matches the spec's "empty overlay
      // should be treated as no overlay" contract.
      if (!desc && !notes && entry.overlay_for_book) {
        const res = await deleteCodexEntryOverlayAction(entry.overlay_for_book.id);
        if (!res.ok) {
          toast.error(res.error ?? "Could not clear overlay.");
          return;
        }
        toast.success("Overlay cleared.");
        onMutation?.();
        return;
      }
      const res = await upsertCodexEntryOverlayAction({
        codex_entry_id: entry.id,
        book_id: seriesContext.currentBookId,
        field_overrides: {},
        description_override: desc || null,
        notes: notes || null,
      });
      if (!res.ok) {
        toast.error(res.error ?? "Could not save overlay.");
        return;
      }
      toast.success("Overlay saved.");
      onMutation?.();
    });
  };

  return (
    <section className="rounded-md border border-border/40 bg-muted/10 p-4">
      <header className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-serif text-sm text-editorial-cream">
            {isSeriesScoped ? "Series scope" : "Scope"}
          </h3>
          <p className="mt-0.5 text-xs text-editorial-muted">
            {isSeriesScoped
              ? `This entry is shared with every book in ${seriesContext.seriesName}. Edits to the base fields above apply everywhere; use the overlay below to override just this book.`
              : canPromote
                ? `This entry lives only in this book. Promote to series scope to share it across every book in ${seriesContext.seriesName}.`
                : "Standalone entry."}
          </p>
        </div>
      </header>

      {isSeriesScoped ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-editorial-muted">
              Demote to single book:
            </span>
            {seriesContext.books.map((b) => (
              <Button
                key={b.id}
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => demote(b.id)}
                className="h-7 text-xs"
              >
                <ArrowLeft className="mr-1 h-3 w-3" aria-hidden />
                {b.title.length > 22 ? `${b.title.slice(0, 22)}…` : b.title}
              </Button>
            ))}
          </div>

          <div className="mt-5 rounded-md border border-border/40 bg-background/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-xs font-medium text-editorial-cream">
                Per-book overlay
              </Label>
              <span className="text-[10px] uppercase tracking-wide text-editorial-muted">
                {entry.is_modified_here ? "Modified here" : "Inherits from base"}
              </span>
            </div>
            <p className="mb-2 text-[11px] text-editorial-muted">
              Book-specific tweaks. A non-empty description replaces the base
              description when this book's chapters are generated. Leave both
              empty and save to drop the overlay.
            </p>
            <Label htmlFor="codex-overlay-desc" className="mb-1 mt-2 block text-[11px] text-editorial-muted">
              Description override
            </Label>
            <Textarea
              id="codex-overlay-desc"
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              onBlur={saveOverlay}
              placeholder={`Overrides the base description for generation in this book only.`}
              className="min-h-[100px] font-mono text-[12px]"
            />
            <Label htmlFor="codex-overlay-notes" className="mb-1 mt-3 block text-[11px] text-editorial-muted">
              Book-specific notes (not sent to AI)
            </Label>
            <Textarea
              id="codex-overlay-notes"
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              onBlur={saveOverlay}
              placeholder="Author-facing notes about what's different in this book."
              className="min-h-[60px] text-[12px]"
            />
            <div className="mt-2 flex items-center justify-end gap-2">
              {entry.overlay_for_book ? (
                <button
                  type="button"
                  className="text-[11px] text-editorial-muted underline underline-offset-2 hover:text-editorial-cream"
                  onClick={() => {
                    setDescDraft("");
                    setNotesDraft("");
                    // Fire save immediately — user expects "clear" to be instant.
                    startTransition(async () => {
                      if (!entry.overlay_for_book) return;
                      const res = await deleteCodexEntryOverlayAction(
                        entry.overlay_for_book.id,
                      );
                      if (!res.ok) {
                        toast.error(res.error ?? "Could not clear overlay.");
                        return;
                      }
                      toast.success("Overlay cleared.");
                      onMutation?.();
                    });
                  }}
                  disabled={pending}
                >
                  Clear overlay
                </button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={saveOverlay}
                disabled={pending}
                className="h-7 text-xs"
              >
                {pending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                Save overlay
              </Button>
            </div>
          </div>
        </>
      ) : canPromote ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={promote}
          disabled={pending}
          className="h-8 text-xs"
        >
          {pending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <ArrowUp className="mr-1 h-3 w-3" aria-hidden />}
          Promote to series scope
        </Button>
      ) : null}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Progressions panel                                                         */
/* -------------------------------------------------------------------------- */

const DEFAULT_EVENT_TYPES = [
  "age_change",
  "status_change",
  "relationship_change",
  "location_change",
  "acquires_item",
  "loses_item",
  "learns_fact",
  "secret_reveal",
  "injury",
  "death",
  "custom",
] as const;

function ProgressionsPanel({
  entry,
  seriesContext,
  currentBook,
  chapters,
  progressions,
  onMutation,
}: {
  entry: CodexEntry;
  seriesContext: EntryEditorProps["seriesContext"];
  currentBook: SeriesBookRef;
  chapters: CodexChapterRef[];
  progressions: ProgressionPreviewRow[];
  onMutation?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const availableBooks = seriesContext?.books?.length
    ? seriesContext.books
    : [currentBook];
  const [bookId, setBookId] = useState(availableBooks[0]?.id ?? currentBook.id);
  const [chapterId, setChapterId] = useState("");
  const [eventType, setEventType] = useState<string>("status_change");
  const [description, setDescription] = useState("");
  const [positionHint, setPositionHint] = useState("");
  const chapterOptions = bookId === currentBook.id ? chapters : [];

  /* Sort progressions in reading order: by the book's series_order first,
   * then by created_at so mid-book events land in the order the author
   * logged them. Spec's "sorted by (book position, chapter number,
   * created_at)" — we don't have chapter_number inline (it's a separate
   * table) so we fall back to created_at, which is close enough for the
   * preview timeline; the AI context builder does the more precise sort. */
  const byBookOrder = useMemo(() => {
    if (!seriesContext) {
      return [...progressions].sort((a, b) => a.created_at.localeCompare(b.created_at));
    }
    const order = new Map(
      seriesContext.books.map((b) => [b.id, b.series_order ?? 999] as const),
    );
    return [...progressions].sort((a, b) => {
      const oa = order.get(a.book_id) ?? 999;
      const ob = order.get(b.book_id) ?? 999;
      if (oa !== ob) return oa - ob;
      return a.created_at.localeCompare(b.created_at);
    });
  }, [progressions, seriesContext]);

  const resetForm = () => {
    setBookId(availableBooks[0]?.id ?? currentBook.id);
    setChapterId("");
    setEventType("status_change");
    setDescription("");
    setPositionHint("");
  };

  const addProgression = () => {
    if (!bookId) return toast.error("Pick a book.");
    const desc = description.trim();
    if (!desc) return toast.error("Describe what happens.");
    startTransition(async () => {
      const res = await createProgressionAction({
        codex_entry_id: entry.id,
        book_id: bookId,
        chapter_id: chapterId || null,
        event_type: eventType.trim() || "custom",
        description: desc,
        position_hint: positionHint.trim() || null,
      });
      if (!res.ok) {
        toast.error(res.error ?? "Could not save event.");
        return;
      }
      toast.success("Progression added.");
      resetForm();
      setAddOpen(false);
      onMutation?.();
    });
  };

  const deleteProgression = (id: string) => {
    startTransition(async () => {
      const res = await deleteProgressionAction(id);
      if (!res.ok) {
        toast.error(res.error ?? "Could not delete.");
        return;
      }
      toast.success("Progression removed.");
      onMutation?.();
    });
  };

  return (
    <section className="rounded-md border border-border/40 bg-muted/10 p-4">
      <header className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-serif text-sm text-editorial-cream">
            Progressions timeline
          </h3>
          <p className="mt-0.5 text-xs text-editorial-muted">
            {seriesContext
              ? "Key events that happen to this entry across the series. Injected into later books' generation prompts as established facts; future books never see events from books that haven't been reached yet."
              : "Key events that happen to this entry across this book's chapters. These become continuity anchors for later chapter generation and checks."}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setAddOpen((v) => !v)}
          className="h-7 text-xs"
        >
          <Plus className="mr-1 h-3 w-3" aria-hidden />
          {addOpen ? "Cancel" : "Add event"}
        </Button>
      </header>

      {addOpen ? (
        <div className="mb-3 space-y-2 rounded-md border border-border/40 bg-background/40 p-3">
          <div className="grid grid-cols-2 gap-2">
            {availableBooks.length > 1 ? (
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={bookId}
                onChange={(e) => {
                  setBookId(e.target.value);
                  setChapterId("");
                }}
                aria-label="Book"
              >
                {availableBooks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.series_order != null ? `#${b.series_order} ` : ""}
                    {b.title}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm text-editorial-muted">
                {availableBooks[0]?.title ?? "Current book"}
              </div>
            )}
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              aria-label="Event type"
            >
              {DEFAULT_EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={chapterId}
            onChange={(e) => setChapterId(e.target.value)}
            aria-label="Chapter"
          >
            <option value="">No chapter (book-level event)</option>
            {chapterOptions.map((ch) => (
              <option key={ch.id} value={ch.id}>
                Ch {ch.chapter_number}: {ch.title}
              </option>
            ))}
          </select>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What happens? (1–2 sentences)"
            className="min-h-[72px] text-sm"
            maxLength={2_000}
          />
          <Input
            value={positionHint}
            onChange={(e) => setPositionHint(e.target.value)}
            placeholder="Position hint (e.g. 'Ch 7, climax scene')"
            maxLength={120}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                resetForm();
                setAddOpen(false);
              }}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={addProgression}
              disabled={pending}
              className="h-8 text-xs"
            >
              {pending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              Save event
            </Button>
          </div>
        </div>
      ) : null}

      {byBookOrder.length === 0 ? (
        <p className="rounded-md border border-dashed border-border/40 bg-background/40 px-3 py-4 text-center text-xs text-editorial-muted">
          No progressions logged yet. Add one when a key event happens to keep
          later books in continuity.
        </p>
      ) : (
        <ol className="space-y-2">
          {byBookOrder.map((p) => {
            const book = availableBooks.find((b) => b.id === p.book_id);
            const chapter = chapters.find((c) => c.id === p.chapter_id);
            return (
              <li
                key={p.id}
                className="rounded-md border border-border/40 bg-background/40 p-2.5 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-editorial-muted">
                      {seriesContext ? `#${book?.series_order ?? "?"} ` : ""}
                      {book?.title ?? "Unknown book"}
                      {chapter ? ` · Ch ${chapter.chapter_number}` : ""}
                      {p.position_hint ? ` · ${p.position_hint}` : ""}
                      {" · "}
                      <span className="text-gold">{p.event_type.replace(/_/g, " ")}</span>
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-editorial-cream/90">
                      {p.description}
                    </p>
                  </div>
                  <ProgressionEditControls
                    progression={p}
                    pending={pending}
                    onDelete={() => deleteProgression(p.id)}
                    onSave={(patch) => {
                      startTransition(async () => {
                        const res = await updateProgressionAction(p.id, patch);
                        if (!res.ok) {
                          toast.error(res.error ?? "Could not update.");
                          return;
                        }
                        toast.success("Progression updated.");
                        onMutation?.();
                      });
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

/**
 * Inline edit / delete controls for a single progression row. Edit opens a
 * small popover with the same fields as the add-form (but book + chapter
 * are intentionally read-only — moving a progression between books would
 * cascade into overlay + context semantics we haven't designed for yet).
 */
function ProgressionEditControls({
  progression,
  pending,
  onDelete,
  onSave,
}: {
  progression: ProgressionPreviewRow;
  pending: boolean;
  onDelete: () => void;
  onSave: (patch: {
    event_type?: string;
    description?: string;
    position_hint?: string | null;
  }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [eventType, setEventType] = useState(progression.event_type);
  const [description, setDescription] = useState(progression.description);
  const [positionHint, setPositionHint] = useState(
    progression.position_hint ?? "",
  );

  const save = () => {
    const patch: {
      event_type?: string;
      description?: string;
      position_hint?: string | null;
    } = {};
    const desc = description.trim();
    if (!desc) return;
    if (eventType !== progression.event_type) patch.event_type = eventType.trim() || "custom";
    if (desc !== progression.description) patch.description = desc;
    const hint = positionHint.trim();
    if (hint !== (progression.position_hint ?? "")) {
      patch.position_hint = hint || null;
    }
    if (Object.keys(patch).length > 0) onSave(patch);
    setEditing(false);
  };

  return (
    <div className="flex shrink-0 items-start gap-1">
      {editing ? (
        <div className="absolute right-4 z-10 w-[min(22rem,90vw)] space-y-2 rounded-md border border-border/60 bg-background p-3 shadow-lg">
          <select
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            aria-label="Event type"
          >
            {DEFAULT_EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
            {!DEFAULT_EVENT_TYPES.includes(
              progression.event_type as typeof DEFAULT_EVENT_TYPES[number],
            ) ? (
              <option value={progression.event_type}>
                {progression.event_type.replace(/_/g, " ")}
              </option>
            ) : null}
          </select>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[72px] text-xs"
          />
          <Input
            value={positionHint}
            onChange={(e) => setPositionHint(e.target.value)}
            placeholder="Position hint"
            className="h-8 text-xs"
            maxLength={120}
          />
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
              className="h-7 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={save}
              disabled={pending}
              className="h-7 text-xs"
            >
              Save
            </Button>
          </div>
        </div>
      ) : null}
      <button
        type="button"
        aria-label="Edit progression"
        className="rounded p-1 text-editorial-muted hover:text-editorial-cream"
        onClick={() => setEditing((v) => !v)}
      >
        <FileText className="h-3.5 w-3.5" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Delete progression"
        className="rounded p-1 text-editorial-muted hover:text-red-300"
        onClick={onDelete}
        disabled={pending}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}
