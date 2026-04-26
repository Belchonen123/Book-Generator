import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EntryEditor } from "@/app/(dashboard)/projects/[id]/codex/_components/entry-editor";
import type { CodexEntry } from "@/lib/codex/types";

vi.mock("@/app/(dashboard)/dashboard/series/codex/actions", () => ({
  createProgressionAction: vi.fn(),
  deleteCodexEntryOverlayAction: vi.fn(),
  deleteProgressionAction: vi.fn(),
  demoteCodexEntryToBookAction: vi.fn(),
  promoteCodexEntryToSeriesAction: vi.fn(),
  updateProgressionAction: vi.fn(),
  upsertCodexEntryOverlayAction: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("EntryEditor standalone progressions", () => {
  it("renders the progressions panel for standalone project entries", () => {
    const entry: CodexEntry = {
      id: "entry-1",
      book_id: "book-1",
      entry_type: "character",
      name: "Aria",
      aliases: [],
      summary: null,
      description_md: "",
      custom_fields: {},
      ai_scope: "on_match",
      relations: [],
      image_url: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      scope: "project",
      series_id: null,
      is_series_scoped: false,
      is_modified_here: false,
      overlay_for_book: null,
    };

    render(
      <EntryEditor
        entry={entry}
        availableRelationTargets={[]}
        saveState="idle"
        onPatch={() => {}}
        onDelete={() => {}}
        seriesContext={null}
        progressions={[
          {
            id: "prog-1",
            codex_entry_id: "entry-1",
            book_id: "book-1",
            chapter_id: "ch-2",
            event_type: "status_change",
            description: "Aria burns the old map and commits to the new route.",
            position_hint: "After archive scene",
            created_at: "2026-01-01T00:00:00.000Z",
          },
        ]}
        currentBook={{ id: "book-1", title: "Standalone Novel", series_order: null }}
        chapters={[
          { id: "ch-1", chapter_number: 1, title: "Arrival" },
          { id: "ch-2", chapter_number: 2, title: "The Archive" },
        ]}
      />,
    );

    expect(screen.getByText("Progressions timeline")).not.toBeNull();
    expect(
      screen.getByText("Aria burns the old map and commits to the new route."),
    ).not.toBeNull();
  });
});

