"use client";

/**
 * 3-pane Codex page:
 *   ┌────────────┬─────────────────────┬────────────────────────────────┐
 *   │ type tabs  │ entry list for type │ entry editor (right pane)      │
 *   └────────────┴─────────────────────┴────────────────────────────────┘
 *
 * State model
 * -----------
 *  - `entries`      client-authoritative cache, seeded from the server.
 *  - `selectedId`   which entry is open in the right pane.
 *  - `activeType`   which tab is selected in the left rail.
 *  - `pending`      per-entry save debounce state (patch buffer +
 *                   timer + last-flush status).
 *
 * Autosave
 * --------
 *  Every field fires `onPatch(partial)` synchronously. We apply the patch
 *  locally (optimistic) and schedule a 600ms debounced flush. Multiple
 *  patches inside the window coalesce, both in local state and in the
 *  outgoing payload, so the network sees one PATCH per burst of typing.
 *
 *  If the page unmounts with a pending patch we flush it synchronously via
 *  `navigator.sendBeacon` is overkill here — instead we `void updateCodexEntry`
 *  in the cleanup and let the browser finish it; worst case the user sees
 *  the change on the next page load.
 */

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  Link2 as LinkIcon,
  Loader2,
  MapPin,
  Package,
  Plus,
  Search,
  Sparkles,
  User,
  Users,
} from "@/lib/lucide-icons";
import {
  CODEX_ENTRY_TYPES,
  CODEX_TYPE_META,
  type CodexEntry,
  type CodexEntryType,
  isUiCodexType,
} from "@/lib/codex/types";
import { cn } from "@/lib/utils/cn";
import { defaultScopeForEntryType } from "@/lib/codex/default-scope-for-entry-type";
import type { CodexEntryScopeDb, CodexEntryTypeDb } from "@/types/database.types";

import {
  createCodexEntry,
  deleteCodexEntry,
  updateCodexEntry,
  type UpdateCodexEntryPatch,
} from "../actions";
import {
  EntryEditor,
  type CodexChapterRef,
  type ProgressionPreviewRow,
  type SeriesBookRef,
} from "./entry-editor";

/**
 * Convert an editor-facing `Partial<CodexEntry>` (where `summary` is
 * `string | null`, mirroring the DB row) into the server action's
 * `UpdateCodexEntryPatch` shape (where every field is `string | undefined`
 * because the action treats missing keys as no-op and doesn't distinguish
 * null from not-set). Fields the editor never writes (`summary`) just fall
 * through; we keep this explicit so future additions to CodexEntry don't
 * silently break the server contract.
 */
function toUpdatePatch(patch: Partial<CodexEntry>): UpdateCodexEntryPatch {
  const out: UpdateCodexEntryPatch = {};
  if (patch.name !== undefined) out.name = patch.name;
  if (patch.aliases !== undefined) out.aliases = patch.aliases;
  if (patch.ai_scope !== undefined) out.ai_scope = patch.ai_scope;
  if (patch.description_md !== undefined) out.description_md = patch.description_md;
  if (patch.custom_fields !== undefined) out.custom_fields = patch.custom_fields;
  if (patch.relations !== undefined) out.relations = patch.relations;
  if (patch.image_url !== undefined) out.image_url = patch.image_url;
  if (patch.summary !== undefined) out.summary = patch.summary ?? undefined;
  if (patch.entry_type !== undefined) out.entry_type = patch.entry_type;
  return out;
}

export function mergeSavedCodexEntry(
  current: CodexEntry,
  saved: CodexEntry,
  newerPendingPatch?: Partial<CodexEntry>,
): CodexEntry {
  return { ...current, ...saved, ...(newerPendingPatch ?? {}) };
}

const TYPE_ICON: Record<CodexEntryType, typeof User> = {
  character: User,
  location: MapPin,
  object: Package,
  lore: BookOpen,
  faction: Users,
  subplot: GitBranch,
};

const AUTOSAVE_DEBOUNCE_MS = 600;

type SaveState = "idle" | "saving" | "saved" | "error";

