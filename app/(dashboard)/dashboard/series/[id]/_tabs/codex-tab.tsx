"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useSeriesKeyboardStore } from "@/stores/series-keyboard-store";

import {
  bulkPromoteCodexEntriesToSeriesAction,
  createCodexEntryAction,
  createProgressionAction,
  deleteCodexEntryAction,
  deleteProgressionAction,
  demoteCodexEntryToBookAction,
  promoteCodexEntryToSeriesAction,
  updateCodexEntryAction,
  upsertCodexEntryOverlayAction,
} from "@/app/(dashboard)/dashboard/series/codex/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowUp,
  ArrowLeft,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from "@/lib/lucide-icons";
import {
  responsiveModalBackdrop,
  responsiveModalPanel,
  responsiveModalRoot,
} from "@/lib/ui/responsive-modal";
import { cn } from "@/lib/utils/cn";
import type {
  CodexEntryScopeDb,
  CodexEntryTypeDb,
} from "@/types/database.types";

import type {
  CodexRow,
  OverlayRow,
  ProgressionRow,
  SeriesBookRow,
} from "../series-detail-shell";

const TYPE_OPTIONS: { value: CodexEntryTypeDb; label: string }[] = [
  { value: "character", label: "Character" },
  { value: "location", label: "Location" },
  { value: "faction", label: "Faction" },
  { value: "object", label: "Object" },
  { value: "lore", label: "Lore" },
  { value: "subplot", label: "Subplot" },
  { value: "custom", label: "Custom" },
];

