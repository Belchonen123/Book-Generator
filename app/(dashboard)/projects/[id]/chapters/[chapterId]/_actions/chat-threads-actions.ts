"use server";

/**
 * Server actions for the chapter-side chat panel. The streaming API
 * route (`/api/ai/chat`) handles message creation and assistant
 * responses; these actions cover the boring-but-necessary lifecycle
 * work the UI does around threads:
 *
 *   - `listChatThreads`    : populate the thread drawer
 *   - `getThreadMessages`  : hydrate a thread when the author selects it
 *   - `renameChatThread`   : title override from the drawer
 *   - `deleteChatThread`   : trash button
 *
 * Auth + ownership is enforced on every call. The chat panel is a
 * client component and must not trust any ids the browser hands it.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/utils/errors";

export type ChatThreadListItem = {
  id: string;
  title: string | null;
  chapterId: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
};

export type ChatMessageDTO = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  mentions: Array<{ type: "codex" | "chapter"; id: string; label?: string }>;
  createdAt: string;
};

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

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

export async function listChatThreads(
  bookId: string,
): Promise<ActionResult<ChatThreadListItem[]>> {
  const parsed = UuidSchema.safeParse(bookId);
  if (!parsed.success) return { ok: false, error: "Invalid book id." };

  const guard = await assertBookOwnership(bookId);
  if (!guard.ok) return { ok: false, error: guard.error };

  const supabase = await createClient();
  const { data: threads, error } = await supabase
    .from("chat_threads")
    .select("id, title, chapter_id, created_at, updated_at")
    .eq("project_id", bookId)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error || !threads) {
    logServerError("chat-threads.list", error);
    return { ok: false, error: "Could not load chats." };
  }

  if (threads.length === 0) {
    return { ok: true, data: [] };
  }

  /* Fetch message counts in a single grouped query. Supabase JS doesn't
   * expose postgres' `group by` directly, so we batch per thread — OK
   * for the 100-row cap above. */
  const ids = threads.map((t) => t.id);
  const { data: countRows } = await supabase
    .from("chat_messages")
    .select("thread_id")
    .in("thread_id", ids);
  const counts = new Map<string, number>();
  for (const r of countRows ?? []) {
    counts.set(r.thread_id, (counts.get(r.thread_id) ?? 0) + 1);
  }

  return {
    ok: true,
    data: threads.map((t) => ({
      id: t.id,
      title: t.title,
      chapterId: t.chapter_id,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      messageCount: counts.get(t.id) ?? 0,
    })),
  };
}

export async function getThreadMessages(
  bookId: string,
  threadId: string,
): Promise<ActionResult<ChatMessageDTO[]>> {
  if (!UuidSchema.safeParse(bookId).success) {
    return { ok: false, error: "Invalid book id." };
  }
  if (!UuidSchema.safeParse(threadId).success) {
    return { ok: false, error: "Invalid thread id." };
  }

  const guard = await assertBookOwnership(bookId);
  if (!guard.ok) return { ok: false, error: guard.error };

  const supabase = await createClient();
  /* Guard: thread must belong to this book. RLS already enforces it,
   * but re-checking in app code keeps the error message user-friendly. */
  const { data: thread } = await supabase
    .from("chat_threads")
    .select("id")
    .eq("id", threadId)
    .eq("project_id", bookId)
    .maybeSingle();
  if (!thread) {
    return { ok: false, error: "Chat thread not found." };
  }

  const { data: rows, error } = await supabase
    .from("chat_messages")
    .select("id, role, content, mentions, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error || !rows) {
    logServerError("chat-threads.messages", error);
    return { ok: false, error: "Could not load messages." };
  }

  return {
    ok: true,
    data: rows.map((r) => ({
      id: r.id,
      role: r.role,
      content: r.content,
      mentions: normalizeMentions(r.mentions),
      createdAt: r.created_at,
    })),
  };
}

const RenameSchema = z.object({
  bookId: z.string().uuid(),
  threadId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
});

