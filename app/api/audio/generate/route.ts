import { NextResponse } from "next/server";

import { runAudiobookJob, type ProgressPayload } from "@/lib/audio/run-audiobook-job";
import { getElevenLabsApiKey } from "@/lib/elevenlabs/config";
import { requireBookOwnedByUser } from "@/lib/api/book-access";
import { createClient } from "@/lib/supabase/server";
import { ensureProfileRowForUser } from "@/lib/supabase/ensure-profile-row";
import { AudioGenerateRequestSchema } from "@/lib/utils/schemas";
import { apiJsonError, ApiErrorCode, logServerError } from "@/lib/utils/errors";
import type { Json } from "@/types/database.types";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

function ndjsonLine(obj: object): Uint8Array {
  return encoder.encode(`${JSON.stringify(obj)}\n`);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return apiJsonError("Please sign in.", ApiErrorCode.UNAUTHORIZED, 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiJsonError("Invalid JSON body.", ApiErrorCode.VALIDATION_ERROR, 400);
  }

  const parsed = AudioGenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
  }

  const { bookId, voiceId, voiceName, chapterIds: requestedChapterIds } = parsed.data;

  const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
  if (denied) {
    return denied;
  }

  let { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) {
    const e = await ensureProfileRowForUser(supabase, user);
    if (e.ok) {
      const r = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", user.id)
        .maybeSingle();
      profile = r.data;
    } else {
      logServerError(
        "audio/generate.profile-create",
        new Error(
          `${e.error}${e.code ? ` (code ${e.code})` : ""}${e.hint ? ` | ${e.hint}` : ""}`,
        ),
      );
      profile = { subscription_tier: "free" as const };
    }
  }
  if (profile?.subscription_tier !== "pro") {
    return apiJsonError("Audiobook export is a Pro feature.", ApiErrorCode.UPGRADE_REQUIRED, 403);
  }

  const key = getElevenLabsApiKey();
  if (!key) {
    return apiJsonError(
      "ELEVENLABS_API_KEY is not configured on this server.",
      ApiErrorCode.CONFIGURATION,
      503,
    );
  }

  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("id, title, user_id")
    .eq("id", bookId)
    .eq("user_id", user.id)
    .single();

  if (bookError || !book) {
    return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
  }

  const { data: chRows, error: chError } = await supabase
    .from("chapters")
    .select("id, chapter_number, title, content, status")
    .eq("book_id", bookId)
    .in("status", ["draft", "edited", "approved"])
    .order("chapter_number", { ascending: true });

  if (chError) {
    return apiJsonError("Could not load chapters.", ApiErrorCode.INTERNAL, 500);
  }
  let chapters = (chRows ?? []).filter((c) => c.content && c.content.trim().length > 0);

  if (requestedChapterIds?.length) {
    const allowed = new Map(chapters.map((c) => [c.id, c]));
    const missing = requestedChapterIds.filter((id) => !allowed.has(id));
    if (missing.length > 0) {
      return apiJsonError(
        "One or more selected chapters are invalid, not in this book, or have no body text.",
        ApiErrorCode.VALIDATION_ERROR,
        400,
      );
    }
    const orderIndex = new Map(requestedChapterIds.map((id, i) => [id, i]));
    chapters = [...chapters]
      .filter((c) => orderIndex.has(c.id))
      .sort((a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0));
  } else {
    chapters.sort((a, b) => a.chapter_number - b.chapter_number);
  }

  if (chapters.length === 0) {
    return apiJsonError(
      "No published chapter text found. Chapters need draft, edited, or approved status and body text.",
      ApiErrorCode.VALIDATION_ERROR,
      400,
    );
  }

  const { data: ins, error: insError } = await supabase
    .from("audio_exports")
    .insert({
      book_id: bookId,
      user_id: user.id,
      voice_id: voiceId,
      voice_name: voiceName,
      status: "queued",
      progress: 0,
      chapter_states: [] as unknown as Json,
    })
    .select("id")
    .single();

  if (insError || !ins) {
    logServerError("audio/generate.insert", insError);
    return apiJsonError("Could not start export job.", ApiErrorCode.INTERNAL, 500);
  }

  const exportId = ins.id;
  const bookTitle = book.title?.trim() || "Untitled";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (p: ProgressPayload) => {
        controller.enqueue(
          ndjsonLine({
            ...p,
            chapterStates: p.chapterStates,
          } as object),
        );
      };

      try {
        await runAudiobookJob(
          supabase,
          {
            userId: user.id,
            bookId,
            bookTitle,
            exportId,
            voiceId,
            voiceName,
            chapters: chapters.map((c) => ({
              id: c.id,
              chapter_number: c.chapter_number,
              title: c.title,
              content: c.content,
            })),
          },
          send,
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Audiobook generation failed";
        logServerError("audio/generate.job", e);
        await supabase
          .from("audio_exports")
          .update({
            status: "failed",
            error: msg.slice(0, 2_000),
            updated_at: new Date().toISOString(),
          })
          .eq("id", exportId);
        send({
          type: "error",
          progress: 0,
          message: msg,
          exportId,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Audio-Export-Id": exportId,
    },
  });
}
