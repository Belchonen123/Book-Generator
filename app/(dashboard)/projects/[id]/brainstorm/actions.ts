"use server";

/**
 * Server actions for the brainstorm page.
 *
 * The streaming `/api/ai/brainstorm` route handles generation + initial
 * item creation. These actions cover the rest of the lifecycle:
 *   - listing prior sessions (sidebar)
 *   - hydrating a chosen session's items
 *   - thumbs-up (toggle keeper)
 *   - thumbs-down (mark hidden)
 *   - delete session
 *
 * All callers prove ownership of the book before touching any row.
 * RLS already enforces this; the explicit check keeps error messages
 * friendly.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/utils/errors";

export type BrainstormSessionListItem = {
  id: string;
  topic: string;
  title: string | null;
  prompt: string;
  createdAt: string;
  itemCount: number;
  keeperCount: number;
};

export type BrainstormItemDTO = {
  id: string;
  content: string;
  isKeeper: boolean;
  isHidden: boolean;
  position: number;
};

export type BrainstormSessionFullDTO = {
  id: string;
  topic: string;
  title: string | null;
  prompt: string;
  createdAt: string;
  items: BrainstormItemDTO[];
};

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const UuidSchema = z.string().uuid();

async function assertBookOwnership(bookId: string): Promise<
  | { ok: true; userId: string }
  | { ok: false; error: string; status: number }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Please sign in.", status: 401 };
  }
  const { data: book, error } = await supabase
    .from("books")
    .select("id")
    .eq("id", bookId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !book) {
    return { ok: false, error: "Book not found.", status: 404 };
  }
  return { ok: true, userId: user.id };
}

async function assertSessionOwnership(
  bookId: string,
  sessionId: string,
): Promise<ActionResult<{ userId: string }>> {
  if (!UuidSchema.safeParse(bookId).success) {
    return { ok: false, error: "Invalid book id." };
  }
  if (!UuidSchema.safeParse(sessionId).success) {
    return { ok: false, error: "Invalid session id." };
  }
  const guard = await assertBookOwnership(bookId);
  if (!guard.ok) return { ok: false, error: guard.error };

  const supabase = await createClient();
  const { data: session } = await supabase
    .from("brainstorm_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("project_id", bookId)
    .maybeSingle();
  if (!session) {
    return { ok: false, error: "Brainstorm session not found." };
  }
  return { ok: true, data: { userId: guard.userId } };
}

/* ------------------------------------------------------------------ *
 * List sessions                                                      *
 * ------------------------------------------------------------------ */

export async function listBrainstormSessions(
  bookId: string,
): Promise<ActionResult<BrainstormSessionListItem[]>> {
  if (!UuidSchema.safeParse(bookId).success) {
    return { ok: false, error: "Invalid book id." };
  }
  const guard = await assertBookOwnership(bookId);
  if (!guard.ok) return { ok: false, error: guard.error };

  const supabase = await createClient();
  const { data: sessions, error } = await supabase
    .from("brainstorm_sessions")
    .select("id, topic, title, prompt, created_at")
    .eq("project_id", bookId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !sessions) {
    logServerError("brainstorm.sessions-list", error);
    return { ok: false, error: "Could not load brainstorm sessions." };
  }

  if (sessions.length === 0) return { ok: true, data: [] };

  /* Aggregate item + keeper counts in a single scan. */
  const ids = sessions.map((s) => s.id);
  const { data: items } = await supabase
    .from("brainstorm_items")
    .select("session_id, is_keeper, is_hidden")
    .in("session_id", ids);

  const counts = new Map<string, { total: number; keepers: number }>();
  for (const row of items ?? []) {
    const bucket = counts.get(row.session_id) ?? { total: 0, keepers: 0 };
    /* Hidden items still count toward "total" so the sidebar badge
     * reflects what the author saw generated. */
    bucket.total += 1;
    if (row.is_keeper) bucket.keepers += 1;
    counts.set(row.session_id, bucket);
  }

  return {
    ok: true,
    data: sessions.map((s) => ({
      id: s.id,
      topic: s.topic,
      title: s.title,
      prompt: s.prompt,
      createdAt: s.created_at,
      itemCount: counts.get(s.id)?.total ?? 0,
      keeperCount: counts.get(s.id)?.keepers ?? 0,
    })),
  };
}

/* ------------------------------------------------------------------ *
 * Load one session (items included)                                  *
 * ------------------------------------------------------------------ */

export async function getBrainstormSession(
  bookId: string,
  sessionId: string,
): Promise<ActionResult<BrainstormSessionFullDTO>> {
  const guard = await assertSessionOwnership(bookId, sessionId);
  if (!guard.ok) return guard;

  const supabase = await createClient();
  const { data: session, error: sessionErr } = await supabase
    .from("brainstorm_sessions")
    .select("id, topic, title, prompt, created_at")
    .eq("id", sessionId)
    .eq("project_id", bookId)
    .single();
  if (sessionErr || !session) {
    return { ok: false, error: "Brainstorm session not found." };
  }

  const { data: items, error: itemsErr } = await supabase
    .from("brainstorm_items")
    .select("id, content, is_keeper, is_hidden, position")
    .eq("session_id", sessionId)
    .order("position", { ascending: true });

  if (itemsErr || !items) {
    logServerError("brainstorm.items-load", itemsErr);
    return { ok: false, error: "Could not load brainstorm items." };
  }

  return {
    ok: true,
    data: {
      id: session.id,
      topic: session.topic,
      title: session.title,
      prompt: session.prompt,
      createdAt: session.created_at,
      items: items.map((it) => ({
        id: it.id,
        content: it.content,
        isKeeper: it.is_keeper,
        isHidden: it.is_hidden,
        position: it.position,
      })),
    },
  };
}

