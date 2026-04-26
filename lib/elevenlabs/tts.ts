import { ELEVEN_TTS_MODEL } from "@/lib/elevenlabs/config";

/** ACX/Audible commonly expects 44.1kHz, 192 kbps CBR MP3; ElevenLabs outputs CBR in this format. */
export const ELEVEN_ACX_OUTPUT_FORMAT = "mp3_44100_192" as const;

const CONTEXT_LEN = 500;

type TtsChunkOpts = {
  previousText?: string;
  nextText?: string;
};

export async function synthesizeTextToMp3(
  apiKey: string,
  voiceId: string,
  text: string,
  opts: TtsChunkOpts = {},
): Promise<Buffer> {
  const body: {
    text: string;
    model_id: string;
    previous_text?: string;
    next_text?: string;
  } = {
    text,
    model_id: ELEVEN_TTS_MODEL,
  };
  if (opts.previousText) {
    body.previous_text = opts.previousText.slice(-CONTEXT_LEN);
  }
  if (opts.nextText) {
    body.next_text = opts.nextText.slice(0, CONTEXT_LEN);
  }

  const doFetch = (outputFormat: string) => {
    const u = new URL(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
    );
    u.searchParams.set("output_format", outputFormat);
    return fetch(u.toString(), {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify(body),
    });
  };

  let res = await doFetch(ELEVEN_ACX_OUTPUT_FORMAT);
  if (res.status === 403) {
    res = await doFetch("mp3_44100_128");
  }
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`TTS ${res.status}: ${err.slice(0, 400)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}
