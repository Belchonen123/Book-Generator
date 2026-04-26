"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "@/lib/lucide-icons";

export type PendingStateProps = {
  title: string;
  batchBusy: boolean;
  /** Chapters still in `pending` or `generating` status. Zero disables the bulk button. */
  remainingCount: number;
  /** Localized bulk-generate button label (varies by remainingCount). */
  bulkGenerateLabel: string;
  onGenerateOne: () => void;
  onGenerateAll: () => void;
};

export function PendingState({
  title,
  batchBusy,
  remainingCount,
  bulkGenerateLabel,
  onGenerateOne,
  onGenerateAll,
}: PendingStateProps) {
  const bulkDisabled = batchBusy || remainingCount === 0;
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12 text-center">
      <p className="w-full max-w-xl text-center font-serif text-2xl text-gold">{title}</p>
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Button
          type="button"
          className="bg-gold px-8 py-6 text-base font-semibold text-editorial-bg hover:bg-gold/90"
          disabled={batchBusy}
          onClick={onGenerateOne}
        >
          Generate chapter
        </Button>
        <Button
          type="button"
          variant="outline"
          className="border-gold/50 px-6 py-6 text-editorial-cream hover:bg-gold/10"
          disabled={bulkDisabled}
          onClick={onGenerateAll}
        >
          {batchBusy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Working…
            </>
          ) : (
            bulkGenerateLabel
          )}
        </Button>
      </div>
    </div>
  );
}