/* ------------------------------------------------------------------ *
 * Item mutations                                                     *
 * ------------------------------------------------------------------ */

const ItemMutationSchema = z.object({
  bookId: z.string().uuid(),
  sessionId: z.string().uuid(),
  itemId: z.string().uuid(),
});

export async function toggleBrainstormKeeper(input: {
  bookId: string;
  sessionId: string;
  itemId: string;
  isKeeper: boolean;
}): Promise<ActionResult<{ itemId: string; isKeeper: boolean }>> {
  const parsed = ItemMutationSchema.extend({
    isKeeper: z.boolean(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid toggle request." };

  const guard = await assertSessionOwnership(
    parsed.data.bookId,
    parsed.data.sessionId,
  );
  if (!guard.ok) return guard;

  const supabase = await createClient();
  /* Thumbs-up implicitly un-hides the item so keepers never disappear
   * from the fold-top strip even if a previous thumbs-down hid them. */
  const patch: { is_keeper: boolean; is_hidden?: boolean } = {
    is_keeper: parsed.data.isKeeper,
  };
  if (parsed.data.isKeeper) patch.is_hidden = false;

  const { error } = await supabase
    .from("brainstorm_items")
    .update(patch)
    .eq("id", parsed.data.itemId)
    .eq("session_id", parsed.data.sessionId);
  if (error) {
    logServerError("brainstorm.toggle-keeper", error);
    return { ok: false, error: "Could not update item." };
  }

  return {
    ok: true,
    data: { itemId: parsed.data.itemId, isKeeper: parsed.data.isKeeper },
  };
}

export async function setBrainstormItemHidden(input: {
  bookId: string;
  sessionId: string;
  itemId: string;
  isHidden: boolean;
}): Promise<ActionResult<{ itemId: string; isHidden: boolean }>> {
  const parsed = ItemMutationSchema.extend({
    isHidden: z.boolean(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid hide request." };

  const guard = await assertSessionOwnership(
    parsed.data.bookId,
    parsed.data.sessionId,
  );
  if (!guard.ok) return guard;

  const supabase = await createClient();
  /* Thumbs-down should not persist a keeper flag — if the user
   * changes their mind, they can thumbs-up again to un-hide. */
  const patch: { is_hidden: boolean; is_keeper?: boolean } = {
    is_hidden: parsed.data.isHidden,
  };
  if (parsed.data.isHidden) patch.is_keeper = false;

  const { error } = await supabase
    .from("brainstorm_items")
    .update(patch)
    .eq("id", parsed.data.itemId)
    .eq("session_id", parsed.data.sessionId);
  if (error) {
    logServerError("brainstorm.hide", error);
    return { ok: false, error: "Could not update item." };
  }

  return {
    ok: true,
    data: { itemId: parsed.data.itemId, isHidden: parsed.data.isHidden },
  };
}

export async function deleteBrainstormSession(input: {
  bookId: string;
  sessionId: string;
}): Promise<ActionResult<{ sessionId: string }>> {
  const parsed = z
    .object({ bookId: z.string().uuid(), sessionId: z.string().uuid() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid delete request." };

  const guard = await assertSessionOwnership(
    parsed.data.bookId,
    parsed.data.sessionId,
  );
  if (!guard.ok) return guard;

  const supabase = await createClient();
  const { error } = await supabase
    .from("brainstorm_sessions")
    .delete()
    .eq("id", parsed.data.sessionId)
    .eq("project_id", parsed.data.bookId);
  if (error) {
    logServerError("brainstorm.delete-session", error);
    return { ok: false, error: "Could not delete session." };
  }

  revalidatePath(`/projects/${parsed.data.bookId}/brainstorm`);
  return { ok: true, data: { sessionId: parsed.data.sessionId } };
}

/**
 * Pull the list of keeper content strings across ALL sessions in this
 * project. Used by "Generate more like the keepers" to seed the next
 * brainstorm with positive examples without the UI having to
 * concatenate them client-side.
 */
export async function listKeepersForBook(
  bookId: string,
): Promise<ActionResult<string[]>> {
  if (!UuidSchema.safeParse(bookId).success) {
    return { ok: false, error: "Invalid book id." };
  }
  const guard = await assertBookOwnership(bookId);
  if (!guard.ok) return { ok: false, error: guard.error };

  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("brainstorm_sessions")
    .select("id")
    .eq("project_id", bookId);
  const ids = (sessions ?? []).map((s) => s.id);
  if (ids.length === 0) return { ok: true, data: [] };

  const { data: items, error } = await supabase
    .from("brainstorm_items")
    .select("content, created_at")
    .in("session_id", ids)
    .eq("is_keeper", true)
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) {
    logServerError("brainstorm.keepers-list", error);
    return { ok: false, error: "Could not load keepers." };
  }

  return { ok: true, data: (items ?? []).map((it) => it.content) };
}