export async function renameChatThread(input: {
  bookId: string;
  threadId: string;
  title: string;
}): Promise<ActionResult<{ threadId: string; title: string }>> {
  const parsed = RenameSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid rename request." };

  const guard = await assertBookOwnership(parsed.data.bookId);
  if (!guard.ok) return { ok: false, error: guard.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("chat_threads")
    .update({ title: parsed.data.title })
    .eq("id", parsed.data.threadId)
    .eq("project_id", parsed.data.bookId);

  if (error) {
    logServerError("chat-threads.rename", error);
    return { ok: false, error: "Could not rename chat." };
  }

  revalidatePath(`/projects/${parsed.data.bookId}`);
  return {
    ok: true,
    data: { threadId: parsed.data.threadId, title: parsed.data.title },
  };
}

const DeleteSchema = z.object({
  bookId: z.string().uuid(),
  threadId: z.string().uuid(),
});

export async function deleteChatThread(input: {
  bookId: string;
  threadId: string;
}): Promise<ActionResult<{ threadId: string }>> {
  const parsed = DeleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid delete request." };

  const guard = await assertBookOwnership(parsed.data.bookId);
  if (!guard.ok) return { ok: false, error: guard.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("chat_threads")
    .delete()
    .eq("id", parsed.data.threadId)
    .eq("project_id", parsed.data.bookId);

  if (error) {
    logServerError("chat-threads.delete", error);
    return { ok: false, error: "Could not delete chat." };
  }

  revalidatePath(`/projects/${parsed.data.bookId}`);
  return { ok: true, data: { threadId: parsed.data.threadId } };
}

/**
 * Mention-picker data source. Returns the book's codex entries + its
 * chapters so the UI can fuzzy-match offline. Payload is small
 * enough to keep in memory for a panel session; we don't paginate.
 */
export type MentionCandidate =
  | {
      type: "codex";
      id: string;
      name: string;
      aliases: string[];
      entryType: string;
    }
  | {
      type: "chapter";
      id: string;
      name: string;
      chapterNumber: number;
    };

export async function listMentionCandidates(
  bookId: string,
): Promise<ActionResult<MentionCandidate[]>> {
  if (!UuidSchema.safeParse(bookId).success) {
    return { ok: false, error: "Invalid book id." };
  }
  const guard = await assertBookOwnership(bookId);
  if (!guard.ok) return { ok: false, error: guard.error };

  const supabase = await createClient();
  const [codex, chapters] = await Promise.all([
    supabase
      .from("codex_entries")
      .select("id, name, aliases, entry_type")
      .eq("book_id", bookId)
      .order("name", { ascending: true })
      .limit(500),
    supabase
      .from("chapters")
      .select("id, title, chapter_number")
      .eq("book_id", bookId)
      .order("chapter_number", { ascending: true })
      .limit(500),
  ]);

  if (codex.error) {
    logServerError("chat-threads.mentions.codex", codex.error);
  }
  if (chapters.error) {
    logServerError("chat-threads.mentions.chapters", chapters.error);
  }

  const codexItems: MentionCandidate[] = (codex.data ?? []).map((c) => ({
    type: "codex" as const,
    id: c.id,
    name: c.name,
    aliases: Array.isArray(c.aliases) ? c.aliases : [],
    entryType: c.entry_type,
  }));
  const chapterItems: MentionCandidate[] = (chapters.data ?? []).map((c) => ({
    type: "chapter" as const,
    id: c.id,
    name: c.title || `Chapter ${c.chapter_number}`,
    chapterNumber: c.chapter_number,
  }));

  return { ok: true, data: [...codexItems, ...chapterItems] };
}

function normalizeMentions(
  raw: unknown,
): ChatMessageDTO["mentions"] {
  if (!Array.isArray(raw)) return [];
  const out: ChatMessageDTO["mentions"] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const obj = entry as Record<string, unknown>;
    const type = obj.type;
    const id = obj.id;
    const label = obj.label;
    if ((type !== "codex" && type !== "chapter") || typeof id !== "string") {
      continue;
    }
    out.push({
      type,
      id,
      label: typeof label === "string" ? label : undefined,
    });
  }
  return out;
}
