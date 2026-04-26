"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Check, Loader2 } from "@/lib/lucide-icons";
import { cn } from "@/lib/utils/cn";

import type { ConversionCodexGroup, ConversionPreview } from "../actions";

export type MergeAction = "merge" | "keep";

export type MergeDecision = {
  groupKey: string;
  action: MergeAction;
  canonicalEntryId: string | null;
};

/**
 * Step 2: the codex-diff review + series metadata.
 *
 * The left column holds a lightweight form for the series name +
 * description; the right column lists every potential merge group with
 * a radio for the canonical version and "Merge" / "Keep separate"
 * toggles. Groups with no diffs collapse by default so the list doesn't
 * overwhelm the author when everything lines up.
 */
export function ReviewCodexStep({
  preview,
  previewError,
  isLoading,
  seriesName,
  onSeriesNameChange,
  seriesDescription,
  onSeriesDescriptionChange,
  decisions,
  onDecisionChange,
}: {
  preview: ConversionPreview | null;
  previewError: string | null;
  isLoading: boolean;
  seriesName: string;
  onSeriesNameChange: (next: string) => void;
  seriesDescription: string;
  onSeriesDescriptionChange: (next: string) => void;
  decisions: Map<string, MergeDecision>;
  onDecisionChange: (groupKey: string, update: Partial<MergeDecision>) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-md border border-border/60 bg-card/30 p-10 text-sm text-editorial-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Scanning codex entries across your selected books…
      </div>
    );
  }
  if (previewError || !preview) {
    return (
      <div className="rounded-md border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
        <AlertTriangle className="mr-2 inline h-4 w-4" />
        {previewError ?? "Could not load codex preview."}
      </div>
    );
  }

  const totalInMerge = preview.mergeGroups.reduce(
    (acc, g) => acc + g.instances.length,
    0,
  );
  const standaloneEntries = preview.totalCodexEntries - totalInMerge;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
      <aside className="space-y-4 rounded-md border border-border/60 bg-card/30 p-4">
        <div>
          <h2 className="font-serif text-lg text-editorial-cream">Series details</h2>
          <p className="mt-1 text-xs text-editorial-muted">
            You can change these later from the series dashboard.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="convert-series-name" className="text-xs text-editorial-muted">
            Series name
          </Label>
          <Input
            id="convert-series-name"
            value={seriesName}
            onChange={(e) => onSeriesNameChange(e.target.value)}
            placeholder="e.g. Ashbound Saga"
            maxLength={200}
          />
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="convert-series-desc"
            className="text-xs text-editorial-muted"
          >
            Short description (optional)
          </Label>
          <Textarea
            id="convert-series-desc"
            value={seriesDescription}
            onChange={(e) => onSeriesDescriptionChange(e.target.value)}
            placeholder="One or two sentences your readers would recognize."
            maxLength={4000}
            rows={4}
          />
        </div>

        <div className="rounded-md border border-border/40 bg-background/30 p-3 text-xs text-editorial-muted">
          <div className="font-semibold text-editorial-cream">Diff summary</div>
          <ul className="mt-2 space-y-1">
            <li>
              {preview.totalCodexEntries} codex entr
              {preview.totalCodexEntries === 1 ? "y" : "ies"} across{" "}
              {preview.books.length} book{preview.books.length === 1 ? "" : "s"}.
            </li>
            <li>
              {preview.mergeGroups.length} potential merge group
              {preview.mergeGroups.length === 1 ? "" : "s"} ({totalInMerge} entries).
            </li>
            <li>
              {standaloneEntries} entr
              {standaloneEntries === 1 ? "y" : "ies"} unique to one book — these
              stay book-scoped.
            </li>
          </ul>
        </div>
      </aside>

      <section>
        <h2 className="font-serif text-lg text-editorial-cream">
          Review merge groups
        </h2>
        <p className="mt-1 text-xs text-editorial-muted">
          Choose the canonical version for each group. Books whose version
          differs will get a per-book overlay so those details aren&apos;t lost.
        </p>

        {preview.mergeGroups.length === 0 ? (
          <div className="mt-4 rounded-md border border-border/60 bg-card/30 p-4 text-center text-sm text-editorial-muted">
            No duplicate entries detected. Every codex entry is unique to one
            book, so nothing needs merging.
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {preview.mergeGroups.map((group) => (
              <MergeGroupRow
                key={group.groupKey}
                group={group}
                decision={decisions.get(group.groupKey) ?? null}
                onDecisionChange={onDecisionChange}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MergeGroupRow({
  group,
  decision,
  onDecisionChange,
}: {
  group: ConversionCodexGroup;
  decision: MergeDecision | null;
  onDecisionChange: (groupKey: string, update: Partial<MergeDecision>) => void;
}) {
  // Open by default when the group actually has diverging fields — that's
  // where the user's review time is best spent. Identical-content groups
  // collapse so the panel reads "all clear" at a glance.
  const hasDiffs =
    group.diffs.summary ||
    group.diffs.description_md ||
    group.diffs.aliases ||
    group.diffs.customFields;
  const [open, setOpen] = useState(hasDiffs);

  const action = decision?.action ?? "merge";
  const canonicalId = decision?.canonicalEntryId ?? group.instances[0]?.entryId ?? null;

  return (
    <li
      className={cn(
        "rounded-md border bg-card/30",
        action === "keep" ? "border-border/40" : "border-border/70",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 p-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-xs text-editorial-muted hover:text-editorial-cream"
            aria-expanded={open}
          >
            {open ? "▾" : "▸"}
          </button>
          <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-editorial-muted">
            {group.entryType}
          </span>
          <span className="truncate font-serif text-sm text-editorial-cream">
            {group.displayName}
          </span>
          <span className="text-xs text-editorial-muted">
            · {group.instances.length} book versions
          </span>
          {hasDiffs ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-200">
              <AlertTriangle className="h-2.5 w-2.5" /> fields differ
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200">
              <Check className="h-2.5 w-2.5" /> identical
            </span>
          )}
        </div>
        <div
          role="tablist"
          className="inline-flex overflow-hidden rounded-md border border-border/60 text-[11px]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={action === "merge"}
            className={cn(
              "px-3 py-1",
              action === "merge"
                ? "bg-gold text-editorial-bg"
                : "text-editorial-muted hover:text-editorial-cream",
            )}
            onClick={() =>
              onDecisionChange(group.groupKey, { action: "merge", canonicalEntryId: canonicalId })
            }
          >
            Merge
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={action === "keep"}
            className={cn(
              "px-3 py-1",
              action === "keep"
                ? "bg-card/70 text-editorial-cream"
                : "text-editorial-muted hover:text-editorial-cream",
            )}
            onClick={() =>
              onDecisionChange(group.groupKey, { action: "keep" })
            }
          >
            Keep separate
          </button>
        </div>
      </div>

      {open ? (
        <div className="divide-y divide-border/40">
          {group.instances.map((instance) => {
            const isCanonical =
              action === "merge" && canonicalId === instance.entryId;
            return (
              <div
                key={instance.entryId}
                className={cn(
                  "flex flex-col gap-2 p-3 sm:flex-row sm:items-start",
                  isCanonical ? "bg-gold/5" : "",
                )}
              >
                <div className="flex shrink-0 items-start gap-2">
                  <input
                    type="radio"
                    name={`canonical-${group.groupKey}`}
                    className="mt-1"
                    disabled={action !== "merge"}
                    checked={isCanonical}
                    onChange={() =>
                      onDecisionChange(group.groupKey, {
                        action: "merge",
                        canonicalEntryId: instance.entryId,
                      })
                    }
                    aria-label={`Use ${instance.bookTitle} as canonical`}
                  />
                  <div className="text-xs">
                    <div className="font-semibold text-editorial-cream">
                      {instance.bookTitle}
                    </div>
                    <div className="text-editorial-muted">
                      {isCanonical
                        ? "Canonical"
                        : action === "merge"
                          ? "Overlay if differs"
                          : "Stays per-book"}
                    </div>
                  </div>
                </div>
                <div className="min-w-0 flex-1 space-y-2 text-xs text-editorial-cream/90">
                  {instance.summary ? (
                    <div>
                      <span className="text-[10px] uppercase tracking-wide text-editorial-muted">
                        Summary
                      </span>
                      <p className="mt-0.5 whitespace-pre-wrap">{instance.summary}</p>
                    </div>
                  ) : null}
                  {instance.description_md ? (
                    <div>
                      <span className="text-[10px] uppercase tracking-wide text-editorial-muted">
                        Description
                      </span>
                      <p className="mt-0.5 line-clamp-5 whitespace-pre-wrap">
                        {instance.description_md}
                      </p>
                    </div>
                  ) : null}
                  {instance.aliases.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {instance.aliases.map((a) => (
                        <span
                          key={a}
                          className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-editorial-muted"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </li>
  );
}
