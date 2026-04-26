import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

/**
 * Prompt 16 § 397-406 (edge case #6): reject arc configurations that are
 * internally inconsistent — specifically, if `starts_book_id ==
 * ends_book_id` (the arc is supposed to live inside a single book) but
 * the arc has beats attached to *other* books, the spec says the save
 * should fail validation.
 *
 * The caller supplies the final (post-update) `startsBookId`/`endsBookId`
 * pair so this can be used both for arc updates and for beat inserts /
 * moves. A `beatOverride` slot lets us validate a pending beat write
 * before it hits the DB (overrides replace or add the given beat's
 * `book_id` in the check set).
 *
 * Returns `{ ok: true }` when the configuration is valid, or
 * `{ ok: false, error }` with a human-readable message otherwise.
 *
 * Exported from its own module (rather than the `"use server"` action
 * file) so it can be unit-tested directly without the action boundary.
 */
export async function validateArcBookSpan(
  supabase: SupabaseClient<Database>,
  arcId: string,
  startsBookId: string | null,
  endsBookId: string | null,
  beatOverride?: {
    /** ID of a beat whose book_id is about to change; null = insert. */
    beatId: string | null;
    newBookId: string | null;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  /* Only constrain when BOTH endpoints are set and equal — the arc
   * declares it belongs to a single book. Null endpoints (floating arc)
   * or an explicit multi-book span are always OK here. */
  if (!startsBookId || !endsBookId || startsBookId !== endsBookId) {
    return { ok: true };
  }

  const { data: beats, error } = await supabase
    .from("series_arc_beats")
    .select("id, book_id")
    .eq("arc_id", arcId);
  if (error) {
    /* Don't block the save on a transient fetch failure; surface it as
     * a validation error so the caller can retry. */
    return {
      ok: false,
      error: "Could not verify arc book span; please try again.",
    };
  }

  type BeatRow = { id: string; book_id: string | null };
  let effective: BeatRow[] = (beats ?? []).map((b) => ({
    id: b.id,
    book_id: b.book_id,
  }));

  if (beatOverride) {
    const existingIdx = beatOverride.beatId
      ? effective.findIndex((b) => b.id === beatOverride.beatId)
      : -1;
    if (existingIdx >= 0) {
      effective = effective.map((b, i) =>
        i === existingIdx ? { ...b, book_id: beatOverride.newBookId } : b,
      );
    } else if (beatOverride.beatId === null) {
      /* An insert — add a synthetic row so the validation sees it. */
      effective = [
        ...effective,
        { id: "__pending__", book_id: beatOverride.newBookId },
      ];
    }
  }

  const offending = effective.filter(
    (b) => b.book_id != null && b.book_id !== startsBookId,
  );
  if (offending.length > 0) {
    return {
      ok: false,
      error:
        "Arc spans multiple books but its start and end are set to the same book. Update the book range to cover every beat, or move the out-of-range beats first.",
    };
  }
  return { ok: true };
}
