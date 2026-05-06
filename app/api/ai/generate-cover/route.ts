import { NextResponse } from "next/server";

import { requireBookOwnedByUser } from "@/lib/api/book-access";
import { createClient } from "@/lib/supabase/server";
import {
  apiJsonError,
  apiJsonRateLimited,
  ApiErrorCode,
  logServerError,
} from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { CoverRequestSchema } from "@/lib/utils/schemas";
import { trackEvent } from "@/lib/utils/analytics";
import { coverPremiseFromRefinedIdea } from "@/lib/refined-idea/parse";
import { sanitizeText } from "@/lib/utils/sanitize";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const COVER_WIDTH = 1024;
const COVER_HEIGHT = 1792;

function escapeSvg(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  for (const word of words) {
    const current = lines[lines.length - 1];
    if (!current || current.length + word.length + 1 > maxChars) {
      lines.push(word);
    } else {
      lines[lines.length - 1] = `${current} ${word}`;
    }
  }
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] =
    kept[maxLines - 1].replace(/\s+\S+$/, "").trim() || kept[maxLines - 1];
  return kept;
}

function svgTextLines(lines: string[], x: number, y: number, lineHeight: number): string {
  return lines
    .map(
      (line, index) =>
        `<tspan x="${x}" y="${y + index * lineHeight}">${escapeSvg(line)}</tspan>`,
    )
    .join("");
}

type CoverTheme =
  | "sci_fi"
  | "fantasy"
  | "thriller"
  | "horror"
  | "romance"
  | "business"
  | "memoir"
  | "literary";

type CoverBuildResult = {
  buffer: Buffer;
  prompt: string;
};

type CoverPalette = {
  name: string;
  bgA: string;
  bgB: string;
  bgC: string;
  accentA: string;
  accentB: string;
  accentC: string;
  text: string;
  mutedText: string;
  dark: string;
};

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(random: () => number, values: T[]): T {
  return values[Math.floor(random() * values.length)] ?? values[0]!;
}

function numberBetween(random: () => number, min: number, max: number): number {
  return Math.round(min + random() * (max - min));
}

function detectCoverTheme(text: string): CoverTheme {
  const source = text.toLowerCase();
  const checks: Array<[CoverTheme, RegExp]> = [
    [
      "sci_fi",
      /\b(space|spaceship|star|planet|alien|galaxy|cyber|robot|android|future|colony|mars|moon|cosmic|quantum|nebula|orbit)\b/,
    ],
    [
      "fantasy",
      /\b(magic|dragon|kingdom|witch|wizard|fae|curse|sword|realm|prophecy|goddess|godfact|holyfire|shadow|myth|oracle)\b/,
    ],
    [
      "thriller",
      /\b(killer|murder|secret|conspiracy|agent|spy|crime|detective|missing|chase|code|silence|network|directive)\b/,
    ],
    [
      "horror",
      /\b(haunt|ghost|demon|blood|nightmare|terror|curse|grave|dead|monster|darkness)\b/,
    ],
    [
      "romance",
      /\b(love|heart|bride|wedding|kiss|desire|romance|beloved|affair)\b/,
    ],
    [
      "business",
      /\b(business|leadership|strategy|startup|sales|marketing|money|wealth|productivity|management|career|guide|system|framework)\b/,
    ],
    [
      "memoir",
      /\b(memoir|life|family|mother|father|daughter|son|home|healing|journey|childhood)\b/,
    ],
  ];

  return checks.find(([, pattern]) => pattern.test(source))?.[0] ?? "literary";
}