function customFieldsToStrings(cf: unknown): Record<string, string> {
  if (!cf || typeof cf !== "object" || Array.isArray(cf)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(cf as Record<string, unknown>)) {
    if (v === null || v === undefined) out[k] = "";
    else if (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
      out[k] = String(v);
    else out[k] = JSON.stringify(v);
  }
  return out;
}

type SuggestCodexResponse = {
  entry_type: CodexEntryTypeDb;
  name: string;
  aliases: string[];
  summary: string | null;
  description_md: string;
  custom_fields: Record<string, string | number | boolean>;
};

export function CodexTab({
  seriesId,
  books,
  codex,
  overlays,
  progressions,
  initialOpenEntryId = null,
}: {
  seriesId: string;
  books: SeriesBookRow[];
  codex: CodexRow[];
  overlays: OverlayRow[];
  progressions: ProgressionRow[];
  /**
   * Entry id to auto-open on mount. Used by the series keyboard shortcut
   * handler (Cmd/Ctrl+Shift+P) to deep-link into a specific character's
   * progressions timeline.
   */
  initialOpenEntryId?: string | null;
}) {
  const router = useRouter();
  const setSelectedCodexEntryId = useSeriesKeyboardStore(
    (s) => s.setSelectedCodexEntryId,
  );
  const [scopeFilter, setScopeFilter] = useState<"all" | CodexEntryScopeDb>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | CodexEntryTypeDb>("all");
  const [openId, setOpenId] = useState<string | null>(() => {
    if (!initialOpenEntryId) return null;
    // Only honor the deep link if the entry actually exists in the loaded
    // codex payload — an invalid id would render an empty modal.
    return codex.some((c) => c.id === initialOpenEntryId)
      ? initialOpenEntryId
      : null;
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  /**
   * Broadcast the currently-open codex entry id to the shared shortcut
   * store so `Cmd/Ctrl+Shift+P` can jump to its progressions timeline
   * from anywhere else in the series surface.
   */
  useEffect(() => {
    setSelectedCodexEntryId(openId);
    return () => setSelectedCodexEntryId(null);
  }, [openId, setSelectedCodexEntryId]);

  /**
   * React to deep-link changes after mount — e.g. the shortcut handler
   * pushes `?tab=codex&entry=<id>` while the tab is already mounted.
   */
  useEffect(() => {
    if (!initialOpenEntryId) return;
    if (!codex.some((c) => c.id === initialOpenEntryId)) return;
    setOpenId(initialOpenEntryId);
  }, [initialOpenEntryId, codex]);

  const filtered = useMemo(() => {
    return codex
      .filter((c) => (scopeFilter === "all" ? true : c.scope === scopeFilter))
      .filter((c) => (typeFilter === "all" ? true : c.entry_type === typeFilter))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [codex, scopeFilter, typeFilter]);

  /*
   * Build a "used-in" map: entry id → sorted list of book titles it touches.
   * Coverage sources, in order of confidence:
   *   - overlays: per-book overrides (strongest signal it's actually in that book)
   *   - progressions: per-book events/story beats
   *   - book_id: project-scoped home book (always at least one)
   * We preserve series_order from the books prop so chips read in reading order.
   */
  const usedInByEntry = useMemo(() => {
    const bookIndex = new Map<string, SeriesBookRow>();
    for (const b of books) bookIndex.set(b.id, b);

    const map = new Map<string, SeriesBookRow[]>();
    const add = (entryId: string, bookId: string) => {
      const book = bookIndex.get(bookId);
      if (!book) return;
      const list = map.get(entryId) ?? [];
      if (!list.find((b) => b.id === bookId)) list.push(book);
      map.set(entryId, list);
    };
    for (const o of overlays) add(o.codex_entry_id, o.book_id);
    for (const p of progressions) add(p.codex_entry_id, p.book_id);
    for (const c of codex) {
      if (c.scope === "project" && c.book_id) add(c.id, c.book_id);
    }
    for (const [id, list] of Array.from(map.entries())) {
      list.sort(
        (a, b) => (a.series_order ?? 999) - (b.series_order ?? 999),
      );
      map.set(id, list);
    }
    return map;
  }, [books, codex, overlays, progressions]);

  // Only project-scoped entries in the filtered view can be bulk-promoted.
  const promotableIds = useMemo(
    () =>
      filtered
        .filter((c) => c.scope === "project" && c.book_id)
        .map((c) => c.id),
    [filtered],
  );
  const selectedPromotable = useMemo(
    () => promotableIds.filter((id) => selected.has(id)),
    [promotableIds, selected],
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const toggleSelectAllPromotable = () => {
    if (selectedPromotable.length === promotableIds.length && promotableIds.length > 0) {
      clearSelection();
    } else {
      setSelected(new Set(promotableIds));
    }
  };

  const bulkPromote = async () => {
    if (selectedPromotable.length === 0) return;
    setBulkBusy(true);
    const res = await bulkPromoteCodexEntriesToSeriesAction(selectedPromotable);
    setBulkBusy(false);
    if (!res.ok) {
      toast.error(res.error ?? "Could not promote entries.");
      return;
    }
    if (res.failed.length > 0) {
      toast.warning(
        `Promoted ${res.promoted}. Skipped ${res.failed.length} (${
          res.failed[0]?.reason ?? "unknown"
        }).`,
      );
    } else {
      toast.success(
        `Promoted ${res.promoted} entr${res.promoted === 1 ? "y" : "ies"} to series scope.`,
      );
    }
    clearSelection();
    router.refresh();
  };

  const openEntry = openId ? codex.find((c) => c.id === openId) ?? null : null;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg text-editorial-cream">Codex</h2>
          <p className="text-xs text-editorial-muted">
            Structured characters, locations, factions, and lore. Promote
            project entries to{" "}
            <span className="text-editorial-cream">series</span> scope to share
            across every book.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          New entry
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap gap-2">
          <Filter
            label="Scope"
            value={scopeFilter}
            onChange={(v) => setScopeFilter(v as typeof scopeFilter)}
            options={[
              { value: "all", label: "All" },
              { value: "series", label: "Series" },
              { value: "project", label: "Book" },
            ]}
          />
          <Filter
            label="Type"
            value={typeFilter}
            onChange={(v) => setTypeFilter(v as typeof typeFilter)}
            options={[
              { value: "all", label: "All" },
              ...TYPE_OPTIONS.map((t) => ({ value: t.value, label: t.label })),
            ]}
          />
        </div>
        {promotableIds.length > 0 ? (
          <button
            type="button"
            onClick={toggleSelectAllPromotable}
            className="rounded-md border border-border/60 bg-background px-2 py-1 text-[11px] uppercase tracking-wide text-editorial-muted hover:border-gold/60"
          >
            {selectedPromotable.length === promotableIds.length
              ? "Clear selection"
              : `Select all book-scoped (${promotableIds.length})`}
          </button>
        ) : null}
      </div>

      {selectedPromotable.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-xs text-editorial-cream">
          <span>
            {selectedPromotable.length} book-scoped entr
            {selectedPromotable.length === 1 ? "y" : "ies"} selected
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={clearSelection}
              disabled={bulkBusy}
            >
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void bulkPromote()}
              disabled={bulkBusy}
            >
              {bulkBusy ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <ArrowUp className="mr-1 h-3.5 w-3.5" />
              )}
              Promote to series
            </Button>
          </div>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-editorial-muted">
          No codex entries match these filters yet.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border/40 rounded-lg border border-border/60 bg-card/40">
          {filtered.map((c) => {
            const ol = overlays.filter((o) => o.codex_entry_id === c.id);
            const progs = progressions.filter((p) => p.codex_entry_id === c.id);
            const firstBookTitle = books.find((b) => b.id === c.book_id)?.title;
            const usedIn = usedInByEntry.get(c.id) ?? [];
            const promotable = c.scope === "project" && !!c.book_id;
            const isSelected = selected.has(c.id);
            return (
              <li
                key={c.id}
                className={cn(
                  "flex items-start gap-3 p-3 hover:bg-card/60",
                  isSelected && "bg-gold/5",
                )}
              >
                {promotable ? (
                  <label className="mt-1 flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      aria-label={`Select ${c.name}`}
                      className="h-4 w-4 rounded border-border/60 bg-background accent-gold"
                      checked={isSelected}
                      onChange={() => toggleSelect(c.id)}
                    />
                  </label>
                ) : (
                  <span className="mt-1 inline-block h-4 w-4 shrink-0" aria-hidden />
                )}
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  onClick={() => setOpenId(c.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-serif text-base text-editorial-cream">
                        {c.name}
                      </span>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide",
                          c.scope === "series"
                            ? "border-gold/50 text-gold"
                            : "border-border/60 text-editorial-muted",
                        )}
                      >
                        {c.scope === "series"
                          ? "Series"
                          : c.scope === "shared"
                            ? "Shared"
                            : firstBookTitle ?? "Book"}
                      </span>
                      <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-editorial-muted">
                        {c.entry_type}
                      </span>
                    </div>
                    {c.summary ? (
                      <p className="mt-1 line-clamp-1 text-xs text-editorial-muted">
                        {c.summary}
                      </p>
                    ) : null}
                    {usedIn.length > 0 ? (
                      <div className="mt-2 flex flex-wrap items-center gap-1 text-[10px] text-editorial-muted">
                        <span className="uppercase tracking-wide">Used in:</span>
                        {usedIn.slice(0, 5).map((b) => (
                          <span
                            key={b.id}
                            className="rounded-full border border-border/60 px-1.5 py-0.5 text-editorial-cream"
                            title={b.title}
                          >
                            #{b.series_order ?? "?"}{" "}
                            <span className="opacity-80">{b.title}</span>
                          </span>
                        ))}
                        {usedIn.length > 5 ? (
                          <span>+{usedIn.length - 5} more</span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 text-[10px] text-editorial-muted">
                    {ol.length > 0 ? (
                      <span>
                        {ol.length} overlay{ol.length === 1 ? "" : "s"}
                      </span>
                    ) : null}
                    {progs.length > 0 ? (
                      <span>
                        {progs.length} progression{progs.length === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {createOpen ? (
        <EntryEditor
          seriesId={seriesId}
          books={books}
          onClose={() => setCreateOpen(false)}
          mode="create"
        />
      ) : null}

      {openEntry ? (
        <EntryDetail
          key={openEntry.id}
          entry={openEntry}
          books={books}
          overlays={overlays.filter((o) => o.codex_entry_id === openEntry.id)}
          progressions={progressions
            .filter((p) => p.codex_entry_id === openEntry.id)
            .sort((a, b) => a.created_at.localeCompare(b.created_at))}
          onClose={() => setOpenId(null)}
        />
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Filter chip                                                                */
/* -------------------------------------------------------------------------- */

function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-editorial-muted">
      {label}
      <select
        className="h-8 rounded-md border border-border bg-background px-2 text-xs normal-case text-editorial-cream"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/*  Entry create / edit modal                                                  */
/* -------------------------------------------------------------------------- */

function EntryEditor({
  seriesId,
  books,
  onClose,
  mode,
  initial,
}: {
  seriesId: string;
  books: SeriesBookRow[];
  onClose: () => void;
  mode: "create" | "edit";
  initial?: CodexRow;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<CodexEntryTypeDb>(initial?.entry_type ?? "character");
  const [scope, setScope] = useState<"series" | "project">(
    initial?.scope === "project" ? "project" : "series",
  );
  const [bookId, setBookId] = useState<string>(
    initial?.book_id ?? books[0]?.id ?? "",
  );
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [description, setDescription] = useState(initial?.description_md ?? "");
  const [aliases, setAliases] = useState(initial?.aliases?.join(", ") ?? "");
  const [customFields, setCustomFields] = useState<Record<string, string>>(() =>
    customFieldsToStrings(mode === "edit" && initial ? initial.custom_fields : null),
  );
  const [aiHint, setAiHint] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [newCustomKey, setNewCustomKey] = useState("");
  const [busy, setBusy] = useState(false);

  const applyCustomFields = (raw: Record<string, string | number | boolean>) => {
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (k.trim()) next[k.trim()] = String(v);
    }
    setCustomFields(next);
  };

  const fillWithAi = async () => {
    const hint = aiHint.trim();
    if (!hint) {
      toast.error("Add a short description of what you want, then try again.");
      return;
    }
    setAiBusy(true);
    try {
      const res = await fetch("/api/ai/suggest-codex-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seriesId,
          userHint: hint,
          scope,
          bookId: scope === "project" ? bookId || null : null,
          formEntryType: type,
        }),
      });
      const data = (await res.json()) as { error?: string } & Partial<SuggestCodexResponse>;
      if (!res.ok) {
        toast.error(data.error ?? "Could not generate a suggestion.");
        return;
      }
      if (!data.name || !data.entry_type) {
        toast.error("Unexpected response. Try again.");
        return;
      }
      setName(data.name);
      setType(data.entry_type);
      setSummary(data.summary ?? "");
      setDescription(data.description_md ?? "");
      setAliases((data.aliases ?? []).join(", "));
      if (data.custom_fields && Object.keys(data.custom_fields).length > 0) {
        applyCustomFields(data.custom_fields);
      }
      toast.success("Form filled. Review and edit, then save.");
    } catch {
      toast.error("Request failed. Check your connection and try again.");
    } finally {
      setAiBusy(false);
    }
  };

  const save = async () => {
    const aliasArr = aliases
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setBusy(true);
    if (mode === "create") {
      const cf: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(customFields)) {
        if (k.trim() && v.trim()) cf[k.trim()] = v.trim();
      }
      const res = await createCodexEntryAction({
        scope,
        book_id: scope === "project" ? bookId || null : null,
        series_id: scope === "series" ? seriesId : null,
        input: {
          entry_type: type,
          name: name.trim() || "Untitled",
          aliases: aliasArr,
          summary: summary.trim() || null,
          description_md: description.trim() || null,
          custom_fields: cf,
        },
      });
      setBusy(false);
      if (!res.ok) {
        toast.error(res.error ?? "Could not create.");
        return;
      }
      toast.success("Entry created.");
      onClose();
      router.refresh();
    } else if (initial) {
      const cf: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(customFields)) {
        if (k.trim() && v.trim()) cf[k.trim()] = v.trim();
      }
      const res = await updateCodexEntryAction(initial.id, {
        entry_type: type,
        name: name.trim() || "Untitled",
        aliases: aliasArr,
        summary: summary.trim() || null,
        description_md: description.trim() || null,
        custom_fields: cf,
      });
      setBusy(false);
      if (!res.ok) {
        toast.error(res.error ?? "Could not save.");
        return;
      }
      toast.success("Entry saved.");
      onClose();
      router.refresh();
    }
  };

  return (
    <div
      className={responsiveModalRoot()}
      role="dialog"
      aria-modal="true"
      aria-label={mode === "create" ? "Create codex entry" : "Edit codex entry"}
    >
      <button
        type="button"
        className={responsiveModalBackdrop()}
        aria-label="Close"
        onClick={onClose}
      />
      <div className={responsiveModalPanel("max-w-lg p-6 gap-3")}>
        <h2 className="font-serif text-xl text-editorial-cream">
          {mode === "create" ? "New codex entry" : "Edit entry"}
        </h2>
        <div className="rounded-lg border border-gold/25 bg-gold/5 p-3">
          <p className="text-xs leading-relaxed text-editorial-muted">
            Describe the entry, paste notes, or stay vague. AI can suggest the type, name, summary,
            long description, and extra detail fields. You can change anything before saving.
          </p>
          <label htmlFor="codex-ai-hint" className="sr-only">
            Hints for AI
          </label>
          <textarea
            id="codex-ai-hint"
            value={aiHint}
            onChange={(e) => setAiHint(e.target.value)}
            className="mt-2 w-full min-h-[88px] rounded-md border border-input bg-background px-3 py-2 text-sm text-editorial-cream"
            placeholder="E.g. A smuggler captain who opposes the hero in the outer rim arc; shows up in books 1 and 2."
          />
          <Button
            type="button"
            variant="outline"
            className="mt-2 w-full border-gold/50 text-gold hover:bg-gold/10"
            disabled={aiBusy}
            onClick={() => void fillWithAi()}
          >
            {aiBusy ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 shrink-0" />
            )}
            <span className="ml-2">Auto-fill with AI</span>
          </Button>
        </div>
        <div>
          <Label htmlFor="cn">Name</Label>
          <Input
            id="cn"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="ct">Type</Label>
            <select
              id="ct"
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as CodexEntryTypeDb)}
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="cs">Scope</Label>
            <select
              id="cs"
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={scope}
              disabled={mode === "edit"}
              onChange={(e) => setScope(e.target.value as typeof scope)}
            >
              <option value="series">Series-wide</option>
              <option value="project">Single book</option>
            </select>
          </div>
        </div>
        {scope === "project" && mode === "create" ? (
          <div>
            <Label htmlFor="cbi">Which book?</Label>
            <select
              id="cbi"
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
            >
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div>
          <Label htmlFor="ca">Aliases (comma-separated)</Label>
          <Input
            id="ca"
            value={aliases}
            onChange={(e) => setAliases(e.target.value)}
            placeholder="Faiga, Fi, the youngest Sternberg"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="csum">Summary (one line)</Label>
          <Input
            id="csum"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="cd">Description</Label>
          <textarea
            id="cd"
            className="mt-1 w-full min-h-[160px] rounded-md border border-input bg-background px-3 py-2 text-sm text-editorial-cream"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <Label>Custom fields (optional)</Label>
          <p className="mb-2 text-xs text-editorial-muted">
            Short facts (age, rank, where it appears). Filled by AI or add your own.
          </p>
          {Object.keys(customFields).map((k) => (
            <div key={k} className="mb-2 flex items-center gap-2">
              <span className="w-28 shrink-0 truncate text-[11px] uppercase tracking-wide text-editorial-muted">
                {k.replace(/_/g, " ")}
              </span>
              <Input
                className="h-8 flex-1 text-sm"
                value={customFields[k] ?? ""}
                onChange={(e) =>
                  setCustomFields((prev) => ({ ...prev, [k]: e.target.value }))
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 text-editorial-muted hover:text-red-300"
                onClick={() => {
                  setCustomFields((prev) => {
                    const n = { ...prev };
                    delete n[k];
                    return n;
                  });
                }}
                aria-label={`Remove field ${k}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <form
            className="mt-1 flex items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              const t = newCustomKey.trim().replace(/\s+/g, "_");
              if (!t || t in customFields) return;
              setCustomFields((p) => ({ ...p, [t]: "" }));
              setNewCustomKey("");
            }}
          >
            <Input
              value={newCustomKey}
              onChange={(e) => setNewCustomKey(e.target.value)}
              className="h-8 max-w-xs text-xs"
              placeholder="add_field_key"
            />
            <Button type="submit" size="sm" variant="ghost" className="h-8 text-xs">
              <Plus className="mr-1 h-3 w-3" />
              Add
            </Button>
          </form>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={busy} onClick={() => void save()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Entry detail (overlays + progressions + scope)                             */
/* -------------------------------------------------------------------------- */

function EntryDetail({
  entry,
  books,
  overlays,
  progressions,
  onClose,
}: {
  entry: CodexRow;
  books: SeriesBookRow[];
  overlays: OverlayRow[];
  progressions: ProgressionRow[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const promote = async () => {
    setBusy(true);
    const res = await promoteCodexEntryToSeriesAction(entry.id);
    setBusy(false);
    if (!res.ok) return toast.error(res.error ?? "Could not promote.");
    toast.success("Promoted to series scope.");
    router.refresh();
  };

  const demote = async (targetBookId: string) => {
    setBusy(true);
    const res = await demoteCodexEntryToBookAction(entry.id, targetBookId);
    setBusy(false);
    if (!res.ok) return toast.error(res.error ?? "Could not demote.");
    toast.success("Demoted to single book.");
    router.refresh();
  };

  const del = async () => {
    if (!confirm("Delete this codex entry? This cannot be undone.")) return;
    setBusy(true);
    const res = await deleteCodexEntryAction(entry.id);
    setBusy(false);
    if (!res.ok) return toast.error(res.error ?? "Could not delete.");
    toast.success("Entry deleted.");
    onClose();
    router.refresh();
  };

  return (
    <div
      className={responsiveModalRoot()}
      role="dialog"
      aria-modal="true"
      aria-label={`Edit ${entry.name}`}
    >
      <button
        type="button"
        className={responsiveModalBackdrop()}
        aria-label="Close"
        onClick={onClose}
      />
      <div className={responsiveModalPanel("max-w-2xl p-6 gap-4")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-serif text-2xl text-editorial-cream">
              {entry.name}
            </h2>
            <p className="mt-1 text-xs uppercase tracking-wide text-editorial-muted">
              {entry.entry_type} · {entry.scope === "series" ? "series-wide" : "single book"}
            </p>
            {entry.summary ? (
              <p className="mt-2 text-sm text-editorial-muted">{entry.summary}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void del()}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {entry.description_md ? (
          <section className="rounded-md border border-border/40 bg-card/30 p-4 text-sm whitespace-pre-wrap text-editorial-cream/90">
            {entry.description_md}
          </section>
        ) : null}

        <ScopeActions entry={entry} books={books} busy={busy} onPromote={promote} onDemote={demote} />

        {entry.scope === "series" ? (
          <OverlaysPanel
            entry={entry}
            books={books}
            overlays={overlays}
            onChange={() => router.refresh()}
          />
        ) : null}

        <ProgressionsPanel
          entry={entry}
          books={books}
          progressions={progressions}
          onChange={() => router.refresh()}
        />
      </div>
      {editOpen ? (
        <EntryEditor
          seriesId={entry.series_id ?? ""}
          books={books}
          onClose={() => setEditOpen(false)}
          mode="edit"
          initial={entry}
        />
      ) : null}
    </div>
  );
}

function ScopeActions({
  entry,
  books,
  busy,
  onPromote,
  onDemote,
}: {
  entry: CodexRow;
  books: SeriesBookRow[];
  busy: boolean;
  onPromote: () => void;
  onDemote: (bookId: string) => void;
}) {
  if (entry.scope === "series") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-editorial-muted">
          Demote to single book:
        </span>
        {books.slice(0, 4).map((b) => (
          <Button
            key={b.id}
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => onDemote(b.id)}
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            {b.title.length > 24 ? `${b.title.slice(0, 24)}…` : b.title}
          </Button>
        ))}
      </div>
    );
  }
  return (
    <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onPromote}>
      <ArrowUp className="mr-1 h-3.5 w-3.5" />
      Promote to series scope
    </Button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Overlays panel                                                             */
/* -------------------------------------------------------------------------- */

function OverlaysPanel({
  entry,
  books,
  overlays,
  onChange,
}: {
  entry: CodexRow;
  books: SeriesBookRow[];
  overlays: OverlayRow[];
  onChange: () => void;
}) {
  const [openBookId, setOpenBookId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [descOverride, setDescOverride] = useState("");
  const [saving, setSaving] = useState(false);

  const startEdit = (bookId: string) => {
    const existing = overlays.find((o) => o.book_id === bookId);
    setNotes(existing?.notes ?? "");
    setDescOverride(existing?.description_override ?? "");
    setOpenBookId(bookId);
  };

  const save = async () => {
    if (!openBookId) return;
    setSaving(true);
    const res = await upsertCodexEntryOverlayAction({
      codex_entry_id: entry.id,
      book_id: openBookId,
      field_overrides: {},
      description_override: descOverride.trim() || null,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (!res.ok) return toast.error(res.error ?? "Could not save overlay.");
    toast.success("Overlay saved.");
    setOpenBookId(null);
    onChange();
  };

  return (
    <section className="rounded-md border border-border/40 bg-card/30 p-4">
      <h3 className="font-serif text-sm text-editorial-cream">
        Per-book overlays
      </h3>
      <p className="mt-1 text-xs text-editorial-muted">
        Override this entry's description for a specific book (e.g. "in Book 3,
        Faiga is 14 not 9"). Overlays merge into the prompt when generating
        that book.
      </p>
      <ul className="mt-3 space-y-2">
        {books.map((b) => {
          const has = overlays.find((o) => o.book_id === b.id);
          return (
            <li
              key={b.id}
              className="flex items-center justify-between rounded-md border border-border/50 bg-background/60 px-3 py-2 text-sm"
            >
              <span className="truncate text-editorial-cream">
                #{b.series_order ?? "?"} {b.title}
                {has ? (
                  <span className="ml-2 rounded-full border border-gold/50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gold">
                    Overlay
                  </span>
                ) : null}
              </span>
              <Button type="button" size="sm" variant="outline" onClick={() => startEdit(b.id)}>
                {has ? "Edit" : "Add"}
              </Button>
            </li>
          );
        })}
      </ul>
      {openBookId ? (
        <div
          className={responsiveModalRoot()}
          role="dialog"
          aria-modal="true"
          aria-label="Overlay editor"
        >
          <button
            type="button"
            className={responsiveModalBackdrop()}
            aria-label="Close"
            onClick={() => setOpenBookId(null)}
          />
          <div className={responsiveModalPanel("max-w-md p-6 gap-3")}>
            <h3 className="font-serif text-lg text-editorial-cream">
              Overlay for {books.find((b) => b.id === openBookId)?.title}
            </h3>
            <div>
              <Label htmlFor="odo">Description override</Label>
              <textarea
                id="odo"
                className="mt-1 w-full min-h-[140px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={descOverride}
                onChange={(e) => setDescOverride(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="onts">Notes (not sent to AI)</Label>
              <textarea
                id="onts"
                className="mt-1 w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setOpenBookId(null)}>
                Cancel
              </Button>
              <Button type="button" disabled={saving} onClick={() => void save()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save overlay"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Progressions panel                                                         */
/* -------------------------------------------------------------------------- */

function ProgressionsPanel({
  entry,
  books,
  progressions,
  onChange,
}: {
  entry: CodexRow;
  books: SeriesBookRow[];
  progressions: ProgressionRow[];
  onChange: () => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [bookId, setBookId] = useState(books[0]?.id ?? "");
  const [eventType, setEventType] = useState("status_change");
  const [description, setDescription] = useState("");
  const [positionHint, setPositionHint] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!bookId) return toast.error("Pick a book.");
    if (!description.trim()) return toast.error("Describe what happens.");
    setBusy(true);
    const res = await createProgressionAction({
      codex_entry_id: entry.id,
      book_id: bookId,
      event_type: eventType.trim() || "custom",
      description: description.trim(),
      position_hint: positionHint.trim() || null,
    });
    setBusy(false);
    if (!res.ok) return toast.error(res.error ?? "Could not save.");
    toast.success("Progression added.");
    setDescription("");
    setPositionHint("");
    setAddOpen(false);
    onChange();
  };

  const del = async (id: string) => {
    const res = await deleteProgressionAction(id);
    if (!res.ok) return toast.error(res.error ?? "Could not delete.");
    toast.success("Progression removed.");
    onChange();
  };

  return (
    <section className="rounded-md border border-border/40 bg-card/30 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-sm text-editorial-cream">Progressions</h3>
        <Button type="button" size="sm" variant="outline" onClick={() => setAddOpen((v) => !v)}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add event
        </Button>
      </div>
      <p className="mt-1 text-xs text-editorial-muted">
        Key moments across the series. Injected into later books' generation
        prompts as established facts.
      </p>
      {addOpen ? (
        <div className="mt-3 space-y-2 rounded-md border border-border/50 bg-background/60 p-3">
          <div className="grid grid-cols-2 gap-2">
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
            >
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  #{b.series_order ?? "?"} {b.title}
                </option>
              ))}
            </select>
            <Input
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              placeholder="event_type (learns_X, acquires_Y…)"
            />
          </div>
          <textarea
            className="w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What happens?"
          />
          <Input
            value={positionHint}
            onChange={(e) => setPositionHint(e.target.value)}
            placeholder="When in the book? (e.g. 'Ch 7, after the market scene')"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={busy} onClick={() => void save()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save event"}
            </Button>
          </div>
        </div>
      ) : null}
      {progressions.length === 0 ? (
        <p className="mt-3 text-xs text-editorial-muted">
          No events logged yet.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {progressions.map((p) => {
            const book = books.find((b) => b.id === p.book_id);
            return (
              <li
                key={p.id}
                className="rounded-md border border-border/50 bg-background/60 p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-editorial-muted">
                      #{book?.series_order ?? "?"} {book?.title ?? "Unknown book"}
                      {p.position_hint ? ` · ${p.position_hint}` : ""} ·{" "}
                      <span className="text-gold">{p.event_type}</span>
                    </p>
                    <p className="mt-1 text-editorial-cream/90">{p.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void del(p.id)}
                    aria-label="Delete progression"
                    className="rounded p-1 text-editorial-muted hover:text-editorial-cream"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
