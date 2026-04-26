"use server";

import { revalidatePath } from "next/cache";

import { restoreRevision, snapshotChapter } from "@/lib/book/revisions";
import { createClient } from "@/lib/supabase/server";

/**
 * User-initiated restore of a chapter revision. Re-authenticates with the
 * session cookie (RLS enforces ownership too) and invalidates the editor +
 * revisions pages so the next render shows the restored content.
 */
export async function restoreRevisionAction(
  revisionId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!revisionId || typeof revisionId !== "string") {
    return { ok: false, error: "Invalid revision id." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  const result = await restoreRevision(supabase, revisionId, user.id);
  if (!result.ok) {
    return { ok: false, error: result.error ?? "Restore failed." };
  }

  if (result.bookId && result.chapterId) {
    revalidatePath(`/projects/${result.bookId}/chapters/${result.chapterId}`);
    revalidatePath(
      `/projects/${result.bookId}/chapters/${result.chapterId}/revisions`,
    );
  }
  return { ok: true };
}

/**
 * Record a `manual_save` revision of the given chapter.
 *
 * The editor calls this from `saveContent()` after a successful save, but
 * debounces to at most one per 5 minutes per chapter client-side — this
 * server action does NOT de-duplicate. If the chapter has no content yet
 * (`snapshotChapter` returns `{ ok: false, code: 'empty' }`), we treat
 * that as a soft success so the editor doesn't surface an error for a
 * blank draft.
 */
export async function snapshotManualSaveAction(
  chapterId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!chapterId || typeof chapterId !== "string") {
    return { ok: false, error: "Invalid chapter id." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  const result = await snapshotChapter(supabase, {
    chapterId,
    userId: user.id,
    source: "manual_save",
  });

  if (!result.ok && result.code !== "empty") {
    return { ok: false, error: result.error };
  }
  return { ok: true };
}