const COVER_PALETTES: Record<CoverTheme, CoverPalette[]> = {
  sci_fi: [
    {
      name: "solar storm",
      bgA: "#07121f",
      bgB: "#193d78",
      bgC: "#f86f36",
      accentA: "#53f6ff",
      accentB: "#ffdf6e",
      accentC: "#ff4f93",
      text: "#f7fbff",
      mutedText: "#bfeaff",
      dark: "#020612",
    },
    {
      name: "violet orbit",
      bgA: "#060518",
      bgB: "#322269",
      bgC: "#00d2d2",
      accentA: "#d7b8ff",
      accentB: "#64ffda",
      accentC: "#ff5f7a",
      text: "#ffffff",
      mutedText: "#d9d6ff",
      dark: "#04030b",
    },
  ],
  fantasy: [
    {
      name: "ember court",
      bgA: "#120711",
      bgB: "#452344",
      bgC: "#d59a38",
      accentA: "#ffd66b",
      accentB: "#d9fff5",
      accentC: "#ff5f6d",
      text: "#fff7df",
      mutedText: "#f8d89b",
      dark: "#090307",
    },
    {
      name: "moonlit green",
      bgA: "#06140f",
      bgB: "#174f42",
      bgC: "#b88bff",
      accentA: "#a4ffd7",
      accentB: "#ffe8a3",
      accentC: "#ef5fff",
      text: "#f7fff6",
      mutedText: "#d1f7dd",
      dark: "#03100b",
    },
  ],
  thriller: [
    {
      name: "noir signal",
      bgA: "#06070b",
      bgB: "#18253a",
      bgC: "#b9112c",
      accentA: "#ffcc4d",
      accentB: "#65c8ff",
      accentC: "#ff3158",
      text: "#f8f4e8",
      mutedText: "#c5d0df",
      dark: "#030407",
    },
    {
      name: "cold case",
      bgA: "#071014",
      bgB: "#233f50",
      bgC: "#8b1f2f",
      accentA: "#f4da71",
      accentB: "#81d4ff",
      accentC: "#e53a4d",
      text: "#fffdf5",
      mutedText: "#c8d7dd",
      dark: "#03080a",
    },
  ],
  horror: [
    {
      name: "black chapel",
      bgA: "#080507",
      bgB: "#251018",
      bgC: "#7d0c20",
      accentA: "#f13c4f",
      accentB: "#f6d097",
      accentC: "#6a0018",
      text: "#fff1e7",
      mutedText: "#d6aaa6",
      dark: "#020102",
    },
    {
      name: "sickly moon",
      bgA: "#030605",
      bgB: "#203126",
      bgC: "#74172b",
      accentA: "#d7ff8f",
      accentB: "#ff596f",
      accentC: "#496151",
      text: "#f7ffe7",
      mutedText: "#d7c7b8",
      dark: "#010302",
    },
  ],
  romance: [
    {
      name: "rose cinema",
      bgA: "#240916",
      bgB: "#8a284d",
      bgC: "#f6b35e",
      accentA: "#ffd0dc",
      accentB: "#fff0a8",
      accentC: "#d94979",
      text: "#fff7f5",
      mutedText: "#ffd6df",
      dark: "#14040c",
    },
    {
      name: "midnight blush",
      bgA: "#160b22",
      bgB: "#6641a1",
      bgC: "#e56483",
      accentA: "#ffe0ec",
      accentB: "#f7c66b",
      accentC: "#8df2ff",
      text: "#fff8fb",
      mutedText: "#ead8ff",
      dark: "#0b0611",
    },
  ],
  business: [
    {
      name: "editorial brass",
      bgA: "#0b1115",
      bgB: "#1f3640",
      bgC: "#d6ad43",
      accentA: "#f6d56f",
      accentB: "#7ee8d1",
      accentC: "#e8f0f2",
      text: "#fbf4df",
      mutedText: "#ced9d7",
      dark: "#05080a",
    },
    {
      name: "electric slate",
      bgA: "#071016",
      bgB: "#16334d",
      bgC: "#19a7ce",
      accentA: "#f4d44d",
      accentB: "#ff6b57",
      accentC: "#d9f7ff",
      text: "#ffffff",
      mutedText: "#c9d7de",
      dark: "#03070a",
    },
  ],
  memoir: [
    {
      name: "old photograph",
      bgA: "#17110f",
      bgB: "#604537",
      bgC: "#d8a968",
      accentA: "#ffe0a8",
      accentB: "#9ed6c6",
      accentC: "#f06f5f",
      text: "#fff8e8",
      mutedText: "#e8cba6",
      dark: "#090605",
    },
    {
      name: "blue hour",
      bgA: "#081120",
      bgB: "#1e4f6f",
      bgC: "#d18e69",
      accentA: "#f8d27f",
      accentB: "#aee6ff",
      accentC: "#e65d60",
      text: "#fffaf1",
      mutedText: "#cfe6ee",
      dark: "#030811",
    },
  ],
  literary: [
    {
      name: "ink and gold",
      bgA: "#080a10",
      bgB: "#222c45",
      bgC: "#d6a940",
      accentA: "#f4cd5d",
      accentB: "#88d8ff",
      accentC: "#ff7b54",
      text: "#fff9e8",
      mutedText: "#d7dfeb",
      dark: "#04060a",
    },
    {
      name: "storm window",
      bgA: "#111019",
      bgB: "#334960",
      bgC: "#b18454",
      accentA: "#f5d67d",
      accentB: "#9be1d7",
      accentC: "#e05d55",
      text: "#fff7ea",
      mutedText: "#d2dde1",
      dark: "#08070d",
    },
  ],
};

