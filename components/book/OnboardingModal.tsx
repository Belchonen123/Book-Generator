"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles, X } from "@/lib/lucide-icons";
import { useRouter } from "next/navigation";

import { completeOnboardingAction } from "@/app/(dashboard)/dashboard/actions";
import { Button } from "@/components/ui/button";
import {
  responsiveModalBackdrop,
  responsiveModalPanel,
  responsiveModalRoot,
} from "@/lib/ui/responsive-modal";
import { cn } from "@/lib/utils/cn";

const WORKFLOW_STEPS = [
  { label: "Idea", detail: "Chat through your concept" },
  { label: "Outline", detail: "AI-structured chapters" },
  { label: "Chapters", detail: "Draft & edit in the studio" },
  { label: "Cover", detail: "DALL·E artwork for KDP" },
  { label: "Export", detail: "Word + publishing guide" },
];

type OnboardingModalProps = {
  open: boolean;
  onClose: () => void;
};

export function OnboardingModal({ open, onClose }: OnboardingModalProps) {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setSlide(0);
  }, [open]);

  const dismiss = useCallback(async () => {
    setBusy(true);
    try {
      await completeOnboardingAction();
      onClose();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }, [onClose, router]);

  const goNext = useCallback(() => {
    if (slide >= 3) {
      void dismiss();
      return;
    }
    setSlide((s) => s + 1);
  }, [dismiss, slide]);

  const goPrev = useCallback(() => {
    setSlide((s) => Math.max(0, s - 1));
  }, []);

  if (!open) return null;

  return (
    <div
      className={responsiveModalRoot("z-[110]")}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <button
        type="button"
        className={cn(responsiveModalBackdrop(), "bg-black/80")}
        aria-label="Close onboarding"
        disabled={busy}
        onClick={() => {
          if (!busy) void dismiss();
        }}
      />
      <div
        className={cn(
          responsiveModalPanel("max-w-lg border-border bg-editorial-bg p-6 sm:p-8"),
          "relative",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-md text-editorial-muted transition hover:bg-muted/40 hover:text-editorial-cream md:right-4 md:top-4 md:h-9 md:w-9"
          aria-label="Skip onboarding"
          disabled={busy}
          onClick={() => void dismiss()}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 flex justify-center gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 w-8 rounded-full transition-colors",
                i === slide ? "bg-gold" : "bg-border",
              )}
            />
          ))}
        </div>

        {slide === 0 ? (
          <div className="text-center">
            <div className="onboarding-illus mx-auto mb-6 flex h-36 w-36 items-center justify-center rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/20 via-card to-editorial-bg">
              <Sparkles className="h-14 w-14 text-gold onboarding-illus-sparkle" aria-hidden />
            </div>
            <h2 id="onboarding-title" className="font-serif text-2xl text-editorial-cream">
              Welcome to ChapterAI
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-editorial-muted">
              Your co-writer for long-form books—from messy idea to a manuscript you can upload to
              Amazon KDP. We handle structure, drafting, and export so you can focus on voice and
              story.
            </p>
          </div>
        ) : null}

        {slide === 1 ? (
          <div>
            <h2 className="text-center font-serif text-2xl text-editorial-cream">How it flows</h2>
            <p className="mt-2 text-center text-sm text-editorial-muted">
              Five beats from spark to publishable files.
            </p>
            <ol className="mt-8 space-y-4">
              {WORKFLOW_STEPS.map((step, i) => (
                <li
                  key={step.label}
                  className="flex gap-4 rounded-xl border border-border/60 bg-card/50 px-4 py-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/20 text-sm font-semibold text-gold">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium text-editorial-cream">{step.label}</p>
                    <p className="text-xs text-editorial-muted">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {slide === 2 ? (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-full border-2 border-dashed border-gold/50 bg-gold/5">
              <span className="font-serif text-4xl text-gold">✦</span>
            </div>
            <h2 className="font-serif text-2xl text-editorial-cream">All you need is an idea</h2>
            <p className="mt-3 text-sm leading-relaxed text-editorial-muted">
              No outline? No problem. Start with a paragraph, a trope list, or a voice note summary.
              ChapterAI helps you refine the premise, lock a chapter structure, and fill the pages
              one chapter at a time.
            </p>
          </div>
        ) : null}

        {slide === 3 ? (
          <div className="text-center">
            <h2 className="font-serif text-2xl text-editorial-cream">Plans</h2>
            <p className="mt-3 text-sm leading-relaxed text-editorial-muted">
              <strong className="text-editorial-cream">Free</strong> includes core writing, outlines,
              and exports with generous limits. <strong className="text-editorial-cream">Pro</strong>{" "}
              unlocks unlimited books, deeper chapter generation, and priority workflows.
            </p>
            <div className="mt-8 rounded-xl border border-gold/35 bg-gold/10 px-5 py-6">
              <p className="text-sm font-medium text-editorial-cream">Ready when you are</p>
              <p className="mt-1 text-xs text-editorial-muted">
                Start on Free—upgrade anytime from the dashboard.
              </p>
              <Button
                type="button"
                className="mt-5 w-full bg-gold font-semibold text-editorial-bg hover:bg-gold/90"
                disabled={busy}
                onClick={() => void dismiss()}
              >
                {busy ? "Saving…" : "Start for Free"}
              </Button>
              <a
                href="/#pricing"
                className="mt-3 inline-block text-xs text-gold underline-offset-4 hover:underline"
                onClick={() => void dismiss()}
              >
                Compare plans on the marketing site
              </a>
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-6">
          <Button
            type="button"
            variant="ghost"
            className="text-editorial-muted"
            disabled={busy}
            onClick={() => void dismiss()}
          >
            Skip
          </Button>
          <div className="flex gap-2">
            {slide > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-border"
                disabled={busy}
                onClick={goPrev}
              >
                <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
                Back
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              className="bg-gold text-editorial-bg hover:bg-gold/90"
              disabled={busy}
              onClick={() => void goNext()}
            >
              {slide >= 3 ? (
                "Done"
              ) : (
                <>
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
