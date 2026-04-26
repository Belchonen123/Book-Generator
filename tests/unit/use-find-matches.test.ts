import type { Editor } from "@tiptap/core";
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  findMatchesInDoc,
  nextMatchIndexAfterReplace,
  useFindMatches,
} from "@/components/book/chapter-editor/hooks/use-find-matches";

type UpdateListener = () => void;

class MockEditor {
  private text: string;
  private listeners = new Set<UpdateListener>();

  constructor(initialText: string) {
    this.text = initialText;
  }

  setText(next: string) {
    this.text = next;
  }

  emitUpdate() {
    for (const listener of this.listeners) listener();
  }

  state = {
    doc: {
      descendants: (cb: (node: { isText: boolean; text: string }, pos: number) => void) => {
        cb({ isText: true, text: this.text }, 0);
      },
    },
  };

  on(event: string, listener: UpdateListener) {
    if (event === "update") this.listeners.add(listener);
  }

  off(event: string, listener: UpdateListener) {
    if (event === "update") this.listeners.delete(listener);
  }
}

afterEach(() => {
  vi.useRealTimers();
});

describe("useFindMatches", () => {
  it("recomputes matches on editor updates and preserves selected match index", async () => {
    vi.useFakeTimers();
    const editor = new MockEditor("foo bar foo");

    const { result } = renderHook(() =>
      useFindMatches({
        editor: editor as unknown as Editor,
        open: true,
        query: "foo",
        caseSensitive: false,
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.matches).toHaveLength(2);

    act(() => {
      result.current.setMatchIndex(1);
      editor.setText("foo bar foo foo");
      editor.emitUpdate();
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.matches).toHaveLength(3);
    expect(result.current.matchIndex).toBe(1);
  });
});

describe("replace-current progression", () => {
  it("does not re-replace inside replacement text when replace contains find", () => {
    const editor = new MockEditor("cat cat cat");
    const findQuery = "cat";
    const replaceQuery = "concat";
    let text = "cat cat cat";
    let matchIndex = 0;

    for (let i = 0; i < 2; i += 1) {
      editor.setText(text);
      const matches = findMatchesInDoc(editor as unknown as Editor, findQuery, false);
      const current = matches[matchIndex];
      expect(current).toBeTruthy();
      if (!current) return;

      const newRangeEnd = current.from + replaceQuery.length;
      text =
        text.slice(0, current.from) +
        replaceQuery +
        text.slice(current.to);

      editor.setText(text);
      const nextList = findMatchesInDoc(editor as unknown as Editor, findQuery, false);
      matchIndex = nextMatchIndexAfterReplace(nextList, newRangeEnd);
    }

    expect(text).toBe("concat concat cat");
    expect(text).not.toContain("conconcat");
  });
});
