"use client";

import type { Editor } from "@tiptap/core";
import { useCallback, useEffect, useState } from "react";

import type { FindMatch } from "../types";

/**
 * Walk the ProseMirror doc for literal substring matches inside text nodes.
 * Matches that span multiple text nodes (e.g. across bold/italic boundaries)
 * are intentionally skipped — those are rare and costly to track.
 */
export function findMatchesInDoc(
  editor: Editor,
  query: string,
  caseSensitive: boolean,
): FindMatch[] {
  if (!query) return [];
  const needle = caseSensitive ? query : query.toLowerCase();
  const matches: FindMatch[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || typeof node.text !== "string") return;
    const hay = caseSensitive ? node.text : node.text.toLowerCase();
    let from = 0;
    while (from <= hay.length - needle.length) {
      const found = hay.indexOf(needle, from);
      if (found === -1) break;
      matches.push({ from: pos + found, to: pos + found + query.length });
      from = found + Math.max(needle.length, 1);
    }
  });
  return matches;
}

export function nextMatchIndexAfterReplace(
  nextList: FindMatch[],
  newRangeEnd: number,
): number {
  if (nextList.length === 0) return 0;
  let nextIdx = nextList.findIndex((x) => x.from >= newRangeEnd);
  if (nextIdx === -1) nextIdx = 0;
  return nextIdx;
}

export function useFindMatches({
  editor,
  open,
  query,
  caseSensitive,
}: {
  editor: Editor | null;
  open: boolean;
  query: string;
  caseSensitive: boolean;
}) {
  const [matches, setMatches] = useState<FindMatch[]>([]);
  const [matchIndex, setMatchIndex] = useState(0);

  const recompute = useCallback(
    (preferredIndex?: number) => {
      if (!editor || !query) {
        setMatches([]);
        setMatchIndex(0);
        return [] as FindMatch[];
      }
      const found = findMatchesInDoc(editor, query, caseSensitive);
      setMatches(found);
      if (found.length === 0) {
        setMatchIndex(0);
      } else if (preferredIndex != null) {
        setMatchIndex(Math.max(0, Math.min(preferredIndex, found.length - 1)));
      } else {
        setMatchIndex((i) => (i >= found.length ? 0 : i));
      }
      return found;
    },
    [caseSensitive, editor, query],
  );

  useEffect(() => {
    if (!open) return;
    recompute(0);
  }, [open, query, caseSensitive, recompute]);

  useEffect(() => {
    if (!open || !editor || !query) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onTr = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        recompute();
      }, 200);
    };
    editor.on("update", onTr);
    return () => {
      if (timer) clearTimeout(timer);
      editor.off("update", onTr);
    };
  }, [editor, open, query, recompute]);

  const gotoMatch = useCallback(
    (idx: number, list?: FindMatch[]) => {
      if (!editor) return;
      const m = (list ?? matches)[idx];
      if (!m) return;
      editor
        .chain()
        .focus()
        .setTextSelection({ from: m.from, to: m.to })
        .scrollIntoView()
        .run();
    },
    [editor, matches],
  );

  const findNext = useCallback(() => {
    if (matches.length === 0) return;
    const next = (matchIndex + 1) % matches.length;
    setMatchIndex(next);
    gotoMatch(next);
  }, [gotoMatch, matchIndex, matches.length]);

  const findPrev = useCallback(() => {
    if (matches.length === 0) return;
    const next = (matchIndex - 1 + matches.length) % matches.length;
    setMatchIndex(next);
    gotoMatch(next);
  }, [gotoMatch, matchIndex, matches.length]);

  return {
    matches,
    matchIndex,
    setMatches,
    setMatchIndex,
    recompute,
    gotoMatch,
    findNext,
    findPrev,
  };
}
