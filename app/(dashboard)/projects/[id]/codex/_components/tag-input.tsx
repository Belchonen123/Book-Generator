"use client";

/**
 * Tag input — used for the aliases field on a codex entry.
 *
 * Semantics:
 *  - Enter or comma commits the current buffer as a new tag
 *  - Backspace on an empty buffer removes the trailing tag
 *  - Duplicates (case-insensitive) are rejected silently
 *  - Values are trimmed on commit
 */
import { useCallback, useRef, useState, type KeyboardEvent } from "react";

import { X } from "@/lib/lucide-icons";
import { cn } from "@/lib/utils/cn";

export type TagInputProps = {
  id?: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  maxTagLength?: number;
  maxTags?: number;
  disabled?: boolean;
  ariaDescribedBy?: string;
};

export function TagInput({
  id,
  value,
  onChange,
  placeholder = "Add alias and press Enter…",
  maxTagLength = 200,
  maxTags = 32,
  disabled = false,
  ariaDescribedBy,
}: TagInputProps) {
  const [buffer, setBuffer] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = useCallback(
    (raw: string) => {
      const next = raw.trim();
      if (!next) return false;
      if (next.length > maxTagLength) return false;
      if (value.length >= maxTags) return false;
      if (value.some((existing) => existing.toLowerCase() === next.toLowerCase())) {
        return false;
      }
      onChange([...value, next]);
      return true;
    },
    [maxTagLength, maxTags, onChange, value],
  );

  const removeAt = useCallback(
    (idx: number) => {
      onChange(value.filter((_, i) => i !== idx));
    },
    [onChange, value],
  );

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      if (buffer.trim()) {
        e.preventDefault();
        if (commit(buffer)) setBuffer("");
      }
      return;
    }
    if (e.key === "Backspace" && buffer === "" && value.length > 0) {
      e.preventDefault();
      removeAt(value.length - 1);
    }
  };

  const handleBlur = () => {
    if (buffer.trim()) {
      if (commit(buffer)) setBuffer("");
    }
  };

  return (
    <div
      className={cn(
        "flex min-h-11 flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5 text-sm",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
        disabled && "pointer-events-none opacity-60",
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((tag, idx) => (
        <span
          key={`${tag}-${idx}`}
          className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-xs text-editorial-cream"
        >
          {tag}
          <button
            type="button"
            className="rounded-full text-editorial-muted hover:text-editorial-cream"
            onClick={(e) => {
              e.stopPropagation();
              removeAt(idx);
            }}
            aria-label={`Remove ${tag}`}
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        </span>
      ))}
      <input
        id={id}
        ref={inputRef}
        className="min-w-[120px] flex-1 bg-transparent text-editorial-cream outline-none placeholder:text-editorial-muted"
        placeholder={value.length === 0 ? placeholder : ""}
        value={buffer}
        onChange={(e) => setBuffer(e.target.value)}
        onKeyDown={handleKey}
        onBlur={handleBlur}
        disabled={disabled}
        aria-describedby={ariaDescribedBy}
      />
    </div>
  );
}
