"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { X } from "@/lib/lucide-icons";

export type ShortcutRow = { keys: string[]; label: string };

const SECTIONS: { title: string; rows: ShortcutRow[] }[] = [
  {
    title: "Formatting",
    rows: [
      { keys: ["Ctrl/Cmd", "B"], label: "Bold" },
      { keys: ["Ctrl/Cmd", "I"], label: "Italic" },
      { keys: ["Ctrl/Cmd", "U"], label: "Underline" },
      { keys: ["Ctrl/Cmd", "Shift", "S"], label: "Strikethrough" },
      { keys: ["Ctrl/Cmd", "E"], label: "Inline code" },
      { keys: ["Ctrl/Cmd", "Shift", "K"], label: "Code block" },
      { keys: ["Ctrl/Cmd", "Alt", "1-4"], label: "Heading 1–4" },
      { keys: ["Ctrl/Cmd", "Shift", "7"], label: "Numbered list" },
      { keys: ["Ctrl/Cmd", "Shift", "8"], label: "Bulleted list" },
      { keys: ["Ctrl/Cmd", "Shift", "B"], label: "Blockquote" },
    ],
  },
  {
    title: "Editing",
    rows: [
      { keys: ["Ctrl/Cmd", "Z"], label: "Undo" },
      { keys: ["Ctrl/Cmd", "Shift", "Z"], label: "Redo" },
      { keys: ["Ctrl/Cmd", "F"], label: "Find & replace" },
      { keys: ["Ctrl/Cmd", "K"], label: "Add / edit link" },
      { keys: ["Enter"], label: "Next match (in Find)" },
      { keys: ["Shift", "Enter"], label: "Previous match (in Find)" },
    ],
  },
  {
    title: "View",
    rows: [
      { keys: ["?"], label: "Show this cheatsheet" },
      { keys: ["Esc"], label: "Close panels / dialogs" },
    ],
  },
  {
    title: "Series",
    rows: [
      { keys: ["Ctrl/Cmd", "Shift", "S"], label: "Open series dashboard (series books only)" },
      { keys: ["Ctrl/Cmd", "Shift", "A"], label: "Jump to arcs view" },
      { keys: ["Ctrl/Cmd", "Shift", "P"], label: "Open progressions timeline (character selected)" },
    ],
  },
];

export function ShortcutCheatsheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl border border-border/70 bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-serif text-lg text-gold">Keyboard shortcuts</p>
            <p className="text-xs text-editorial-muted">
              Press <kbd className="rounded bg-muted px-1.5 py-0.5 text-[11px]">?</kbd> anywhere in the
              editor to open this sheet. Press{" "}
              <kbd className="rounded bg-muted px-1.5 py-0.5 text-[11px]">Esc</kbd> to close.
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" aria-label="Close" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-editorial-muted">
                {section.title}
              </p>
              <dl className="mt-2 space-y-1.5">
                {section.rows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-3 text-sm text-editorial-cream"
                  >
                    <dt className="truncate">{row.label}</dt>
                    <dd className="flex shrink-0 items-center gap-1">
                      {row.keys.map((k, i) => (
                        <kbd
                          key={`${row.label}-${i}`}
                          className="rounded border border-border/70 bg-editorial-bg/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-editorial-muted"
                        >
                          {k}
                        </kbd>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
