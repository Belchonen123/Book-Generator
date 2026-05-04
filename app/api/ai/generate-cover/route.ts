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

function buildFlatCoverSvg(params: {
  title: string;
  subtitle: string;
  authorDisplayName: string;
  premise: string;
}): Buffer {
  const titleLines = wrapText(params.title, 12, 3);
  const subtitleLines = params.subtitle ? wrapText(params.subtitle, 30, 3) : [];
  const titleFontSize =
    titleLines.length >= 3 ? 68 : titleLines.length === 2 ? 80 : 88;
  const titleLineHeight = Math.round(titleFontSize * 1.05);
  const subtitleStart = 172 + titleLines.length * titleLineHeight + 28;
  const author = params.authorDisplayName.trim();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${COVER_WIDTH}" height="${COVER_HEIGHT}" viewBox="0 0 ${COVER_WIDTH} ${COVER_HEIGHT}">
  <defs>
    <linearGradient id="sky" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#050816"/>
      <stop offset="0.34" stop-color="#102b5f"/>
      <stop offset="0.64" stop-color="#5a2871"/>
      <stop offset="1" stop-color="#090614"/>
    </linearGradient>
    <radialGradient id="nebula" cx="50%" cy="47%" r="58%">
      <stop offset="0" stop-color="#a6fbff" stop-opacity="0.92"/>
      <stop offset="0.25" stop-color="#38ccff" stop-opacity="0.46"/>
      <stop offset="0.55" stop-color="#8b4dff" stop-opacity="0.32"/>
      <stop offset="0.82" stop-color="#ff476f" stop-opacity="0.2"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ground" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#301031"/>
      <stop offset="0.45" stop-color="#7b2e3b"/>
      <stop offset="1" stop-color="#d06d36"/>
    </linearGradient>
    <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="5" stdDeviation="7" flood-color="#000000" flood-opacity="0.78"/>
    </filter>
    <filter id="heroGlow" x="-35%" y="-35%" width="170%" height="170%">
      <feGaussianBlur stdDeviation="12" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer>
        <feFuncA type="table" tableValues="0 0.08"/>
      </feComponentTransfer>
    </filter>
  </defs>
  <rect width="${COVER_WIDTH}" height="${COVER_HEIGHT}" fill="url(#sky)"/>
  <rect width="${COVER_WIDTH}" height="${COVER_HEIGHT}" fill="url(#nebula)"/>
  <rect width="${COVER_WIDTH}" height="${COVER_HEIGHT}" filter="url(#grain)" opacity="0.55"/>
  <path d="M62 338 C238 128 456 132 682 250 C822 324 910 232 1010 118" stroke="#61ecff" stroke-width="18" opacity="0.13" fill="none"/>
  <path d="M-20 930 C190 812 400 888 548 786 C738 655 914 712 1050 620 L1050 1180 C806 1286 628 1180 424 1268 C246 1346 94 1264 -20 1360 Z" fill="#64f0ff" opacity="0.08"/>
  <circle cx="512" cy="860" r="360" fill="none" stroke="#9df7ff" stroke-width="14" opacity="0.16"/>
  <circle cx="512" cy="860" r="280" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.18"/>
  <g opacity="0.92">
    <circle cx="122" cy="210" r="3" fill="#fff"/>
    <circle cx="228" cy="368" r="2" fill="#b7f4ff"/>
    <circle cx="870" cy="220" r="4" fill="#fff"/>
    <circle cx="786" cy="420" r="2" fill="#ffd66b"/>
    <circle cx="164" cy="780" r="2" fill="#fff"/>
    <circle cx="898" cy="830" r="3" fill="#b7f4ff"/>
    <circle cx="714" cy="154" r="2" fill="#fff"/>
    <circle cx="350" cy="122" r="3" fill="#ffd66b"/>
    <circle cx="60" cy="520" r="2" fill="#fff"/>
  </g>
  <circle cx="812" cy="500" r="134" fill="#ff9a6f" opacity="0.9"/>
  <circle cx="756" cy="466" r="138" fill="#2d1744" opacity="0.38"/>
  <circle cx="176" cy="654" r="70" fill="#8df7ff" opacity="0.78"/>
  <circle cx="208" cy="632" r="71" fill="#031629" opacity="0.24"/>
  <g opacity="0.5" filter="url(#heroGlow)">
    <path d="M220 930 C188 835 210 748 284 710 C364 668 438 748 398 842 C366 918 276 968 220 930 Z" fill="#12142b"/>
    <circle cx="312" cy="694" r="42" fill="#f64f88"/>
    <path d="M768 914 C824 824 806 730 726 690 C642 648 582 738 620 834 C652 912 718 952 768 914 Z" fill="#11142a"/>
    <circle cx="704" cy="674" r="40" fill="#46f7dd"/>
  </g>
  <path d="M0 1215 C190 1156 298 1210 430 1166 C604 1108 724 1168 1024 1108 L1024 1792 L0 1792 Z" fill="url(#ground)"/>
  <path d="M0 1342 C172 1280 346 1345 506 1298 C690 1245 812 1296 1024 1246 L1024 1792 L0 1792 Z" fill="#0b162a" opacity="0.8"/>
  <g opacity="0.55">
    <path d="M120 1208 C126 1162 168 1132 205 1166 C236 1195 228 1240 190 1256 C154 1272 114 1249 120 1208 Z" fill="#54f1c8"/>
    <path d="M812 1180 C824 1130 875 1114 910 1154 C942 1192 920 1245 874 1252 C834 1258 802 1222 812 1180 Z" fill="#ff5d7e"/>
    <path d="M690 1375 C700 1336 738 1316 772 1346 C802 1372 792 1420 752 1432 C714 1442 682 1414 690 1375 Z" fill="#64f0ff"/>
  </g>
  <g transform="translate(512 920)" filter="url(#heroGlow)">
    <ellipse cx="0" cy="458" rx="176" ry="32" fill="#000" opacity="0.36"/>
    <path d="M-66 -22 C-48 -106 48 -106 66 -22 L96 232 C104 306 50 356 0 356 C-50 356 -104 306 -96 232 Z" fill="#effbff"/>
    <path d="M-45 6 C-32 -62 32 -62 45 6 L66 214 C72 270 34 314 0 314 C-34 314 -72 270 -66 214 Z" fill="#86acc8"/>
    <path d="M-86 58 C-174 130 -224 238 -244 376" stroke="#d8f4ff" stroke-width="34" stroke-linecap="round" fill="none"/>
    <path d="M86 58 C174 130 224 238 244 376" stroke="#d8f4ff" stroke-width="34" stroke-linecap="round" fill="none"/>
    <path d="M-48 258 C-112 344 -132 436 -126 526" stroke="#d8f4ff" stroke-width="40" stroke-linecap="round" fill="none"/>
    <path d="M48 258 C112 344 132 436 126 526" stroke="#d8f4ff" stroke-width="40" stroke-linecap="round" fill="none"/>
    <circle cx="0" cy="-116" r="88" fill="#dcefff"/>
    <circle cx="0" cy="-116" r="58" fill="#081d38"/>
    <path d="M-48 -130 C-8 -170 48 -156 54 -100 C24 -122 -14 -130 -48 -130 Z" fill="#76f7ff" opacity="0.64"/>
    <rect x="-54" y="34" width="108" height="176" rx="34" fill="#b7d6e8" opacity="0.42"/>
    <circle cx="-26" cy="112" r="6" fill="#ffdf6b"/>
    <circle cx="0" cy="112" r="6" fill="#55f2ff"/>
    <circle cx="26" cy="112" r="6" fill="#ff5d7e"/>
  </g>
  <rect x="0" y="0" width="${COVER_WIDTH}" height="520" fill="#06152f" opacity="0.28"/>
  <rect x="0" y="1375" width="${COVER_WIDTH}" height="417" fill="#06152f" opacity="0.5"/>
  <text filter="url(#textShadow)" x="512" y="172" text-anchor="middle" fill="#f9fbff" font-family="Georgia, 'Times New Roman', serif" font-size="${titleFontSize}" font-weight="900" letter-spacing="3">${svgTextLines(titleLines, 512, 172, titleLineHeight)}</text>
  ${subtitleLines.length ? `<text filter="url(#textShadow)" x="512" y="${subtitleStart}" text-anchor="middle" fill="#ffd766" font-family="Arial, Helvetica, sans-serif" font-size="40" font-weight="800" letter-spacing="1">${svgTextLines(subtitleLines, 512, subtitleStart, 52)}</text>` : ""}
  ${author ? `<text filter="url(#textShadow)" x="512" y="1628" text-anchor="middle" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="800" letter-spacing="5">${escapeSvg(author.toUpperCase())}</text>` : ""}
</svg>`;

  return Buffer.from(svg, "utf8");
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

    const coverBuffer = buildFlatCoverSvg({
      title,
      subtitle,
      authorDisplayName,
      premise,
    });
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

    const storedPrompt = [
      "Deterministic flat cover SVG",
      `Title: ${title}`,
      subtitle ? `Subtitle: ${subtitle}` : null,
      authorDisplayName ? `Author: ${authorDisplayName}` : null,
      `Genre: ${genre}`,
    ]
      .filter(Boolean)
      .join("\n");

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
