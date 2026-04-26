"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Loader2, Mic, Pause, Play, Square, X } from "@/lib/lucide-icons";
import {
  responsiveModalBackdrop,
  responsiveModalPanel,
  responsiveModalRoot,
} from "@/lib/ui/responsive-modal";
import { cn } from "@/lib/utils/cn";

const MAX_MS = 5 * 60 * 1000;
const MIME = "audio/webm;codecs=opus";
const ALT_MIME = "audio/webm";

export type VoiceMemoMode = "append" | "replace" | "rewrite";

export type VoiceMemoModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBeforeTranscribe: () => Promise<boolean>;
  onTranscribe: (
    blob: Blob,
    mode: VoiceMemoMode,
    durationMs: number,
  ) => Promise<void>;
  isBusy: boolean;
};

function formatTime(ms: number): string {
  const s = Math.floor(Math.max(0, ms) / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function VoiceMemoModal({
  open,
  onOpenChange,
  onBeforeTranscribe,
  onTranscribe,
  isBusy,
}: VoiceMemoModalProps) {
  const [phase, setPhase] = useState<"idle" | "rec" | "playback">("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [lastDurationMs, setLastDurationMs] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [mode, setMode] = useState<VoiceMemoMode>("append");
  const [error, setError] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const totalPausedMs = useRef(0);
  const pauseStartedAt = useRef<number | null>(null);
  const timerId = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const clearTimer = useCallback(() => {
    if (timerId.current != null) {
      clearInterval(timerId.current);
      timerId.current = null;
    }
  }, []);

  const getElapsed = useCallback(() => {
    const base = totalPausedMs.current;
    if (pauseStartedAt.current != null) {
      return Math.min(
        Math.max(0, pauseStartedAt.current - startedAt.current - base),
        MAX_MS,
      );
    }
    return Math.min(
      Math.max(0, Date.now() - startedAt.current - base),
      MAX_MS,
    );
  }, []);

  const updateElapsed = useCallback(() => {
    setElapsedMs(getElapsed());
  }, [getElapsed]);

  const stopTracks = useCallback(() => {
    recRef.current?.stream.getTracks().forEach((tr) => tr.stop());
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    stopTracks();
    recRef.current = null;
    chunksRef.current = [];
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
    setObjectUrl(null);
    setBlob(null);
    setPhase("idle");
    setElapsedMs(0);
    setLastDurationMs(0);
    setIsPaused(false);
    setError(null);
    startedAt.current = 0;
    totalPausedMs.current = 0;
    pauseStartedAt.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, [clearTimer, objectUrl, stopTracks]);

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const pickMime = useCallback((): string | undefined => {
    if (typeof window === "undefined") return undefined;
    if (MediaRecorder.isTypeSupported(MIME)) return MIME;
    if (MediaRecorder.isTypeSupported(ALT_MIME)) return ALT_MIME;
    return undefined;
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickMime();
      const rec = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        if (pauseStartedAt.current != null) {
          totalPausedMs.current += Date.now() - pauseStartedAt.current;
          pauseStartedAt.current = null;
        }
        const dur = Math.min(
          Math.max(0, Date.now() - startedAt.current - totalPausedMs.current),
          MAX_MS,
        );
        setLastDurationMs(dur);
        const type = rec.mimeType || "audio/webm";
        const b = new Blob(chunksRef.current, { type });
        setBlob(b);
        setObjectUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(b);
        });
        setPhase("playback");
        clearTimer();
      };
      recRef.current = rec;
      rec.start(400);
      setPhase("rec");
      setIsPaused(false);
      startedAt.current = Date.now();
      totalPausedMs.current = 0;
      pauseStartedAt.current = null;
      setElapsedMs(0);
      timerId.current = setInterval(() => {
        const el = getElapsed();
        if (el >= MAX_MS) {
          rec.stop();
          clearTimer();
        }
        setElapsedMs(el);
      }, 200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not use the microphone.");
    }
  }, [clearTimer, getElapsed, pickMime]);

  const onPauseResume = useCallback(() => {
    const r = recRef.current;
    if (!r) return;
    if (r.state === "inactive") return;
    if (typeof r.pause !== "function" || typeof r.resume !== "function") {
      toast.error("Pause is not supported in this browser.");
      return;
    }
    if (r.state === "recording") {
      r.pause();
      pauseStartedAt.current = Date.now();
      setIsPaused(true);
      clearTimer();
      setElapsedMs(
        Math.min(
          Date.now() - startedAt.current - totalPausedMs.current,
          MAX_MS,
        ),
      );
    } else if (r.state === "paused") {
      if (pauseStartedAt.current != null) {
        totalPausedMs.current += Date.now() - pauseStartedAt.current;
        pauseStartedAt.current = null;
      }
      r.resume();
      setIsPaused(false);
      timerId.current = setInterval(() => {
        const el = getElapsed();
        if (el >= MAX_MS) {
          r.stop();
          clearTimer();
        }
        setElapsedMs(el);
      }, 200);
    }
  }, [clearTimer, getElapsed]);

  const onStop = useCallback(() => {
    clearTimer();
    if (pauseStartedAt.current != null) {
      totalPausedMs.current += Date.now() - pauseStartedAt.current;
      pauseStartedAt.current = null;
    }
    if (recRef.current?.state === "recording" || recRef.current?.state === "paused") {
      setLastDurationMs(
        Math.min(
          Math.max(0, Date.now() - startedAt.current - totalPausedMs.current),
          MAX_MS,
        ),
      );
    }
    recRef.current?.stop();
  }, [clearTimer]);

  const onTranscribeClick = useCallback(async () => {
    if (!blob) {
      toast.error("Record something first.");
      return;
    }
    const ok = await onBeforeTranscribe();
    if (!ok) return;
    const dur = lastDurationMs > 0 ? lastDurationMs : elapsedMs;
    try {
      await onTranscribe(blob, mode, Math.min(dur, MAX_MS));
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start drafting.");
    }
  }, [blob, elapsedMs, lastDurationMs, mode, onBeforeTranscribe, onOpenChange, onTranscribe]);

  if (!open) {
    return null;
  }

  return (
    <div
      className={responsiveModalRoot()}
      role="dialog"
      aria-modal="true"
      aria-label="Voice memo to chapter"
    >
      <button
        type="button"
        className={responsiveModalBackdrop()}
        aria-label="Close"
        onClick={() => !isBusy && onOpenChange(false)}
      />
      <div
        className={cn(
          responsiveModalPanel(),
          "max-h-[min(90vh,640px)] w-full max-w-lg flex-col p-0",
        )}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <h2 className="font-serif text-lg font-semibold text-gold">Voice memo</h2>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            disabled={isBusy}
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 overflow-y-auto px-4 py-4">
          <p className="text-sm text-editorial-muted">
            Record up to 5 minutes of notes or dictation. We&apos;ll turn it into chapter
            prose.
          </p>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-editorial-muted">
              Mode
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              {(
                [
                  ["append", "Append to draft"],
                  ["replace", "Replace draft"],
                  ["rewrite", "Rewrite / merge with draft"],
                ] as const
              ).map(([k, label]) => (
                <label
                  key={k}
                  className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-border/60 bg-card/30 px-3 py-2 text-sm"
                >
                  <input
                    type="radio"
                    name="vmmode"
                    className="accent-gold"
                    checked={mode === k}
                    onChange={() => setMode(k)}
                    disabled={isBusy}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center py-4">
            <div
              className={cn(
                "relative flex h-32 w-32 items-center justify-center rounded-full border-2 border-gold/40 bg-gold/10",
                phase === "rec" && !isPaused && "ring-4 ring-gold/30 ring-offset-2 ring-offset-editorial-bg animate-pulse",
              )}
            >
              <Mic className="h-14 w-14 text-gold" aria-hidden />
            </div>
            <p className="mt-2 font-mono text-lg text-editorial-cream">
              {formatTime(phase === "rec" ? elapsedMs : lastDurationMs || elapsedMs)} / 5:00
            </p>
          </div>

          {phase === "idle" && (
            <div className="flex justify-center">
              <Button
                type="button"
                className="bg-gold font-medium text-editorial-bg hover:bg-gold/90"
                onClick={() => void startRecording()}
                disabled={isBusy}
              >
                <Mic className="mr-2 h-4 w-4" />
                Start recording
              </Button>
            </div>
          )}

          {phase === "rec" && (
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={onPauseResume}
                disabled={isBusy}
              >
                {isPaused ? <Play className="mr-1 h-4 w-4" /> : <Pause className="mr-1 h-4 w-4" />}
                {isPaused ? "Resume" : "Pause"}
              </Button>
              <Button
                type="button"
                className="bg-gold/90 text-editorial-bg"
                onClick={onStop}
                disabled={isBusy}
              >
                <Square className="mr-1 h-4 w-4" />
                Stop
              </Button>
            </div>
          )}

          {phase === "playback" && objectUrl && (
            <div className="space-y-3">
              <audio ref={audioRef} src={objectUrl} className="w-full" controls />
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    reset();
                  }}
                  disabled={isBusy}
                >
                  Re-record
                </Button>
                <Button
                  type="button"
                  className="bg-gold font-medium text-editorial-bg hover:bg-gold/90"
                  disabled={isBusy}
                  onClick={() => void onTranscribeClick()}
                >
                  {isBusy ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Drafting…
                    </>
                  ) : (
                    "Transcribe & draft"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
