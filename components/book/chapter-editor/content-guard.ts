import type { SaveState } from "./types";

type GuardEditor = {
  getText: () => string;
  getHTML: () => string;
  commands: {
    setContent: (html: string, emitUpdate: boolean) => void;
  };
};

type SyncChapterContentParams = {
  editor: GuardEditor;
  chapterContent: string | null | undefined;
  serverContent: string;
  saveState: SaveState;
  markdownToHtml: (markdown: string) => string;
  toMarkdown: (html: string) => string;
  onConflict: () => void;
  onHydrated?: () => void;
  onHydrationComplete?: () => void;
};

type SyncChapterContentResult = {
  nextServerContent: string;
  outcome: "noop" | "conflict" | "hydrated";
};

export function syncChapterContentWithEditor({
  editor,
  chapterContent,
  serverContent,
  saveState,
  markdownToHtml,
  toMarkdown,
  onConflict,
  onHydrated,
  onHydrationComplete,
}: SyncChapterContentParams): SyncChapterContentResult {
  const incoming = chapterContent ?? "";
  const currentText = editor.getText();

  if (incoming === serverContent && currentText.length > 0) {
    return { nextServerContent: serverContent, outcome: "noop" };
  }

  const localMd = toMarkdown(editor.getHTML());
  const incomingDiffersFromLocal = incoming.trim() !== localMd.trim();
  const hasUnsavedEdits = saveState === "dirty" || saveState === "saving";

  if (hasUnsavedEdits && incomingDiffersFromLocal && currentText.trim().length > 0) {
    onConflict();
    return { nextServerContent: incoming, outcome: "conflict" };
  }

  const html = markdownToHtml(incoming);
  editor.commands.setContent(html, false);
  onHydrated?.();
  onHydrationComplete?.();
  return { nextServerContent: incoming, outcome: "hydrated" };
}
