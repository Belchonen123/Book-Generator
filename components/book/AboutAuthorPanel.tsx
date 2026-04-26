"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { Loader2, Save, Sparkles, UserRound } from "@/lib/lucide-icons";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const MAX_ABOUT_LEN = 1500;

export type AboutAuthorPanelProps = {
  bookId: string;
  initialAboutAuthor: string | null;
  /** Pulled from the user's profile — used for the "Use my profile bio" prefill. */
  profileBio: string | null;
  /** Shown next to the avatar when the field is empty (helps the user recognize who it's about). */
  profilePenName: string | null;
  profileFullName: string | null;
  profileAvatarUrl: string | null;
  onSaved?: (next: string | null) => void;
};

function trimOrNull(v: string): string | null {
  const t = v.trim();
  return t ? t : null;
}

export function AboutAuthorPanel({
  bookId,
  initialAboutAuthor,
  profileBio,
  profilePenName,
  profileFullName,
  profileAvatarUrl,
  onSaved,
}: AboutAuthorPanelProps) {
  const [value, setValue] = useState(initialAboutAuthor ?? "");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const wordCount = useMemo(() => {
    const t = value.trim();
    if (!t) return 0;
    return t.split(/\s+/).filter(Boolean).length;
  }, [value]);

  const displayName =
    profilePenName?.trim() || profileFullName?.trim() || "your profile";

  const bioAvailable = Boolean(profileBio?.trim());

  const runPrefillFromProfile = useCallback(() => {
    if (!profileBio?.trim()) {
      toast.error(
        "Your profile bio is empty — add one on the Profile page to use this shortcut.",
      );
      return;
    }
    setValue(profileBio.trim().slice(0, MAX_ABOUT_LEN));
    toast.success("Pulled your bio from profile. Edit freely, then save.");
  }, [profileBio]);

  const runGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-about-author", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }),
      });
      const data = (await res.json().catch(() => null)) as {
        aboutAuthor?: string;
        error?: string;
      } | null;
      if (!res.ok || !data?.aboutAuthor) {
        throw new Error(data?.error ?? "Could not generate an About the Author paragraph.");
      }
      setValue(data.aboutAuthor.slice(0, MAX_ABOUT_LEN));
      toast.success("About the Author drafted. Edit freely, then save.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not generate an About the Author paragraph.",
      );
    } finally {
      setGenerating(false);
    }
  }, [bookId]);

  const runSave = useCallback(async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const next = trimOrNull(value);
      const { error } = await supabase
        .from("books")
        .update({ about_author: next })
        .eq("id", bookId);
      if (error) {
        const hint = /about_author|column/i.test(error.message)
          ? " — run supabase/migrations/021_book_about_author.sql"
          : "";
        toast.error(`Could not save About the Author: ${error.message}${hint}`);
        console.error("[AboutAuthorPanel] save failed", error);
        return;
      }
      toast.success("About the Author saved.");
      onSaved?.(next);
    } catch (e) {
      console.error("[AboutAuthorPanel] save threw", e);
      toast.error(e instanceof Error ? e.message : "Could not save About the Author.");
    } finally {
      setSaving(false);
    }
  }, [bookId, onSaved, value]);

  const busy = generating || saving;

  return (
    <section
      aria-label="About the author"
      className="rounded-xl border border-border bg-card/40 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-editorial-bg/60">
            {profileAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profileAvatarUrl}
                alt={`Avatar for ${displayName}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <UserRound className="h-5 w-5 text-editorial-muted" aria-hidden />
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold">
              About the author
            </p>
            <h2 className="mt-1 font-serif text-xl text-editorial-cream">
              Short author bio for this book
            </h2>
            <p className="mt-1 text-sm text-editorial-muted">
              A 60–110 word paragraph shown on the paperback back cover and your KDP
              listing. Defaults from {displayName} if you have one set.
            </p>
          </div>
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

      <div className="mt-5">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, MAX_ABOUT_LEN))}
          placeholder={
            generating
              ? "Drafting your About the Author…"
              : "Write a short third-person bio here — or let AI draft one from your profile and this book."
          }
          rows={8}
          maxLength={MAX_ABOUT_LEN}
          disabled={busy}
          className="min-h-[180px] w-full resize-y rounded-lg border border-border bg-editorial-bg/60 px-4 py-3 text-sm leading-relaxed text-editorial-cream placeholder:text-editorial-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 disabled:opacity-60"
        />
        <div className="mt-2 flex items-center justify-between text-xs text-editorial-muted">
          <span>
            {wordCount} word{wordCount === 1 ? "" : "s"}
            {wordCount > 0 && (wordCount < 40 || wordCount > 140) ? (
              <span className="ml-2 text-amber-400/90">aim for ~60–110</span>
            ) : null}
          </span>
          <span>
            {value.length} / {MAX_ABOUT_LEN}
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={runPrefillFromProfile}
          disabled={busy || !bioAvailable}
          title={
            bioAvailable
              ? "Replace the text with your profile bio"
              : "Add a bio on the Profile page first"
          }
        >
          <UserRound className="h-4 w-4" aria-hidden />
          Use my profile bio
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
              Save bio
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
