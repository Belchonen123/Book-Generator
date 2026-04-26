"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link2Off, X } from "@/lib/lucide-icons";

export type LinkPopoverProps = {
  open: boolean;
  initialHref: string | null;
  onClose: () => void;
  onApply: (href: string) => void;
  onUnlink: () => void;
};

function normaliseUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^(mailto:|tel:|https?:\/\/|\/\/|\/)/i.test(trimmed)) return trimmed;
  if (/^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(trimmed)) return `mailto:${trimmed}`;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

/**
 * Compact centered dialog for inserting or editing a link. We keep it DOM-level
 * (no Radix portal) so it composes cleanly with the floating bubble menu.
 */
export function LinkPopover({
  open,
  initialHref,
  onClose,
  onApply,
  onUnlink,
}: LinkPopoverProps) {
  const [value, setValue] = useState(initialHref ?? "");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setValue(initialHref ?? "");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [initialHref, open]);

  if (!open) return null;

  const submit = () => {
    const href = normaliseUrl(value);
    if (!href) {
      onClose();
      return;
    }
    onApply(href);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Link editor"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border/70 bg-card p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-editorial-cream">
            {initialHref ? "Edit link" : "Add link"}
          </p>
          <Button type="button" variant="ghost" size="sm" aria-label="Close" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            }
          }}
          placeholder="example.com or https://example.com"
          className="h-10"
        />
        <p className="mt-2 text-[11px] text-editorial-muted">
          We'll add <code className="text-editorial-cream">https://</code> if you don't.
          Use an email to create a <code className="text-editorial-cream">mailto:</code> link.
        </p>
        <div className="mt-4 flex items-center justify-between gap-2">
          {initialHref ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1 text-editorial-muted hover:text-red-300"
              onClick={() => {
                onUnlink();
              }}
            >
              <Link2Off className="h-4 w-4" aria-hidden />
              Remove link
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-gold text-editorial-bg hover:bg-gold/90"
              onClick={submit}
            >
              {initialHref ? "Update" : "Add link"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
