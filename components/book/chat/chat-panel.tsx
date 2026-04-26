"use client";

/**
 * Story chat panel — Prompt 7.
 *
 * Slide-in right sidebar toggled from the chapter-editor toolbar. Talks
 * to:
 *   - `/api/ai/chat` (streaming) for new turns
 *   - `chat-threads-actions.ts` (server actions) for thread lifecycle
 *     + mention candidate listing
 *
 * Design choices:
 *   - One component owns the entire panel: thread list, message view,
 *     composer, mention picker. Keeps the streaming bookkeeping local
 *     and lets us avoid context-plumbing through three layers.
 *   - Streaming uses a vanilla fetch + ReadableStream reader (not
 *     `useChat`) — the server route already handles persistence, and
 *     the custom response headers pass back thread / message ids we
 *     need to reconcile the optimistic UI.
 *   - Mention chips are rendered as pills in the composer preview
 *     strip (not inline in the textarea). Browser textareas can't host
 *     rich content; we keep the @-tokens as plain `@Name` strings in
 *     the text and send the resolved `mentions` array alongside.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  BookOpen,
  History,
  Library,
  Loader2,
  MessageSquareText,
  Pencil,
  Plus,
  Send,
  Trash2,
  X,
} from "@/lib/lucide-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";

import {
  deleteChatThread,
  getThreadMessages,
  listChatThreads,
  listMentionCandidates,
  renameChatThread,
  type ChatMessageDTO,
  type ChatThreadListItem,
  type MentionCandidate,
} from "@/app/(dashboard)/projects/[id]/chapters/[chapterId]/_actions/chat-threads-actions";

import { filterAndSort, MentionPicker } from "./mention-picker";

/* ------------------------------------------------------------------ *
 * Types                                                              *
 * ------------------------------------------------------------------ */

type StoredMention = { type: "codex" | "chapter"; id: string; label?: string };

type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  mentions: StoredMention[];
  /** True while the assistant message is still streaming in. */
  streaming?: boolean;
};