function renderSpeckles(random: () => number, palette: CoverPalette, count: number): string {
  return Array.from({ length: count })
    .map(() => {
      const cx = numberBetween(random, 40, COVER_WIDTH - 40);
      const cy = numberBetween(random, 70, COVER_HEIGHT - 90);
      const r = numberBetween(random, 1, 5);
      const opacity = (0.12 + random() * 0.58).toFixed(2);
      const color = pick(random, [palette.text, palette.accentA, palette.accentB]);
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="${opacity}"/>`;
    })
    .join("");
}

function renderGenreScene(
  theme: CoverTheme,
  random: () => number,
  palette: CoverPalette,
): string {
  const cx = numberBetween(random, 384, 640);
  const cy = numberBetween(random, 780, 980);

  if (theme === "sci_fi") {
    return `
      <g opacity="0.96">
        <circle cx="${cx}" cy="${cy}" r="${numberBetween(random, 210, 300)}" fill="none" stroke="${palette.accentA}" stroke-width="18" opacity="0.34"/>
        <circle cx="${cx + numberBetween(random, -90, 90)}" cy="${cy - numberBetween(random, 260, 380)}" r="${numberBetween(random, 78, 148)}" fill="${palette.accentC}" opacity="0.78"/>
        <circle cx="${cx + numberBetween(random, -220, -120)}" cy="${cy - numberBetween(random, 120, 240)}" r="${numberBetween(random, 34, 70)}" fill="${palette.accentB}" opacity="0.86"/>
        <path d="M${cx - 270} ${cy + 95} C${cx - 120} ${cy - 120} ${cx + 160} ${cy - 110} ${cx + 290} ${cy + 85}" fill="none" stroke="${palette.accentA}" stroke-width="8" opacity="0.28"/>
        <path d="M${cx - 80} ${cy + 32} L${cx + 172} ${cy - 72} L${cx + 58} ${cy + 102} L${cx + 34} ${cy + 214} Z" fill="${palette.text}" opacity="0.9"/>
        <path d="M${cx + 30} ${cy + 55} L${cx + 196} ${cy - 68}" stroke="${palette.accentB}" stroke-width="18" stroke-linecap="round" opacity="0.72"/>
        <path d="M${cx - 120} ${cy + 270} C${cx + 20} ${cy + 194} ${cx + 168} ${cy + 214} ${cx + 306} ${cy + 130}" fill="none" stroke="${palette.text}" stroke-width="2" opacity="0.34"/>
      </g>`;
  }

  if (theme === "fantasy") {
    const baseY = cy + 300;
    return `
      <g opacity="0.96">
        <circle cx="${cx + 210}" cy="${cy - 320}" r="128" fill="${palette.accentA}" opacity="0.92"/>
        <circle cx="${cx + 254}" cy="${cy - 342}" r="128" fill="${palette.bgB}" opacity="0.95"/>
        <path d="M${cx - 300} ${baseY} L${cx - 242} ${cy + 18} L${cx - 174} ${baseY} Z" fill="${palette.dark}" opacity="0.96"/>
        <path d="M${cx - 170} ${baseY} L${cx - 98} ${cy - 84} L${cx - 22} ${baseY} Z" fill="${palette.dark}" opacity="0.96"/>
        <path d="M${cx - 20} ${baseY} L${cx + 42} ${cy - 28} L${cx + 106} ${baseY} Z" fill="${palette.dark}" opacity="0.96"/>
        <path d="M${cx + 122} ${baseY} L${cx + 198} ${cy - 118} L${cx + 268} ${baseY} Z" fill="${palette.dark}" opacity="0.96"/>
        <path d="M${cx - 320} ${baseY} C${cx - 108} ${baseY - 52} ${cx + 126} ${baseY - 30} ${cx + 320} ${baseY - 72} L${cx + 350} ${baseY + 172} L${cx - 350} ${baseY + 172} Z" fill="${palette.dark}" opacity="0.78"/>
        <path d="M${cx - 210} ${cy + 10} C${cx - 68} ${cy - 96} ${cx + 76} ${cy - 82} ${cx + 214} ${cy + 20}" fill="none" stroke="${palette.accentB}" stroke-width="10" opacity="0.46"/>
        <circle cx="${cx - 18}" cy="${cy - 40}" r="9" fill="${palette.accentA}"/>
        <circle cx="${cx + 64}" cy="${cy + 26}" r="6" fill="${palette.accentB}"/>
        <circle cx="${cx - 94}" cy="${cy + 52}" r="5" fill="${palette.accentC}"/>
      </g>`;
  }

  if (theme === "thriller") {
    return `
      <g opacity="0.96">
        <path d="M0 ${cy - 350} L${COVER_WIDTH} ${cy - 510} L${COVER_WIDTH} ${cy - 390} L0 ${cy - 230} Z" fill="${palette.dark}" opacity="0.56"/>
        <path d="M0 ${cy + 380} L${COVER_WIDTH} ${cy + 170} L${COVER_WIDTH} ${cy + 360} L0 ${cy + 560} Z" fill="${palette.dark}" opacity="0.66"/>
        <rect x="${cx - 245}" y="${cy - 190}" width="490" height="585" fill="${palette.dark}" opacity="0.9"/>
        ${Array.from({ length: 26 })
          .map((_, index) => {
            const x = cx - 210 + (index % 5) * 92;
            const y = cy - 146 + Math.floor(index / 5) * 86;
            return `<rect x="${x}" y="${y}" width="38" height="44" fill="${pick(random, [palette.accentA, palette.accentB, palette.bgB])}" opacity="${(0.18 + random() * 0.52).toFixed(2)}"/>`;
          })
          .join("")}
        <path d="M${cx - 330} ${cy + 430} L${cx + 355} ${cy - 245}" stroke="${palette.accentC}" stroke-width="14" opacity="0.82"/>
        <circle cx="${cx - 115}" cy="${cy + 92}" r="76" fill="${palette.dark}"/>
        <path d="M${cx - 188} ${cy + 230} C${cx - 148} ${cy + 130} ${cx - 78} ${cy + 130} ${cx - 36} ${cy + 230} Z" fill="${palette.dark}"/>
      </g>`;
  }

  if (theme === "horror") {
    return `
      <g opacity="0.98">
        <circle cx="${cx + 190}" cy="${cy - 365}" r="135" fill="${palette.accentB}" opacity="0.72"/>
        <path d="M${cx - 310} ${cy + 350} C${cx - 160} ${cy + 170} ${cx + 92} ${cy + 180} ${cx + 318} ${cy + 342} L${cx + 360} ${cy + 550} L${cx - 360} ${cy + 550} Z" fill="${palette.dark}" opacity="0.92"/>
        <path d="M${cx - 174} ${cy + 310} L${cx - 144} ${cy - 38} L${cx + 132} ${cy - 86} L${cx + 176} ${cy + 310} Z" fill="${palette.dark}"/>
        <path d="M${cx - 176} ${cy - 38} L${cx - 34} ${cy - 190} L${cx + 134} ${cy - 86} Z" fill="${palette.dark}"/>
        <rect x="${cx - 66}" y="${cy + 96}" width="56" height="90" fill="${palette.accentA}" opacity="0.5"/>
        <rect x="${cx + 60}" y="${cy + 38}" width="50" height="52" fill="${palette.accentA}" opacity="0.42"/>
        <path d="M${cx - 350} ${cy + 250} C${cx - 280} ${cy + 110} ${cx - 316} ${cy - 90} ${cx - 238} ${cy - 260}" stroke="${palette.dark}" stroke-width="28" fill="none"/>
        <path d="M${cx - 250} ${cy - 78} C${cx - 312} ${cy - 150} ${cx - 372} ${cy - 166} ${cx - 424} ${cy - 220}" stroke="${palette.dark}" stroke-width="16" fill="none"/>
        <path d="M${cx - 238} ${cy - 52} C${cx - 172} ${cy - 144} ${cx - 104} ${cy - 160} ${cx - 42} ${cy - 242}" stroke="${palette.dark}" stroke-width="14" fill="none"/>
      </g>`;
  }

  if (theme === "romance") {
    return `
      <g opacity="0.94">
        <circle cx="${cx}" cy="${cy - 60}" r="286" fill="${palette.accentA}" opacity="0.12"/>
        <path d="M${cx - 170} ${cy - 140} C${cx - 350} ${cy - 330} ${cx - 520} ${cy - 40} ${cx - 130} ${cy + 250} C${cx - 80} ${cy + 288} ${cx - 36} ${cy + 314} ${cx} ${cy + 344} C${cx + 36} ${cy + 314} ${cx + 80} ${cy + 288} ${cx + 130} ${cy + 250} C${cx + 520} ${cy - 40} ${cx + 350} ${cy - 330} ${cx + 170} ${cy - 140} C${cx + 84} ${cy - 42} ${cx - 84} ${cy - 42} ${cx - 170} ${cy - 140} Z" fill="${palette.accentA}" opacity="0.42"/>
        <path d="M${cx - 265} ${cy + 320} C${cx - 132} ${cy + 142} ${cx + 94} ${cy + 144} ${cx + 268} ${cy + 306}" fill="none" stroke="${palette.accentB}" stroke-width="12" opacity="0.56"/>
        <circle cx="${cx - 96}" cy="${cy - 50}" r="72" fill="${palette.dark}" opacity="0.62"/>
        <circle cx="${cx + 102}" cy="${cy - 36}" r="72" fill="${palette.dark}" opacity="0.62"/>
        <path d="M${cx - 188} ${cy + 244} C${cx - 126} ${cy + 30} ${cx - 8} ${cy + 16} ${cx - 4} ${cy + 252}" stroke="${palette.text}" stroke-width="22" stroke-linecap="round" fill="none" opacity="0.82"/>
        <path d="M${cx + 188} ${cy + 244} C${cx + 126} ${cy + 30} ${cx + 8} ${cy + 16} ${cx + 4} ${cy + 252}" stroke="${palette.text}" stroke-width="22" stroke-linecap="round" fill="none" opacity="0.82"/>
      </g>`;
  }

  if (theme === "business") {
    return `
      <g opacity="0.96">
        <rect x="${cx - 350}" y="${cy - 330}" width="700" height="700" fill="${palette.dark}" opacity="0.62"/>
        <rect x="${cx - 310}" y="${cy - 288}" width="184" height="620" fill="${palette.accentA}" opacity="0.9"/>
        <rect x="${cx - 86}" y="${cy - 198}" width="184" height="530" fill="${palette.accentB}" opacity="0.82"/>
        <rect x="${cx + 138}" y="${cy - 72}" width="184" height="404" fill="${palette.accentC}" opacity="0.72"/>
        <path d="M${cx - 354} ${cy + 366} L${cx + 354} ${cy - 342}" stroke="${palette.text}" stroke-width="8" opacity="0.64"/>
        <circle cx="${cx - 242}" cy="${cy + 252}" r="26" fill="${palette.text}"/>
        <circle cx="${cx - 4}" cy="${cy + 16}" r="26" fill="${palette.text}"/>
        <circle cx="${cx + 238}" cy="${cy - 226}" r="26" fill="${palette.text}"/>
        <path d="M${cx - 370} ${cy - 390} H${cx + 370}" stroke="${palette.accentA}" stroke-width="4" opacity="0.5"/>
        <path d="M${cx - 370} ${cy + 430} H${cx + 370}" stroke="${palette.accentB}" stroke-width="4" opacity="0.5"/>
      </g>`;
  }

  if (theme === "memoir") {
    return `
      <g opacity="0.96">
        <rect x="${cx - 260}" y="${cy - 320}" width="520" height="680" rx="6" fill="${palette.text}" opacity="0.12"/>
        <rect x="${cx - 226}" y="${cy - 286}" width="452" height="540" fill="${palette.dark}" opacity="0.54"/>
        <circle cx="${cx - 86}" cy="${cy - 86}" r="90" fill="${palette.accentA}" opacity="0.62"/>
        <path d="M${cx - 226} ${cy + 172} C${cx - 88} ${cy + 42} ${cx + 40} ${cy + 88} ${cx + 226} ${cy - 34} L${cx + 226} ${cy + 254} L${cx - 226} ${cy + 254} Z" fill="${palette.accentB}" opacity="0.56"/>
        <path d="M${cx - 224} ${cy + 252} C${cx - 86} ${cy + 126} ${cx + 80} ${cy + 172} ${cx + 226} ${cy + 56} L${cx + 226} ${cy + 254} L${cx - 226} ${cy + 254} Z" fill="${palette.accentC}" opacity="0.42"/>
        <path d="M${cx - 304} ${cy + 400} C${cx - 164} ${cy + 322} ${cx + 142} ${cy + 332} ${cx + 302} ${cy + 392}" fill="none" stroke="${palette.mutedText}" stroke-width="8" opacity="0.48"/>
      </g>`;
  }

  return `
    <g opacity="0.96">
      <circle cx="${cx + 210}" cy="${cy - 340}" r="112" fill="${palette.accentA}" opacity="0.78"/>
      <path d="M${cx - 420} ${cy + 388} C${cx - 214} ${cy + 170} ${cx + 50} ${cy + 248} ${cx + 424} ${cy + 42} L${cx + 450} ${cy + 545} L${cx - 450} ${cy + 545} Z" fill="${palette.dark}" opacity="0.74"/>
      <path d="M${cx - 320} ${cy + 428} C${cx - 116} ${cy + 230} ${cx + 118} ${cy + 266} ${cx + 320} ${cy + 84}" fill="none" stroke="${palette.accentB}" stroke-width="14" opacity="0.44"/>
      <rect x="${cx - 92}" y="${cy - 120}" width="184" height="360" rx="92" fill="${palette.text}" opacity="0.16"/>
      <path d="M${cx - 92} ${cy - 120} C${cx - 26} ${cy - 176} ${cx + 38} ${cy - 178} ${cx + 92} ${cy - 120}" fill="none" stroke="${palette.text}" stroke-width="10" opacity="0.55"/>
      <path d="M${cx - 186} ${cy + 284} C${cx - 72} ${cy + 154} ${cx + 68} ${cy + 154} ${cx + 186} ${cy + 284}" fill="none" stroke="${palette.accentA}" stroke-width="10" opacity="0.62"/>
    </g>`;
}

function buildDynamicFlatCoverSvg(params: {
  bookId: string;
  title: string;
  subtitle: string;
  authorDisplayName: string;
  genre: string;
  premise: string;
  tone: string;
  visualDirection: string;
}): CoverBuildResult {
  const seedSource = [
    params.bookId,
    params.title,
    params.subtitle,
    params.authorDisplayName,
    params.genre,
    params.premise,
    params.tone,
    params.visualDirection,
  ].join("|");
  const seed = hashString(seedSource);
  const random = seededRandom(seed);
  const theme = detectCoverTheme(seedSource);
  const palette = pick(random, COVER_PALETTES[theme]);
  const titleLines = wrapText(params.title, params.title.length > 26 ? 13 : 16, 4);
  const subtitleLines = params.subtitle ? wrapText(params.subtitle, 34, 3) : [];
  const titleFontSize =
    titleLines.length >= 4 ? 58 : titleLines.length === 3 ? 66 : titleLines.length === 2 ? 78 : 90;
  const titleLineHeight = Math.round(titleFontSize * 1.02);
  const subtitleY = 188 + titleLines.length * titleLineHeight + 44;
  const author = params.authorDisplayName.trim();
  const titleBandHeight = Math.max(420, subtitleLines.length ? subtitleY + 170 : subtitleY + 100);
  const scene = renderGenreScene(theme, random, palette);
  const speckles = renderSpeckles(random, palette, theme === "business" ? 44 : 76);
  const diagonalA = numberBetween(random, 130, 260);
  const diagonalB = numberBetween(random, 760, 930);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${COVER_WIDTH}" height="${COVER_HEIGHT}" viewBox="0 0 ${COVER_WIDTH} ${COVER_HEIGHT}">
  <defs>
    <linearGradient id="coverBg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="${palette.bgA}"/>
      <stop offset="0.48" stop-color="${palette.bgB}"/>
      <stop offset="1" stop-color="${palette.bgC}"/>
    </linearGradient>
    <radialGradient id="coverPulse" cx="${numberBetween(random, 35, 70)}%" cy="${numberBetween(random, 34, 66)}%" r="70%">
      <stop offset="0" stop-color="${palette.accentA}" stop-opacity="0.44"/>
      <stop offset="0.34" stop-color="${palette.accentB}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="${palette.dark}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bottomShade" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="${palette.dark}" stop-opacity="0"/>
      <stop offset="0.45" stop-color="${palette.dark}" stop-opacity="0.62"/>
      <stop offset="1" stop-color="${palette.dark}" stop-opacity="0.96"/>
    </linearGradient>
    <filter id="coverShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="7" stdDeviation="7" flood-color="#000000" flood-opacity="0.72"/>
    </filter>
    <filter id="softGlow" x="-35%" y="-35%" width="170%" height="170%">
      <feGaussianBlur stdDeviation="10" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="coverGrain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.68" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer>
        <feFuncA type="table" tableValues="0 0.075"/>
      </feComponentTransfer>
    </filter>
  </defs>
  <rect width="${COVER_WIDTH}" height="${COVER_HEIGHT}" fill="url(#coverBg)"/>
  <rect width="${COVER_WIDTH}" height="${COVER_HEIGHT}" fill="url(#coverPulse)"/>
  <path d="M-80 ${diagonalA} C210 ${diagonalA - 170} 486 ${diagonalA + 190} 1100 ${diagonalA - 82}" fill="none" stroke="${palette.accentA}" stroke-width="22" opacity="0.16"/>
  <path d="M-60 ${diagonalB} C280 ${diagonalB - 130} 588 ${diagonalB + 100} 1080 ${diagonalB - 180}" fill="none" stroke="${palette.accentB}" stroke-width="12" opacity="0.18"/>
  ${speckles}
  <rect width="${COVER_WIDTH}" height="${COVER_HEIGHT}" filter="url(#coverGrain)" opacity="0.62"/>
  <g filter="url(#softGlow)">${scene}</g>
  <rect x="0" y="0" width="${COVER_WIDTH}" height="${titleBandHeight}" fill="${palette.dark}" opacity="0.46"/>
  <rect x="0" y="${COVER_HEIGHT - 310}" width="${COVER_WIDTH}" height="310" fill="url(#bottomShade)"/>
  <rect x="64" y="70" width="896" height="${COVER_HEIGHT - 140}" rx="0" fill="none" stroke="${palette.text}" stroke-width="3" opacity="0.22"/>
  <path d="M92 ${titleBandHeight - 18} H932" stroke="${palette.accentA}" stroke-width="5" opacity="0.72"/>
  <text filter="url(#coverShadow)" x="512" y="162" text-anchor="middle" fill="${palette.text}" font-family="Georgia, 'Times New Roman', serif" font-size="${titleFontSize}" font-weight="900" letter-spacing="1">${svgTextLines(titleLines, 512, 162, titleLineHeight)}</text>
  ${subtitleLines.length ? `<text filter="url(#coverShadow)" x="512" y="${subtitleY}" text-anchor="middle" fill="${palette.accentA}" font-family="Arial, Helvetica, sans-serif" font-size="39" font-weight="800" letter-spacing="1">${svgTextLines(subtitleLines, 512, subtitleY, 52)}</text>` : ""}
  ${author ? `<text filter="url(#coverShadow)" x="512" y="1636" text-anchor="middle" fill="${palette.text}" font-family="Arial, Helvetica, sans-serif" font-size="50" font-weight="900" letter-spacing="6">${escapeSvg(author.toUpperCase())}</text>` : ""}
</svg>`;

  const prompt = [
    "Dynamic flat KDP front cover SVG",
    "No 3D book mockup. No repeated stock scene. Upload-ready portrait cover.",
    `Theme: ${theme}`,
    `Palette: ${palette.name}`,
    `Seed: ${seed}`,
    `Title: ${params.title}`,
    params.subtitle ? `Subtitle: ${params.subtitle}` : null,
    params.authorDisplayName ? `Author: ${params.authorDisplayName}` : null,
    `Genre: ${params.genre}`,
    params.tone ? `Tone: ${params.tone}` : null,
    params.premise ? `Premise: ${params.premise}` : null,
    params.visualDirection ? `User direction: ${params.visualDirection}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    buffer: Buffer.from(svg, "utf8"),
    prompt,
  };
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiJsonError("Please sign in to continue.", ApiErrorCode.UNAUTHORIZED, 401);
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return apiJsonError("Invalid JSON body.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const parsed = CoverRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const {
      bookId,
      title: rawTitle,
      subtitle: rawSubtitle,
      authorDisplayName: rawAuthorDisplayName,
      customPrompt: rawCustomPrompt,
    } = parsed.data;

    const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
    if (denied) {
      return denied;
    }

    const rl = await checkRateLimit(user.id, "generate-cover");
    if (!rl.allowed) {
      return apiJsonRateLimited(rl.resetAt);
    }

    const { data: book, error: bookError } = await supabase
      .from("books")
      .select(
        "id, user_id, title, subtitle, author_display_name, genre, refined_idea, tone",
      )
      .eq("id", bookId)
      .eq("user_id", user.id)
      .single();

    if (bookError || !book) {
      return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    const title = sanitizeText(rawTitle?.trim() || book.title?.trim() || "Untitled");
    const genre = sanitizeText(book.genre?.trim() || "General fiction");
    const premise = sanitizeText(
      coverPremiseFromRefinedIdea(book.refined_idea, "generate-cover.premise", {
        bookId,
      }),
    );
    const subtitle = rawSubtitle?.trim()
      ? sanitizeText(rawSubtitle.trim())
      : book.subtitle?.trim()
        ? sanitizeText(book.subtitle.trim())
        : "";
    const authorDisplayName = rawAuthorDisplayName?.trim()
      ? sanitizeText(rawAuthorDisplayName.trim())
      : book.author_display_name?.trim()
        ? sanitizeText(book.author_display_name.trim())
        : "";
    const tone = sanitizeText(book.tone?.trim() || "");
    const visualDirection = sanitizeText(rawCustomPrompt?.trim() || "");

    if (
      rawTitle !== undefined ||
      rawSubtitle !== undefined ||
      rawAuthorDisplayName !== undefined
    ) {
      const { error: metadataUpdateError } = await supabase
        .from("books")
        .update({
          title,
          subtitle: subtitle || null,
          author_display_name: authorDisplayName || null,
        })
        .eq("id", bookId)
        .eq("user_id", user.id);
      if (metadataUpdateError) {
        logServerError("generate-cover.metadata-update", metadataUpdateError);
        return apiJsonError(
          "Could not save cover metadata before generation.",
          ApiErrorCode.INTERNAL,
          500,
        );
      }
    }

    const generatedCover = buildDynamicFlatCoverSvg({
      bookId,
      title,
      subtitle,
      authorDisplayName,
      genre,
      premise,
      tone,
      visualDirection,
    });
    const coverBuffer = generatedCover.buffer;
    const storagePath = `${user.id}/${bookId}/cover.svg`;

    const { error: uploadError } = await supabase.storage
      .from("covers")
      .upload(storagePath, coverBuffer, {
        contentType: "image/svg+xml",
        upsert: true,
      });

    if (uploadError) {
      logServerError("generate-cover.storage-upload", uploadError);
      return apiJsonError(
        "Could not upload cover to storage.",
        ApiErrorCode.INTERNAL,
        500,
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("covers").getPublicUrl(storagePath);

    const storedPrompt = generatedCover.prompt;

    const { error: updateError } = await supabase
      .from("books")
      .update({
        cover_url: publicUrl,
        cover_prompt: storedPrompt,
      })
      .eq("id", bookId)
      .eq("user_id", user.id);

    if (updateError) {
      logServerError("generate-cover.book-update", updateError);
      return apiJsonError(
        "Could not save cover metadata.",
        ApiErrorCode.INTERNAL,
        500,
      );
    }

    await supabase.from("api_usage").insert({
      user_id: user.id,
      route: "/api/ai/generate-cover",
      tokens_used: 0,
      model: "flat-svg-cover",
    });

    await trackEvent(user, "cover_generated", bookId);

    return NextResponse.json({
      coverUrl: publicUrl,
      prompt: storedPrompt,
    });
  } catch (e) {
    logServerError("generate-cover", e);
    return apiJsonError(
      "Something went wrong. Please try again.",
      ApiErrorCode.INTERNAL,
      500,
    );
  }
}
