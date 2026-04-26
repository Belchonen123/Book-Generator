import { NextResponse } from "next/server";

import { getElevenLabsApiKey } from "@/lib/elevenlabs/config";
import { apiJsonError, ApiErrorCode, logServerError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

type PremadeVoice = {
  voiceId: string;
  name: string;
  previewUrl: string | null;
};

type CacheEntry = { at: number; data: { voices: PremadeVoice[] } };
let voicesCache: CacheEntry | null = null;
const CACHE_MS = 60 * 60 * 1000;

/**
 * Returns curated premade ElevenLabs voices; cached 1h in process.
 */
export async function GET() {
  try {
    if (voicesCache && Date.now() - voicesCache.at < CACHE_MS) {
      return NextResponse.json(voicesCache.data, {
        headers: { "Cache-Control": "private, s-maxage=3600" },
      });
    }

    const apiKey = getElevenLabsApiKey();
    if (!apiKey) {
      return apiJsonError(
        "Audiobook generation is not configured (missing ELEVENLABS_API_KEY).",
        ApiErrorCode.CONFIGURATION,
        503,
      );
    }

    const res = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": apiKey },
    });
    if (!res.ok) {
      const t = await res.text();
      logServerError("elevenlabs.voices", new Error(t.slice(0, 300)));
      return apiJsonError(
        "Could not list voices. Try again later.",
        ApiErrorCode.UPSTREAM,
        502,
      );
    }

    const data = (await res.json()) as { voices?: unknown[] };
    const out: PremadeVoice[] = [];
    for (const raw of data.voices ?? []) {
      if (!raw || typeof raw !== "object") continue;
      const v = raw as Record<string, unknown>;
      if (v.category !== "premade" && v.category !== "Premade") continue;
      const id = typeof v.voice_id === "string" ? v.voice_id : null;
      const name = typeof v.name === "string" ? v.name : null;
      if (!id || !name) continue;
      out.push({
        voiceId: id,
        name,
        previewUrl: typeof v.preview_url === "string" ? v.preview_url : null,
      });
    }
    out.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    const payload = { voices: out };
    voicesCache = { at: Date.now(), data: payload };
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "private, s-maxage=3600" },
    });
  } catch (e) {
    logServerError("api/audio/voices", e);
    return apiJsonError("Unexpected error.", ApiErrorCode.INTERNAL, 500);
  }
}
