import JSZip from "jszip";
import type { SupabaseClient } from "@supabase/supabase-js";

import { buildAcxStyleReadme } from "@/lib/audio/acxReadme";
import { chunkTextForTts } from "@/lib/audio/chunkTextForTts";
import { markdownToPlainText } from "@/lib/audio/markdownToPlainText";
import { getElevenLabsApiKey } from "@/lib/elevenlabs/config";
import { synthesizeTextToMp3 } from "@/lib/elevenlabs/tts";
import { sanitizeText } from "@/lib/utils/sanitize";
import type { Database, Json } from "@/types/database.types";

type ChapterState = {
  chapterNumber: number;
  title: string;
  state: "pending" | "generating" | "done" | "failed";
};

type ChapterIn = {
  id: string;
  chapter_number: number;
  title: string;
  content: string | null;
};

function fileSafe(s: string): string {
  return s.replace(/[^\w\-.]+/g, "_").replace(/_+/g, "_").slice(0, 80) || "Chapter";
}

function storagePrefix(userId: string, bookId: string, exportId: string): string {
  return `${userId}/${bookId}/${exportId}`;
}

export type ProgressPayload = {
  type: "progress" | "done" | "error";
  progress: number;
  message?: string;
  exportId: string;
  chapterStates?: ChapterState[];
};

/**
 * Run full ElevenLabs pipeline: per-chapter MP3s, ZIP with README, upload, api_usage.
 */
export async function runAudiobookJob(
  supabase: SupabaseClient<Database>,
  args: {
    userId: string;
    bookId: string;
    bookTitle: string;
    exportId: string;
    voiceId: string;
    voiceName: string;
    chapters: ChapterIn[];
  },
  emit: (p: ProgressPayload) => void,
): Promise<void> {
  const apiKey = getElevenLabsApiKey();
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not configured");
  }

  const { userId, bookId, bookTitle, exportId, voiceId, voiceName, chapters: rows } = args;
  const prefix = storagePrefix(userId, bookId, exportId);
  const bucket = "audiobooks";

  const chapterStates: ChapterState[] = rows.map((c) => ({
    chapterNumber: c.chapter_number,
    title: c.title,
    state: "pending" as const,
  }));

  const updateChapter = (num: number, st: ChapterState["state"]) => {
    const i = chapterStates.findIndex((c) => c.chapterNumber === num);
    if (i >= 0) {
      const cur = chapterStates[i]!;
      chapterStates[i] = { ...cur, state: st };
    }
  };

  const persist = async (progress: number) => {
    await supabase
      .from("audio_exports")
      .update({
        progress: Math.min(100, Math.max(0, progress)),
        chapter_states: chapterStates as unknown as Json,
        updated_at: new Date().toISOString(),
      })
      .eq("id", exportId)
      .eq("user_id", userId);
  };

  let ttsCharCount = 0;
  const zipFiles: { filename: string; title: string; data: Buffer }[] = [];
  const n = rows.length;
  if (n === 0) {
    throw new Error("No chapters to read.");
  }

  await supabase
    .from("audio_exports")
    .update({ status: "generating", progress: 1, updated_at: new Date().toISOString() })
    .eq("id", exportId);

  emit({ type: "progress", progress: 2, exportId, chapterStates: [...chapterStates] });

  for (let idx = 0; idx < rows.length; idx += 1) {
    const ch = rows[idx]!;
    updateChapter(ch.chapter_number, "generating");
    await persist(Math.floor((idx / n) * 80) + 5);
    emit({ type: "progress", progress: Math.floor((idx / n) * 80) + 5, exportId, chapterStates: [...chapterStates] });

    const plain = markdownToPlainText(ch.content ?? "");
    if (!plain.trim()) {
      updateChapter(ch.chapter_number, "failed");
      throw new Error(`Chapter ${ch.chapter_number} has no readable text.`);
    }

    const chunks = chunkTextForTts(plain);
    const mp3Parts: Buffer[] = [];
    for (let ci = 0; ci < chunks.length; ci += 1) {
      const chunk = chunks[ci]!;
      ttsCharCount += chunk.length;
      const previousText = ci > 0 ? chunks[ci - 1]! : undefined;
      const nextText = ci < chunks.length - 1 ? chunks[ci + 1]! : undefined;
      const buf = await synthesizeTextToMp3(apiKey, voiceId, chunk, { previousText, nextText });
      mp3Parts.push(buf);
    }
    const combined = Buffer.concat(mp3Parts);
    const fn = `ch${String(ch.chapter_number).padStart(2, "0")}_${fileSafe(sanitizeText(ch.title))}.mp3`;
    const path = `${prefix}/${fn}`;

    const { error: upErr } = await supabase.storage.from(bucket).upload(path, combined, {
      contentType: "audio/mpeg",
      upsert: true,
    });
    if (upErr) {
      updateChapter(ch.chapter_number, "failed");
      throw new Error(upErr.message);
    }

    zipFiles.push({ filename: fn, title: ch.title, data: combined });
    updateChapter(ch.chapter_number, "done");
    await persist(Math.floor(((idx + 1) / n) * 80) + 5);
    emit({ type: "progress", progress: Math.floor(((idx + 1) / n) * 80) + 5, exportId, chapterStates: [...chapterStates] });
  }

  const readme = buildAcxStyleReadme({
    bookTitle,
    files: zipFiles.map((z) => ({ filename: z.filename, title: z.title })),
  });

  const zip = new JSZip();
  for (const z of zipFiles) {
    zip.file(z.filename, z.data);
  }
  zip.file("README-ACX-notes.txt", readme);
  zip.file("chapter_list.txt", zipFiles.map((z) => `${z.filename}\t${z.title}`).join("\n"));

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  const zipName = "audiobook.zip";
  const zipPath = `${prefix}/${zipName}`;

  const { error: zipErr } = await supabase.storage.from(bucket).upload(zipPath, zipBuffer, {
    contentType: "application/zip",
    upsert: true,
  });
  if (zipErr) {
    throw new Error(zipErr.message);
  }

  const estWords = ttsCharCount / 5;
  const estSeconds = Math.round((estWords / 150) * 60);
  const totalDurationSeconds = Math.max(30, estSeconds);

  await supabase.from("api_usage").insert({
    user_id: userId,
    route: "/api/audio/generate-tts",
    tokens_used: ttsCharCount,
    model: "eleven_turbo_v2_5",
  });

  await supabase
    .from("audio_exports")
    .update({
      status: "ready",
      progress: 100,
      zip_storage_path: zipPath,
      total_duration_seconds: totalDurationSeconds,
      chapter_states: chapterStates as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", exportId);

  emit({
    type: "done",
    progress: 100,
    exportId,
    message: "Audiobook ready",
    chapterStates: [...chapterStates],
  });
}
