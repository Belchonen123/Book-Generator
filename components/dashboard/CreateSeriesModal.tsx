"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createSeriesAction } from "@/app/(dashboard)/dashboard/series/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProUpgradeModal } from "@/components/subscription/ProUpgradeModal";
import { Library, Loader2, Sparkles, X } from "@/lib/lucide-icons";
import {
  responsiveModalBackdrop,
  responsiveModalRoot,
} from "@/lib/ui/responsive-modal";
import { cn } from "@/lib/utils/cn";
import type { SeriesStatusDb } from "@/types/database.types";

type CreateSeriesModalProps = {
  open: boolean;
  onClose: () => void;
  isPro: boolean;
};

const STATUS_OPTIONS: { value: SeriesStatusDb; label: string }[] = [
  { value: "planning", label: "Planning" },
  { value: "active", label: "Active" },
  { value: "complete", label: "Complete" },
  { value: "abandoned", label: "Abandoned" },
];

const INITIAL = {
  name: "",
  tagline: "",
  description: "",
  genre: "",
  plannedCount: "",
  status: "planning" as SeriesStatusDb,
};

export function CreateSeriesModal({ open, onClose, isPro }: CreateSeriesModalProps) {
  const router = useRouter();
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState(INITIAL);
  const [busy, setBusy] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(INITIAL);
      // Autofocus the name field once the modal paints.
      const id = window.setTimeout(() => firstFieldRef.current?.focus(), 40);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;

    if (!isPro) {
      setUpgradeOpen(true);
      return;
    }

    const name = form.name.trim();
    if (!name) {
      toast.error("Enter a series name.");
      firstFieldRef.current?.focus();
      return;
    }

    let planned: number | null = null;
    if (form.plannedCount.trim()) {
      const parsed = Number.parseInt(form.plannedCount, 10);
      if (Number.isNaN(parsed) || parsed < 0 || parsed > 99) {
        toast.error("Planned book count must be between 0 and 99.");
        return;
      }
      planned = parsed;
    }

    setBusy(true);
    try {
      const res = await createSeriesAction(name, form.description.trim(), {
        tagline: form.tagline.trim() || null,
        genre: form.genre.trim() || null,
        plannedBookCount: planned,
        status: form.status,
      });

      if (!res.ok) {
        toast.error(res.error);
        if (res.error.toLowerCase().includes("pro")) {
          setUpgradeOpen(true);
        }
        return;
      }

      toast.success("Series created.");
      onClose();
      // Soft navigation + refresh keeps any surrounding dashboard state
      // intact (drawer, toasts) where a hard reload would nuke it.
      router.push(`/dashboard/series/${res.id}`);
      router.refresh();
    } catch (err) {
      console.error("[create-series]", err);
      toast.error("Something went wrong creating your series. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div
        className={cn(responsiveModalRoot(), "z-[100]")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-series-title"
      >
        <button
          type="button"
          className={cn(responsiveModalBackdrop(), "bg-black/75")}
          aria-label="Close"
          disabled={busy}
          onClick={() => {
            if (!busy) onClose();
          }}
        />

        <form
          onSubmit={submit}
          className={cn(
            "relative z-10 flex w-full flex-col overflow-hidden border border-border/70 bg-card shadow-2xl",
            "max-md:rounded-t-2xl max-md:rounded-b-none max-md:border-x-0 max-md:border-b-0 max-md:border-t max-md:max-h-[92dvh]",
            "md:max-w-lg md:rounded-2xl md:max-h-[min(88vh,720px)]",
          )}
        >
          <header className="relative flex items-start gap-3 border-b border-border/60 px-6 py-5">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold">
              <Library className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2
                id="create-series-title"
                className="font-serif text-xl leading-tight text-editorial-cream"
              >
                Create a new series
              </h2>
              <p className="mt-1 text-xs text-editorial-muted">
                Group linked books so they share a character bible, world notes,
                codex entries, and arcs. Pro only.
              </p>
            </div>
            <button
              type="button"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-md text-editorial-muted transition hover:bg-muted/40 hover:text-editorial-cream md:right-4 md:top-4"
              aria-label="Close"
              disabled={busy}
              onClick={onClose}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-5">
              <div>
                <Label htmlFor="cs-name">
                  Name <span className="text-gold">*</span>
                </Label>
                <Input
                  id="cs-name"
                  ref={firstFieldRef}
                  className="mt-1"
                  value={form.name}
                  maxLength={120}
                  disabled={busy}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Saga of the Waking Sea"
                  aria-required="true"
                />
              </div>

              <div>
                <Label htmlFor="cs-tagline">Tagline</Label>
                <Input
                  id="cs-tagline"
                  className="mt-1"
                  value={form.tagline}
                  maxLength={160}
                  disabled={busy}
                  onChange={(e) => set("tagline", e.target.value)}
                  placeholder="A one-line hook for back-cover copy"
                />
              </div>

              <div>
                <Label htmlFor="cs-description">Description</Label>
                <textarea
                  id="cs-description"
                  className="mt-1 min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-editorial-muted/60 focus:outline-none focus:ring-1 focus:ring-gold/60 disabled:opacity-60"
                  value={form.description}
                  maxLength={2000}
                  disabled={busy}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="High-level through-line across the books…"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor="cs-genre">Genre</Label>
                  <Input
                    id="cs-genre"
                    className="mt-1"
                    value={form.genre}
                    maxLength={60}
                    disabled={busy}
                    onChange={(e) => set("genre", e.target.value)}
                    placeholder="Fantasy"
                  />
                </div>
                <div>
                  <Label htmlFor="cs-planned">Planned books</Label>
                  <Input
                    id="cs-planned"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={99}
                    className="mt-1"
                    value={form.plannedCount}
                    disabled={busy}
                    onChange={(e) => set("plannedCount", e.target.value)}
                    placeholder="5"
                  />
                </div>
                <div>
                  <Label htmlFor="cs-status">Status</Label>
                  <select
                    id="cs-status"
                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-gold/60 disabled:opacity-60"
                    value={form.status}
                    disabled={busy}
                    onChange={(e) =>
                      set("status", e.target.value as SeriesStatusDb)
                    }
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-gold/20 bg-gold/5 px-3 py-2.5 text-xs text-editorial-muted">
                <Sparkles
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold"
                  aria-hidden
                />
                <p>
                  After creating the series you can seed the shared character
                  bible, codex, and arcs — or promote an existing book’s
                  bible into the series in one click.
                </p>
              </div>
            </div>
          </div>

          <footer className="flex items-center justify-end gap-2 border-t border-border/60 bg-card/60 px-6 py-4">
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={busy || !form.name.trim()}
              className="min-w-[120px] bg-gold font-semibold text-editorial-bg hover:bg-gold/90"
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create series"
              )}
            </Button>
          </footer>
        </form>
      </div>

      <ProUpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        title="Series is a Pro feature"
        description="Group linked manuscripts, share a series bible, and keep continuity in outlines and chapters."
      />
    </>
  );
}
