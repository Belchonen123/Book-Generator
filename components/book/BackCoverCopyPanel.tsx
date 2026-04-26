"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { Copy, Eye, Loader2, Pencil, Save, Sparkles } from "@/lib/lucide-icons";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const MAX_BLURB_LEN = 3000;

export type BackCoverCopyPanelProps = {
  bookId: string;
  initialBlurb: string | null;
  onSaved?: (blurb: string | null) => void;
};

function trimOrNull(v: string): string | null {
  const t = v.trim();
  return t ? t : null;
}

export function BackCoverCopyPanel({
  bookId,
  initialBlurb,
  onSaved,
}: BackCoverCopyPanelProps) {
  const [blurb, setBlurb] = useState(initialBlurb ?? "");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState(false);

  const wordCount = useMemo(() => {
    const t = blurb.trim();
    if (!t) return 0;
    return t.split(/\s+/).filter(Boolean).length;
  }, [blurb]);

  const paragraphs = useMemo(() => {
    return blurb
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
  }, [blurb]);

  const runGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-back-cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }),
      });
      const data = (await res.json().catch(() => null)) as {
        blurb?: string;
        error?: string;
      } | null;
      if (!res.ok || !data?.blurb) {
        throw new Error(data?.error ?? "Could not generate back cover copy.");
      }
      setBlurb(data.blurb.slice(0, MAX_BLURB_LEN));
      toast.success("Back cover copy ready. Edit freely, then save.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate back cover copy.");
    } finally {
      setGenerating(false);
    }
  }, [bookId]);

  const runSave = useCallback(async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const nextBlurb = trimOrNull(blurb);
      const { error } = await supabase
        .from("books")
        .update({ back_cover_copy: nextBlurb })
        .eq("id", bookId);
      if (error) {
        const hint = /back_cover_copy|column/i.test(error.message)
          ? " — run supabase/migrations/016_book_metadata.sql"
          : "";
        toast.error(`Could not save back cover copy: ${error.message}${hint}`);
        console.error("[BackCoverCopyPanel] save failed", error);
        return;
      }
      toast.success("Back cover copy saved.");
      onSaved?.(nextBlurb);
    } catch (e) {
      console.error("[BackCoverCopyPanel] save threw", e);
      toast.error(e instanceof Error ? e.message : "Could not save back cover copy.");
    } finally {
      setSaving(false);
    }
  }, [blurb, bookId, onSaved]);

  const runCopy = useCallback(async () => {
    const t = blurb.trim();
    if (!t) {
      toast.error("Nothing to copy yet.");
      return;
    }
    try {
      await navigator.clipboard.writeText(t);
      setCopied(true);
      toast.success("Copied to clipboard.");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Clipboard is unavailable.");
    }
  }, [blurb]);

  const busy = generating || saving;

  return (
    <section
      aria-label="Back cover copy"
      className="rounded-xl border border-border bg-card/40 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">
            Back cover
          </p>
          <h2 className="mt-1 font-serif text-xl text-editorial-cream">
            Back of book copy
          </h2>
          <p className="mt-1 text-sm text-editorial-muted">
            A 150–200 word blurb for your KDP listing and paperback back cover.
            Separate paragraphs with a blank line.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="border-gold/40 text-gold hover:bg-gold/10"
          onClick={() => void runGenerate()}
          disabled={busy}
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Writing…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" aria-hidden />
              AI Generate
            </>
          )}
        </Button>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Editor or paragraph preview"
          className="inline-flex rounded-lg border border-border bg-editorial-bg/40 p-1 text-xs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={!preview}
            onClick={() => setPreview(false)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
              !preview
                ? "bg-gold/15 text-gold"
                : "text-editorial-muted hover:text-editorial-cream"
            }`}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Edit
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={preview}
            onClick={() => setPreview(true)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
              preview
                ? "bg-gold/15 text-gold"
                : "text-editorial-muted hover:text-editorial-cream"
            }`}
          >
            <Eye className="h-3.5 w-3.5" aria-hidden />
            Preview as paragraphs
          </button>
        </div>
        <span className="text-xs text-editorial-muted">
          {paragraphs.length} paragraph{paragraphs.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-3">
        {preview ? (
          <div
            aria-label="Back cover paragraph preview"
            className="min-h-[220px] rounded-lg border border-border bg-editorial-bg/60 px-4 py-3 text-sm leading-relaxed text-editorial-cream"
          >
            {paragraphs.length === 0 ? (
              <p className="text-editorial-muted">
                Nothing to preview yet — write or generate a blurb, then come back.
              </p>
            ) : (
              <div className="space-y-4">
                {paragraphs.map((p, i) => (
                  <p key={i} className="whitespace-pre-wrap">
                    {p}
                  </p>
                ))}
              </div>
            )}
          </div>
        ) : (
          <textarea
            value={blurb}
            onChange={(e) => setBlurb(e.target.value.slice(0, MAX_BLURB_LEN))}
            placeholder={
              generating
                ? "Drafting your blurb…"
                : "Your back cover copy will appear here. Separate paragraphs with a blank line — this textarea is fully editable."
            }
            rows={10}
            maxLength={MAX_BLURB_LEN}
            disabled={busy}
            className="min-h-[220px] w-full resize-y rounded-lg border border-border bg-editorial-bg/60 px-4 py-3 text-sm leading-relaxed text-editorial-cream placeholder:text-editorial-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 disabled:opacity-60"
          />
        )}
        <div className="mt-2 flex items-center justify-between text-xs text-editorial-muted">
          <span>
            {wordCount} word{wordCount === 1 ? "" : "s"}
            {wordCount > 0 && (wordCount < 120 || wordCount > 220) ? (
              <span className="ml-2 text-amber-400/90">
                aim for ~150–200
              </span>
            ) : null}
          </span>
          <span>
            {blurb.length} / {MAX_BLURB_LEN}
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => void runCopy()}
          disabled={!blurb.trim()}
        >
          <Copy className="h-4 w-4" aria-hidden />
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button
          type="button"
          className="bg-gold text-editorial-bg hover:bg-gold/90"
          onClick={() => void runSave()}
          disabled={busy}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Saving…
            </>
          ) : (
            <>
              <Save className="h-4 w-4" aria-hidden />
              Save blurb
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