export type ChatPanelProps = {
  bookId: string;
  chapterId: string | null;
  chapterTitle?: string | null;
  chapterNumber?: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/* ------------------------------------------------------------------ *
 * Component                                                          *
 * ------------------------------------------------------------------ */

export function ChatPanel({
  bookId,
  chapterId,
  chapterTitle,
  chapterNumber,
  open,
  onOpenChange,
}: ChatPanelProps) {
  const [threads, setThreads] = useState<ChatThreadListItem[]>([]);
  const [threadsLoaded, setThreadsLoaded] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [input, setInput] = useState("");
  const [pendingMentions, setPendingMentions] = useState<StoredMention[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [candidates, setCandidates] = useState<MentionCandidate[]>([]);

  /* Mention picker state. `start` records the position of the `@` in
   * the textarea so we can delete the partial query and insert the
   * chip label in one splice. */
  const [mentionState, setMentionState] = useState<{
    start: number;
    query: string;
  } | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /* ------------------------------------------------------------ *
   * Initial loads (threads + mention candidates) when panel opens.
   * ------------------------------------------------------------ */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const [threadsRes, candidatesRes] = await Promise.all([
        listChatThreads(bookId),
        listMentionCandidates(bookId),
      ]);
      if (cancelled) return;
      if (threadsRes.ok) setThreads(threadsRes.data);
      setThreadsLoaded(true);
      if (candidatesRes.ok) setCandidates(candidatesRes.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, bookId]);

  /* Abort any in-flight stream when the panel closes or unmounts. */
  useEffect(() => {
    if (open) return;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, [open]);

  /* Hydrate messages when the author picks a thread. */
  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await getThreadMessages(bookId, activeThreadId);
      if (cancelled) return;
      if (res.ok) {
        setMessages(
          res.data
            .filter(
              (m): m is ChatMessageDTO & { role: "user" | "assistant" } =>
                m.role !== "system",
            )
            .map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              mentions: m.mentions,
            })),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeThreadId, bookId]);

  /* Auto-scroll the message list whenever messages change. */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ------------------------------------------------------------ *
   * Mention picker wiring                                         *
   * ------------------------------------------------------------ */

  const filteredMentions = useMemo(() => {
    if (!mentionState) return [];
    return filterAndSort(candidates, mentionState.query).slice(0, 12);
  }, [mentionState, candidates]);

  const updateMentionStateFromCaret = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const caret = el.selectionStart ?? 0;
    const text = el.value;
    /* Walk back from caret to find the most recent `@`. Stop at
     * whitespace or sentence boundary. */
    let i = caret - 1;
    while (i >= 0 && !/[\s@]/.test(text[i])) i--;
    if (i < 0 || text[i] !== "@") {
      setMentionState(null);
      return;
    }
    /* Require `@` to be preceded by whitespace or start-of-text so
     * emails ("me@foo.com") don't trigger the picker. */
    const prev = i === 0 ? "" : text[i - 1];
    if (prev && !/\s/.test(prev)) {
      setMentionState(null);
      return;
    }
    const query = text.slice(i + 1, caret);
    if (/\s/.test(query)) {
      setMentionState(null);
      return;
    }
    setMentionState({ start: i, query });
    setMentionIndex(0);
  }, []);

  const insertMention = useCallback(
    (candidate: MentionCandidate) => {
      if (!mentionState) return;
      const el = textareaRef.current;
      if (!el) return;
      const text = el.value;
      const caret = el.selectionStart ?? text.length;
      const label =
        candidate.type === "chapter"
          ? `Ch${candidate.chapterNumber}: ${candidate.name}`
          : candidate.name;
      const chip = `@${label} `;
      const before = text.slice(0, mentionState.start);
      const after = text.slice(caret);
      const next = `${before}${chip}${after}`;
      setInput(next);
      setPendingMentions((prev) => {
        if (prev.some((m) => m.id === candidate.id && m.type === candidate.type)) {
          return prev;
        }
        return [
          ...prev,
          { type: candidate.type, id: candidate.id, label },
        ];
      });
      setMentionState(null);
      /* Restore caret after React commits. */
      requestAnimationFrame(() => {
        el.focus();
        const pos = before.length + chip.length;
        el.setSelectionRange(pos, pos);
      });
    },
    [mentionState],
  );

  /* ------------------------------------------------------------ *
   * Send / streaming                                              *
   * ------------------------------------------------------------ */

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    /* Resolve which mentions actually survive — the author may have
     * typed an @chip then backspaced part of its label. We keep a
     * mention only if its label still appears in the message text. */
    const surviving = pendingMentions.filter((m) =>
      m.label ? trimmed.includes(`@${m.label}`) : true,
    );

    setIsSending(true);
    const tempUserId = `tmp-u-${Date.now()}`;
    const tempAssistantId = `tmp-a-${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      {
        id: tempUserId,
        role: "user",
        content: trimmed,
        mentions: surviving,
      },
      {
        id: tempAssistantId,
        role: "assistant",
        content: "",
        mentions: [],
        streaming: true,
      },
    ]);

    setInput("");
    setPendingMentions([]);
    setMentionState(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          bookId,
          chapterId,
          threadId: activeThreadId,
          userMessage: trimmed,
          mentions: surviving,
        }),
      });

      if (!res.ok) {
        let reason = "The assistant is unavailable.";
        try {
          const json = (await res.json()) as { error?: string };
          if (json.error) reason = json.error;
        } catch {
          /* body wasn't JSON */
        }
        toast.error(reason);
        setMessages((prev) => prev.filter((m) => m.id !== tempAssistantId));
        return;
      }

      const threadIdFromServer = res.headers.get("X-Chat-Thread-Id");
      const assistantNewContent = await readStream(
        res.body,
        (chunk) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempAssistantId
                ? { ...m, content: m.content + chunk }
                : m,
            ),
          );
        },
      );

      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempAssistantId
            ? {
                ...m,
                content: assistantNewContent,
                streaming: false,
              }
            : m,
        ),
      );

      if (threadIdFromServer && threadIdFromServer !== activeThreadId) {
        setActiveThreadId(threadIdFromServer);
      }

      /* Refresh threads list so the title + updatedAt reflect the new
       * turn (and any auto-titling that fired on the server). */
      const refreshed = await listChatThreads(bookId);
      if (refreshed.ok) setThreads(refreshed.data);
    } catch (err) {
      if ((err as { name?: string } | null)?.name === "AbortError") {
        return;
      }
      toast.error("Chat failed. Please try again.");
      setMessages((prev) => prev.filter((m) => m.id !== tempAssistantId));
    } finally {
      setIsSending(false);
      abortControllerRef.current = null;
    }
  }, [activeThreadId, bookId, chapterId, input, isSending, pendingMentions]);

  const handleNewThread = useCallback(() => {
    abortControllerRef.current?.abort();
    setActiveThreadId(null);
    setMessages([]);
    setInput("");
    setPendingMentions([]);
    setDrawerOpen(false);
    textareaRef.current?.focus();
  }, []);

  const handleDeleteThread = useCallback(
    async (threadId: string) => {
      if (!window.confirm("Delete this chat? This cannot be undone.")) return;
      const res = await deleteChatThread({ bookId, threadId });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
      if (activeThreadId === threadId) {
        setActiveThreadId(null);
        setMessages([]);
      }
    },
    [activeThreadId, bookId],
  );

  const handleRenameThread = useCallback(
    async (threadId: string, title: string) => {
      const clean = title.trim();
      if (!clean) return;
      const res = await renameChatThread({ bookId, threadId, title: clean });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, title: clean } : t)),
      );
    },
    [bookId],
  );

  /* ------------------------------------------------------------ *
   * Render                                                        *
   * ------------------------------------------------------------ */

  if (!open) return null;

  return (
    <>
      {/* Backdrop on mobile — desktop is push-style so authors see the
          editor next to the chat. */}
      <div
        className="fixed inset-0 z-30 bg-black/40 md:hidden"
        onClick={() => onOpenChange(false)}
        aria-hidden
      />
      <aside
        className={cn(
          "fixed right-0 top-0 z-40 flex h-full w-full max-w-[420px] flex-col border-l border-border/70 bg-editorial-bg shadow-xl",
          "md:shadow-none",
        )}
        aria-label="Story chat"
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
          <MessageSquareText className="h-4 w-4 text-gold" aria-hidden />
          <h2 className="flex-1 truncate font-serif text-sm text-editorial-cream">
            {activeThreadTitle(threads, activeThreadId) ?? "New chat"}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDrawerOpen((v) => !v)}
            aria-pressed={drawerOpen}
            title="Chat history"
            className="text-editorial-muted hover:text-gold"
          >
            <History className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleNewThread}
            title="New chat"
            className="text-editorial-muted hover:text-gold"
          >
            <Plus className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            title="Close"
            className="text-editorial-muted hover:text-gold"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>

        {/* Thread drawer */}
        {drawerOpen ? (
          <ThreadDrawer
            threads={threads}
            loaded={threadsLoaded}
            activeThreadId={activeThreadId}
            onPick={(id) => {
              setActiveThreadId(id);
              setDrawerOpen(false);
            }}
            onDelete={handleDeleteThread}
            onRename={handleRenameThread}
          />
        ) : (
          <>
            {/* Context hint (which chapter is active) */}
            {chapterId ? (
              <div className="border-b border-border/40 bg-editorial-bg/60 px-3 py-1.5 text-[11px] text-editorial-muted">
                Grounded in{" "}
                <span className="text-editorial-cream">
                  {chapterNumber ? `Chapter ${chapterNumber}` : "this chapter"}
                  {chapterTitle ? ` · ${chapterTitle}` : ""}
                </span>
                , the book outline, codex, and voice.
              </div>
            ) : null}

            {/* Message list */}
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              {messages.length === 0 ? (
                <EmptyState chapterTitle={chapterTitle ?? null} />
              ) : (
                <ul className="flex flex-col gap-3">
                  {messages.map((m) => (
                    <MessageBubble key={m.id} message={m} />
                  ))}
                </ul>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Mention chip strip */}
            {pendingMentions.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 border-t border-border/40 bg-editorial-bg/40 px-3 py-2">
                {pendingMentions.map((m) => (
                  <span
                    key={`${m.type}-${m.id}`}
                    className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[11px] font-medium text-editorial-cream"
                  >
                    {m.type === "chapter" ? (
                      <BookOpen className="h-3 w-3" aria-hidden />
                    ) : (
                      <Library className="h-3 w-3" aria-hidden />
                    )}
                    {m.label ?? "@mention"}
                    <button
                      type="button"
                      onClick={() =>
                        setPendingMentions((prev) =>
                          prev.filter((p) => p.id !== m.id),
                        )
                      }
                      className="ml-0.5 text-editorial-muted hover:text-rose-300"
                      aria-label={`Remove mention ${m.label ?? ""}`}
                    >
                      <X className="h-3 w-3" aria-hidden />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}

            {/* Composer */}
            <div className="relative border-t border-border/60 bg-editorial-bg/70 px-3 py-2">
              {mentionState ? (
                <MentionPicker
                  candidates={candidates}
                  query={mentionState.query}
                  activeIndex={mentionIndex}
                  onActiveIndexChange={setMentionIndex}
                  onPick={insertMention}
                  onCancel={() => setMentionState(null)}
                />
              ) : null}
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  updateMentionStateFromCaret();
                }}
                onKeyDown={(e) => {
                  if (mentionState && filteredMentions.length > 0) {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setMentionIndex((i) =>
                        Math.min(filteredMentions.length - 1, i + 1),
                      );
                      return;
                    }
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setMentionIndex((i) => Math.max(0, i - 1));
                      return;
                    }
                    if (e.key === "Enter" || e.key === "Tab") {
                      e.preventDefault();
                      const picked = filteredMentions[mentionIndex];
                      if (picked) insertMention(picked);
                      return;
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setMentionState(null);
                      return;
                    }
                  }
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    !e.metaKey &&
                    !e.ctrlKey
                  ) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                onClick={updateMentionStateFromCaret}
                onKeyUp={updateMentionStateFromCaret}
                rows={3}
                placeholder="Ask about a character, brainstorm options, or @mention a codex entry…"
                className="min-h-[80px] resize-none pr-12 text-sm"
                disabled={isSending}
              />
              <Button
                type="button"
                size="sm"
                className="absolute bottom-4 right-5"
                onClick={() => void handleSend()}
                disabled={!input.trim() || isSending}
                aria-label="Send message"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Send className="h-4 w-4" aria-hidden />
                )}
              </Button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Subcomponents                                                      *
 * ------------------------------------------------------------------ */

function MessageBubble({ message }: { message: UiMessage }) {
  const isUser = message.role === "user";
  return (
    <li
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
          isUser
            ? "bg-gold text-editorial-bg"
            : "bg-editorial-cream/95 text-editorial-bg",
        )}
      >
        <p className="whitespace-pre-wrap break-words">
          {message.content || (message.streaming ? "…" : "")}
        </p>
        {message.mentions.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.mentions.map((m) => (
              <span
                key={`${m.type}-${m.id}`}
                className="inline-flex items-center gap-1 rounded-full bg-editorial-bg/10 px-1.5 py-0.5 text-[10px] font-medium"
              >
                {m.type === "chapter" ? (
                  <BookOpen className="h-2.5 w-2.5" aria-hidden />
                ) : (
                  <Library className="h-2.5 w-2.5" aria-hidden />
                )}
                {m.label ?? m.type}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </li>
  );
}

function EmptyState({ chapterTitle }: { chapterTitle: string | null }) {
  const suggestions = [
    chapterTitle
      ? `What's the emotional arc of "${chapterTitle}"?`
      : "What's the emotional arc of this chapter?",
    "Brainstorm 5 options for the climax.",
    "What's @Marcus's motivation here?",
  ];
  return (
    <div className="mx-auto mt-6 max-w-sm text-center">
      <p className="font-serif text-base text-editorial-cream">
        Ask me anything about your book.
      </p>
      <p className="mt-1 text-xs text-editorial-muted">
        I can see your outline, codex, recent prose, and voice. Start with a
        question or pick one of these:
      </p>
      <ul className="mt-4 space-y-1.5 text-left">
        {suggestions.map((s) => (
          <li
            key={s}
            className="rounded-md border border-border/50 bg-editorial-bg/60 px-3 py-2 text-xs text-editorial-muted"
          >
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ThreadDrawer({
  threads,
  loaded,
  activeThreadId,
  onPick,
  onDelete,
  onRename,
}: {
  threads: ChatThreadListItem[];
  loaded: boolean;
  activeThreadId: string | null;
  onPick: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}) {
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {!loaded ? (
        <div className="flex items-center justify-center py-8 text-xs text-editorial-muted">
          <Loader2 className="mr-2 h-3 w-3 animate-spin" aria-hidden />
          Loading chats…
        </div>
      ) : threads.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-editorial-muted">
          No chats yet. Ask your first question and a thread will show up
          here.
        </p>
      ) : (
        <ul className="py-1">
          {threads.map((t) => {
            const isActive = t.id === activeThreadId;
            const isRenaming = renameId === t.id;
            return (
              <li key={t.id}>
                <div
                  className={cn(
                    "group flex items-center gap-2 border-b border-border/30 px-3 py-2 text-sm",
                    isActive
                      ? "bg-gold/15 text-editorial-cream"
                      : "text-editorial-muted hover:bg-muted/30 hover:text-editorial-cream",
                  )}
                >
                  {isRenaming ? (
                    <form
                      className="flex flex-1 items-center gap-1"
                      onSubmit={(e) => {
                        e.preventDefault();
                        onRename(t.id, renameValue);
                        setRenameId(null);
                      }}
                    >
                      <Input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="h-7 text-xs"
                        onBlur={() => setRenameId(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setRenameId(null);
                        }}
                      />
                    </form>
                  ) : (
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate text-left"
                      onClick={() => onPick(t.id)}
                    >
                      <span className="truncate font-medium">
                        {t.title ?? "Untitled chat"}
                      </span>
                      <span className="ml-1 text-[10px] text-editorial-muted">
                        {t.messageCount} msg
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 hover:text-gold"
                    onClick={() => {
                      setRenameId(t.id);
                      setRenameValue(t.title ?? "");
                    }}
                    title="Rename"
                    aria-label="Rename chat"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-400"
                    onClick={() => onDelete(t.id)}
                    title="Delete"
                    aria-label="Delete chat"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Utilities                                                          *
 * ------------------------------------------------------------------ */

function activeThreadTitle(
  threads: ChatThreadListItem[],
  activeId: string | null,
): string | null {
  if (!activeId) return null;
  const thread = threads.find((t) => t.id === activeId);
  return thread?.title ?? null;
}

async function readStream(
  body: ReadableStream<Uint8Array> | null,
  onChunk: (chunk: string) => void,
): Promise<string> {
  if (!body) return "";
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (chunk) {
        accumulated += chunk;
        onChunk(chunk);
      }
    }
    const tail = decoder.decode();
    if (tail) {
      accumulated += tail;
      onChunk(tail);
    }
  } finally {
    reader.releaseLock();
  }
  return accumulated;
}
