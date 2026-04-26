import { sanitizeText } from "@/lib/utils/sanitize";

import { ELEVEN_ACX_OUTPUT_FORMAT } from "@/lib/elevenlabs/tts";

/**
 * ACX/Amazon/Audible tech notes for the zip — generated audio still needs a human
 * master pass for loudness, silence, and QC before upload.
 * See: https://www.acx.com/ (ACX help center) for the current submission checklist.
 */
export function buildAcxStyleReadme(params: {
  bookTitle: string;
  files: { filename: string; title: string }[];
}): string {
  const title = sanitizeText(params.bookTitle || "Manuscript");
  const lines: string[] = [
    "ACX / AUDIBLE — TECHNICAL NOTES (READ BEFORE UPLOADING)",
    "=======================================================",
    "",
    `Project: ${title}`,
    "",
    "SOURCE FILES (this ZIP)",
    "------------------------",
    `• Chapter MP3s are requested as ${ELEVEN_ACX_OUTPUT_FORMAT.replace(/_/g, " ")} (44.1 kHz) via ElevenLabs;`,
    "  if your ElevenLabs plan does not allow 192 kbps, the pipeline may fall back to 44.1 kHz / 128 kbps.",
    "  Both are common ACX-friendly sample rates; always re-check ACX’s current minimum bitrate.",
    "• AI TTS is not a substitute for proof-listening, mastering, and ACX’s Audio Lab validation.",
    "",
    "WHAT ACX TYPICALLY REQUIRES (SUMMARY; VERIFY ON ACX FOR YOUR REGION)",
    "---------------------------------------------------------------------",
    "Format:  MP3, constant bit rate, 44.1 kHz sample rate.",
    "Bitrate: 192 kbps is the standard for retail audiobooks on ACX (ACX’s own spec may allow",
    "         other minimums in edge cases; always re-read their help pages before submitting).",
    "Loudness: RMS in approximately the -18 to -23 dB range; peaks below -3 dB (true peak).",
    "Noise:   Room tone or noise floor below the levels ACX allows (per their spec).",
    "Silence: ~0.5–1.0 s at the start and ~1.0–5.0 s at the end of each file (narration, not",
    "         metronome silence; follow ACX for exact guidance).",
    "Structure: one opening/closing of the audiobook; chapter stops at natural breaks.",
    "Metadata:  title, chapter labels, and opening/closing credits as required by the distributor.",
    "",
    "BEFORE YOU UPLOAD",
    "-----------------",
    "1. Full proof-listen (pronunciation, numbers, character voices, wrong words).",
    "2. Mastering in your DAW or with ACX’s tools so loudness and silence meet the live ACX",
    "   checklist (this export is a starting point, not a mastered retail master).",
    "3. Run ACX’s Audio Lab / submission checker if you use their workflow — rejections for",
    "   loudness or format are not negotiable there.",
    "",
    "Chapter files in this package:",
    "",
  ];
  for (const f of params.files) {
    lines.push(`  • ${f.filename} — ${sanitizeText(f.title)}`);
  }
  lines.push("", "Generated with ChapterAI.");
  return lines.join("\n");
}
