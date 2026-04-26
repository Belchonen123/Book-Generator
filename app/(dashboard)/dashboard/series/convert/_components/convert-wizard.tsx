"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
} from "@/lib/lucide-icons";
import { cn } from "@/lib/utils/cn";
import type { BookStatusDb } from "@/types/database.types";

import {
  executeSeriesConversionAction,
  previewSeriesConversionAction,
  type ConversionCodexGroup,
  type ConversionPreview,
} from "../actions";

import { SelectBooksStep } from "./step-select-books";
import { ReviewCodexStep, type MergeDecision } from "./step-review-codex";
import { ConfirmStep } from "./step-confirm";

export type StandaloneBookRow = {
  id: string;
  title: string;
  subtitle: string | null;
  cover_url: string | null;
  status: BookStatusDb;
  word_count: number;
  chapterCount: number;
  codexCount: number;
  updated_at: string;
};

type Step = 1 | 2 | 3;

const STEPS: { id: Step; label: string }[] = [
  { id: 1, label: "Select books" },
  { id: 2, label: "Review & merge codex" },
  { id: 3, label: "Confirm" },
];

/**
 * Client orchestrator for the three-step "convert to series" wizard.
 *
 * State model:
 *   - `step`              — which panel is visible.
 *   - `orderedBookIds`    — reading order; preserved across step changes.
 *   - `seriesName` / desc — entered on the confirm step, also seeded on
 *                           step 2 so the user sees a running preview.
 *   - `preview`           — cached codex-diff; refetched only when the
 *                           selection changes.
 *   - `decisionsByKey`    — per-group merge choice ("merge" | "keep") +
 *                           canonical entry id.
 *
 * The preview and execute actions both re-validate input on the server,
 * so tampering with this state can never produce a malformed write.
 */