type PendingRecord = {
  patch: Partial<CodexEntry>;
  timer: ReturnType<typeof setTimeout> | null;
};

type SuggestCodexResponse = {
  entry_type: CodexEntryTypeDb;
  name: string;
  aliases: string[];
  summary: string | null;
  description_md: string;
  custom_fields: Record<string, string | number | boolean>;
};

/**
 * Series context passed down from the page loader. Non-null iff the current
 * book is in a series. Drives:
 *   - the sidebar chip + entry grouping
 *   - whether the create-modal exposes the scope picker
 *   - which sibling books show up in the demote dropdown + progression forms
 */
export type SeriesContextRow = {
  id: string;
  name: string;
  books: SeriesBookRef[];
};

export type CodexPageContentProps = {
  bookId: string;
  bookTitle: string;
  initialEntries: CodexEntry[];
  seriesContext?: SeriesContextRow | null;
  initialProgressions?: ProgressionPreviewRow[];
  initialChapters?: CodexChapterRef[];
};

export function CodexPageContent({
  bookId,
  bookTitle,
  initialEntries,
  seriesContext = null,
  initialProgressions = [],
  initialChapters = [],
}: CodexPageContentProps) {
  const router = useRouter();
  const [entries, setEntries] = useState<CodexEntry[]>(initialEntries);
  const [activeType, setActiveType] = useState<CodexEntryType>(() => {
    /* Prefer the type that already has entries so first-paint isn't an
     * empty list when the user has 0 characters but 5 locations. */
    for (const t of CODEX_ENTRY_TYPES) {
      if (initialEntries.some((e) => e.entry_type === t)) return t;
    }
    return "character";
  });
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const first = initialEntries[0];
    return first ? first.id : null;
  });
  const [search, setSearch] = useState("");
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
  const [isCreating, startCreateTransition] = useTransition();
  const [isAiSuggesting, startAiSuggestTransition] = useTransition();
  /* Sidebar sections default expanded. We persist expand/collapse state in
   * local component state only; it's a navigation affordance, not content. */
  const [seriesSectionOpen, setSeriesSectionOpen] = useState(true);
  const [bookSectionOpen, setBookSectionOpen] = useState(true);
  /* Scope picker draft used by the "New entry" button flow. Reset after
   * each successful create so the next new entry re-defaults sensibly
   * (character → series, object → book). */
  const [createScope, setCreateScope] = useState<Extract<CodexEntryScopeDb, "project" | "series"> | null>(null);
  const [aiHint, setAiHint] = useState("");
  const [aiSuggestOpen, setAiSuggestOpen] = useState(false);

  /* Per-entry save buffers. Not in React state — updating it on every
   * keystroke would cascade re-renders through the entire tree. */
  const pendingRef = useRef<Map<string, PendingRecord>>(new Map());

  /* Flush any in-flight debounce on unmount so a user who navigates away
   * mid-type doesn't lose the last ~600ms of edits. We fire-and-forget
   * because React won't wait on an async cleanup anyway. */
  useEffect(() => {
    const pending = pendingRef.current;
    return () => {
      for (const [entryId, record] of Array.from(pending.entries())) {
        if (record.timer) clearTimeout(record.timer);
        if (Object.keys(record.patch).length > 0) {
          void updateCodexEntry(entryId, toUpdatePatch(record.patch));
        }
      }
      pending.clear();
    };
  }, []);

  const countsByType = useMemo(() => {
    const counts: Record<CodexEntryType, number> = {
      character: 0,
      location: 0,
      object: 0,
      lore: 0,
      faction: 0,
      subplot: 0,
    };
    for (const e of entries) {
      if (e.entry_type in counts) counts[e.entry_type as CodexEntryType] += 1;
    }
    return counts;
  }, [entries]);

  const entriesForType = useMemo(() => {
    const filtered = entries.filter((e) => e.entry_type === activeType);
    const q = search.trim().toLowerCase();
    if (!q) return filtered;
    return filtered.filter((e) => {
      if (e.name.toLowerCase().includes(q)) return true;
      return e.aliases.some((a) => a.toLowerCase().includes(q));
    });
  }, [entries, activeType, search]);

  /* Split entries into series-scoped vs project-scoped buckets for the
   * grouped sidebar. The full list keeps the original order (typ. updated_at
   * desc from the page loader); we just pivot it here. */
  const { seriesEntries, projectEntries } = useMemo(() => {
    if (!seriesContext) {
      return { seriesEntries: [] as CodexEntry[], projectEntries: entriesForType };
    }
    const s: CodexEntry[] = [];
    const p: CodexEntry[] = [];
    for (const e of entriesForType) {
      if (e.scope === "series" || e.scope === "shared") {
        s.push(e);
      } else {
        p.push(e);
      }
    }
    return { seriesEntries: s, projectEntries: p };
  }, [entriesForType, seriesContext]);

  const selectedEntry = useMemo(
    () => entries.find((e) => e.id === selectedId) ?? null,
    [entries, selectedId],
  );

  const relationTargets = useMemo(
    () =>
      entries
        .map((e) => ({ id: e.id, name: e.name, entry_type: e.entry_type }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [entries],
  );

  const flushPatch = useCallback((entryId: string) => {
    const pending = pendingRef.current;
    const record = pending.get(entryId);
    if (!record) return;
    const patch = record.patch;
    if (Object.keys(patch).length === 0) return;
    pending.set(entryId, { patch: {}, timer: null });
    setSaveStates((s) => ({ ...s, [entryId]: "saving" }));

    void (async () => {
      const res = await updateCodexEntry(entryId, toUpdatePatch(patch));
      if (res.success) {
        /* Reconcile authoritative timestamps + the server-side trimming
         * of long strings back into local state. If the author typed more
         * while this request was in flight, keep those newer local edits
         * over the older save response so the textarea never appears to
         * delete what they just wrote. */
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entryId
              ? mergeSavedCodexEntry(
                  e,
                  res.data,
                  pendingRef.current.get(entryId)?.patch,
                )
              : e,
          ),
        );
        setSaveStates((s) => ({ ...s, [entryId]: "saved" }));
        setSaveErrors((m) => {
          if (!m[entryId]) return m;
          const next = { ...m };
          delete next[entryId];
          return next;
        });
        /* Fade the "Saved" pill back to idle after a beat. */
        setTimeout(() => {
          setSaveStates((s) => (s[entryId] === "saved" ? { ...s, [entryId]: "idle" } : s));
        }, 1_500);
      } else {
        setSaveStates((s) => ({ ...s, [entryId]: "error" }));
        setSaveErrors((m) => ({ ...m, [entryId]: res.error }));
      }
    })();
  }, []);

  const queuePatch = useCallback(
    (entryId: string, patch: Partial<CodexEntry>) => {
      const pending = pendingRef.current;
      const existing = pending.get(entryId);
      const merged: Partial<CodexEntry> = { ...(existing?.patch ?? {}), ...patch };
      if (existing?.timer) clearTimeout(existing.timer);
      const timer = setTimeout(() => flushPatch(entryId), AUTOSAVE_DEBOUNCE_MS);
      pending.set(entryId, { patch: merged, timer });
    },
    [flushPatch],
  );

  const onPatchSelected = useCallback(
    (patch: Partial<CodexEntry>) => {
      if (!selectedEntry) return;
      setEntries((prev) =>
        prev.map((e) => (e.id === selectedEntry.id ? { ...e, ...patch } : e)),
      );
      queuePatch(selectedEntry.id, patch);
    },
    [selectedEntry, queuePatch],
  );

  const handleCreate = (
    scopeOverride?: Extract<CodexEntryScopeDb, "project" | "series">,
    seedPatch?: Partial<CodexEntry>,
    entryTypeOverride?: CodexEntryType,
  ) => {
    startCreateTransition(async () => {
      setSaveErrors((m) => {
        if (!m.__create) return m;
        const next = { ...m };
        delete next.__create;
        return next;
      });
      const createType = entryTypeOverride ?? activeType;
      const meta = CODEX_TYPE_META[createType];
      const resolvedScope: Extract<CodexEntryScopeDb, "project" | "series"> =
        scopeOverride ??
        createScope ??
        defaultScopeForEntryType(createType, Boolean(seriesContext));
      const res = await createCodexEntry(bookId, {
        entry_type: createType,
        name: `New ${meta.label.toLowerCase()}`,
        ai_scope: "on_match",
        scope: seriesContext ? resolvedScope : "project",
      });
      if (!res.success) {
        setSaveErrors((m) => ({ ...m, __create: res.error }));
        toast.error(res.error);
        return;
      }
      setSaveErrors((m) => {
        if (!m.__create) return m;
        const next = { ...m };
        delete next.__create;
        return next;
      });
      const created: CodexEntry = {
        ...res.data,
        custom_fields: res.data.custom_fields,
        relations: res.data.relations,
        /* Hand the optimistic row the same series metadata the page loader
         * would have stamped on it — otherwise the just-created series entry
         * briefly renders in the wrong sidebar bucket. */
        scope: seriesContext ? resolvedScope : "project",
        series_id: seriesContext && resolvedScope === "series" ? seriesContext.id : null,
        is_series_scoped: Boolean(seriesContext && resolvedScope === "series"),
        is_modified_here: false,
        overlay_for_book: null,
      };
      setEntries((prev) => [created, ...prev]);
      if (seedPatch) {
        setEntries((prev) => prev.map((e) => (e.id === created.id ? { ...e, ...seedPatch } : e)));
        queuePatch(created.id, seedPatch);
      }
      setSelectedId(created.id);
      setCreateScope(null);
      /* A fresh series entry affects sibling-book pages too; force the
       * Next.js cache to re-fetch so re-opening this page shows the right
       * grouping even if Supabase realtime is slow. */
      if (seriesContext && resolvedScope === "series") {
        router.refresh();
      }
    });
  };

  const fillCreateFormWithAi = useCallback(() => {
    const hint = aiHint.trim();
    if (!hint) {
      toast.error("Add a short description of what you want, then try again.");
      return;
    }
    startAiSuggestTransition(async () => {
      const failureMessage = "Could not generate a suggestion. Try a longer hint or try again.";
      try {
        const effectiveScope = seriesContext
          ? createScope ?? defaultScopeForEntryType(activeType, true)
          : "project";
        const payload = seriesContext
          ? {
              seriesId: seriesContext.id,
              bookId,
              scope: effectiveScope,
              userHint: hint,
              formEntryType: activeType,
            }
          : {
              bookId,
              scope: "project" as const,
              userHint: hint,
              formEntryType: activeType,
            };
        const response = await fetch("/api/ai/suggest-codex-entry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await response.json()) as { error?: string } & Partial<SuggestCodexResponse>;
        if (!response.ok || !data.name) {
          toast.error(failureMessage);
          return;
        }

        const rawSuggestedType = data.entry_type ?? "";
        const suggestedType: CodexEntryType = isUiCodexType(rawSuggestedType)
          ? rawSuggestedType
          : activeType;
        const seedPatch: Partial<CodexEntry> = {
          name: data.name,
          summary: data.summary ?? null,
          description_md: data.description_md ?? "",
          aliases: Array.isArray(data.aliases) ? data.aliases : [],
          custom_fields: data.custom_fields ?? {},
          entry_type: suggestedType,
        };

        handleCreate(effectiveScope, seedPatch, suggestedType);
        setAiSuggestOpen(false);
        setAiHint("");
      } catch {
        toast.error(failureMessage);
      }
    });
  }, [activeType, aiHint, bookId, createScope, handleCreate, seriesContext]);

  /**
   * Called by the editor after any promote / demote / overlay / progression
   * mutation. These actions mutate rows the page loader is authoritative
   * for (scope, overlay, progressions), so we trigger a server refresh to
   * re-seed `initialEntries` and `initialProgressions`. We also clear the
   * selected id if the mutation removed the entry from THIS book's view
   * (happens when demoting to a different book).
   */
  const handleSeriesMutation = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleDelete = () => {
    if (!selectedEntry) return;
    const id = selectedEntry.id;
    if (!confirm(`Delete "${selectedEntry.name}"? This can't be undone.`)) return;

    const prevEntries = entries;
    const idx = entries.findIndex((e) => e.id === id);
    const fallbackId =
      entries.filter((e) => e.entry_type === activeType && e.id !== id)[0]?.id ??
      entries.find((e) => e.id !== id)?.id ??
      null;
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setSelectedId(fallbackId);

    /* Cancel any pending autosave for the row we just deleted — otherwise
     * we'd emit a PATCH against a row the server already considers gone. */
    const record = pendingRef.current.get(id);
    if (record?.timer) clearTimeout(record.timer);
    pendingRef.current.delete(id);

    void (async () => {
      const res = await deleteCodexEntry(id);
      if (!res.success) {
        setEntries(prevEntries);
        setSelectedId(id);
        setSaveErrors((m) => ({ ...m, [id]: res.error }));
      }
      /* If the deleted entry was referenced from any sibling's relations
       * the server already swept them — mirror that in local state so
       * hovering a relation doesn't momentarily show "Deleted entry". */
      setEntries((prev) =>
        prev.map((e) => {
          const next = e.relations.filter((r) => r.targetId !== id);
          return next.length === e.relations.length ? e : { ...e, relations: next };
        }),
      );
      void idx; // reserved for future "undo" toast
    })();
  };

  const activeMeta = CODEX_TYPE_META[activeType];

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-editorial-bg text-editorial-cream">
      <header className="flex items-center justify-between border-b border-border/60 px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <a
            href={`/projects/${bookId}`}
            className="inline-flex items-center gap-1 text-xs text-editorial-muted hover:text-editorial-cream"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            Back to project
          </a>
          <span className="h-4 w-px bg-border/60" aria-hidden />
          <h1 className="truncate font-serif text-lg">
            Codex <span className="text-editorial-muted">—</span> {bookTitle}
          </h1>
        </div>
        <p className="hidden text-xs text-editorial-muted md:block">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </p>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[220px] shrink-0 flex-col border-r border-border/60">
          <nav className="flex-1 overflow-y-auto p-2">
            <ul className="space-y-1">
              {CODEX_ENTRY_TYPES.map((t) => {
                const meta = CODEX_TYPE_META[t];
                const Icon = TYPE_ICON[t];
                const active = t === activeType;
                return (
                  <li key={t}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveType(t);
                        const firstOfType = entries.find((e) => e.entry_type === t);
                        setSelectedId(firstOfType ? firstOfType.id : null);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition",
                        active
                          ? "bg-muted/40 text-editorial-cream"
                          : "text-editorial-muted hover:bg-muted/20 hover:text-editorial-cream",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <Icon
                          className={cn("h-4 w-4", active ? meta.iconClass : "")}
                          aria-hidden
                        />
                        {meta.labelPlural}
                      </span>
                      <span className="rounded-full bg-muted/40 px-1.5 text-[11px] text-editorial-muted">
                        {countsByType[t]}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <section className="flex w-[320px] shrink-0 flex-col border-r border-border/60">
          <div className="space-y-2 border-b border-border/60 p-3">
            {/* Series chip: only shown when this book is part of a series.
             * Makes it obvious which series we're editing in, and offers a
             * one-click return to the series dashboard. Matches the spec's
             * "Editing {bookTitle} in {seriesName}" affordance. */}
            {seriesContext ? (
              <a
                href={`/dashboard/series/${seriesContext.id}`}
                className="group flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-2 py-1 text-[11px] text-gold transition hover:border-gold/60"
                title={`Go to ${seriesContext.name}`}
              >
                <LinkIcon className="h-3 w-3" aria-hidden />
                <span className="truncate">
                  Editing <span className="font-medium">{bookTitle}</span> in{" "}
                  <span className="font-medium">{seriesContext.name}</span>
                </span>
                <ChevronRight
                  className="ml-auto h-3 w-3 shrink-0 opacity-0 transition group-hover:opacity-100"
                  aria-hidden
                />
              </a>
            ) : null}
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-base text-editorial-cream">
                {activeMeta.labelPlural}
              </h2>
              {/* Scope-aware create control. When the book is in a series we
               * render a split control: a primary create that uses the
               * picker-selected (or defaulted) scope, plus a scope toggle
               * underneath. Kept intentionally simple — a full modal would
               * be overkill for two options. */}
              {seriesContext ? (
                <CreateWithScope
                  activeType={activeType}
                  createScope={createScope}
                  setCreateScope={setCreateScope}
                  onCreate={handleCreate}
                  creating={isCreating}
                  seriesName={seriesContext.name}
                />
              ) : (
                <Button
                  size="sm"
                  onClick={() => handleCreate()}
                  loading={isCreating}
                  className="h-8"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
                  New
                </Button>
              )}
            </div>
            {saveErrors.__create ? (
              <p className="text-xs text-red-300">{saveErrors.__create}</p>
            ) : null}
            <div className="rounded-md border border-gold/25 bg-gold/5 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-editorial-muted">
                  Generate a draft entry from a quick hint.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAiSuggestOpen((v) => !v)}
                  className="h-7 border-gold/50 text-gold hover:bg-gold/10"
                >
                  <Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden />
                  AI suggest
                </Button>
              </div>
              {aiSuggestOpen ? (
                <div className="mt-2 space-y-2">
                  <Textarea
                    value={aiHint}
                    onChange={(e) => setAiHint(e.target.value)}
                    placeholder="A 40-year-old former surgeon who now smuggles supplies through blockade checkpoints..."
                    className="min-h-[88px] text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={fillCreateFormWithAi}
                    disabled={isAiSuggesting || isCreating}
                    className="h-8 w-full border-gold/50 text-gold hover:bg-gold/10"
                  >
                    {isAiSuggesting ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden />
                    )}
                    Auto-fill with AI
                  </Button>
                </div>
              ) : null}
            </div>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-editorial-muted"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or alias…"
                className="h-8 pl-8 text-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {entriesForType.length === 0 ? (
              <EmptyTypeState
                type={activeType}
                hasSearch={search.trim().length > 0}
                onCreate={() => handleCreate()}
                creating={isCreating}
                globallyEmpty={entries.length === 0}
              />
            ) : seriesContext ? (
              // Grouped view for series books: series section first, book-only
              // below. Both collapsible; both always present (empty buckets
              // show a small "none yet" hint so authors know the bucket exists).
              <div className="space-y-1 py-1">
                <SidebarGroup
                  title={`Series: ${seriesContext.name}`}
                  hint="Shared with every book in this series."
                  count={seriesEntries.length}
                  open={seriesSectionOpen}
                  onToggle={() => setSeriesSectionOpen((v) => !v)}
                  variant="series"
                >
                  {renderEntryList(seriesEntries)}
                </SidebarGroup>
                <SidebarGroup
                  title="This book only"
                  hint="Lives in this book's codex only."
                  count={projectEntries.length}
                  open={bookSectionOpen}
                  onToggle={() => setBookSectionOpen((v) => !v)}
                  variant="project"
                >
                  {renderEntryList(projectEntries)}
                </SidebarGroup>
              </div>
            ) : (
              <ul className="divide-y divide-border/40">
                {entriesForType.map((e) => renderEntryRow(e))}
              </ul>
            )}
          </div>
        </section>

        <section className="flex min-w-0 flex-1 flex-col">
          {selectedEntry ? (
            <EntryEditor
              key={selectedEntry.id}
              entry={selectedEntry}
              availableRelationTargets={relationTargets}
              saveState={saveStates[selectedEntry.id] ?? "idle"}
              errorMessage={saveErrors[selectedEntry.id]}
              onPatch={onPatchSelected}
              onDelete={handleDelete}
              seriesContext={
                seriesContext
                  ? {
                      seriesId: seriesContext.id,
                      seriesName: seriesContext.name,
                      currentBookId: bookId,
                      books: seriesContext.books,
                    }
                  : null
              }
              progressions={initialProgressions.filter(
                (p) => p.codex_entry_id === selectedEntry.id,
              )}
              currentBook={
                seriesContext?.books.find((b) => b.id === bookId) ?? {
                  id: bookId,
                  title: bookTitle,
                  series_order: null,
                }
              }
              chapters={initialChapters}
              onSeriesMutation={handleSeriesMutation}
            />
          ) : (
            <EmptyEditorState
              hasEntries={entries.length > 0}
              onCreate={() => handleCreate()}
              creating={isCreating}
            />
          )}
        </section>
      </div>
    </div>
  );

  /* Inline helpers that close over per-render state (selectedId, saveStates
   * etc.). Kept as inner fns rather than memoized components because
   * they're only used here and moving them out would force a long prop
   * list for no perf win. */
  function renderEntryRow(e: CodexEntry) {
    const selected = e.id === selectedId;
    const saveState = saveStates[e.id] ?? "idle";
    const isSeriesEntry = e.scope === "series" || e.scope === "shared";
    return (
      <li key={e.id}>
        <button
          type="button"
          onClick={() => setSelectedId(e.id)}
          className={cn(
            "group flex w-full flex-col items-start gap-1 px-3 py-2.5 text-left transition",
            selected ? "bg-muted/40" : "hover:bg-muted/20",
          )}
        >
          <div className="flex w-full items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 truncate text-sm font-medium text-editorial-cream">
              {isSeriesEntry ? (
                <LinkIcon
                  className="h-3 w-3 shrink-0 text-gold/80"
                  aria-label="Series-scoped entry"
                />
              ) : null}
              <span className="truncate">{e.name || "Untitled"}</span>
              {e.is_modified_here ? (
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400"
                  aria-label="Modified in this book"
                  title="This entry has a per-book overlay here."
                />
              ) : null}
            </span>
            {e.ai_scope === "always" ? (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-gold/30 bg-gold/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gold">
                <Sparkles className="h-2.5 w-2.5" aria-hidden />
                Always
              </span>
            ) : saveState === "saving" ? (
              <span className="text-[10px] text-editorial-muted">Saving…</span>
            ) : null}
          </div>
          {e.aliases.length > 0 ? (
            <span className="truncate text-xs text-editorial-muted">
              aka {e.aliases.slice(0, 3).join(", ")}
              {e.aliases.length > 3 ? ` +${e.aliases.length - 3}` : ""}
            </span>
          ) : e.description_md ? (
            <span className="line-clamp-1 text-xs text-editorial-muted">
              {e.description_md.replace(/[#*_`>-]/g, "").slice(0, 120)}
            </span>
          ) : (
            <span className="text-xs italic text-editorial-muted/70">
              No description yet
            </span>
          )}
        </button>
      </li>
    );
  }

  function renderEntryList(list: CodexEntry[]) {
    if (list.length === 0) {
      return (
        <p className="px-3 pb-2 pt-1 text-[11px] italic text-editorial-muted/70">
          None yet.
        </p>
      );
    }
    return (
      <ul className="divide-y divide-border/40">
        {list.map((e) => renderEntryRow(e))}
      </ul>
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Empty states                                                               */
/* -------------------------------------------------------------------------- */

function EmptyTypeState({
  type,
  hasSearch,
  onCreate,
  creating,
  globallyEmpty,
}: {
  type: CodexEntryType;
  hasSearch: boolean;
  onCreate: () => void;
  creating: boolean;
  globallyEmpty: boolean;
}) {
  const meta = CODEX_TYPE_META[type];
  if (hasSearch) {
    return (
      <div className="p-5 text-sm text-editorial-muted">
        No {meta.labelPlural.toLowerCase()} match your search.
      </div>
    );
  }
  return (
    <div className="space-y-3 p-5">
      <p className="text-sm text-editorial-cream">
        {globallyEmpty
          ? "Your codex is empty."
          : `No ${meta.labelPlural.toLowerCase()} yet.`}
      </p>
      <p className="text-xs text-editorial-muted">
        {globallyEmpty
          ? "Create entries for your main characters, locations, and key lore. The AI will automatically use them when it matches names in your writing."
          : meta.helper}
      </p>
      <Button onClick={onCreate} loading={creating} size="sm" className="h-8">
        <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
        Create {meta.label.toLowerCase()}
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sidebar helpers                                                            */
/* -------------------------------------------------------------------------- */

function SidebarGroup({
  title,
  hint,
  count,
  open,
  onToggle,
  variant,
  children,
}: {
  title: string;
  hint: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  /* 'series' tints the header to make series-shared entries feel distinct
   * from the per-book ones. Helps first-time users parse the grouping
   * without relying solely on the section label. */
  variant: "series" | "project";
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-[11px] uppercase tracking-wide transition",
          variant === "series"
            ? "text-gold/90 hover:bg-gold/5"
            : "text-editorial-muted hover:bg-muted/10",
        )}
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {open ? (
            <ChevronDown className="h-3 w-3 shrink-0" aria-hidden />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
          )}
          <span className="truncate font-medium normal-case">{title}</span>
        </span>
        <span className="shrink-0 rounded-full bg-muted/30 px-1.5 text-[10px]">
          {count}
        </span>
      </button>
      {open ? (
        <>
          <p className="px-3 pb-1 text-[10px] italic text-editorial-muted/70">
            {hint}
          </p>
          {children}
        </>
      ) : null}
    </div>
  );
}

/**
 * Small inline "scope-picker + create" control. We skip a full modal
 * because:
 *   - The scope toggle is only two options.
 *   - Inline feedback lets users see what they're about to create.
 *   - The primary action still uses the type-derived default, so most
 *     users never touch the picker.
 */
function CreateWithScope({
  activeType,
  createScope,
  setCreateScope,
  onCreate,
  creating,
  seriesName,
}: {
  activeType: CodexEntryType;
  createScope: Extract<CodexEntryScopeDb, "project" | "series"> | null;
  setCreateScope: (
    v: Extract<CodexEntryScopeDb, "project" | "series"> | null,
  ) => void;
  onCreate: (scope?: Extract<CodexEntryScopeDb, "project" | "series">) => void;
  creating: boolean;
  seriesName: string;
}) {
  const defaultScope = defaultScopeForEntryType(activeType, true);
  const effectiveScope = createScope ?? defaultScope;
  return (
    <div className="inline-flex items-stretch overflow-hidden rounded-md border border-border/60 bg-muted/20">
      <Button
        size="sm"
        onClick={() => onCreate(effectiveScope)}
        loading={creating}
        className="h-8 rounded-none border-0 bg-transparent text-xs text-editorial-cream hover:bg-muted/40"
        title={
          effectiveScope === "series"
            ? `New entry shared across ${seriesName}`
            : "New entry for this book only"
        }
      >
        <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
        New
      </Button>
      <select
        value={effectiveScope}
        onChange={(e) =>
          setCreateScope(
            e.target.value as Extract<CodexEntryScopeDb, "project" | "series">,
          )
        }
        aria-label="Entry scope"
        className="h-8 border-l border-border/60 bg-transparent px-1 text-[11px] text-editorial-muted focus:outline-none"
        title={
          effectiveScope === "series"
            ? "Series scope — shared across every book"
            : "Book scope — only lives in this book's codex"
        }
      >
        <option value="project">In book</option>
        <option value="series">In series</option>
      </select>
    </div>
  );
}

function EmptyEditorState({
  hasEntries,
  onCreate,
  creating,
}: {
  hasEntries: boolean;
  onCreate: () => void;
  creating: boolean;
}) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-md space-y-3 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-gold" aria-hidden />
        <h2 className="font-serif text-xl text-editorial-cream">
          {hasEntries ? "Pick an entry" : "Build your world"}
        </h2>
        <p className="text-sm text-editorial-muted">
          {hasEntries
            ? "Select an entry on the left to edit it, or create a new one."
            : "Start with your main characters and key locations. As you write, matching names will underline in the editor and the AI will remember them."}
        </p>
        <div className="pt-2">
          <Button onClick={onCreate} loading={creating} size="sm">
            <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Create entry
          </Button>
        </div>
      </div>
    </div>
  );
}
