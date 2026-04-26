"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { upsertSeriesMetadataAction } from "@/app/(dashboard)/dashboard/series/metadata/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "@/lib/lucide-icons";

import type { SeriesMetadataRow } from "../series-detail-shell";

/**
 * Commercial + KDP metadata editor. The spec's "cross-promotion pages",
 * "boxed-set compilation", "reading order", and "also-by author list" all
 * store their source text here; the actual PDF/EPUB rendering is a follow-up
 * in the export pipeline.
 */
export function MetadataTab({
  seriesId,
  seriesName,
  metadata,
}: {
  seriesId: string;
  seriesName: string;
  metadata: SeriesMetadataRow | null;
}) {
  const router = useRouter();
  const [m, setM] = useState<SeriesMetadataRow>({
    kdp_series_name: metadata?.kdp_series_name ?? seriesName,
    kdp_series_number_format: metadata?.kdp_series_number_format ?? "standard",
    amazon_series_asin: metadata?.amazon_series_asin ?? null,
    boxed_set_title: metadata?.boxed_set_title ?? null,
    boxed_set_description: metadata?.boxed_set_description ?? null,
    cross_promo_copy_md: metadata?.cross_promo_copy_md ?? null,
    also_by_author_list_md: metadata?.also_by_author_list_md ?? null,
    reading_order_copy_md: metadata?.reading_order_copy_md ?? null,
    boxed_set_dedication_md: metadata?.boxed_set_dedication_md ?? null,
    boxed_set_author_note_md: metadata?.boxed_set_author_note_md ?? null,
    newsletter_signup_copy_md: metadata?.newsletter_signup_copy_md ?? null,
    boxed_set_included_book_ids: metadata?.boxed_set_included_book_ids ?? null,
    audiobook_bundle_metadata: metadata?.audiobook_bundle_metadata ?? {},
  });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const res = await upsertSeriesMetadataAction(seriesId, {
      kdp_series_name: m.kdp_series_name,
      kdp_series_number_format: m.kdp_series_number_format || "standard",
      amazon_series_asin: m.amazon_series_asin,
      boxed_set_title: m.boxed_set_title,
      boxed_set_description: m.boxed_set_description,
      cross_promo_copy_md: m.cross_promo_copy_md,
      also_by_author_list_md: m.also_by_author_list_md,
      reading_order_copy_md: m.reading_order_copy_md,
    });
    setBusy(false);
    if (!res.ok) return toast.error(res.error ?? "Could not save metadata.");
    toast.success("Metadata saved.");
    router.refresh();
  };

  const field = <K extends keyof SeriesMetadataRow>(
    key: K,
    value: SeriesMetadataRow[K],
  ) => setM((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="max-w-3xl">
      <h2 className="font-serif text-lg text-editorial-cream">
        Commercial metadata
      </h2>
      <p className="text-xs text-editorial-muted">
        Powers the compile pipeline's cross-promo pages, boxed-set listings,
        and KDP series registration. Everything here is optional — we fall
        back to series defaults.
      </p>

      <section className="mt-6 space-y-4 rounded-lg border border-border/60 bg-card/40 p-4">
        <h3 className="font-serif text-sm uppercase tracking-wide text-gold">
          KDP series
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="kdpn">KDP series name</Label>
            <Input
              id="kdpn"
              className="mt-1"
              value={m.kdp_series_name ?? ""}
              onChange={(e) => field("kdp_series_name", e.target.value || null)}
            />
          </div>
          <div>
            <Label htmlFor="kdpf">Numbering format</Label>
            <select
              id="kdpf"
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={m.kdp_series_number_format}
              onChange={(e) => field("kdp_series_number_format", e.target.value)}
            >
              <option value="standard">Book 1, Book 2…</option>
              <option value="roman">Book I, Book II…</option>
              <option value="volume">Volume 1, Volume 2…</option>
              <option value="part">Part 1, Part 2…</option>
              <option value="none">No numbering</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="asin">Amazon series ASIN (optional)</Label>
            <Input
              id="asin"
              className="mt-1"
              placeholder="B0XXXXXXXX"
              value={m.amazon_series_asin ?? ""}
              onChange={(e) => field("amazon_series_asin", e.target.value || null)}
            />
          </div>
        </div>
      </section>

      <section className="mt-6 space-y-4 rounded-lg border border-border/60 bg-card/40 p-4">
        <h3 className="font-serif text-sm uppercase tracking-wide text-gold">
          Boxed set
        </h3>
        <div>
          <Label htmlFor="bst">Boxed-set title</Label>
          <Input
            id="bst"
            className="mt-1"
            placeholder={`The Complete ${seriesName}`}
            value={m.boxed_set_title ?? ""}
            onChange={(e) => field("boxed_set_title", e.target.value || null)}
          />
        </div>
        <div>
          <Label htmlFor="bsd">Boxed-set description</Label>
          <textarea
            id="bsd"
            className="mt-1 w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={m.boxed_set_description ?? ""}
            onChange={(e) => field("boxed_set_description", e.target.value || null)}
          />
        </div>
      </section>

      <section className="mt-6 space-y-4 rounded-lg border border-border/60 bg-card/40 p-4">
        <h3 className="font-serif text-sm uppercase tracking-wide text-gold">
          Cross-promotion copy
        </h3>
        <p className="text-xs text-editorial-muted">
          Markdown. Appended to the back-matter of each book as a
          "Continue the series" page.
        </p>
        <textarea
          className="w-full min-h-[160px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
          value={m.cross_promo_copy_md ?? ""}
          onChange={(e) => field("cross_promo_copy_md", e.target.value || null)}
          placeholder={`## Continue the ${seriesName} series\n\nPick up **Book Two** on Amazon…`}
        />
      </section>

      <section className="mt-6 space-y-4 rounded-lg border border-border/60 bg-card/40 p-4">
        <h3 className="font-serif text-sm uppercase tracking-wide text-gold">
          Reading-order page
        </h3>
        <textarea
          className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
          value={m.reading_order_copy_md ?? ""}
          onChange={(e) => field("reading_order_copy_md", e.target.value || null)}
          placeholder="Reading order:\n1. Book One\n2. Book Two\n3. Novella…"
        />
      </section>

      <section className="mt-6 space-y-4 rounded-lg border border-border/60 bg-card/40 p-4">
        <h3 className="font-serif text-sm uppercase tracking-wide text-gold">
          Also by the author
        </h3>
        <textarea
          className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
          value={m.also_by_author_list_md ?? ""}
          onChange={(e) => field("also_by_author_list_md", e.target.value || null)}
          placeholder="**Also by J. Author**\n\n- Other Series: Book One\n- Standalone Novella"
        />
      </section>

      <div className="sticky bottom-4 mt-8 flex justify-end">
        <Button type="button" disabled={busy} onClick={() => void save()}>
          {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
          Save metadata
        </Button>
      </div>
    </div>
  );
}
