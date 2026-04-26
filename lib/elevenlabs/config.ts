export const ELEVEN_TTS_MODEL = "eleven_turbo_v2_5";

export function getElevenLabsApiKey(): string | null {
  const k = process.env.ELEVENLABS_API_KEY?.trim();
  return k && k.length > 0 ? k : null;
}