export function ConvertWizard({ books }: { books: StandaloneBookRow[] }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [orderedBookIds, setOrderedBookIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<ConversionPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [decisionsByKey, setDecisionsByKey] = useState<Map<string, MergeDecision>>(
    new Map(),
  );
  const [seriesName, setSeriesName] = useState("");
  const [seriesDescription, setSeriesDescription] = useState("");
  const [isPreviewPending, startPreview] = useTransition();
  const [isExecutePending, startExecute] = useTransition();

  const selectedBooks = useMemo(() => {
    const byId = new Map(books.map((b) => [b.id, b]));
    return orderedBookIds
      .map((id) => byId.get(id))
      .filter((b): b is StandaloneBookRow => Boolean(b));
  }, [books, orderedBookIds]);

  const totalWords = useMemo(
    () => selectedBooks.reduce((acc, b) => acc + b.word_count, 0),
    [selectedBooks],
  );
  const totalChapters = useMemo(
    () => selectedBooks.reduce((acc, b) => acc + b.chapterCount, 0),
    [selectedBooks],
  );

  const canAdvanceFromStep1 = orderedBookIds.length >= 2;

  const goToStep2 = () => {
    if (!canAdvanceFromStep1) return;
    setPreviewError(null);
    startPreview(async () => {
      const res = await previewSeriesConversionAction(orderedBookIds);
      if (!res.ok) {
        setPreviewError(res.error);
        toast.error(res.error);
        return;
      }
      setPreview(res.preview);
      // Default every group to "merge" with the entry that has the
      // longest description as the canonical (richest information wins).
      const next = new Map<string, MergeDecision>();
      for (const g of res.preview.mergeGroups) {
        const richest = pickRichestInstance(g);
        next.set(g.groupKey, {
          groupKey: g.groupKey,
          action: "merge",
          canonicalEntryId: richest.entryId,
        });
      }
      setDecisionsByKey(next);
      // Default the series name to something reasonable: the shortest
      // common prefix of the selected titles, falling back to "New series".
      if (!seriesName.trim()) {
        const guess = guessSeriesName(selectedBooks.map((b) => b.title));
        setSeriesName(guess);
      }
      setStep(2);
    });
  };

  const goToStep3 = () => {
    // Validate: every "merge" decision needs a canonical entry.
    if (preview) {
      for (const g of preview.mergeGroups) {
        const d = decisionsByKey.get(g.groupKey);
        if (d?.action === "merge" && !d.canonicalEntryId) {
          toast.error(`Choose a canonical version for "${g.displayName}".`);
          return;
        }
      }
    }
    setStep(3);
  };

  const submit = () => {
    if (!seriesName.trim()) {
      toast.error("Give your series a name before converting.");
      return;
    }
    startExecute(async () => {
      const res = await executeSeriesConversionAction({
        seriesName: seriesName.trim(),
        seriesDescription: seriesDescription.trim() || null,
        bookIds: orderedBookIds,
        mergeDecisions: Array.from(decisionsByKey.values()).map((d) => ({
          groupKey: d.groupKey,
          action: d.action,
          canonicalEntryId: d.canonicalEntryId ?? null,
        })),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `Series created. ${res.summary.booksLinked} books linked${
          res.summary.entriesMerged > 0
            ? `, ${res.summary.entriesMerged} codex entries merged`
            : ""
        }.`,
      );
      router.push(`/dashboard/series/${res.seriesId}`);
      router.refresh();
    });
  };

  return (
    <div className="mt-8">
      <Stepper current={step} />

      <div className="mt-6">
        {step === 1 ? (
          <SelectBooksStep
            books={books}
            orderedBookIds={orderedBookIds}
            onChange={setOrderedBookIds}
            totalWords={totalWords}
            totalChapters={totalChapters}
          />
        ) : null}

        {step === 2 ? (
          <ReviewCodexStep
            preview={preview}
            previewError={previewError}
            isLoading={isPreviewPending && !preview}
            seriesName={seriesName}
            onSeriesNameChange={setSeriesName}
            seriesDescription={seriesDescription}
            onSeriesDescriptionChange={setSeriesDescription}
            decisions={decisionsByKey}
            onDecisionChange={(groupKey, update) => {
              setDecisionsByKey((prev) => {
                const next = new Map(prev);
                const existing = next.get(groupKey);
                next.set(groupKey, {
                  groupKey,
                  action: update.action ?? existing?.action ?? "merge",
                  canonicalEntryId:
                    update.canonicalEntryId ?? existing?.canonicalEntryId ?? null,
                });
                return next;
              });
            }}
          />
        ) : null}

        {step === 3 && preview ? (
          <ConfirmStep
            selectedBooks={selectedBooks}
            preview={preview}
            decisions={decisionsByKey}
            seriesName={seriesName}
            seriesDescription={seriesDescription}
          />
        ) : null}
      </div>

      <div className="mt-8 flex items-center justify-between gap-3 border-t border-border/60 pt-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            if (step === 1) {
              router.push("/dashboard/series");
              return;
            }
            setStep((step - 1) as Step);
          }}
          disabled={isExecutePending}
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" />
          {step === 1 ? "Cancel" : "Back"}
        </Button>

        {step === 1 ? (
          <div className="flex items-center gap-3">
            {!canAdvanceFromStep1 ? (
              <span className="hidden text-[11px] text-editorial-muted sm:inline">
                {orderedBookIds.length === 0
                  ? "Select books to continue"
                  : "Pick one more book — a series needs at least two"}
              </span>
            ) : null}
            <Button
              type="button"
              size="sm"
              onClick={goToStep2}
              disabled={!canAdvanceFromStep1 || isPreviewPending}
              title={
                !canAdvanceFromStep1
                  ? "A series needs at least two books."
                  : undefined
              }
            >
              {isPreviewPending ? (
                <>
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  Scanning codex…
                </>
              ) : (
                <>
                  Next: review codex
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        ) : null}

        {step === 2 ? (
          <Button
            type="button"
            size="sm"
            onClick={goToStep3}
            disabled={!preview}
          >
            Next: confirm
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        ) : null}

        {step === 3 ? (
          <Button
            type="button"
            size="sm"
            onClick={submit}
            disabled={isExecutePending || !seriesName.trim()}
          >
            {isExecutePending ? (
              <>
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                Converting…
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                Convert to series
              </>
            )}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function Stepper({ current }: { current: Step }) {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {STEPS.map((s, i) => {
        const done = s.id < current;
        const active = s.id === current;
        return (
          <li key={s.id} className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold",
                done
                  ? "border-gold bg-gold text-editorial-bg"
                  : active
                    ? "border-gold text-gold"
                    : "border-border/60 text-editorial-muted",
              )}
            >
              {done ? <Check className="h-3 w-3" /> : s.id}
            </span>
            <span
              className={cn(
                "text-xs",
                active
                  ? "text-editorial-cream"
                  : done
                    ? "text-editorial-muted"
                    : "text-editorial-muted/70",
              )}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 ? (
              <span className="mx-1 h-px w-6 bg-border/60" aria-hidden />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Pick the codex instance with the most substantive data as the default
 * canonical version. We prefer (a) the longest description, then (b) the
 * longest summary, then (c) the one with the most aliases — this ranks
 * "real content" over "empty placeholder" when the user created the same
 * character in multiple books with uneven detail.
 */
function pickRichestInstance(group: ConversionCodexGroup) {
  return [...group.instances].sort((a, b) => {
    const aLen = (a.description_md ?? "").length;
    const bLen = (b.description_md ?? "").length;
    if (aLen !== bLen) return bLen - aLen;
    const aSum = (a.summary ?? "").length;
    const bSum = (b.summary ?? "").length;
    if (aSum !== bSum) return bSum - aSum;
    return (b.aliases?.length ?? 0) - (a.aliases?.length ?? 0);
  })[0]!;
}

/**
 * Guess a series name from the shortest common prefix of the selected
 * book titles. This is a nicety, not a requirement — the user can always
 * edit the name on step 3 before committing.
 */
function guessSeriesName(titles: string[]): string {
  if (titles.length === 0) return "";
  const clean = titles.map((t) => t.trim()).filter((t) => t.length > 0);
  if (clean.length === 0) return "";
  let prefix = clean[0]!;
  for (const t of clean.slice(1)) {
    let i = 0;
    while (i < prefix.length && i < t.length && prefix[i] === t[i]) i++;
    prefix = prefix.slice(0, i);
  }
  // Strip trailing punctuation/whitespace like "Kingdom of " → "Kingdom of".
  const trimmed = prefix.replace(/[\s\-:–—,]+$/, "").trim();
  return trimmed.length >= 3 ? `${trimmed} series` : "";
}
