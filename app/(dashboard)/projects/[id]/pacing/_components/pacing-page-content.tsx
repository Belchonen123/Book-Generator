"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { AnalyzeBeatsResponseBody } from "@/app/api/ai/analyze-beats/route";
import { BeatsMap, type BeatsMapChapter } from "@/components/book/BeatsMap";
import { pacingCallToAction } from "@/lib/beats/pacing-cta";
import { ApiErrorCode } from "@/lib/utils/errors";
import { Loader2 } from "@/lib/lucide-icons";

type ChapterRow = {
  id: string;
  title: string;
  chapter_number: number;
  content: string | null;
};

type RowStatus = "pending" | "loading" | "done" | "error";

type RowState = {
  status: RowStatus;
  data?: AnalyzeBeatsResponseBody;
  errorMessage?: string;
  code?: string;
};

function mergeStates(
  prev: Record<string, RowState>,
  id: string,
  patch: RowState,
): Record<string, RowState> {
  return { ...prev, [id]: { ...prev[id], ...patch } };
}

export function PacingPageContent({
  bookId,
  chapters,
}: {
  bookId: string;
  chapters: ChapterRow[];
}) {
  const [rowState, setRowState] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(chapters.map((c) => [c.id, { status: "pending" as const }])),
  );
  const [doneCount, setDoneCount] = useState(0);

  const runChunk = useCallback(
    async (id: string) => {
      setRowState((s) => mergeStates(s, id, { status: "loading" }));
      const res = await fetch("/api/ai/analyze-beats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, chapterId: id }),
      });
      const body = (await res.json().catch(() => ({}))) as
        | AnalyzeBeatsResponseBody
        | { error?: string; code?: string };
      if (!res.ok) {
        const err = body as { error?: string; code?: string };
        const msg =
          res.status === 403 && err.code === ApiErrorCode.UPGRADE_REQUIRED
            ? "Pacing map is a Pro feature."
            : (err.error ?? "Could not analyze beats.");
        setRowState((s) =>
          mergeStates(s, id, { status: "error", errorMessage: msg, code: err.code }),
        );
        return;
      }
      setRowState((s) => mergeStates(s, id, { status: "done", data: body as AnalyzeBeatsResponseBody }));
    },
    [bookId],
  );

  const chapterOrderKey = useMemo(() => chapters.map((c) => c.id).join(","), [chapters]);

  useEffect(() => {
    if (chapters.length === 0) return;
    const queue = chapters.map((c) => c.id);
    let cancelled = false;
    const runOne = async (id: string) => {
      try {
        await runChunk(id);
      } finally {
        if (!cancelled) {
          setDoneCount((d) => d + 1);
        }
      }
    };
    const worker = async () => {
      while (!cancelled && queue.length > 0) {
        const id = queue.shift();
        if (!id) break;
        await runOne(id);
      }
    };
    void Promise.all([worker(), worker()]);
    return () => {
      cancelled = true;
    };
  }, [bookId, chapterOrderKey, chapters, runChunk]);

  const mapChapters: BeatsMapChapter[] = useMemo(() => {
    return chapters
      .map((c) => {
        const st = rowState[c.id];
        if (st?.status !== "done" || !st.data) {
          return {
            id: c.id,
            title: c.title,
            number: c.chapter_number,
            beats: [],
            totalParagraphs: 0,
          };
        }
        return {
          id: c.id,
          title: c.title,
          number: c.chapter_number,
          beats: st.data.beats,
          totalParagraphs: st.data.totalParagraphs,
        };
      })
      .filter((c) => c.beats.length > 0);
  }, [chapters, rowState]);

  const ctas = useMemo(() => {
    const out: string[] = [];
    for (const c of chapters) {
      const st = rowState[c.id];
      if (st?.status !== "done" || !st.data) continue;
      const raw = c.content?.trim() ?? "";
      if (!raw) continue;
      const line = pacingCallToAction(c.chapter_number, raw, st.data.beats);
      if (line) out.push(line);
    }
    return out;
  }, [chapters, rowState]);

  const total = chapters.length;
  const progress = total === 0 ? 1 : doneCount / total;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="font-serif text-3xl text-editorial-cream">Pacing & scene beats</h1>
      <p className="mt-2 text-sm text-editorial-muted">
        Fiction only. We map paragraph ranges to beat types, tension, and a tension curve per chapter. Cached
        when text hasn’t changed.
      </p>

      {total > 0 ? (
        <div className="mt-6">
          <div className="mb-1 flex items-center justify-between text-xs text-editorial-muted">
            <span>Analyzing chapters</span>
            <span>
              {Math.min(doneCount, total)}/{total}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted/50">
            <div
              className="h-full bg-gold/80 transition-[width] duration-300"
              style={{ width: `${Math.min(1, progress) * 100}%` }}
            />
          </div>
        </div>
      ) : null}

      {ctas.length > 0 ? (
        <ul className="mt-8 list-disc space-y-2 pl-5 text-sm text-amber-200/90">
          {ctas.map((c) => (
            <li key={c.slice(0, 80)}>{c}</li>
          ))}
        </ul>
      ) : null}

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-editorial-cream">Map</h2>
        {mapChapters.length > 0 ? (
          <div className="mt-4">
            <BeatsMap chapters={mapChapters} />
          </div>
        ) : (
          <p className="mt-2 text-sm text-editorial-muted">Maps appear as each chapter finishes loading.</p>
        )}
      </div>

      <div className="mt-12">
        <h2 className="text-lg font-semibold text-editorial-cream">Per chapter</h2>
        <ul className="mt-4 space-y-3">
          {chapters.map((c) => {
            const st = rowState[c.id] ?? { status: "pending" as const };
            return (
              <li
                key={c.id}
                className="rounded-lg border border-border/50 bg-card/30 px-4 py-3 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-editorial-cream">
                    Chapter {c.chapter_number}: {c.title}
                  </span>
                  {st.status === "loading" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-gold" aria-label="Loading" />
                  ) : null}
                </div>
                {st.status === "error" ? (
                  <p className="mt-1 text-rose-300/90">{st.errorMessage ?? "Error"}</p>
                ) : null}
                {st.status === "done" && st.data ? (
                  <p className="mt-1 text-editorial-muted">
                    {st.data.beats.length} beat{st.data.beats.length === 1 ? "" : "s"}
                    {st.data.cached ? " · from cache" : ""}
                    {st.data.model ? ` · ${st.data.model}` : ""}
                  </p>
                ) : null}
                {st.status === "pending" ? (
                  <p className="mt-1 text-editorial-muted">Waiting…</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
