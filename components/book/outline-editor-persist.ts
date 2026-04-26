import { buildChapterOutlineSummary } from "@/lib/outline/build-chapter-outline-summary";

type PersistOutlineSection = {
  number: number;
  title: string;
  description: string;
  [key: string]: unknown;
};

export type PersistChapterRow = {
  id: string;
  chapter_number: number;
  title: string;
  outline_summary: string | null;
  content: string | null;
  status: string;
  word_count: number | null;
};

type PersistOutlineDeps = {
  updateOutlineSections: (sections: PersistOutlineSection[]) => Promise<void>;
  loadExistingChapters: () => Promise<PersistChapterRow[]>;
  updateChapterTitleAndSummary: (
    chapterId: string,
    update: { title: string; outline_summary: string },
  ) => Promise<void>;
  insertChapter: (payload: {
    chapter_number: number;
    title: string;
    outline_summary: string;
    status: "pending";
  }) => Promise<void>;
  deleteChaptersByIds: (ids: string[]) => Promise<void>;
  updateBookChapterCount: (count: number) => Promise<void>;
  refresh: () => void;
  confirmDestructiveDelete: (message: string) => boolean;
  onDeleteCancelled: () => void;
};

export async function persistOutlineWithReconcile(args: {
  sections: PersistOutlineSection[];
  deps: PersistOutlineDeps;
}): Promise<{ cancelled: boolean }> {
  const { sections, deps } = args;
  await deps.updateOutlineSections(sections);

  const existingRows = await deps.loadExistingChapters();
  const existingByNumber = new Map<number, PersistChapterRow>();
  for (const r of existingRows) existingByNumber.set(r.chapter_number, r);
  const targetNumbers = new Set(sections.map((s) => s.number));

  for (const s of sections) {
    const existing = existingByNumber.get(s.number);
    const outlineSummary = buildChapterOutlineSummary(s);
    if (existing) {
      await deps.updateChapterTitleAndSummary(existing.id, {
        title: s.title,
        outline_summary: outlineSummary,
      });
    } else {
      await deps.insertChapter({
        chapter_number: s.number,
        title: s.title,
        outline_summary: outlineSummary,
        status: "pending",
      });
    }
  }

  const toDelete: string[] = [];
  for (const r of existingRows) {
    if (!targetNumbers.has(r.chapter_number)) toDelete.push(r.id);
  }

  if (toDelete.length > 0) {
    const destructive = existingRows.filter(
      (r) => toDelete.includes(r.id) && (r.word_count ?? 0) > 50,
    );
    if (destructive.length > 0) {
      const confirmed = deps.confirmDestructiveDelete(
        `Removing ${destructive.length} chapter(s) with existing prose (${destructive
          .map((c) => `#${c.chapter_number}`)
          .join(", ")}). This deletes the written content. Continue?`,
      );
      if (!confirmed) {
        deps.onDeleteCancelled();
        return { cancelled: true };
      }
    }
    await deps.deleteChaptersByIds(toDelete);
  }

  await deps.updateBookChapterCount(sections.length);
  deps.refresh();
  return { cancelled: false };
}
