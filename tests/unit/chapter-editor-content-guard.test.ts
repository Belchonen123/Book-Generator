import { describe, expect, it, vi } from "vitest";

import { syncChapterContentWithEditor } from "@/components/book/chapter-editor/content-guard";

function makeEditor(opts?: { text?: string; html?: string }) {
  const setContent = vi.fn();
  return {
    getText: () => opts?.text ?? "",
    getHTML: () => opts?.html ?? "",
    commands: {
      setContent,
    },
    setContent,
  };
}

describe("syncChapterContentWithEditor", () => {
  it("hydrates editor content on fresh chapter load", () => {
    const editor = makeEditor({ text: "", html: "" });
    const markdownToHtml = vi.fn((md: string) => `<p>${md}</p>`);
    const toMarkdown = vi.fn(() => "");
    const onConflict = vi.fn();

    const result = syncChapterContentWithEditor({
      editor,
      chapterContent: "fresh server draft",
      serverContent: "",
      saveState: "idle",
      markdownToHtml,
      toMarkdown,
      onConflict,
    });

    expect(result.outcome).toBe("hydrated");
    expect(editor.setContent).toHaveBeenCalledWith("<p>fresh server draft</p>", false);
    expect(onConflict).not.toHaveBeenCalled();
  });

  it("no-ops when parent re-fetches with identical content", () => {
    const editor = makeEditor({ text: "local typing", html: "<p>local typing</p>" });
    const markdownToHtml = vi.fn((md: string) => `<p>${md}</p>`);
    const toMarkdown = vi.fn(() => "local typing");
    const onConflict = vi.fn();

    const result = syncChapterContentWithEditor({
      editor,
      chapterContent: "same server payload",
      serverContent: "same server payload",
      saveState: "dirty",
      markdownToHtml,
      toMarkdown,
      onConflict,
    });

    expect(result.outcome).toBe("noop");
    expect(editor.setContent).not.toHaveBeenCalled();
    expect(onConflict).not.toHaveBeenCalled();
  });

  it("preserves local dirty edits and raises conflict on remote change", () => {
    const editor = makeEditor({
      text: "local unsaved text",
      html: "<p>local unsaved text</p>",
    });
    const markdownToHtml = vi.fn((md: string) => `<p>${md}</p>`);
    const toMarkdown = vi.fn(() => "local unsaved text");
    const onConflict = vi.fn();

    const result = syncChapterContentWithEditor({
      editor,
      chapterContent: "remote changed",
      serverContent: "previous remote",
      saveState: "dirty",
      markdownToHtml,
      toMarkdown,
      onConflict,
    });

    expect(result.outcome).toBe("conflict");
    expect(onConflict).toHaveBeenCalledTimes(1);
    expect(editor.setContent).not.toHaveBeenCalled();
  });
});
