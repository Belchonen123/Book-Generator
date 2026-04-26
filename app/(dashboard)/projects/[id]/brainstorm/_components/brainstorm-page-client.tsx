"use client";

/**
 * Brainstorm page client — Prompt 8.
 *
 * Three regions: session sidebar on the left, composer on the right,
 * item list below the composer. The page is a single client component
 * because the streaming session and the keeper mutations share a lot
 * of state.
 *
 * Streaming model:
 *   The API returns plain UTF-8 text ("1. …\n2. …\n"). We parse each
 *   completed numbered line as bytes arrive and update the corresponding
 *   pre-provisioned item row. Pre-provisioned item ids come back in the
 *   `X-Brainstorm-Item-Ids` header as a comma-separated list.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  BRAINSTORM_PRESET_IDS,
  BRAINSTORM_PRESETS,
  type BrainstormPresetId,
} from "@/lib/ai/prompt-templates";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Lightbulb,
  Loader2,
  RefreshCw,
  Sparkles,
  Star,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Wand2,
} from "@/lib/lucide-icons";
import { cn } from "@/lib/utils/cn";

import {
  deleteBrainstormSession,
  getBrainstormSession,
  listBrainstormSessions,
  listKeepersForBook,
  setBrainstormItemHidden,
  toggleBrainstormKeeper,
  type BrainstormItemDTO,
  type BrainstormSessionFullDTO,
  type BrainstormSessionListItem,
} from "../actions";

/* ------------------------------------------------------------------ *
 * Types                                                              *
 * ------------------------------------------------------------------ */

type StreamState =
  | { status: "idle" }
  | { status: "streaming"; sessionId: string }
  | { status: "done"; sessionId: string };

export type BrainstormPageClientProps = {
  bookId: string;
  bookTitle: string;
  initialSessions: BrainstormSessionListItem[];
  initialActiveSession: BrainstormSessionFullDTO | null;
  initialKeepers: string[];
};

const NUMBERED_LINE = /^\s*\d+[.)\]]\s+(.+?)\s*$/;

