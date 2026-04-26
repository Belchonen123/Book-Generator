"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Loader2, Mic, Play, Square } from "@/lib/lucide-icons";

import type { ExportChapterRow } from "@/components/book/export/export-types";
import { ProUpgradeModal } from "@/components/subscription/ProUpgradeModal";
import { Button } from "@/components/ui/button";

type PremadeVoice = {
  voiceId: string;
  name: string;
  previewUrl: string | null;
};

type ChapterStateRow = {
  chapterNumber: number;
  title: string;
  state: "pending" | "generating" | "done" | "failed";
};

type AudioExportRow = {
  id: string;
  status: "queued" | "generating" | "ready" | "failed";
  progress: number;
  error: string | null;
  zip_storage_path: string | null;
  total_duration_seconds: number | null;
  voice_id: string;
  voice_name: string;
  chapter_states: unknown;
  created_at: string;
  updated_at: string;
};

function parseChapterStates(raw: unknown): ChapterStateRow[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: ChapterStateRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const chapterNumber = typeof o.chapterNumber === "number" ? o.chapterNumber : null;
    const title = typeof o.title === "string" ? o.title : "";
    const state = o.state;
    if (chapterNumber == null) continue;
    if (
      state !== "pending" &&
      state !== "generating" &&
      state !== "done" &&
      state !== "failed"
    ) {
      continue;
    }
    out.push({ chapterNumber, title, state });
  }
  return out;
}

type AudioExportSectionProps = {
  bookId: string;
  isPro: boolean;
  /** Chapters exist and at least one is draft/edited/approved (same idea as compile). */
  canGenerate: boolean;
  chapters: ExportChapterRow[];
};

function chapterOkForAudio(c: ExportChapterRow): boolean {
  return (
    (c.status === "draft" || c.status === "edited" || c.status === "approved") && c.hasAudioBody
  );
}

function audioChapterHint(c: ExportChapterRow): string | null {
  if (chapterOkForAudio(c)) return null;
  if (c.status === "pending") {
    return "Pending — open this chapter and add or generate text first.";
  }
  if (!c.hasAudioBody) {
    return "No text in this chapter yet.";
  }
  return "This chapter can’t be narrated yet.";
}

