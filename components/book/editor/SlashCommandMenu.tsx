"use client";

import type { Editor, Range } from "@tiptap/core";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

import { cn } from "@/lib/utils/cn";

import { slashItemKey, type SlashCommandItem } from "./slash-command-items";

export type SlashCommandMenuHandle = {
  /**
   * Forwarded keyboard events from the TipTap suggestion plugin. The
   * argument is a native `KeyboardEvent` (prosemirror-view passes the
   * raw DOM event), not React's synthetic event.
   *
   * Returning `true` swallows the keystroke (ArrowUp/Down/Enter/Tab);
   * any other event returns `false` so the editor keeps its default
   * behavior.
   */
  onKeyDown: (event: KeyboardEvent) => boolean;
};

export type SlashCommandMenuProps = {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
  editor: Editor;
  range: Range;
};

/**
 * Popup rendered by `tippy.js` when a user types `/` at the start of a
 * paragraph. Styling matches the editorial theme (dark bg, gold hover) so
 * the palette feels native to the rest of the editor.
 */
export const SlashCommandMenu = forwardRef<
  SlashCommandMenuHandle,
  SlashCommandMenuProps
>(function SlashCommandMenu({ items, command }, ref) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: (event) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + items.length - 1) % Math.max(items.length, 1));
        return true;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(items.length, 1));
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        const item = items[selectedIndex];
        if (item) command(item);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-editorial-bg/95 px-3 py-2 text-xs text-editorial-muted shadow-xl backdrop-blur-sm">
        No matching commands.
      </div>
    );
  }

  return (
    <div
      role="menu"
      aria-label="Slash commands"
      className="w-72 overflow-hidden rounded-lg border border-border bg-editorial-bg/95 text-sm shadow-xl backdrop-blur-sm"
    >
      <ul className="max-h-80 overflow-y-auto py-1">
        {items.map((item, idx) => {
          const active = idx === selectedIndex;
          return (
            <li key={slashItemKey(item)}>
              <button
                type="button"
                role="menuitem"
                className={cn(
                  "flex w-full items-start gap-3 px-3 py-2 text-left transition-colors",
                  active
                    ? "bg-gold/15 text-gold"
                    : "text-editorial-cream hover:bg-muted/40",
                )}
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => command(item)}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[11px] font-semibold uppercase tracking-wide",
                    active
                      ? "border-gold/50 bg-gold/10"
                      : "border-border/60 bg-muted/30 text-editorial-muted",
                  )}
                  aria-hidden
                >
                  /{item.trigger[0]}
                </span>
                <div className="min-w-0">
                  <div
                    className={cn(
                      "font-medium",
                      active ? "text-gold" : "text-editorial-cream",
                    )}
                  >
                    /{item.trigger}
                  </div>
                  <div className="text-xs leading-snug text-editorial-muted">
                    {item.description}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-border/50 px-3 py-1.5 text-[11px] text-editorial-muted">
        <kbd className="rounded border border-border/60 bg-card/40 px-1">↑↓</kbd>{" "}
        to navigate ·{" "}
        <kbd className="rounded border border-border/60 bg-card/40 px-1">
          Enter
        </kbd>{" "}
        to run ·{" "}
        <kbd className="rounded border border-border/60 bg-card/40 px-1">Esc</kbd>{" "}
        to close
      </div>
    </div>
  );
});
