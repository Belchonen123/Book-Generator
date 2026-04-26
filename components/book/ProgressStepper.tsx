import Link from "next/link";
import type { ReactNode } from "react";

import { Check } from "@/lib/lucide-icons";
import { BOOK_STATUS_ORDER, workflowStatusHref } from "@/lib/book/workflow";
import type { BookStatusDb } from "@/types/database.types";
import { cn } from "@/lib/utils/cn";

const LABELS: Record<BookStatusDb, string> = {
  idea: "Idea",
  refining: "Refine",
  outlining: "Outline",
  writing: "Write",
  editing: "Edit",
  cover: "Cover",
  complete: "Done",
};

type ProgressStepperProps = {
  currentStatus: BookStatusDb;
  className?: string;
  /** Shown before the step row on small screens (e.g. mobile menu). */
  leading?: ReactNode;
  /** When provided, each step is a link to that phase (see `workflowStatusHref`). */
  bookId?: string;
  firstChapterId?: string | null;
};

export function ProgressStepper({
  currentStatus,
  className,
  leading,
  bookId,
  firstChapterId = null,
}: ProgressStepperProps) {
  const activeIndex = BOOK_STATUS_ORDER.indexOf(currentStatus);
  const currentIndex = activeIndex === -1 ? 0 : activeIndex;

  return (
    <div
      className={cn(
        "flex w-full items-stretch border-b border-border/70 bg-card/40",
        className,
      )}
    >
      {leading ? (
        <div className="flex shrink-0 items-center border-r border-border/60 px-2 py-2 md:hidden">
          {leading}
        </div>
      ) : null}
      <div className="min-w-0 flex-1 overflow-x-auto px-3 py-3 sm:px-6 sm:py-4">
      <div className="mx-auto flex min-w-max max-w-5xl items-center justify-between gap-0.5 sm:gap-1">
        {BOOK_STATUS_ORDER.map((status, index) => {
          const isPast = index < currentIndex;
          const isCurrent = index === currentIndex;
          const showCheck =
            isPast || (isCurrent && currentStatus === "complete");
          const stepHref =
            bookId != null && bookId.length > 0
              ? workflowStatusHref(bookId, firstChapterId, status)
              : null;
          const stepLabel = `${LABELS[status]} — go to this step`;

          const circle = (
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors sm:h-10 sm:w-10",
                stepHref &&
                  "group-hover:border-gold/80 group-hover:bg-gold/15 group-focus-visible:border-gold",
                isPast &&
                  "border-gold/55 bg-gold/10 text-gold",
                isCurrent &&
                  "border-gold bg-gold/20 text-gold shadow-[0_0_12px_rgba(201,168,76,0.2)]",
                !isPast &&
                  !isCurrent &&
                  "border-border bg-editorial-bg/90 text-editorial-muted",
              )}
              aria-current={
                stepHref ? undefined : isCurrent ? "step" : undefined
              }
            >
              {showCheck ? (
                <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
          );

          const label = (
            <span
              className={cn(
                "hidden max-w-[4.5rem] text-center text-[10px] font-medium uppercase tracking-wide sm:block sm:text-xs",
                isCurrent && "text-gold",
                !isCurrent && "text-editorial-muted",
                stepHref && "group-hover:text-gold/90",
              )}
            >
              {LABELS[status]}
            </span>
          );

          const stepColumn = stepHref ? (
            <Link
              href={stepHref}
              prefetch
              aria-label={stepLabel}
              aria-current={isCurrent ? "step" : undefined}
              className="group flex flex-col items-center gap-1.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              {circle}
              {label}
            </Link>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              {circle}
              {label}
            </div>
          );

          return (
            <div key={status} className="flex flex-1 items-center">
              {stepColumn}
              {index < BOOK_STATUS_ORDER.length - 1 ? (
                <div
                  className={cn(
                    "mx-0.5 h-0.5 min-w-[10px] flex-1 rounded-full sm:mx-1",
                    index < currentIndex ? "bg-gold/50" : "bg-border",
                  )}
                  aria-hidden
                />
              ) : null}
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
