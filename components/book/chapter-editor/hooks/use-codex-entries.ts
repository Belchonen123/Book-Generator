"use client";

/**
 * Client hook: load the codex entries for a given book and keep them in
 * sync with realtime changes made on the codex page.
 *
 * Returned `entries` is used by the CodexHighlight TipTap extension (to
 * rebuild the matcher/trie) and by the hover card (to render the entry's
 * name + description + type icon).
 *
 * Series awareness (Prompt 16.3)
 * ------------------------------
 * When the loaded book has `series_id` set we ALSO fetch:
 *   - every series-scoped codex entry for that series (scope in ('series',
 *     'shared')), so the matcher and hover card see recurring characters
 *     even while the author works inside a specific book;
 *   - every per-book overlay row for (this book, any of those series
 *     entries), so we can apply the author's book-specific overrides to the
 *     rendered description + custom_fields before the entry hits the UI /
 *     the AI context builder.
 *
 * The realtime subscription listens to BOTH the current book's project
 * entries AND the series' series entries so changes made in the series
 * codex tab (or in another editor tab) propagate without a manual refresh.
 */
import { useCallback, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { CodexEntry, CodexEntryOverlay } from "@/lib/codex/types";
import type {
  CodexEntryAiScopeDb,
  CodexEntryRelationDb,
  CodexEntryScopeDb,
  CodexEntryTypeDb,
} from "@/types/database.types";

export type UseCodexEntriesResult = {
  entries: CodexEntry[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  /** The series id the current book belongs to (null for standalone books). */
  seriesId: string | null;
  /** The series display name — passed through to the CodexHighlight plugin
   * so hover cards can show "Series: {name}" without a second fetch. */
  seriesName: string | null;
};

/** Raw Supabase shape — projected from two selects with identical columns. */
type RawCodexRow = {
  id: string;
  book_id: string | null;
  series_id: string | null;
  scope: string | null;
  entry_type: string;
  name: string;
  aliases: string[] | null;
  summary: string | null;
  description_md: string | null;
  custom_fields: unknown;
  ai_scope: string;
  relations: unknown;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

type RawOverlayRow = {
  id: string;
  codex_entry_id: string;
  book_id: string;
  description_override: string | null;
  notes: string | null;
  field_overrides: unknown;
};

const SELECT_COLS =
  "id, book_id, series_id, scope, entry_type, name, aliases, summary, description_md, custom_fields, ai_scope, relations, image_url, created_at, updated_at";

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function coerceRow(
  row: RawCodexRow,
  currentBookId: string,
  overlay: CodexEntryOverlay | null,
): CodexEntry {
  const scope = (row.scope ?? "project") as CodexEntryScopeDb;
  const isSeries = scope === "series" || scope === "shared";

  // Apply overlay — overrides merged custom fields keys-for-keys, and a
  // non-empty description_override replaces the base description. Keeps the
  // matcher/hover card view consistent with what the AI context builder
  // sends to the model.
  const baseCustom = toRecord(row.custom_fields);
  const overCustom = overlay ? toRecord(overlay.field_overrides) : {};
  const mergedCustom: Record<string, unknown> = { ...baseCustom, ...overCustom };

  const description = overlay?.description_override?.trim()
    ? overlay.description_override
    : row.description_md ?? "";

  return {
    id: row.id,
    /* For series entries we synthesize book_id = currentBookId so the
     * existing editor code paths that look at `book_id` keep working even
     * for entries whose canonical row has book_id = null. The true home is
     * in `owning_book_id` (null for series scope) and `series_id`. */
    book_id: isSeries ? currentBookId : row.book_id ?? "",
    owning_book_id: isSeries ? null : row.book_id ?? null,
    entry_type: row.entry_type as CodexEntryTypeDb,
    name: row.name,
    aliases: row.aliases ?? [],
    summary: row.summary,
    description_md: description,
    custom_fields: mergedCustom,
    ai_scope: row.ai_scope as CodexEntryAiScopeDb,
    relations: Array.isArray(row.relations)
      ? ((row.relations as CodexEntryRelationDb[]) ?? []).filter(
          (r) => r && typeof r === "object" && typeof r.targetId === "string",
        )
      : [],
    image_url: row.image_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
    scope,
    series_id: row.series_id,
    is_series_scoped: isSeries,
    is_modified_here: Boolean(overlay),
    overlay_for_book: overlay,
  };
}

function coerceOverlay(row: RawOverlayRow): CodexEntryOverlay {
  return {
    id: row.id,
    book_id: row.book_id,
    description_override: row.description_override,
    notes: row.notes,
    field_overrides: toRecord(row.field_overrides),
  };
}

export function useCodexEntries(bookId: string): UseCodexEntriesResult {
  const [entries, setEntries] = useState<CodexEntry[]>([]);
  const [seriesId, setSeriesId] = useState<string | null>(null);
  const [seriesName, setSeriesName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    if (!bookId) return;
    const supabase = createClient();

    // Resolve the book's series_id first. A single query keeps the hook
    // identical for standalone and series books — the rest of the fetch
    // fans out from the result.
    const { data: book, error: bookErr } = await supabase
      .from("books")
      .select("series_id")
      .eq("id", bookId)
      .maybeSingle();
    if (bookErr) {
      setError(bookErr.message);
      setLoading(false);
      return;
    }
    const currentSeriesId = book?.series_id ?? null;
    setSeriesId(currentSeriesId);

    // Resolve the series name lazily — only needed to decorate hover cards
    // with "Series: {name}". A missing name is harmless; we just render
    // "Series" without a label.
    if (currentSeriesId) {
      const { data: series } = await supabase
        .from("series")
        .select("name")
        .eq("id", currentSeriesId)
        .maybeSingle();
      setSeriesName(series?.name?.trim() || null);
    } else {
      setSeriesName(null);
    }

    // Project-scoped entries for the current book.
    const projectPromise = supabase
      .from("codex_entries")
      .select(SELECT_COLS)
      .eq("book_id", bookId)
      .eq("scope", "project")
      .order("updated_at", { ascending: false });

    // Series-scoped entries for this book's series (null for standalones).
    const seriesPromise = currentSeriesId
      ? supabase
          .from("codex_entries")
          .select(SELECT_COLS)
          .eq("series_id", currentSeriesId)
          .in("scope", ["series", "shared"])
          .order("updated_at", { ascending: false })
      : Promise.resolve({ data: [] as RawCodexRow[], error: null });

    // Overlays for (this book, any entry). Cheaper than fetching per-entry
    // and then joining client-side; Supabase will return 0 rows when the
    // book has no overlays.
    const overlaysPromise = currentSeriesId
      ? supabase
          .from("codex_entry_overlays")
          .select(
            "id, codex_entry_id, book_id, description_override, notes, field_overrides",
          )
          .eq("book_id", bookId)
      : Promise.resolve({
          data: [] as Array<RawOverlayRow & { codex_entry_id: string }>,
          error: null,
        });

    const [projectRes, seriesRes, overlaysRes] = await Promise.all([
      projectPromise,
      seriesPromise,
      overlaysPromise,
    ]);

    if (projectRes.error) {
      setError(projectRes.error.message);
      setLoading(false);
      return;
    }

    const overlayByEntryId = new Map<string, CodexEntryOverlay>();
    for (const o of (overlaysRes.data ?? []) as Array<
      RawOverlayRow & { codex_entry_id: string }
    >) {
      overlayByEntryId.set(o.codex_entry_id, coerceOverlay(o));
    }

    const projectRows = (projectRes.data ?? []) as RawCodexRow[];
    const seriesRows = (seriesRes.data ?? []) as RawCodexRow[];

    const merged: CodexEntry[] = [
      ...projectRows.map((r) => coerceRow(r, bookId, null)),
      ...seriesRows.map((r) =>
        coerceRow(r, bookId, overlayByEntryId.get(r.id) ?? null),
      ),
    ];

    setEntries(merged);
    setError(null);
    setLoading(false);
  }, [bookId]);

  useEffect(() => {
    setLoading(true);
    void fetchEntries();
  }, [fetchEntries]);

  /* Subscribe to codex_entries changes on BOTH channels the user can mutate:
   *   - this book's project-scoped entries (book_id = bookId)
   *   - this series' series-scoped entries (series_id = seriesId)
   *
   * And to overlay changes scoped to this book. We filter server-side to
   * keep channel traffic minimal on busy accounts. */
  useEffect(() => {
    if (!bookId) return;
    const supabase = createClient();
    const channel = supabase.channel(`codex:${bookId}`);

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "codex_entries",
        filter: `book_id=eq.${bookId}`,
      },
      () => {
        void fetchEntries();
      },
    );

    if (seriesId) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "codex_entries",
          filter: `series_id=eq.${seriesId}`,
        },
        () => {
          void fetchEntries();
        },
      );
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "codex_entries",
          filter: "scope=eq.shared",
        },
        () => {
          void fetchEntries();
        },
      );
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "codex_entry_overlays",
          filter: `book_id=eq.${bookId}`,
        },
        () => {
          void fetchEntries();
        },
      );
    }

    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [bookId, seriesId, fetchEntries]);

  return { entries, loading, error, refetch: fetchEntries, seriesId, seriesName };
}