export function BrainstormPageClient({
  bookId,
  bookTitle,
  initialSessions,
  initialActiveSession,
  initialKeepers,
}: BrainstormPageClientProps) {
  const [sessions, setSessions] = useState(initialSessions);
  const [activeSession, setActiveSession] = useState<BrainstormSessionFullDTO | null>(
    initialActiveSession,
  );
  const [presetId, setPresetId] = useState<BrainstormPresetId>(
    (initialActiveSession?.topic as BrainstormPresetId | undefined) ??
      "character-names",
  );
  const [prompt, setPrompt] = useState<string>(() => {
    if (initialActiveSession) return initialActiveSession.prompt;
    return BRAINSTORM_PRESETS["character-names"].starterPrompt;
  });
  const [count, setCount] = useState<number>(10);
  const [stream, setStream] = useState<StreamState>({ status: "idle" });
  const [keepersAcrossBook, setKeepersAcrossBook] = useState<string[]>(initialKeepers);

  const abortRef = useRef<AbortController | null>(null);

  const preset = BRAINSTORM_PRESETS[presetId];

  /* When the user picks a new preset, only reset the prompt if they
   * haven't meaningfully edited the current one (still equal to some
   * preset's starter). Otherwise we'd blow away their typing. */
  const isUntouchedStarter = useMemo(() => {
    for (const id of BRAINSTORM_PRESET_IDS) {
      if (prompt === BRAINSTORM_PRESETS[id].starterPrompt) return true;
    }
    return prompt.trim() === "";
  }, [prompt]);

  const handlePickPreset = useCallback(
    (id: BrainstormPresetId) => {
      setPresetId(id);
      if (isUntouchedStarter) {
        setPrompt(BRAINSTORM_PRESETS[id].starterPrompt);
      }
      setCount(BRAINSTORM_PRESETS[id].defaultCount);
    },
    [isUntouchedStarter],
  );

  /* ------------------------------------------------------------ *
   * Streaming generate                                            *
   * ------------------------------------------------------------ */

  const runBrainstorm = useCallback(
    async (args: {
      useKeepers: boolean;
    }) => {
      if (stream.status === "streaming") return;
      const cleanPrompt = prompt.trim();
      if (!cleanPrompt) {
        toast.error("Type what you want to brainstorm first.");
        return;
      }

      /* Build the keeper example pool. When "generate more like these"
       * is clicked we use the keepers from THIS session if any, else
       * fall back to the book-wide pool. */
      let keepers: string[] = [];
      if (args.useKeepers) {
        const localKeepers = (activeSession?.items ?? [])
          .filter((i) => i.isKeeper && i.content.trim())
          .map((i) => i.content);
        keepers = localKeepers.length > 0 ? localKeepers : keepersAcrossBook;
        if (keepers.length === 0) {
          toast.error(
            "Thumbs-up a few options first, then I can generate more like those.",
          );
          return;
        }
      }

      const controller = new AbortController();
      abortRef.current = controller;

      let res: Response;
      try {
        res = await fetch("/api/ai/brainstorm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            bookId,
            topic: presetId,
            prompt: cleanPrompt,
            count,
            keepers,
          }),
        });
      } catch (err) {
        if ((err as { name?: string } | null)?.name === "AbortError") return;
        toast.error("Brainstorm failed to start. Please try again.");
        return;
      }

      if (!res.ok) {
        let reason = `Could not run brainstorm (HTTP ${res.status}).`;
        const raw = await res.text().catch(() => "");
        if (raw.trim().length > 0) {
          try {
            const parsed = JSON.parse(raw) as { error?: string };
            if (parsed.error?.trim()) {
              reason = parsed.error.trim();
            } else {
              reason = `${reason} ${raw.trim().slice(0, 160)}`;
            }
          } catch {
            reason = `${reason} ${raw.trim().slice(0, 160)}`;
          }
        }
        toast.error(reason);
        return;
      }

      const sessionId = res.headers.get("X-Brainstorm-Session-Id");
      const itemIdsHeader = res.headers.get("X-Brainstorm-Item-Ids");
      if (!sessionId || !itemIdsHeader) {
        toast.error("Server response missing brainstorm metadata.");
        return;
      }
      const itemIds = itemIdsHeader.split(",").filter(Boolean);

      /* Seed the active session with placeholder items so the UI can
       * render them filling in as the stream parses lines. */
      const placeholderItems: BrainstormItemDTO[] = itemIds.map((id, idx) => ({
        id,
        content: "",
        isKeeper: false,
        isHidden: false,
        position: idx,
      }));
      setActiveSession({
        id: sessionId,
        topic: presetId,
        title: `${preset.label} · ${cleanPrompt.split(/\r?\n/)[0].slice(0, 60)}`,
        prompt: cleanPrompt,
        createdAt: new Date().toISOString(),
        items: placeholderItems,
      });
      setStream({ status: "streaming", sessionId });

      await consumeStream(res.body, (parsed) => {
        setActiveSession((prev) => {
          if (!prev || prev.id !== sessionId) return prev;
          return {
            ...prev,
            items: prev.items.map((it) =>
              it.position < parsed.length
                ? { ...it, content: parsed[it.position] ?? it.content }
                : it,
            ),
          };
        });
      });

      setStream({ status: "done", sessionId });

      /* Refresh sidebar counts + prune any placeholder items the model
       * under-filled (the server deletes them on close). */
      const [sessRes, sessionRes] = await Promise.all([
        listBrainstormSessions(bookId),
        getBrainstormSession(bookId, sessionId),
      ]);
      if (sessRes.ok) setSessions(sessRes.data);
      if (sessionRes.ok) setActiveSession(sessionRes.data);
    },
    [
      activeSession,
      bookId,
      count,
      keepersAcrossBook,
      presetId,
      preset.label,
      prompt,
      stream.status,
    ],
  );

  /* ------------------------------------------------------------ *
   * Item mutations                                                *
   * ------------------------------------------------------------ */

  const updateItemLocal = useCallback(
    (itemId: string, patch: Partial<BrainstormItemDTO>) => {
      setActiveSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((it) =>
            it.id === itemId ? { ...it, ...patch } : it,
          ),
        };
      });
    },
    [],
  );

  const handleToggleKeeper = useCallback(
    async (item: BrainstormItemDTO) => {
      if (!activeSession) return;
      const nextKeeper = !item.isKeeper;
      updateItemLocal(item.id, {
        isKeeper: nextKeeper,
        isHidden: nextKeeper ? false : item.isHidden,
      });
      const res = await toggleBrainstormKeeper({
        bookId,
        sessionId: activeSession.id,
        itemId: item.id,
        isKeeper: nextKeeper,
      });
      if (!res.ok) {
        toast.error(res.error);
        updateItemLocal(item.id, {
          isKeeper: item.isKeeper,
          isHidden: item.isHidden,
        });
        return;
      }
      /* Keep keeper counts on the sidebar in sync. */
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id
            ? {
                ...s,
                keeperCount: Math.max(
                  0,
                  s.keeperCount + (nextKeeper ? 1 : -1),
                ),
              }
            : s,
        ),
      );
    },
    [activeSession, bookId, updateItemLocal],
  );

  const handleHide = useCallback(
    async (item: BrainstormItemDTO) => {
      if (!activeSession) return;
      /* Thumbs-down always hides (no toggle). Authors un-hide by
       * thumbs-up — cleaner mental model than a three-state toggle. */
      updateItemLocal(item.id, { isHidden: true, isKeeper: false });
      const res = await setBrainstormItemHidden({
        bookId,
        sessionId: activeSession.id,
        itemId: item.id,
        isHidden: true,
      });
      if (!res.ok) {
        toast.error(res.error);
        updateItemLocal(item.id, {
          isHidden: item.isHidden,
          isKeeper: item.isKeeper,
        });
      }
    },
    [activeSession, bookId, updateItemLocal],
  );

  /* ------------------------------------------------------------ *
   * Sidebar navigation                                            *
   * ------------------------------------------------------------ */

  const handlePickSession = useCallback(
    async (sessionId: string) => {
      if (activeSession?.id === sessionId) return;
      const res = await getBrainstormSession(bookId, sessionId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setActiveSession(res.data);
      setPresetId(
        (BRAINSTORM_PRESET_IDS as readonly string[]).includes(res.data.topic)
          ? (res.data.topic as BrainstormPresetId)
          : "custom",
      );
      setPrompt(res.data.prompt);
      setStream({ status: "done", sessionId });
    },
    [activeSession, bookId],
  );

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      if (!window.confirm("Delete this brainstorm session? This cannot be undone.")) {
        return;
      }
      const res = await deleteBrainstormSession({ bookId, sessionId });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSession?.id === sessionId) {
        setActiveSession(null);
        setStream({ status: "idle" });
      }
    },
    [activeSession?.id, bookId],
  );

  const handleNewBrainstorm = useCallback(() => {
    abortRef.current?.abort();
    setActiveSession(null);
    setStream({ status: "idle" });
    setPrompt(BRAINSTORM_PRESETS[presetId].starterPrompt);
  }, [presetId]);

  /* Refresh the book-wide keeper pool whenever a session closes. Lets
   * "more like keepers" fall back to the full pool even if the current
   * session has no thumbs-ups yet. */
  useEffect(() => {
    if (stream.status !== "done") return;
    let cancelled = false;
    void (async () => {
      const res = await listKeepersForBook(bookId);
      if (!cancelled && res.ok) setKeepersAcrossBook(res.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId, stream.status]);

  /* ------------------------------------------------------------ *
   * Render                                                        *
   * ------------------------------------------------------------ */

  const items = activeSession?.items ?? [];
  const keepers = items.filter((i) => i.isKeeper);
  const restVisible = items.filter((i) => !i.isKeeper && !i.isHidden);
  const hidden = items.filter((i) => i.isHidden);
  const isStreaming = stream.status === "streaming";

  return (
    <div className="flex h-[calc(100dvh-2rem)] flex-col gap-4 p-4 sm:p-6 lg:flex-row">
      {/* Sidebar: session history */}
      <aside className="shrink-0 rounded-lg border border-border/60 bg-card/40 lg:w-72">
        <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
          <h2 className="flex items-center gap-2 font-serif text-sm text-editorial-cream">
            <Lightbulb className="h-4 w-4 text-gold" aria-hidden />
            Past brainstorms
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleNewBrainstorm}
            className="text-editorial-muted hover:text-gold"
          >
            + New
          </Button>
        </div>
        <div className="max-h-64 overflow-y-auto lg:max-h-[calc(100dvh-10rem)]">
          {sessions.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-editorial-muted">
              No sessions yet. Pick a topic and generate your first list.
            </p>
          ) : (
            <ul>
              {sessions.map((s) => {
                const isActive = s.id === activeSession?.id;
                return (
                  <li key={s.id}>
                    <div
                      className={cn(
                        "group flex items-start gap-2 border-b border-border/30 px-3 py-2 text-sm",
                        isActive
                          ? "bg-gold/15 text-editorial-cream"
                          : "text-editorial-muted hover:bg-muted/30 hover:text-editorial-cream",
                      )}
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => void handlePickSession(s.id)}
                      >
                        <span className="block truncate font-medium">
                          {s.title ?? BRAINSTORM_PRESETS[s.topic as BrainstormPresetId]?.label ?? s.topic}
                        </span>
                        <span className="mt-0.5 block text-[10px] text-editorial-muted">
                          {s.keeperCount > 0 ? (
                            <>
                              <Star
                                className="mr-0.5 inline h-2.5 w-2.5 text-gold"
                                aria-hidden
                              />
                              {s.keeperCount} keeper
                              {s.keeperCount === 1 ? "" : "s"} ·{" "}
                            </>
                          ) : null}
                          {s.itemCount} total
                        </span>
                      </button>
                      <button
                        type="button"
                        className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-400"
                        onClick={() => void handleDeleteSession(s.id)}
                        aria-label="Delete session"
                        title="Delete"
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
      </aside>

      {/* Main column: composer + items */}
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <header>
          <h1 className="font-serif text-2xl text-editorial-cream">
            Brainstorm
          </h1>
          <p className="mt-1 text-sm text-editorial-muted">
            Ask for {count} options about{" "}
            <span className="text-editorial-cream">{bookTitle}</span>. Thumbs-up the
            keepers — they save to this project.
          </p>
        </header>

        {/* Preset picker */}
        <div className="flex flex-wrap gap-2">
          {BRAINSTORM_PRESET_IDS.map((id) => {
            const p = BRAINSTORM_PRESETS[id];
            const active = presetId === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handlePickPreset(id)}
                title={p.description}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  active
                    ? "border-gold bg-gold/20 text-editorial-cream"
                    : "border-border/60 bg-editorial-bg/60 text-editorial-muted hover:border-gold/60 hover:text-editorial-cream",
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Composer */}
        <div className="rounded-lg border border-border/60 bg-editorial-bg/40 p-3">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder={preset.starterPrompt || "Describe what you want to brainstorm…"}
            className="min-h-[100px] resize-none text-sm"
            disabled={isStreaming}
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-editorial-muted">
              Count
              <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                disabled={isStreaming}
                className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs text-foreground"
              >
                {[5, 8, 10, 12, 15, 20].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>

            <div className="ml-auto flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void runBrainstorm({ useKeepers: true })}
                disabled={isStreaming || keepers.length === 0}
                className="gap-1 text-editorial-muted hover:text-gold"
                title={
                  keepers.length === 0
                    ? "Thumbs-up at least one option first"
                    : `Generate ${count} more like the ${keepers.length} keeper${keepers.length === 1 ? "" : "s"} above`
                }
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                More like keepers
              </Button>
              <Button
                type="button"
                onClick={() => void runBrainstorm({ useKeepers: false })}
                disabled={isStreaming || !prompt.trim()}
                className="gap-1.5"
              >
                {isStreaming ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <Wand2 className="h-3.5 w-3.5" aria-hidden />
                )}
                Generate {count}
              </Button>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="min-h-[220px] flex-1 overflow-y-auto rounded-lg border border-border/60 bg-editorial-bg/30 p-3">
          {items.length === 0 ? (
            <EmptyPrompt presetLabel={preset.label} />
          ) : (
            <div className="flex flex-col gap-4">
              {keepers.length > 0 ? (
                <ItemSection
                  title="Keepers"
                  subtitle="Saved to this project — used as examples when you 'generate more like keepers'."
                  items={keepers}
                  onToggleKeeper={handleToggleKeeper}
                  onHide={handleHide}
                  accent="keeper"
                />
              ) : null}
              <ItemSection
                title={keepers.length > 0 ? "Options" : "Generated options"}
                items={restVisible}
                onToggleKeeper={handleToggleKeeper}
                onHide={handleHide}
                streaming={isStreaming}
              />
              {hidden.length > 0 ? (
                <details className="rounded-md border border-border/40 bg-editorial-bg/40 p-2 text-xs text-editorial-muted">
                  <summary className="cursor-pointer select-none">
                    {hidden.length} hidden{" "}
                    {hidden.length === 1 ? "option" : "options"}
                  </summary>
                  <div className="mt-2">
                    <ItemSection
                      title=""
                      items={hidden}
                      onToggleKeeper={handleToggleKeeper}
                      onHide={handleHide}
                      muted
                    />
                  </div>
                </details>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Subcomponents                                                      *
 * ------------------------------------------------------------------ */

function ItemSection({
  title,
  subtitle,
  items,
  onToggleKeeper,
  onHide,
  streaming,
  accent,
  muted,
}: {
  title: string;
  subtitle?: string;
  items: BrainstormItemDTO[];
  onToggleKeeper: (item: BrainstormItemDTO) => Promise<void> | void;
  onHide: (item: BrainstormItemDTO) => Promise<void> | void;
  streaming?: boolean;
  accent?: "keeper";
  muted?: boolean;
}) {
  if (items.length === 0 && !streaming) return null;
  return (
    <section>
      {title ? (
        <header className="mb-1.5 flex items-baseline justify-between">
          <h3
            className={cn(
              "font-serif text-sm uppercase tracking-wider",
              accent === "keeper" ? "text-gold" : "text-editorial-cream",
            )}
          >
            {title}
          </h3>
          {subtitle ? (
            <span className="text-[10px] text-editorial-muted">{subtitle}</span>
          ) : null}
        </header>
      ) : null}
      <ol className="flex flex-col gap-1.5">
        {items.map((item, idx) => (
          <li
            key={item.id}
            className={cn(
              "group flex items-start gap-2 rounded-md border px-3 py-2 text-sm transition",
              item.isKeeper
                ? "border-gold/60 bg-gold/10"
                : "border-border/50 bg-editorial-bg/60",
              muted && "opacity-70",
            )}
          >
            <span className="mt-0.5 w-6 shrink-0 font-mono text-[11px] text-editorial-muted">
              {item.position + 1}.
            </span>
            <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-editorial-cream">
              {item.content || (streaming ? "…" : <em className="text-editorial-muted">(empty)</em>)}
            </p>
            <div className="shrink-0 flex items-center gap-1 opacity-60 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={() => void onToggleKeeper(item)}
                className={cn(
                  "rounded-md p-1.5 transition",
                  item.isKeeper
                    ? "bg-gold text-editorial-bg hover:opacity-90"
                    : "text-editorial-muted hover:bg-muted/40 hover:text-gold",
                )}
                title={item.isKeeper ? "Remove from keepers" : "Save as keeper"}
                aria-pressed={item.isKeeper}
                aria-label="Thumbs up"
              >
                {item.isKeeper ? (
                  <Star className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <ThumbsUp className="h-3.5 w-3.5" aria-hidden />
                )}
              </button>
              <button
                type="button"
                onClick={() => void onHide(item)}
                className="rounded-md p-1.5 text-editorial-muted transition hover:bg-muted/40 hover:text-rose-400"
                title="Hide this option"
                aria-label="Thumbs down"
                disabled={item.isHidden}
              >
                <ThumbsDown className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function EmptyPrompt({ presetLabel }: { presetLabel: string }) {
  return (
    <div className="mx-auto flex min-h-[180px] max-w-sm flex-col items-center justify-center text-center">
      <Sparkles className="mx-auto h-6 w-6 text-gold/80" aria-hidden />
      <p className="mt-2 font-serif text-base text-editorial-cream">
        Pick a topic, hit Generate.
      </p>
      <p className="mt-1 text-xs text-editorial-muted">
        {presetLabel} will stream in as a numbered list. Thumbs-up the keepers —
        they save to this project and can seed future brainstorms.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Stream parsing                                                     *
 * ------------------------------------------------------------------ */

async function consumeStream(
  body: ReadableStream<Uint8Array> | null,
  onParsed: (items: string[]) => void,
): Promise<void> {
  if (!body) return;
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        accumulated += decoder.decode(value, { stream: true });
        onParsed(parseLines(accumulated));
      }
    }
    const tail = decoder.decode();
    if (tail) {
      accumulated += tail;
      onParsed(parseLines(accumulated));
    }
  } finally {
    reader.releaseLock();
  }
}

function parseLines(raw: string): string[] {
  const out: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const m = NUMBERED_LINE.exec(line);
    if (m) out.push(m[1].trim());
  }
  return out;
}
