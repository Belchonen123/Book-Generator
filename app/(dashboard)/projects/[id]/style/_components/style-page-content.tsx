"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";

import { updateStyleExamples } from "../actions";

/** Soft thresholds — the UI only warns outside these; DB cap is far higher. */
const WORDS_LOWER_TARGET = 500;
const WORDS_LOWER_WARN = 300;
const WORDS_UPPER_TARGET = 2_000;
const WORDS_UPPER_WARN = 3_000;

/** Hard cap that mirrors the DB CHECK (~3,500 words). */
const MAX_EXAMPLES_CHARS = 20_000;
const MAX_INSTRUCTIONS_CHARS = 1_000;

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) {
    return 0;
  }
  return trimmed.split(/\s+/).filter(Boolean).length;
}

type StylePageContentProps = {
  bookId: string;
  bookTitle: string;
  initialStyleExamples: string;
  initialStyleInstructions: string;
};

export function StylePageContent({
  bookId,
  bookTitle,
  initialStyleExamples,
  initialStyleInstructions,
}: StylePageContentProps) {
  const [styleExamples, setStyleExamples] = useState(initialStyleExamples);
  const [styleInstructions, setStyleInstructions] = useState(
    initialStyleInstructions,
  );
  const [savedSnapshot, setSavedSnapshot] = useState({
    examples: initialStyleExamples,
    instructions: initialStyleInstructions,
  });
  const [isPending, startTransition] = useTransition();

  const examplesWords = useMemo(() => countWords(styleExamples), [styleExamples]);
  const examplesChars = styleExamples.length;
  const instructionsChars = styleInstructions.length;

  const trimmedExamples = styleExamples.trim();

  const lengthWarning: { tone: "warn" | "error"; message: string } | null = (() => {
    if (trimmedExamples.length === 0) {
      return null;
    }
    if (examplesWords < WORDS_LOWER_WARN) {
      return {
        tone: "warn",
        message:
          "Shorter samples produce weaker voice matching. Aim for at least 500 words.",
      };
    }
    if (examplesWords > WORDS_UPPER_WARN) {
      return {
        tone: "warn",
        message:
          "Longer samples waste tokens without improving quality. Trim toward 2,000 words or fewer.",
      };
    }
    if (examplesChars > MAX_EXAMPLES_CHARS) {
      return {
        tone: "error",
        message: `Sample is over the ${MAX_EXAMPLES_CHARS.toLocaleString()} character cap. Trim it before saving.`,
      };
    }
    return null;
  })();

  const isDirty =
    styleExamples.trim() !== savedSnapshot.examples.trim() ||
    styleInstructions.trim() !== savedSnapshot.instructions.trim();

  const hasHardError = lengthWarning?.tone === "error";
  const canSave = isDirty && !hasHardError && !isPending;

  function handleSave() {
    if (!canSave) {
      return;
    }

    const nextExamples = styleExamples;
    const nextInstructions = styleInstructions;

    startTransition(async () => {
      try {
        const result = await updateStyleExamples(
          bookId,
          nextExamples,
          nextInstructions,
        );
        if (!result.success) {
          toast.error(result.error ?? "Could not save voice & style.");
          return;
        }
        setSavedSnapshot({
          examples: nextExamples.trim(),
          instructions: nextInstructions.trim(),
        });
        toast.success(
          nextExamples.trim().length > 0
            ? "Voice & Style saved. Future AI generations will match this sample."
            : "Voice & Style cleared. Future AI generations will use default voice.",
        );
      } catch {
        toast.error("Something went wrong saving Voice & Style.");
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-editorial-muted">
          Project · {bookTitle}
        </p>
        <h1 className="mt-1 font-serif text-3xl text-editorial-cream sm:text-4xl">
          Voice &amp; Style
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-editorial-muted">
          Paste 500–2,000 words of prose in the voice you want. Your own writing, a
          favorite author, or a chapter you like from another book. The AI will
          match the rhythm, vocabulary, and feel.
        </p>
      </header>

      <section className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <Label
              htmlFor="style-examples"
              className="font-serif text-lg text-editorial-cream"
            >
              Style examples
            </Label>
            <span
              className={cn(
                "text-xs tabular-nums",
                examplesWords >= WORDS_LOWER_TARGET &&
                  examplesWords <= WORDS_UPPER_TARGET
                  ? "text-emerald-400"
                  : "text-editorial-muted",
              )}
              aria-live="polite"
            >
              {examplesWords.toLocaleString()} words ·{" "}
              {examplesChars.toLocaleString()} characters
            </span>
          </div>

          <Textarea
            id="style-examples"
            value={styleExamples}
            onChange={(e) => setStyleExamples(e.target.value)}
            maxLength={MAX_EXAMPLES_CHARS}
            placeholder="Paste 500–2,000 words of prose here. The AI will emulate the rhythm, vocabulary, and register — it won't copy the words."
            className="min-h-[220px] font-serif text-[15px] leading-relaxed"
            aria-describedby="style-examples-help"
          />

          <p
            id="style-examples-help"
            className="text-xs leading-relaxed text-editorial-muted"
          >
            Target 500–2,000 words. We cap at roughly 3,500 words to keep prompt
            cost reasonable. Leave empty to use the default voice.
          </p>

          {lengthWarning ? (
            <p
              role={lengthWarning.tone === "error" ? "alert" : undefined}
              className={cn(
                "text-xs leading-relaxed",
                lengthWarning.tone === "error"
                  ? "text-rose-400"
                  : "text-amber-400",
              )}
            >
              {lengthWarning.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <Label
              htmlFor="style-instructions"
              className="font-serif text-lg text-editorial-cream"
            >
              Style instructions{" "}
              <span className="ml-1 text-xs font-sans font-normal text-editorial-muted">
                Optional
              </span>
            </Label>
            <span className="text-xs tabular-nums text-editorial-muted">
              {instructionsChars.toLocaleString()} / {MAX_INSTRUCTIONS_CHARS.toLocaleString()}
            </span>
          </div>

          <Textarea
            id="style-instructions"
            value={styleInstructions}
            onChange={(e) => setStyleInstructions(e.target.value)}
            maxLength={MAX_INSTRUCTIONS_CHARS}
            placeholder='e.g. "Match this voice but keep the dialogue tighter and less ornate."'
            rows={3}
            className="min-h-[90px]"
            aria-describedby="style-instructions-help"
          />

          <p
            id="style-instructions-help"
            className="text-xs leading-relaxed text-editorial-muted"
          >
            A one-line steering note. Added alongside the sample so the model
            knows how to weight it.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-6">
          <Button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            loading={isPending}
          >
            Save voice &amp; style
          </Button>
          {isDirty ? (
            <p className="text-xs text-editorial-muted">
              Unsaved changes — future AI generations will still use the last
              saved version until you save.
            </p>
          ) : (
            <p className="text-xs text-editorial-muted">
              {savedSnapshot.examples.trim().length > 0
                ? "Saved — this voice is applied to every prose generation in this project."
                : "No style anchor set. Paste a sample above to turn it on."}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
