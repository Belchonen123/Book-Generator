"use client";

import { forwardRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronDown,
  ChevronUp,
  Replace as ReplaceIcon,
  Search,
  X,
} from "@/lib/lucide-icons";

export type FindReplacePanelProps = {
  findQuery: string;
  replaceQuery: string;
  caseSensitive: boolean;
  matchCount: number;
  matchIndex: number;
  disabled: boolean;
  onFindChange: (value: string) => void;
  onReplaceChange: (value: string) => void;
  onCaseSensitiveChange: (value: boolean) => void;
  onFindNext: () => void;
  onFindPrev: () => void;
  onReplace: () => void;
  onReplaceAll: () => void;
  onClose: () => void;
};

export const FindReplacePanel = forwardRef<HTMLInputElement, FindReplacePanelProps>(
  function FindReplacePanel(
    {
      findQuery,
      replaceQuery,
      caseSensitive,
      matchCount,
      matchIndex,
      disabled,
      onFindChange,
      onReplaceChange,
      onCaseSensitiveChange,
      onFindNext,
      onFindPrev,
      onReplace,
      onReplaceAll,
      onClose,
    },
    ref,
  ) {
    return (
      <div className="flex flex-col gap-2 border-b border-border/50 bg-card/40 px-4 py-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <div className="flex min-w-[220px] flex-1 items-center gap-2">
            <Search className="h-4 w-4 shrink-0 text-editorial-muted" aria-hidden />
            <Input
              ref={ref}
              value={findQuery}
              onChange={(e) => onFindChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (e.shiftKey) onFindPrev();
                  else onFindNext();
                }
              }}
              placeholder="Find in chapter…"
              className="h-9"
            />
            <span className="shrink-0 text-xs text-editorial-muted">
              {matchCount === 0
                ? findQuery
                  ? "0 / 0"
                  : ""
                : `${matchIndex + 1} / ${matchCount}`}
            </span>
          </div>
          <div className="flex min-w-[220px] flex-1 items-center gap-2">
            <ReplaceIcon className="h-4 w-4 shrink-0 text-editorial-muted" aria-hidden />
            <Input
              value={replaceQuery}
              onChange={(e) => onReplaceChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onReplace();
                }
              }}
              placeholder="Replace with…"
              className="h-9"
            />
          </div>
          <label className="flex shrink-0 items-center gap-1 text-xs text-editorial-muted">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => onCaseSensitiveChange(e.target.checked)}
              className="accent-gold"
            />
            Match case
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={matchCount === 0}
            onClick={onFindPrev}
            title="Previous match (Shift+Enter)"
          >
            <ChevronUp className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={matchCount === 0}
            onClick={onFindNext}
            title="Next match (Enter)"
          >
            <ChevronDown className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={matchCount === 0 || disabled}
            onClick={onReplace}
          >
            Replace
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            className="bg-gold text-editorial-bg hover:bg-gold/90"
            disabled={matchCount === 0 || disabled}
            onClick={onReplaceAll}
          >
            Replace all
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Close find and replace"
            title="Close (Esc)"
            onClick={onClose}
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    );
  },
);