function triggerBrowserDownload(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function AudioExportSection({
  bookId,
  isPro,
  canGenerate,
  chapters,
}: AudioExportSectionProps) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [voices, setVoices] = useState<PremadeVoice[] | null>(null);
  const [voicesError, setVoicesError] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<PremadeVoice | null>(null);
  const [exportRow, setExportRow] = useState<AudioExportRow | null>(null);
  const [localProgress, setLocalProgress] = useState(0);
  const [localChapterStates, setLocalChapterStates] = useState<ChapterStateRow[]>([]);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [generateBusy, setGenerateBusy] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null);
  const [trackedExportId, setTrackedExportId] = useState<string | null>(null);
  const audioEls = useRef<Map<string, HTMLAudioElement>>(new Map());

  const audioEligibleChapters = useMemo(
    () => chapters.filter((c) => chapterOkForAudio(c)),
    [chapters],
  );

  const chaptersSorted = useMemo(
    () => [...chapters].sort((a, b) => a.chapter_number - b.chapter_number),
    [chapters],
  );

  const eligibleKey = useMemo(
    () => audioEligibleChapters.map((c) => c.id).join("|"),
    [audioEligibleChapters],
  );

  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedChapterIds(chapters.filter((c) => chapterOkForAudio(c)).map((c) => c.id));
  }, [eligibleKey, chapters]);

  const fetchExport = useCallback(
    async (mergeWithTrackedId?: string): Promise<AudioExportRow | null> => {
      const r = await fetch(`/api/audio/exports?bookId=${encodeURIComponent(bookId)}`, {
        cache: "no-store",
      });
      if (!r.ok) return null;
      const data = (await r.json()) as { export: AudioExportRow | null };
      const exp = data.export;
      setExportRow(exp);
      const t = mergeWithTrackedId ?? trackedExportId;
      if (exp && t && exp.id === t) {
        setLocalProgress((p) => Math.max(p, exp.progress));
        const fromServer = parseChapterStates(exp.chapter_states);
        if (fromServer.length > 0) {
          setLocalChapterStates(fromServer);
        }
      }
      return exp;
    },
    [bookId, trackedExportId],
  );

  useEffect(() => {
    void (async () => {
      setVoicesError(null);
      const r = await fetch("/api/audio/voices", { cache: "no-store" });
      if (r.status === 503) {
        const d = (await r.json().catch(() => ({}))) as { error?: string };
        setVoicesError(d.error ?? "Audiobook is not configured (missing ELEVENLABS_API_KEY).");
        setVoices([]);
        return;
      }
      if (!r.ok) {
        setVoicesError("Could not load voices. Try again later.");
        setVoices([]);
        return;
      }
      const data = (await r.json()) as { voices?: PremadeVoice[] };
      const list = data.voices ?? [];
      setVoices(list);
      setSelectedVoice((cur) =>
        cur ? (list.find((v) => v.voiceId === cur.voiceId) ?? null) : null,
      );
    })();
  }, []);

  const thisRunActiveOnServer = useMemo(
    () =>
      !!trackedExportId &&
      exportRow?.id === trackedExportId &&
      (exportRow.status === "queued" || exportRow.status === "generating"),
    [trackedExportId, exportRow],
  );

  const shouldPoll = useMemo(
    () => thisRunActiveOnServer || generateBusy,
    [thisRunActiveOnServer, generateBusy],
  );

  const showProgressForActiveRun = useMemo(
    () =>
      generateBusy ||
      (!!trackedExportId &&
        exportRow?.id === trackedExportId &&
        (exportRow.status === "queued" ||
          exportRow.status === "generating" ||
          exportRow.status === "failed")),
    [generateBusy, trackedExportId, exportRow],
  );

  useEffect(() => {
    void fetchExport();
  }, [fetchExport]);

  useEffect(() => {
    if (!shouldPoll) {
      return;
    }
    const t = setInterval(() => {
      void fetchExport();
    }, 3000);
    return () => clearInterval(t);
  }, [shouldPoll, fetchExport]);

  const isTrackedRow = useMemo(
    () => !!trackedExportId && exportRow?.id === trackedExportId,
    [trackedExportId, exportRow],
  );

  const displayProgress = useMemo(() => {
    if (generateBusy && !isTrackedRow) {
      return localProgress;
    }
    if (!isTrackedRow && !generateBusy) {
      return 0;
    }
    return Math.max(localProgress, isTrackedRow ? (exportRow?.progress ?? 0) : 0);
  }, [exportRow, localProgress, isTrackedRow, generateBusy]);

  const displayChapterRows = useMemo(() => {
    if (localChapterStates.length) {
      return localChapterStates;
    }
    if (isTrackedRow) {
      return parseChapterStates(exportRow?.chapter_states);
    }
    return [];
  }, [exportRow, localChapterStates, isTrackedRow]);

  const stopAllPreviews = () => {
    audioEls.current.forEach((a) => {
      a.pause();
      a.currentTime = 0;
    });
    setPlayingPreviewId(null);
  };

  const togglePreview = (v: PremadeVoice) => {
    if (!v.previewUrl) return;
    const key = v.voiceId;
    if (playingPreviewId && playingPreviewId !== key) {
      stopAllPreviews();
    }
    const el = audioEls.current.get(key);
    if (!el) return;
    if (playingPreviewId === key) {
      el.pause();
      el.currentTime = 0;
      setPlayingPreviewId(null);
      return;
    }
    setPlayingPreviewId(key);
    void el.play();
  };

  const toggleChapterSelected = (id: string) => {
    setSelectedChapterIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectAllAudioChapters = () => {
    setSelectedChapterIds(audioEligibleChapters.map((c) => c.id));
  };

  const clearAudioChapterSelection = () => {
    setSelectedChapterIds([]);
  };

  const runGenerate = async () => {
    if (!isPro) {
      setUpgradeOpen(true);
      return;
    }
    if (!canGenerate) {
      return;
    }
    if (!selectedVoice) {
      return;
    }
    if (selectedChapterIds.length === 0) {
      setStreamError("Select at least one chapter to narrate.");
      return;
    }
    setTrackedExportId(null);
    setStreamError(null);
    setGenerateBusy(true);
    setLocalProgress(0);
    setLocalChapterStates([]);

    let mergeForFetch: string | undefined;
    try {
      const res = await fetch("/api/audio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId,
          voiceId: selectedVoice.voiceId,
          voiceName: selectedVoice.name,
          chapterIds: selectedChapterIds,
        }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setStreamError(d.error ?? "Generation could not start.");
        setGenerateBusy(false);
        return;
      }
      if (!res.body) {
        setStreamError("No response from server.");
        setGenerateBusy(false);
        return;
      }

      const exportId = res.headers.get("X-Audio-Export-Id");
      if (exportId) {
        mergeForFetch = exportId;
        setTrackedExportId(exportId);
        void fetchExport(exportId);
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        buffer += dec.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }
          try {
            const ev = JSON.parse(line) as {
              type: string;
              progress?: number;
              chapterStates?: ChapterStateRow[];
              message?: string;
            };
            if (typeof ev.progress === "number") {
              setLocalProgress(ev.progress);
            }
            if (Array.isArray(ev.chapterStates)) {
              setLocalChapterStates(ev.chapterStates);
            }
            if (ev.type === "error") {
              setStreamError(ev.message ?? "Generation failed.");
            }
            if (ev.type === "done") {
              setLocalProgress(100);
            }
          } catch {
            /* ignore line parse */
          }
        }
      }
    } catch (e) {
      setStreamError(e instanceof Error ? e.message : "Connection error.");
    } finally {
      setGenerateBusy(false);
      void (async () => {
        let last = await fetchExport(mergeForFetch);
        let i = 0;
        const target = mergeForFetch;
        while (
          i < 40 &&
          target &&
          last &&
          last.id === target &&
          last.status !== "ready" &&
          last.status !== "failed"
        ) {
          await new Promise((r) => setTimeout(r, 500));
          last = await fetchExport(target);
          i += 1;
        }
      })();
    }
  };

  const runDownload = async () => {
    if (!exportRow?.id || exportRow.status !== "ready") {
      return;
    }
    setDownloadBusy(true);
    try {
      const r = await fetch(
        `/api/audio/download?exportId=${encodeURIComponent(exportRow.id)}`,
        { cache: "no-store" },
      );
      if (!r.ok) {
        const d = (await r.json().catch(() => ({}))) as { error?: string };
        setStreamError(d.error ?? "Download failed.");
        return;
      }
      const d = (await r.json()) as { url: string; expiresIn?: number };
      if (!d.url) {
        setStreamError("No download URL returned.");
        return;
      }
      triggerBrowserDownload(d.url);
    } finally {
      setDownloadBusy(false);
    }
  };

  if (!isPro) {
    return (
      <section
        className="relative z-10 mx-auto mt-6 max-w-3xl rounded-xl border border-violet-500/25 bg-violet-500/5 px-5 py-6 sm:px-6"
        aria-label="Audiobook export (Pro)"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-300/90">Audiobook</p>
        <h2 className="mt-2 font-serif text-xl text-editorial-cream sm:text-2xl">
          ElevenLabs audiobook export
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-editorial-muted">
          Generate a full audiobook: one MP3 per chapter, then a ZIP with ACX-style notes. Pro
          only.
        </p>
        <Button
          type="button"
          className="mt-4"
          onClick={() => setUpgradeOpen(true)}
        >
          Upgrade to Pro
        </Button>
        <ProUpgradeModal
          open={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
          title="Audiobook export is Pro"
          description="Pro unlocks AI audiobook generation with professional ElevenLabs voices, packaged for delivery."
        />
      </section>
    );
  }

  return (
    <section
      className="relative z-10 mx-auto mt-6 max-w-3xl rounded-xl border border-violet-500/30 bg-violet-950/20 px-5 py-6 sm:px-6"
      aria-label="Audiobook export"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-violet-300/90">Audiobook</p>
      <h2 className="mt-2 font-serif text-xl text-editorial-cream sm:text-2xl">
        Generate an audiobook (ElevenLabs)
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-editorial-muted">
        <strong className="text-editorial-cream/90">Nothing is generated</strong> until you press
        Generate — we don&apos;t start credits or full-book audio in the background. MP3s are
        produced at ACX-relevant 44.1 kHz / 192 kbps; you still need proof-listen and loudness
        work before submitting to Amazon&apos;s ACX.
      </p>

      {!canGenerate ? (
        <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-200/90">
          Write or generate at least one chapter with content (draft, edited, or approved) to enable
          audiobook export.
        </p>
      ) : null}

      {canGenerate && audioEligibleChapters.length === 0 && chapters.length > 0 ? (
        <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-200/90">
          Check the list below: narratable chapters need draft (or edited/approved) status and body
          text. Open a chapter to finish it, then check the boxes you want in the ZIP.
        </p>
      ) : null}

      {chapters.length > 0 ? (
        <div className="mt-4 rounded-lg border border-editorial-muted/25 bg-editorial-bg/25 px-3 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-200/90">
              Chapters to include in the audiobook
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={selectAllAudioChapters}
                disabled={audioEligibleChapters.length === 0}
                className="text-xs font-medium text-violet-200 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
              >
                Select all narratable
              </button>
              <button
                type="button"
                onClick={clearAudioChapterSelection}
                disabled={selectedChapterIds.length === 0}
                className="text-xs font-medium text-editorial-muted underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear selection
              </button>
            </div>
          </div>
          <ul
            className="mt-2 max-h-64 space-y-1.5 overflow-y-auto rounded-md border border-editorial-muted/15 bg-editorial-bg/40 px-2 py-2"
            aria-label="Chapters for audiobook"
          >
            {chaptersSorted.map((ch) => {
              const ok = chapterOkForAudio(ch);
              const checked = ok && selectedChapterIds.includes(ch.id);
              const hint = audioChapterHint(ch);
              return (
                <li key={ch.id}>
                  <label
                    className={`flex items-start gap-2 rounded px-1 py-0.5 text-sm ${
                      ok
                        ? "cursor-pointer hover:bg-editorial-bg/50"
                        : "cursor-not-allowed opacity-75"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!ok}
                      onChange={() => {
                        if (ok) toggleChapterSelected(ch.id);
                      }}
                      className="mt-1 h-4 w-4 shrink-0 rounded border-editorial-muted/50 text-violet-500 focus:ring-violet-500/40 disabled:opacity-50"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="text-editorial-cream">
                        <span className="text-editorial-muted">Ch. {ch.chapter_number}</span>{" "}
                        {ch.title || "Untitled"}
                      </span>
                      {hint ? (
                        <span className="mt-0.5 block text-xs text-editorial-muted">{hint}</span>
                      ) : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-editorial-muted">
            Checked chapters become MP3s in chapter order inside the ZIP (plus ACX-style notes).
          </p>
        </div>
      ) : null}

      {voicesError ? (
        <p className="mt-4 text-sm text-amber-200/90">{voicesError}</p>
      ) : null}

      {voices && voices.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {voices.map((v) => {
            const selected = selectedVoice?.voiceId === v.voiceId;
            return (
              <div
                key={v.voiceId}
                className={`flex flex-col rounded-lg border p-3 text-left transition ${
                  selected
                    ? "border-violet-400/70 bg-violet-500/10"
                    : "border-editorial-muted/25 bg-editorial-bg/20 hover:border-violet-500/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedVoice(v)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block text-sm font-semibold text-editorial-cream">{v.name}</span>
                    <span className="text-xs text-editorial-muted">Premade</span>
                  </button>
                  {v.previewUrl ? (
                    <button
                      type="button"
                      onClick={() => togglePreview(v)}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-violet-500/40 text-violet-200 transition hover:bg-violet-500/20"
                      aria-label={playingPreviewId === v.voiceId ? "Stop sample" : "Play sample"}
                    >
                      {playingPreviewId === v.voiceId ? (
                        <Square className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <Play className="h-3.5 w-3.5" aria-hidden />
                      )}
                    </button>
                  ) : null}
                </div>
                {v.previewUrl ? (
                  <audio
                    ref={(el) => {
                      if (el) {
                        audioEls.current.set(v.voiceId, el);
                        el.onended = () => {
                          setPlayingPreviewId((p) => (p === v.voiceId ? null : p));
                        };
                      } else {
                        audioEls.current.delete(v.voiceId);
                      }
                    }}
                    src={v.previewUrl}
                    preload="none"
                    className="mt-2 h-0 w-0 overflow-hidden"
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : voices && voices.length === 0 && !voicesError ? (
        <p className="mt-4 text-sm text-editorial-muted">No premade voices available.</p>
      ) : (!voices && !voicesError) || (voices == null) ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-editorial-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading voices…
        </div>
      ) : null}

      {voices && voices.length > 0 && chapters.length > 0 ? (
        <p className="mt-3 text-sm text-editorial-muted">
          Check the chapters you want, pick a voice, then{" "}
          <span className="text-editorial-cream">Generate audiobook</span> — preview clips only play
          when you press play.
        </p>
      ) : null}

      <div className="mt-5">
        <button
          type="button"
          onClick={() => void runGenerate()}
          disabled={
            !canGenerate ||
            audioEligibleChapters.length === 0 ||
            selectedChapterIds.length === 0 ||
            !selectedVoice ||
            generateBusy ||
            thisRunActiveOnServer
          }
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-violet-500/50 bg-violet-600/30 px-5 text-sm font-semibold text-editorial-cream shadow-sm transition hover:bg-violet-600/50 disabled:opacity-60 sm:w-auto"
        >
          {generateBusy || thisRunActiveOnServer ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Mic className="h-4 w-4" aria-hidden />
          )}
          {generateBusy || thisRunActiveOnServer ? "Generating audiobook…" : "Generate audiobook"}
        </button>
      </div>

      {showProgressForActiveRun ? (
        <div className="mt-4 space-y-3">
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-editorial-muted">
              <span>Progress</span>
              <span>{displayProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-editorial-bg/50">
              <div
                className="h-full rounded-full bg-violet-500/80 transition-all"
                style={{ width: `${Math.min(100, displayProgress)}%` }}
              />
            </div>
          </div>
          {exportRow?.error || streamError ? (
            <p className="text-sm text-rose-300/90">{streamError ?? exportRow?.error}</p>
          ) : null}
          {displayChapterRows.length > 0 ? (
            <ul className="max-h-48 space-y-1.5 overflow-y-auto rounded-md border border-editorial-muted/20 bg-editorial-bg/30 px-3 py-2 text-sm">
              {displayChapterRows.map((c) => (
                <li key={c.chapterNumber} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-editorial-cream">
                    {c.chapterNumber}. {c.title || "Chapter"}
                  </span>
                  <span
                    className={
                      c.state === "done"
                        ? "text-emerald-400/90"
                        : c.state === "failed"
                          ? "text-rose-300/90"
                          : c.state === "generating"
                            ? "text-amber-200/90"
                            : "text-editorial-muted"
                    }
                  >
                    {c.state}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {exportRow?.status === "ready" && exportRow.zip_storage_path ? (
        <div className="mt-4 rounded-lg border border-emerald-500/35 bg-emerald-950/25 px-4 py-3">
          <p className="text-sm font-medium text-emerald-100/95">Audiobook ready</p>
          <p className="mt-1 text-xs text-editorial-muted">
            Download the ZIP (MP3s + README). Link is signed and expires after about an hour — save
            the file to your computer.
          </p>
          <button
            type="button"
            onClick={() => void runDownload()}
            disabled={downloadBusy}
            className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-600/30 px-4 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-600/45 disabled:opacity-60"
          >
            {downloadBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Download className="h-4 w-4" aria-hidden />
            )}
            {downloadBusy ? "Getting link…" : "Download audiobook (.zip)"}
          </button>
          {exportRow.total_duration_seconds != null ? (
            <p className="mt-2 text-xs text-editorial-muted">
              Estimated duration: ~{Math.floor(exportRow.total_duration_seconds / 60)}m{" "}
              {exportRow.total_duration_seconds % 60}s
            </p>
          ) : null}
        </div>
      ) : null}

    </section>
  );
}
