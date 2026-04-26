"use client";

import { ChevronRight, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { markBookCompleteAction } from "@/app/(dashboard)/dashboard/series/summarize/actions";
import { Button } from "@/components/ui/button";
import {
  parseRefinedIdeaValue,
  REFINED_IDEA_INVALID_USER_MESSAGE,
} from "@/lib/refined-idea/parse";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import type { Json } from "@/types/database.types";

const LOADING_MESSAGES = [
  "Designing your cover…",
  "Painting the scene…",
  "Almost there…",
] as const;

function displayPremise(refinedIdea: Json | null): string {
  const p = parseRefinedIdeaValue(refinedIdea);
  if (!p.success) {
    return REFINED_IDEA_INVALID_USER_MESSAGE;
  }
  if (!p.data) {
    return "Add a refined idea on the idea step to give the cover more context — or rely on title and genre.";
  }
  const b = p.data;
  const line = (b.core_premise ?? b.premise ?? "").trim();
  if (line) {
    return line.length > 800 ? `${line.slice(0, 800)}…` : line;
  }
  const blob = JSON.stringify(b);
  return blob.length > 800 ? `${blob.slice(0, 800)}…` : blob;
}

export type CoverGeneratorProps = {
  bookId: string;
  bookTitle: string;
  genre: string | null;
  refinedIdea: Json | null;
  tone: string | null;
  initialCoverUrl: string | null;
  initialCoverPrompt: string | null;
};

export function CoverGenerator({
  bookId,
  bookTitle,
  genre,
  refinedIdea,
  tone,
  initialCoverUrl,
  initialCoverPrompt,
}: CoverGeneratorProps) {
  const router = useRouter();
  const [coverUrl, setCoverUrl] = useState<string | null>(initialCoverUrl);
  const [coverPrompt, setCoverPrompt] = useState<string | null>(initialCoverPrompt);
  const [imageKey, setImageKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);
  const [continueBusy, setContinueBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCoverUrl(initialCoverUrl);
    setCoverPrompt(initialCoverPrompt);
    setImageKey((k) => k + 1);
  }, [initialCoverUrl, initialCoverPrompt]);

  useEffect(() => {
    if (!loading) return;
    const id = window.setInterval(() => {
      setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => window.clearInterval(id);
  }, [loading]);

  const runGenerate = useCallback(async () => {
    setLoading(true);
    setMsgIndex(0);
    try {
      const res = await fetch("/api/ai/generate-cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }),
      });
      const data = (await res.json().catch(() => null)) as {
        coverUrl?: string;
        prompt?: string;
        error?: string;
      } | null;
      if (!res.ok || !data?.coverUrl) {
        throw new Error(data?.error ?? "Cover generation failed.");
      }
      setCoverUrl(data.coverUrl);
      setCoverPrompt(data.prompt ?? null);
      setImageKey((k) => k + 1);
      toast.success("Cover ready.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cover generation failed.");
    } finally {
      setLoading(false);
    }
  }, [bookId, router]);

  const onOwnCover = useCallback(async (file: File) => {
    const okType = file.type === "image/png" || file.type === "image/jpeg";
    if (!okType) {
      toast.error("Please upload a PNG or JPG file.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      toast.error("Image must be 12MB or smaller.");
      return;
    }
    setUploadBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error("You need to be signed in to upload.");
        return;
      }
      const path = `${user.id}/${bookId}/cover.png`;
      const { error: upErr } = await supabase.storage.from("covers").upload(path, file, {
        contentType: file.type,
        upsert: true,
      });
      if (upErr) {
        toast.error("Upload failed. Check storage permissions.");
        return;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("covers").getPublicUrl(path);
      const { error: dbErr } = await supabase
        .from("books")
        .update({
          cover_url: publicUrl,
          cover_prompt: "Author-uploaded cover",
        })
        .eq("id", bookId);
      if (dbErr) {
        toast.error("Could not save cover URL.");
        return;
      }
      setCoverUrl(publicUrl);
      setCoverPrompt("Author-uploaded cover");
      setImageKey((k) => k + 1);
      toast.success("Cover uploaded.");
      router.refresh();
    } catch {
      toast.error("Upload failed.");
    } finally {
      setUploadBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [bookId, router]);

  const continueToExport = useCallback(async () => {
    setContinueBusy(true);
    try {
      /* Route through the server action so that books-in-a-series also get
       * their Prompt-16 prior-book summary generated as part of the same
       * transition. The action is best-effort: a failed summary won't
       * block the export flow. */
      const res = await markBookCompleteAction(bookId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.seriesSummaryQueued) {
        toast.success("Book complete. Series summary updated.");
      }
      router.push(`/projects/${bookId}/export`);
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setContinueBusy(false);
    }
  }, [bookId, router]);

  const premise = displayPremise(refinedIdea);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <header className="space-y-2 border-b border-border/60 pb-6">
        <h1 className="font-serif text-3xl text-gold">{bookTitle}</h1>
        <p className="text-sm text-editorial-muted">
          <span className="font-medium text-editorial-cream">Genre:</span>{" "}
          {genre?.trim() || "—"}
          {tone ? (
            <>
              {" "}
              <span className="mx-1 text-border">·</span>{" "}
              <span className="font-medium text-editorial-cream">Tone:</span> {tone}
            </>
          ) : null}
        </p>
        <p className="text-sm leading-relaxed text-editorial-cream/90">{premise}</p>
      </header>

      <div className="mt-8 flex flex-col items-center gap-8">
        {!coverUrl && !loading ? (
          <Button
            type="button"
            className="h-auto gap-2 bg-gold px-10 py-6 text-lg font-semibold text-editorial-bg hover:bg-gold/90"
            onClick={() => void runGenerate()}
          >
            <Sparkles className="h-6 w-6" aria-hidden />
            Generate cover
          </Button>
        ) : null}

        {loading ? (
          <div className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="h-12 w-12 animate-spin text-gold" aria-hidden />
            <p className="min-h-[1.5rem] text-center text-sm text-editorial-muted transition-all">
              {LOADING_MESSAGES[msgIndex]}
            </p>
          </div>
        ) : null}

        {coverUrl && !loading ? (
          <div className="flex w-full flex-col items-center gap-6">
            <div className="w-full max-w-md overflow-hidden rounded-lg border border-border/60 bg-black shadow-xl">
              <p className="border-b border-border/50 bg-card/60 px-3 py-2 text-center text-xs text-editorial-muted">
                Same image file you&apos;ll upload to KDP — flat cover, not a 3D mockup
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={imageKey}
                src={`${coverUrl}${coverUrl.includes("?") ? "&" : "?"}v=${imageKey}`}
                alt={`Front cover artwork for ${bookTitle}`}
                className="block h-auto w-full object-cover"
              />
            </div>

            {coverPrompt ? (
              <details className="w-full max-w-xl rounded-lg border border-border/50 bg-card/40 px-3 py-2 text-left">
                <summary className="cursor-pointer list-none text-xs text-editorial-muted marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="underline-offset-2 hover:underline">Image prompt used</span>
                </summary>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-editorial-muted">
                  {coverPrompt}
                </p>
              </details>
            ) : null}

            <div className="flex w-full max-w-xl flex-col items-center gap-3">
              <p className="text-center text-xs text-editorial-muted">
                Edit the <span className="text-editorial-cream">title</span>,{" "}
                <span className="text-editorial-cream">subtitle</span>, or{" "}
                <span className="text-editorial-cream">author by-line</span> on the right —
                they&apos;ll be baked into the image on your next regenerate.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="border-gold/40 text-gold hover:bg-gold/10"
                  disabled={loading}
                  onClick={() => void runGenerate()}
                >
                  Regenerate
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onOwnCover(f);
          }}
        />
        <button
          type="button"
          className={cn(
            "text-sm text-editorial-muted underline-offset-4 transition-colors hover:text-gold hover:underline",
            uploadBusy && "pointer-events-none opacity-60",
          )}
          disabled={uploadBusy || loading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploadBusy ? "Uploading…" : "I'll use my own cover"}
        </button>
      </div>

      <div className="mt-12 flex justify-center border-t border-border/50 pt-8">
        <Button
          type="button"
          className="h-auto gap-2 bg-gold px-8 py-4 text-base font-semibold text-editorial-bg hover:bg-gold/90"
          disabled={continueBusy || !coverUrl}
          onClick={() => void continueToExport()}
        >
          {continueBusy ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : (
            <>
              Continue to export
              <ChevronRight className="h-5 w-5" aria-hidden />
            </>
          )}
        </Button>
      </div>

      <p className="mt-6 text-center text-xs text-editorial-muted">
        Prefer to tweak the manuscript first?{" "}
        <Link href={`/projects/${bookId}/outline`} className="text-gold hover:underline">
          Back to outline
        </Link>
      </p>
    </div>
  );
}
