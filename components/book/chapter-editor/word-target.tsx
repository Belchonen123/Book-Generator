"use client";

import { useEffect, useState } from "react";

import { Target } from "@/lib/lucide-icons";
import { cn } from "@/lib/utils/cn";

export const WORD_TARGET_MIN = 100;
export const WORD_TARGET_MAX = 20_000;

function clampTarget(value: number | null): number | null {
  if (value == null || Number.isNaN(value)) return null;
  const rounded = Math.round(value);
  if (rounded < WORD_TARGET_MIN) return WORD_TARGET_MIN;
  if (rounded > WORD_TARGET_MAX) return WORD_TARGET_MAX;
  return rounded;
}

export type WordTargetProps = {
  target: number | null;
  currentWords: number;
  disabled?: boolean;
  onSave: (next: number | null) => void;
};

export function WordTarget({ target, currentWords, disabled, onSave }: WordTargetProps) {
  const [raw, setRaw] = useState(target != null ? String(target) : "");

  useEffect(() => {
    setRaw(target != null ? String(target) : "");
  }, [target]);

  const commit = () => {
    const trimmed = raw.trim();
    if (!trimmed) {
      if (target != null) onSave(null);
      return;
    }
    const parsed = Number(trimmed.replace(/[,\s]/g, ""));
    if (Number.isNaN(parsed)) {
      setRaw(target != null ? String(target) : "");
      return;
    }
    const next = clampTarget(parsed);
    setRaw(next != null ? String(next) : "");
    if (next !== target) onSave(next);
  };

  const pct =
    target && target > 0
      ? Math.min(100, Math.round((currentWords / target) * 100))
      : 0;
  const hit = target != null && currentWords >= target;

  return (
    <div className="flex items-center gap-2">
      <Target className="h-4 w-4 shrink-0 text-editorial-muted" aria-hidden />
      <label className="text-xs text-editorial-muted">
        Target
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="—"
          disabled={disabled}
          aria-label={`Target word count (${WORD_TARGET_MIN}–${WORD_TARGET_MAX})`}
          className="ml-1.5 w-16 rounded-md border border-border/60 bg-editorial-bg/70 px-1.5 py-0.5 text-right text-xs text-editorial-cream focus:outline-none focus:ring-1 focus:ring-gold/50 disabled:opacity-60"
        />
        <span className="ml-1 text-[10px] uppercase tracking-wide">words</span>
      </label>
      {target != null ? (
        <div
          className="relative h-1.5 w-32 overflow-hidden rounded-full bg-muted/40"
          aria-label={`Progress ${pct}%`}
        >
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ease-out",
              hit ? "bg-gold" : "bg-gold/60",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}
      {target != null ? (
        <span
          className={cn(
            "text-[11px] tabular-nums text-editorial-muted",
            hit && "font-semibold text-gold",
          )}
        >
          {currentWords.toLocaleString()} / {target.toLocaleString()}
        </span>
      ) : null}
    </div>
  );
}
