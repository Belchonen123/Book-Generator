import type { SupabaseClient } from "@supabase/supabase-js";

import { logServerError } from "@/lib/utils/errors";
import type { Database } from "@/types/database.types";

/** Matches cron copy: rows stuck in `generating` with no `updated_at` touch. */
const STUCK_MINUTES = 5;

export type HealStuckChaptersResult = { healed: number; chapterIds: string[] };

/**
 * Clears `generating` chapters whose `updated_at` predates the cutoff (likely
 * abandoned streams). Uses a service-role client so it runs outside user RLS.
 * Long in-flight generations can theoretically be &gt; 5m without a row update;
 * the user-facing recover route and UI remain the manual escape hatch.
 */
export async function healStuckChapters(
  supabase: SupabaseClient<Database>,
): Promise<HealStuckChaptersResult> {
  const cutoff = new Date(
    Date.now() - STUCK_MINUTES * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from("chapters")
    .update({ status: "pending" })
    .eq("status", "generating")
    .lt("updated_at", cutoff)
    .select("id");

  if (error) {
    logServerError("heal-stuck-chapters.update", error, { severity: "critical" });
    return { healed: 0, chapterIds: [] };
  }

  const rows = data ?? [];
  if (rows.length > 0) {
    console.info(
      "[heal-stuck-chapters] reset to pending:",
      rows.length,
      rows.map((r) => r.id).join(", "),
    );
  }
  return { healed: rows.length, chapterIds: rows.map((r) => r.id) };
}
