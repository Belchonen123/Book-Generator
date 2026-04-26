"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/utils/errors";
import type { Database, Json } from "@/types/database.types";

type SeriesMetadataInsert =
  Database["public"]["Tables"]["series_metadata"]["Insert"];

/**
 * Commercial / KDP metadata for a series. 1:1 with the `series` row. We lazily
 * upsert this row the first time a field is saved — avoids creating empty rows
 * for every series just because the user visited the Metadata tab.
 */

const metadataInputSchema = z.object({
  kdp_series_name: z.string().trim().max(200).nullable().optional(),
  kdp_series_number_format: z.string().trim().max(40).optional(),
  amazon_series_asin: z.string().trim().max(40).nullable().optional(),
  boxed_set_title: z.string().trim().max(200).nullable().optional(),
  boxed_set_description: z.string().trim().max(4_000).nullable().optional(),
  cross_promo_copy_md: z.string().trim().max(20_000).nullable().optional(),
  also_by_author_list_md: z.string().trim().max(20_000).nullable().optional(),
  reading_order_copy_md: z.string().trim().max(20_000).nullable().optional(),
  boxed_set_dedication_md: z.string().trim().max(4_000).nullable().optional(),
  boxed_set_author_note_md: z.string().trim().max(8_000).nullable().optional(),
  newsletter_signup_copy_md: z.string().trim().max(4_000).nullable().optional(),
  boxed_set_included_book_ids: z.array(z.string().uuid()).nullable().optional(),
  audiobook_bundle_metadata: z.record(z.unknown()).optional(),
});

export type SeriesMetadataInput = z.infer<typeof metadataInputSchema>;

export async function upsertSeriesMetadataAction(
  seriesId: string,
  patch: SeriesMetadataInput,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = metadataInputSchema.safeParse(patch);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: series } = await supabase
    .from("series")
    .select("id")
    .eq("id", seriesId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!series) return { ok: false, error: "Series not found." };

  const update: SeriesMetadataInsert = {
    series_id: seriesId,
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.kdp_series_name !== undefined) update.kdp_series_name = parsed.data.kdp_series_name;
  if (parsed.data.kdp_series_number_format !== undefined)
    update.kdp_series_number_format = parsed.data.kdp_series_number_format;
  if (parsed.data.amazon_series_asin !== undefined) update.amazon_series_asin = parsed.data.amazon_series_asin;
  if (parsed.data.boxed_set_title !== undefined) update.boxed_set_title = parsed.data.boxed_set_title;
  if (parsed.data.boxed_set_description !== undefined)
    update.boxed_set_description = parsed.data.boxed_set_description;
  if (parsed.data.cross_promo_copy_md !== undefined) update.cross_promo_copy_md = parsed.data.cross_promo_copy_md;
  if (parsed.data.also_by_author_list_md !== undefined)
    update.also_by_author_list_md = parsed.data.also_by_author_list_md;
  if (parsed.data.reading_order_copy_md !== undefined)
    update.reading_order_copy_md = parsed.data.reading_order_copy_md;
  if (parsed.data.boxed_set_dedication_md !== undefined)
    update.boxed_set_dedication_md = parsed.data.boxed_set_dedication_md;
  if (parsed.data.boxed_set_author_note_md !== undefined)
    update.boxed_set_author_note_md = parsed.data.boxed_set_author_note_md;
  if (parsed.data.newsletter_signup_copy_md !== undefined)
    update.newsletter_signup_copy_md = parsed.data.newsletter_signup_copy_md;
  if (parsed.data.boxed_set_included_book_ids !== undefined)
    update.boxed_set_included_book_ids = parsed.data.boxed_set_included_book_ids;
  if (parsed.data.audiobook_bundle_metadata !== undefined)
    update.audiobook_bundle_metadata = parsed.data.audiobook_bundle_metadata as Json;

  const { error } = await supabase
    .from("series_metadata")
    .upsert(update, { onConflict: "series_id" });
  if (error) {
    logServerError("upsertSeriesMetadata", error);
    return { ok: false, error: "Could not save metadata." };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/series/${seriesId}`);
  revalidatePath(`/dashboard/series/${seriesId}/boxed-set`);
  return { ok: true };
}
