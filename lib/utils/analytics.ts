import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";

export const BOOK_EVENT_TYPES = [
  "book_created",
  "idea_refined",
  "outline_approved",
  "chapter_generated",
  "chapter_approved",
  "cover_generated",
  "book_compiled",
  "book_downloaded",
  "kdp_pack_downloaded",
  "upgrade_clicked",
  "subscription_started",
  "consistency_checked",
  "voice_memo_used",
  "beats_analyzed",
  "series_created",
  "series_deleted",
  "series_book_summarized",
  "series_boxed_set_compiled",
  "series_converted_from_standalone",
] as const;

export type BookEventType = (typeof BOOK_EVENT_TYPES)[number];

function isBookEventType(value: string): value is BookEventType {
  return (BOOK_EVENT_TYPES as readonly string[]).includes(value);
}

/**
 * Inserts a row into `book_events` using the current session (RLS).
 *
 * Two call styles:
 * 1. `trackEvent(userId, ...)` — re-verifies the signed-in user matches
 *    `userId` with an extra `auth.getUser()` round-trip (anti-spoof, used
 *    when the caller does not already hold the authenticated user object).
 * 2. `trackEvent(user, ...)` — when the caller already authenticated the
 *    user upstream, skip the redundant round-trip. RLS on `book_events`
 *    still constrains what rows the session-scoped client can insert, so
 *    the re-check is defense-in-depth rather than a security guarantee.
 *    Preferred on hot paths (e.g. streaming routes) where the extra hop
 *    delays the client's fetch resolve.
 */
export async function trackEvent(
  userIdOrUser: string | { id: string },
  eventType: BookEventType,
  bookId?: string | null,
  metadata?: Record<string, unknown> | null,
): Promise<void> {
  if (!isBookEventType(eventType)) {
    return;
  }
  try {
    const supabase = await createClient();

    let userId: string;
    if (typeof userIdOrUser === "string") {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || user.id !== userIdOrUser) {
        return;
      }
      userId = user.id;
    } else {
      userId = userIdOrUser.id;
    }

    const meta = (metadata && typeof metadata === "object" ? metadata : {}) as Record<
      string,
      unknown
    >;

    await supabase.from("book_events").insert({
      user_id: userId,
      book_id: bookId ?? null,
      event_type: eventType,
      metadata: meta as Json,
    });
  } catch {
    /* analytics must never break primary flows */
  }
}

/** Service-role insert (e.g. Stripe webhooks). Bypasses RLS. */
export async function trackEventAdmin(
  userId: string,
  eventType: BookEventType,
  bookId?: string | null,
  metadata?: Record<string, unknown> | null,
): Promise<void> {
  if (!isBookEventType(eventType)) {
    return;
  }
  try {
    const admin = createAdminClient();
    const meta = (metadata && typeof metadata === "object" ? metadata : {}) as Record<
      string,
      unknown
    >;
    await admin.from("book_events").insert({
      user_id: userId,
      book_id: bookId ?? null,
      event_type: eventType,
      metadata: meta as Json,
    });
  } catch {
    /* non-blocking */
  }
}
