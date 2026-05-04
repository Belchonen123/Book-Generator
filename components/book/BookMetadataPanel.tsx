"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Loader2, Save, Sparkles } from "@/lib/lucide-icons";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const MAX_TITLE_LEN = 160;
const MAX_SUBTITLE_LEN = 240;
const MAX_AUTHOR_LEN = 160;

export type BookMetadataPanelProps = {
  bookId: string;
  initialTitle: string;
  initialSubtitle: string | null;
  initialAuthorDisplayName: string | null;
  onSaved?: (next: {
    title: string;
    subtitle: string | null;
    authorDisplayName: string | null;
  }) => void;
  onDraftChange?: (next: {
    title: string;
    subtitle: string | null;
    authorDisplayName: string | null;
  }) => void;
};

const FIELD_CLASS =
  "w-full rounded-lg border border-border bg-editorial-bg/60 px-3 py-2 text-sm text-editorial-cream placeholder:text-editorial-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 disabled:opacity-60";

function trimOrNull(v: string): string | null {
  const t = v.trim();
  return t ? t : null;
}

export function BookMetadataPanel({
  bookId,
  initialTitle,
  initialSubtitle,
  initialAuthorDisplayName,
  onSaved,
  onDraftChange,
}: BookMetadataPanelProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [subtitle, setSubtitle] = useState(initialSubtitle ?? "");
  const [authorDisplayName, setAuthorDisplayName] = useState(
    initialAuthorDisplayName ?? "",
  );
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    onDraftChange?.({
      title,
      subtitle: trimOrNull(subtitle),
      authorDisplayName: trimOrNull(authorDisplayName),
    });
  }, [authorDisplayName, onDraftChange, subtitle, title]);

  const runGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-book-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }),
      });
      const data = (await res.json().catch(() => null)) as {
        title?: string;
        subtitle?: string;
        author_tagline?: string;
        error?: string;
      } | null;
      if (!res.ok || !data) {
        throw new Error(data?.error ?? "Could not generate metadata.");
      }
      if (data.title) setTitle(data.title.slice(0, MAX_TITLE_LEN));
      if (data.subtitle) setSubtitle(data.subtitle.slice(0, MAX_SUBTITLE_LEN));
      if (data.author_tagline)
        setAuthorDisplayName(data.author_tagline.slice(0, MAX_AUTHOR_LEN));
      toast.success("Metadata suggestions ready. Edit freely, then save.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate metadata.");
    } finally {
      setGenerating(false);
    }
  }, [bookId]);

  const runSave = useCallback(async () => {
    const t = title.trim();
    if (!t) {
      toast.error("Title cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const nextSubtitle = trimOrNull(subtitle);
      const nextAuthor = trimOrNull(authorDisplayName);
      const { error } = await supabase
        .from("books")
        .update({
          title: t,
          subtitle: nextSubtitle,
          author_display_name: nextAuthor,
        })
        .eq("id", bookId);
      if (error) {
        // Surface the real DB error (common culprit: migration 016 not applied,
        // so `subtitle` / `author_display_name` don't exist yet).
        const hint = /subtitle|author_display_name|column/i.test(error.message)
          ? " — run supabase/migrations/016_book_metadata.sql"
          : "";
        toast.error(`Could not save metadata: ${error.message}${hint}`);
        console.error("[BookMetadataPanel] save failed", error);
        return;
      }
      toast.success("Book metadata saved.");
      onSaved?.({
        title: t,
        subtitle: nextSubtitle,
        authorDisplayName: nextAuthor,
      });
      router.refresh();
    } catch (e) {
      console.error("[BookMetadataPanel] save threw", e);
      toast.error(e instanceof Error ? e.message : "Could not save metadata.");
    } finally {
      setSaving(false);
    }
  }, [authorDisplayName, bookId, onSaved, router, subtitle, title]);

  const busy = generating || saving;

  return (
    <section
      aria-label="Book metadata"
      className="rounded-xl border border-border bg-card/40 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">
            Publishing metadata
          </p>
          <h2 className="mt-1 font-serif text-xl text-editorial-cream">
            Title, subtitle &amp; author
          </h2>
          <p className="mt-1 text-sm text-editorial-muted">
            Shown on the cover and across export files. Tweak what AI suggests — you own these.
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
              Generating…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" aria-hidden />
              AI Generate
            </>
          )}
        </Button>
      </div>

      <div className="mt-5 grid gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-editorial-cream">Title</span>
          <input
            type="text"
            className={FIELD_CLASS}
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE_LEN))}
            placeholder="Your book's title"
            maxLength={MAX_TITLE_LEN}
            disabled={busy}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-editorial-cream">Subtitle</span>
          <input
            type="text"
            className={FIELD_CLASS}
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value.slice(0, MAX_SUBTITLE_LEN))}
            placeholder="A short promise of the reading experience"
            maxLength={MAX_SUBTITLE_LEN}
            disabled={busy}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-editorial-cream">Author name</span>
          <input
            type="text"
            className={FIELD_CLASS}
            value={authorDisplayName}
            onChange={(e) =>
              setAuthorDisplayName(e.target.value.slice(0, MAX_AUTHOR_LEN))
            }
            placeholder="As you want it printed on the cover"
            maxLength={MAX_AUTHOR_LEN}
            disabled={busy}
          />
        </label>
      </div>

      <div className="mt-5 flex justify-end">
        <Button
          type="button"
          className="bg-gold text-editorial-bg hover:bg-gold/90"
          onClick={() => void runSave()}
          disabled={busy || !title.trim()}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Saving…
            </>
          ) : (
            <>
              <Save className="h-4 w-4" aria-hidden />
              Save metadata
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
