import { describe, expect, it, vi } from "vitest";

import {
  type PersistChapterRow,
  persistOutlineWithReconcile,
} from "@/components/book/outline-editor-persist";

function makeDeps(overrides?: {
  existingRows?: PersistChapterRow[];
  confirmResult?: boolean;
}) {
  const updateOutlineSections = vi.fn(async () => {});
  const loadExistingChapters = vi.fn(
    async () =>
      overrides?.existingRows ??
      ([] as PersistChapterRow[]),
  );
  const updateChapterTitleAndSummary = vi.fn(async () => {});
  const insertChapter = vi.fn(async () => {});
  const deleteChaptersByIds = vi.fn(async () => {});
  const updateBookChapterCount = vi.fn(async () => {});
  const refresh = vi.fn();
  const confirmDestructiveDelete = vi.fn(
    () => overrides?.confirmResult ?? true,
  );
  const onDeleteCancelled = vi.fn();
  return {
    updateOutlineSections,
    loadExistingChapters,
    updateChapterTitleAndSummary,
    insertChapter,
    deleteChaptersByIds,
    updateBookChapterCount,
    refresh,
    confirmDestructiveDelete,
    onDeleteCancelled,
  };
}

describe("outline-editor persist reconcile", () => {
  it("updates chapter rows in place and preserves existing content", async () => {
    const deps = makeDeps({
      existingRows: [
        {
          id: "ch-1",
          chapter_number: 1,
          title: "Old 1",
          outline_summary: "old summary 1",
          content: "existing prose",
          status: "edited",
          word_count: 980,
        },
        {
          id: "ch-2",
          chapter_number: 2,
          title: "Old 2",
          outline_summary: "old summary 2",
          content: "more prose",
          status: "draft",
          word_count: 720,
        },
      ],
    });

    await persistOutlineWithReconcile({
      sections: [
        { number: 1, title: "New Title 1", description: "desc 1" },
        { number: 2, title: "New Title 2", description: "desc 2" },
      ],
      deps,
    });

    expect(deps.updateOutlineSections).toHaveBeenCalledTimes(1);
    expect(deps.updateChapterTitleAndSummary).toHaveBeenCalledTimes(2);
    expect(deps.insertChapter).not.toHaveBeenCalled();
    expect(deps.deleteChaptersByIds).not.toHaveBeenCalled();
    expect(deps.updateBookChapterCount).toHaveBeenCalledWith(2);
    expect(deps.refresh).toHaveBeenCalledTimes(1);
  });

  it("prompts before deleting written chapters and cancels on reject", async () => {
    const deps = makeDeps({
      confirmResult: false,
      existingRows: [
        {
          id: "ch-1",
          chapter_number: 1,
          title: "Chapter 1",
          outline_summary: "summary",
          content: "some prose",
          status: "edited",
          word_count: 800,
        },
        {
          id: "ch-2",
          chapter_number: 2,
          title: "Chapter 2",
          outline_summary: "summary",
          content: "substantial prose",
          status: "draft",
          word_count: 1200,
        },
      ],
    });

    const result = await persistOutlineWithReconcile({
      sections: [{ number: 1, title: "Chapter 1", description: "kept" }],
      deps,
    });

    expect(result.cancelled).toBe(true);
    expect(deps.confirmDestructiveDelete).toHaveBeenCalledTimes(1);
    expect(deps.deleteChaptersByIds).not.toHaveBeenCalled();
    expect(deps.onDeleteCancelled).toHaveBeenCalledTimes(1);
    expect(deps.updateBookChapterCount).not.toHaveBeenCalled();
    expect(deps.refresh).not.toHaveBeenCalled();
  });
});
