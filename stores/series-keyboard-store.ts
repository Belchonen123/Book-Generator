import { create } from "zustand";

/**
 * Cross-component handoff for the series keyboard shortcuts
 * (`Cmd/Ctrl+Shift+S | A | P`, spec lines 339-345).
 *
 * Stored here instead of React context so the shortcut handler —
 * mounted separately from the codex tab — can read the current
 * selection without having to thread refs through the series detail
 * shell. The values are purely ephemeral UI state; nothing is persisted.
 */
type SeriesKeyboardState = {
  /**
   * Id of the codex entry the user most recently opened on the current
   * series detail page. Used by `Cmd/Ctrl+Shift+P` to jump to that
   * character's progressions timeline. Cleared when the entry closes or
   * the page unmounts.
   */
  selectedCodexEntryId: string | null;
  setSelectedCodexEntryId: (entryId: string | null) => void;
};

export const useSeriesKeyboardStore = create<SeriesKeyboardState>((set) => ({
  selectedCodexEntryId: null,
  setSelectedCodexEntryId: (entryId) => set({ selectedCodexEntryId: entryId }),
}));
