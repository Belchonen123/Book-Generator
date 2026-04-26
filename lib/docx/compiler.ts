import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  LevelFormat,
  PageBreak,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";

import { createClient } from "@/lib/supabase/server";
import { TRIM_SPECS, resolveTrimSize, type TrimSize, type TrimSpec } from "@/lib/docx/trim-sizes";
import type { ChapterStatusDb } from "@/types/database.types";

/** Body element for docx sections (paragraph or table). */
export type BodyChild = Paragraph | Table;

// Re-export trim-size primitives so existing imports from `@/lib/docx/compiler`
// keep working. New code (especially client components) should import from
// `@/lib/docx/trim-sizes` directly to avoid pulling server-only modules.
export { TRIM_SIZES, TRIM_SIZE_OPTIONS } from "@/lib/docx/trim-sizes";
export type { TrimSize } from "@/lib/docx/trim-sizes";

/* ------------------------------------------------------------------ */
/* Typography + palette                                               */
/* ------------------------------------------------------------------ */

export const HEADING_FONT = "Playfair Display";
export const BODY_FONT = "Georgia";
export const ACCENT_FONT = "Georgia";

export const GOLD = "C9A84C";
export const INK = "1A1E2E";
export const MUTED = "6B6E7A";

/** Scene-break ornament rendered between body segments. */
export const SCENE_BREAK_ORNAMENT = "\u25C6  \u25C6  \u25C6"; // ◆  ◆  ◆

/* ------------------------------------------------------------------ */
/* Small helpers                                                      */
/* ------------------------------------------------------------------ */

export function inches(n: number): `${number}in` {
  return `${n}in` as const;
}

export function pageBreakParagraph(): Paragraph {
  return new Paragraph({ children: [new PageBreak()] });
}

export function blankLine(spacingAfter = 120): Paragraph {
  return new Paragraph({ spacing: { after: spacingAfter }, children: [new TextRun({ text: "" })] });
}

export function decorativeRule(): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    border: {
      bottom: { color: GOLD, style: BorderStyle.SINGLE, size: 12, space: 1 },
    },
    spacing: { after: 200 },
    children: [new TextRun({ text: "\u2003", size: 8 })],
  });
}

export function sceneBreakParagraph(spec: TrimSpec): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 320, after: 320 },
    children: [
      new TextRun({
        text: SCENE_BREAK_ORNAMENT,
        color: GOLD,
        size: Math.max(22, Math.round(spec.bodyHalfPt * 1.15)),
        font: ACCENT_FONT,
        characterSpacing: 120,
      }),
    ],
  });
}

/* ------------------------------------------------------------------ */
/* Inline parsing: **bold**, *italic*, _italic_                        */
/* ------------------------------------------------------------------ */

type InlineStyle = { bold?: boolean; italics?: boolean; smallCaps?: boolean };

function inlineRuns(
  text: string,
  opts: { size?: number; color?: string; font?: string; base?: InlineStyle } = {},
): TextRun[] {
  const base: InlineStyle = opts.base ?? {};
  const size = opts.size;
  const color = opts.color;
  const font = opts.font ?? BODY_FONT;

  if (!text) {
    return [new TextRun({ text: "", font, ...(size ? { size } : {}), ...(color ? { color } : {}) })];
  }

  const runs: TextRun[] = [];
  const push = (slice: string, extra: InlineStyle) => {
    if (!slice) return;
    runs.push(
      new TextRun({
        text: slice,
        font,
        ...(size ? { size } : {}),
        ...(color ? { color } : {}),
        bold: base.bold || extra.bold,
        italics: base.italics || extra.italics,
        smallCaps: base.smallCaps || extra.smallCaps,
      }),
    );
  };

  let i = 0;
  while (i < text.length) {
    if (text.startsWith("**", i)) {
      const end = text.indexOf("**", i + 2);
      if (end === -1) {
        push(text.slice(i), {});
        break;
      }
      push(text.slice(i + 2, end), { bold: true });
      i = end + 2;
      continue;
    }
    if (text[i] === "*" && text[i + 1] !== "*") {
      const end = text.indexOf("*", i + 1);
      if (end === -1) {
        push(text.slice(i), {});
        break;
      }
      push(text.slice(i + 1, end), { italics: true });
      i = end + 1;
      continue;
    }
    if (text[i] === "_" && text[i + 1] !== "_") {
      const end = text.indexOf("_", i + 1);
      if (end !== -1) {
        push(text.slice(i + 1, end), { italics: true });
        i = end + 1;
        continue;
      }
    }
    let j = i;
    while (j < text.length) {
      if (text.startsWith("**", j)) break;
      if (text[j] === "*" && text[j + 1] !== "*") break;
      if (text[j] === "_" && text[j + 1] !== "_") break;
      j++;
    }
    push(text.slice(i, j), {});
    i = j;
  }
  return runs.length > 0 ? runs : [new TextRun({ text: "", font })];
}

/* ------------------------------------------------------------------ */
/* Block parser                                                       */
/* ------------------------------------------------------------------ */

type CalloutKind =
  | "note"
  | "tip"
  | "warning"
  | "important"
  | "quote"
  | "side"
  | "key"
  | "case";

type Block =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "blockquote"; text: string }
  | { kind: "pullquote"; text: string }
  | { kind: "sceneBreak" }
  | { kind: "bullet"; items: string[] }
  | { kind: "ordered"; items: string[] }
  | { kind: "callout"; variant: CalloutKind; title: string | null; body: string[] };

const CALLOUT_TAGS: Record<string, CalloutKind> = {
  NOTE: "note",
  TIP: "tip",
  WARNING: "warning",
  WARN: "warning",
  CAUTION: "warning",
  IMPORTANT: "important",
  QUOTE: "quote",
  SIDE: "side",
  SIDENOTE: "side",
  ASIDE: "side",
  KEY: "key",
  TAKEAWAY: "key",
  CASE: "case",
  EXAMPLE: "case",
};

function parseBlocks(markdown: string): Block[] {
  const src = markdown.replace(/\r\n/g, "\n");
  const lines = src.split("\n");
  const blocks: Block[] = [];

  const isSceneBreak = (s: string) =>
    /^\s*(?:\*\s*\*\s*\*|-{3,}|_{3,}|~{3,}|\.\s*\.\s*\.|\u25C6(?:\s*\u25C6){1,}|\u2756(?:\s*\u2756){1,})\s*$/.test(
      s,
    );

  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.replace(/\s+$/, "");

    if (!line.trim()) {
      i++;
      continue;
    }

    if (isSceneBreak(line)) {
      blocks.push({ kind: "sceneBreak" });
      i++;
      continue;
    }

    const calloutMatch = line.match(/^>\s*\[!([A-Z]+)\](.*)$/);
    if (calloutMatch) {
      const variant = CALLOUT_TAGS[calloutMatch[1].toUpperCase()] ?? "note";
      const title = calloutMatch[2].trim() || null;
      const body: string[] = [];
      i++;
      while (i < lines.length) {
        const l = lines[i];
        if (/^>\s?/.test(l)) {
          body.push(l.replace(/^>\s?/, ""));
          i++;
        } else if (l.trim() === "") {
          i++;
          break;
        } else {
          break;
        }
      }
      while (body.length > 0 && !body[body.length - 1].trim()) body.pop();
      blocks.push({ kind: "callout", variant, title, body });
      continue;
    }

    if (/^>>\s?/.test(line)) {
      const pulled: string[] = [line.replace(/^>>\s?/, "")];
      i++;
      while (i < lines.length && /^>>\s?/.test(lines[i])) {
        pulled.push(lines[i].replace(/^>>\s?/, ""));
        i++;
      }
      blocks.push({ kind: "pullquote", text: pulled.join(" ").trim() });
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoted: string[] = [line.replace(/^>\s?/, "")];
      i++;
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoted.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ kind: "blockquote", text: quoted.join(" ").trim() });
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, "").trim());
        i++;
      }
      blocks.push({ kind: "bullet", items });
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, "").trim());
        i++;
      }
      blocks.push({ kind: "ordered", items });
      continue;
    }

    const h3 = line.match(/^###\s+(.+?)\s*$/);
    if (h3) {
      blocks.push({ kind: "heading", level: 3, text: h3[1] });
      i++;
      continue;
    }
    const h2 = line.match(/^##\s+(.+?)\s*$/);
    if (h2) {
      blocks.push({ kind: "heading", level: 2, text: h2[1] });
      i++;
      continue;
    }
    const h1 = line.match(/^#\s+(.+?)\s*$/);
    if (h1) {
      blocks.push({ kind: "heading", level: 1, text: h1[1] });
      i++;
      continue;
    }

    const paraLines: string[] = [line];
    i++;
    while (i < lines.length) {
      const l = lines[i];
      if (!l.trim()) break;
      if (/^(#{1,3}\s|>{1,2}\s?|\s*[-*+]\s+|\s*\d+[.)]\s+)/.test(l)) break;
      if (isSceneBreak(l)) break;
      paraLines.push(l);
      i++;
    }
    blocks.push({ kind: "paragraph", text: paraLines.join(" ").trim() });
  }

  return blocks;
}

/* ------------------------------------------------------------------ */
/* Block renderers                                                    */
/* ------------------------------------------------------------------ */

type CalloutStyle = {
  border: string;
  fill: string;
  labelColor: string;
  label: string;
};

const CALLOUT_STYLES: Record<CalloutKind, CalloutStyle> = {
  note: { border: GOLD, fill: "FAF3DC", labelColor: "7A5A0F", label: "NOTE" },
  tip: { border: "5B7F57", fill: "EAF3E4", labelColor: "2F4A2C", label: "TIP" },
  warning: { border: "B85C2F", fill: "FBEBDF", labelColor: "7A2F0A", label: "WARNING" },
  important: { border: "7A1F23", fill: "F7DCDE", labelColor: "5A1013", label: "IMPORTANT" },
  quote: { border: GOLD, fill: "FBF4DB", labelColor: "7A5A0F", label: "REFLECTION" },
  side: { border: "2F4A63", fill: "E7EEF4", labelColor: "1E3348", label: "SIDE NOTE" },
  key: { border: "5E4B9E", fill: "EDE8F7", labelColor: "33235C", label: "KEY TAKEAWAY" },
  case: { border: "2B6F6F", fill: "E3F0F0", labelColor: "0F4040", label: "CASE STUDY" },
};

function renderHeading(b: Extract<Block, { kind: "heading" }>, spec: TrimSpec): Paragraph {
  const size =
    b.level === 1
      ? Math.round(spec.chapterTitleHalfPt * 0.7)
      : b.level === 2
        ? Math.round(spec.chapterTitleHalfPt * 0.55)
        : Math.round(spec.chapterTitleHalfPt * 0.42);
  const heading =
    b.level === 1 ? HeadingLevel.HEADING_2 : b.level === 2 ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_4;
  return new Paragraph({
    heading,
    spacing: { before: 320, after: 160 },
    keepNext: true,
    children: [
      new TextRun({ text: b.text, bold: true, size, font: HEADING_FONT, color: INK }),
    ],
  });
}

function renderParagraph(b: Extract<Block, { kind: "paragraph" }>, spec: TrimSpec): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 120, line: 320 },
    indent: { firstLine: 360 },
    children: inlineRuns(b.text, { size: spec.bodyHalfPt, font: BODY_FONT }),
  });
}

function renderBlockquote(
  b: Extract<Block, { kind: "blockquote" }>,
  spec: TrimSpec,
): Paragraph {
  return new Paragraph({
    spacing: { before: 160, after: 160, line: 320 },
    indent: { left: 720, right: 360 },
    border: {
      left: { color: GOLD, style: BorderStyle.SINGLE, size: 16, space: 12 },
    },
    children: inlineRuns(b.text, {
      size: spec.bodyHalfPt,
      font: BODY_FONT,
      base: { italics: true },
    }),
  });
}

function renderPullQuote(
  b: Extract<Block, { kind: "pullquote" }>,
  spec: TrimSpec,
): Paragraph[] {
  const quoteSize = Math.round(spec.bodyHalfPt * 1.55);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 360, after: 80 },
      children: [
        new TextRun({
          text: "\u201C",
          color: GOLD,
          size: Math.round(spec.bodyHalfPt * 3.2),
          font: HEADING_FONT,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 360, line: 360 },
      indent: { left: 720, right: 720 },
      children: inlineRuns(b.text, {
        size: quoteSize,
        font: HEADING_FONT,
        color: INK,
        base: { italics: true },
      }),
    }),
  ];
}

function renderListItems(items: string[], ordered: boolean, spec: TrimSpec): Paragraph[] {
  const numberingReference = ordered ? "ordered-list" : "bullet-list";
  return items.map(
    (it) =>
      new Paragraph({
        numbering: { reference: numberingReference, level: 0 },
        spacing: { after: 80, line: 300 },
        children: inlineRuns(it, { size: spec.bodyHalfPt, font: BODY_FONT }),
      }),
  );
}

function renderCallout(
  b: Extract<Block, { kind: "callout" }>,
  spec: TrimSpec,
  pageContentTwips: number,
): Table {
  const style = CALLOUT_STYLES[b.variant];
  const innerParagraphs: Paragraph[] = [];

  innerParagraphs.push(
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: b.title ? `${style.label} \u2014 ${b.title.toUpperCase()}` : style.label,
          bold: true,
          size: Math.max(18, spec.bodyHalfPt - 4),
          color: style.labelColor,
          font: HEADING_FONT,
          characterSpacing: 40,
        }),
      ],
    }),
  );

  const bodyBlocks = b.body.length > 0 ? b.body.join("\n").trim() : "";
  if (bodyBlocks.length > 0) {
    const chunks = bodyBlocks.split(/\n{2,}/);
    for (const chunk of chunks) {
      const sub = parseBlocks(chunk);
      for (const sb of sub) {
        if (sb.kind === "paragraph") {
          innerParagraphs.push(
            new Paragraph({
              spacing: { after: 100, line: 300 },
              children: inlineRuns(sb.text, {
                size: spec.bodyHalfPt,
                font: BODY_FONT,
                color: "1F2230",
              }),
            }),
          );
        } else if (sb.kind === "bullet" || sb.kind === "ordered") {
          for (const it of sb.items) {
            innerParagraphs.push(
              new Paragraph({
                spacing: { after: 60, line: 300 },
                indent: { left: 360, hanging: 220 },
                children: [
                  new TextRun({
                    text: sb.kind === "ordered" ? "\u2022  " : "\u2022  ",
                    color: style.labelColor,
                    size: spec.bodyHalfPt,
                    font: BODY_FONT,
                    bold: true,
                  }),
                  ...inlineRuns(it, { size: spec.bodyHalfPt, font: BODY_FONT, color: "1F2230" }),
                ],
              }),
            );
          }
        } else if (sb.kind === "heading") {
          innerParagraphs.push(
            new Paragraph({
              spacing: { before: 100, after: 80 },
              children: [
                new TextRun({
                  text: sb.text,
                  bold: true,
                  size: spec.bodyHalfPt + 2,
                  font: HEADING_FONT,
                  color: style.labelColor,
                }),
              ],
            }),
          );
        } else if (sb.kind === "blockquote") {
          innerParagraphs.push(
            new Paragraph({
              spacing: { after: 100, line: 300 },
              indent: { left: 240 },
              children: inlineRuns(sb.text, {
                size: spec.bodyHalfPt,
                font: BODY_FONT,
                color: "1F2230",
                base: { italics: true },
              }),
            }),
          );
        }
      }
    }
  }

  if (innerParagraphs.length === 1) {
    innerParagraphs.push(new Paragraph({ children: [new TextRun({ text: "" })] }));
  }

  const borderEdge = {
    style: BorderStyle.SINGLE,
    size: 12,
    color: style.border,
  } as const;
  const borderAccentLeft = {
    style: BorderStyle.SINGLE,
    size: 36,
    color: style.border,
  } as const;

  return new Table({
    width: { size: pageContentTwips, type: WidthType.DXA },
    columnWidths: [pageContentTwips],
    indent: { size: 0, type: WidthType.DXA },
    borders: {
      top: borderEdge,
      bottom: borderEdge,
      right: borderEdge,
      left: borderAccentLeft,
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: style.fill, color: "auto", type: ShadingType.CLEAR },
            margins: { top: 240, bottom: 240, left: 300, right: 300 },
            verticalAlign: VerticalAlign.TOP,
            children: innerParagraphs,
          }),
        ],
      }),
    ],
  });
}

/* ------------------------------------------------------------------ */
/* Chapter assembly                                                   */
/* ------------------------------------------------------------------ */

export function stripLeadingChapterHeading(md: string, expectedNumber: number): string {
  if (!md) return md;
  const lines = md.split(/\r?\n/);
  let i = 0;
  while (i < lines.length && lines[i].trim() === "") i++;
  if (i >= lines.length) return md;
  const first = lines[i];
  const headingMatch = first.match(/^\s{0,3}#{1,3}\s+(.+?)\s*$/);
  if (!headingMatch) return md;
  const headingText = headingMatch[1].trim();
  const chapterRe = /^(?:chapter|ch\.?)\s*(\d+)(?:\s*[:\u2014\u2013-]\s*.+)?$/i;
  const m = headingText.match(chapterRe);
  if (!m) return md;
  const numInHeading = parseInt(m[1], 10);
  if (!Number.isFinite(numInHeading) || numInHeading !== expectedNumber) return md;
  let j = i + 1;
  while (j < lines.length && lines[j].trim() === "") j++;
  return lines.slice(j).join("\n");
}

const NUMERAL_WORDS = [
  "ZERO",
  "ONE",
  "TWO",
  "THREE",
  "FOUR",
  "FIVE",
  "SIX",
  "SEVEN",
  "EIGHT",
  "NINE",
  "TEN",
  "ELEVEN",
  "TWELVE",
  "THIRTEEN",
  "FOURTEEN",
  "FIFTEEN",
  "SIXTEEN",
  "SEVENTEEN",
  "EIGHTEEN",
  "NINETEEN",
  "TWENTY",
];

function chapterNumeralWord(n: number): string {
  if (n >= 0 && n < NUMERAL_WORDS.length) return NUMERAL_WORDS[n];
  return String(n);
}

function dropCapFirstParagraph(
  firstText: string,
  spec: TrimSpec,
): Paragraph {
  const trimmed = firstText.trimStart();
  if (!trimmed) {
    return new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 140, line: 320 },
      children: [new TextRun({ text: "", font: BODY_FONT })],
    });
  }
  const firstLetter = trimmed.charAt(0);
  const afterLetter = trimmed.slice(1);
  const smallCapMatch = afterLetter.match(/^([^\s]+(?:\s+[^\s]+){0,3})([\s\S]*)$/);
  const smallCapPortion = smallCapMatch ? smallCapMatch[1] : "";
  const remainder = smallCapMatch ? smallCapMatch[2] : afterLetter;

  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 140, line: 320 },
    children: [
      new TextRun({
        text: firstLetter,
        size: spec.dropCapHalfPt,
        bold: true,
        font: HEADING_FONT,
        color: GOLD,
      }),
      ...(smallCapPortion
        ? [
            new TextRun({
              text: smallCapPortion,
              size: spec.bodyHalfPt,
              font: BODY_FONT,
              smallCaps: true,
              characterSpacing: 20,
            }),
          ]
        : []),
      ...inlineRuns(remainder, { size: spec.bodyHalfPt, font: BODY_FONT }),
    ],
  });
}

export function buildChapterOpener(
  number: number,
  title: string,
  spec: TrimSpec,
): Paragraph[] {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 1600, after: 160 },
      children: [
        new TextRun({
          text: `CHAPTER ${chapterNumeralWord(number)}`,
          color: GOLD,
          bold: true,
          size: Math.round(spec.bodyHalfPt * 1.0),
          characterSpacing: 160,
          font: HEADING_FONT,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 240 },
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: spec.chapterTitleHalfPt,
          font: HEADING_FONT,
          color: INK,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 420 },
      children: [
        new TextRun({
          text: SCENE_BREAK_ORNAMENT,
          color: GOLD,
          size: Math.round(spec.bodyHalfPt * 1.2),
          characterSpacing: 120,
          font: ACCENT_FONT,
        }),
      ],
    }),
  ];
}

export function renderChapterBody(
  markdown: string,
  spec: TrimSpec,
  pageContentTwips: number,
): BodyChild[] {
  const md = markdown.trim();
  const blocks = parseBlocks(md);
  const out: BodyChild[] = [];
  let firstParagraphDone = false;

  for (const b of blocks) {
    switch (b.kind) {
      case "heading":
        out.push(renderHeading(b, spec));
        break;
      case "paragraph":
        if (!firstParagraphDone) {
          out.push(dropCapFirstParagraph(b.text, spec));
          firstParagraphDone = true;
        } else {
          out.push(renderParagraph(b, spec));
        }
        break;
      case "blockquote":
        out.push(renderBlockquote(b, spec));
        break;
      case "pullquote":
        out.push(...renderPullQuote(b, spec));
        break;
      case "sceneBreak":
        out.push(sceneBreakParagraph(spec));
        break;
      case "bullet":
        out.push(...renderListItems(b.items, false, spec));
        break;
      case "ordered":
        out.push(...renderListItems(b.items, true, spec));
        break;
      case "callout":
        out.push(renderCallout(b, spec, pageContentTwips));
        out.push(blankLine(120));
        break;
    }
  }

  if (out.length === 0) {
    out.push(new Paragraph({ children: [new TextRun({ text: "", font: BODY_FONT })] }));
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Front matter                                                       */
/* ------------------------------------------------------------------ */

function buildCoverPages(
  title: string,
  genre: string,
  authorName: string | null,
  spec: TrimSpec,
): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(blankLine(800));
  paragraphs.push(blankLine(600));

  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: SCENE_BREAK_ORNAMENT,
          color: GOLD,
          size: Math.round(spec.bodyHalfPt * 1.1),
          characterSpacing: 160,
          font: ACCENT_FONT,
        }),
      ],
    }),
  );

  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 300 },
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: spec.coverTitleHalfPt,
          font: HEADING_FONT,
          color: INK,
        }),
      ],
    }),
  );

  paragraphs.push(decorativeRule());

  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 180 },
      children: [
        new TextRun({
          text: genre.toUpperCase(),
          size: Math.round(spec.bodyHalfPt * 1.1),
          font: ACCENT_FONT,
          color: GOLD,
          characterSpacing: 240,
          bold: true,
        }),
      ],
    }),
  );

  if (authorName) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 1400, after: 100 },
        children: [
          new TextRun({
            text: "by",
            italics: true,
            size: Math.round(spec.bodyHalfPt * 1.05),
            font: ACCENT_FONT,
            color: MUTED,
          }),
        ],
      }),
    );
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: authorName,
            bold: true,
            size: Math.round(spec.coverTitleHalfPt * 0.42),
            font: HEADING_FONT,
            color: INK,
          }),
        ],
      }),
    );
  }

  paragraphs.push(pageBreakParagraph());

  paragraphs.push(blankLine(600));
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 80 },
      children: [
        new TextRun({
          text: title,
          italics: true,
          size: Math.round(spec.bodyHalfPt * 1.1),
          font: HEADING_FONT,
          color: MUTED,
        }),
      ],
    }),
  );
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `Copyright \u00A9 ${new Date().getFullYear()}${authorName ? ` ${authorName}` : ""}. All rights reserved.`,
          size: Math.round(spec.bodyHalfPt * 0.85),
          font: ACCENT_FONT,
          color: MUTED,
        }),
      ],
    }),
  );
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [
        new TextRun({
          text: "Typeset and compiled with ChapterAI.",
          size: Math.round(spec.bodyHalfPt * 0.8),
          font: ACCENT_FONT,
          color: MUTED,
          italics: true,
        }),
      ],
    }),
  );
  paragraphs.push(pageBreakParagraph());

  return paragraphs;
}

function buildTableOfContents(
  chapters: ReadonlyArray<{ chapter_number: number; title: string }>,
  spec: TrimSpec,
): Paragraph[] {
  const out: Paragraph[] = [];
  out.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 1200, after: 200 },
      children: [
        new TextRun({
          text: "CONTENTS",
          bold: true,
          size: Math.round(spec.chapterTitleHalfPt * 0.85),
          font: HEADING_FONT,
          color: INK,
          characterSpacing: 160,
        }),
      ],
    }),
  );
  out.push(decorativeRule());

  for (const ch of chapters) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 140, line: 320 },
        indent: { left: 360, right: 360 },
        children: [
          new TextRun({
            text: `Chapter ${ch.chapter_number}`,
            size: Math.round(spec.bodyHalfPt * 0.9),
            font: ACCENT_FONT,
            color: GOLD,
            bold: true,
            characterSpacing: 60,
          }),
          new TextRun({
            text: `  \u2014  `,
            size: spec.bodyHalfPt,
            font: ACCENT_FONT,
            color: MUTED,
          }),
          new TextRun({
            text: ch.title,
            size: spec.bodyHalfPt,
            font: BODY_FONT,
            color: INK,
            italics: true,
          }),
        ],
      }),
    );
  }

  out.push(pageBreakParagraph());
  return out;
}

/* ------------------------------------------------------------------ */
/* Public types                                                       */
/* ------------------------------------------------------------------ */

export type DocxCompileBook = {
  title: string | null;
  genre: string | null;
};

export type DocxCompileChapter = {
  chapter_number: number;
  title: string;
  content: string | null;
};

export type BuildDocxOptions = {
  trimSize?: TrimSize;
  authorName?: string | null;
};

/* ------------------------------------------------------------------ */
/* Main compile                                                       */
/* ------------------------------------------------------------------ */

export async function buildDocxBufferFromData(
  book: DocxCompileBook,
  chapterRows: DocxCompileChapter[],
  isFreeTier: boolean,
  options?: BuildDocxOptions,
): Promise<Buffer> {
  const title = book.title?.trim() || "Untitled";
  const genre = book.genre?.trim() || "General";
  const authorName = options?.authorName?.trim() || null;
  const trim = resolveTrimSize(options?.trimSize);
  const spec = TRIM_SPECS[trim];

  const pageWidthTwips = Math.round(spec.widthIn * 1440);
  const marginLeftTwips = Math.round(spec.margin.left * 1440);
  const marginRightTwips = Math.round(spec.margin.right * 1440);
  const contentTwips = Math.max(2000, pageWidthTwips - marginLeftTwips - marginRightTwips);

  const frontMatter: BodyChild[] = buildCoverPages(title, genre, authorName, spec);

  const tocBlocks: BodyChild[] = buildTableOfContents(
    chapterRows.map((c) => ({ chapter_number: c.chapter_number, title: c.title })),
    spec,
  );

  const bodyBlocks: BodyChild[] = [];
  for (let idx = 0; idx < chapterRows.length; idx++) {
    const ch = chapterRows[idx];
    if (idx > 0) {
      bodyBlocks.push(pageBreakParagraph());
    }
    bodyBlocks.push(...buildChapterOpener(ch.chapter_number, ch.title, spec));
    const md = stripLeadingChapterHeading((ch.content ?? "").trim(), ch.chapter_number);
    bodyBlocks.push(...renderChapterBody(md, spec, contentTwips));
  }

  if (isFreeTier) {
    bodyBlocks.push(pageBreakParagraph());
    bodyBlocks.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 1600, after: 160 },
        children: [
          new TextRun({
            text: SCENE_BREAK_ORNAMENT,
            color: GOLD,
            size: Math.round(spec.bodyHalfPt * 1.15),
            characterSpacing: 160,
            font: ACCENT_FONT,
          }),
        ],
      }),
    );
    bodyBlocks.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 120 },
        children: [
          new TextRun({
            text: "Created with ChapterAI",
            italics: true,
            size: Math.round(spec.bodyHalfPt * 1.05),
            color: MUTED,
            font: ACCENT_FONT,
          }),
        ],
      }),
    );
    bodyBlocks.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: "chapterai.com",
            size: Math.round(spec.bodyHalfPt * 0.95),
            color: MUTED,
            font: ACCENT_FONT,
          }),
        ],
      }),
    );
  }

  const pageProps = {
    size: {
      width: inches(spec.widthIn),
      height: inches(spec.heightIn),
      orientation: "portrait" as const,
    },
    margin: {
      top: inches(spec.margin.top),
      bottom: inches(spec.margin.bottom),
      left: inches(spec.margin.left),
      right: inches(spec.margin.right),
      header: inches(Math.max(0.3, spec.margin.top - 0.4)),
      footer: inches(Math.max(0.3, spec.margin.bottom - 0.4)),
      gutter: 0,
    },
  };

  const runningHeader = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: title,
            italics: true,
            size: Math.round(spec.bodyHalfPt * 0.8),
            color: MUTED,
            font: HEADING_FONT,
            characterSpacing: 80,
          }),
        ],
      }),
    ],
  });

  const runningFooter = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            children: [PageNumber.CURRENT],
            size: Math.round(spec.bodyHalfPt * 0.85),
            color: MUTED,
            font: ACCENT_FONT,
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    creator: authorName ?? "ChapterAI",
    title,
    description: `${title} — ${genre}`,
    styles: {
      default: {
        document: {
          run: { font: BODY_FONT, size: spec.bodyHalfPt, color: INK },
          paragraph: { spacing: { line: 320 } },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: "bullet-list",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "\u25CF",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: { indent: { left: 540, hanging: 260 } },
                run: { color: GOLD, font: BODY_FONT },
              },
            },
          ],
        },
        {
          reference: "ordered-list",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: { indent: { left: 540, hanging: 260 } },
                run: { color: GOLD, font: HEADING_FONT, bold: true },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: { page: pageProps, titlePage: true },
        children: frontMatter,
      },
      {
        properties: {
          page: { ...pageProps, pageNumbers: { start: 1 } },
          titlePage: true,
        },
        headers: { default: runningHeader, first: new Header({ children: [new Paragraph({ children: [new TextRun({ text: "" })] })] }) },
        footers: { default: runningFooter, first: new Footer({ children: [new Paragraph({ children: [new TextRun({ text: "" })] })] }) },
        children: [...tocBlocks, ...bodyBlocks],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

/** Compile a user's book from Supabase data into a DOCX buffer. */
export async function compileBookToDocx(
  bookId: string,
  userId: string,
  options?: BuildDocxOptions,
): Promise<Buffer> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, full_name")
    .eq("id", userId)
    .maybeSingle();

  const isFreeTier = (profile?.subscription_tier ?? "free") === "free";
  const authorName = options?.authorName ?? profile?.full_name ?? null;

  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("id, user_id, title, genre")
    .eq("id", bookId)
    .eq("user_id", userId)
    .single();

  if (bookError || !book) {
    throw new Error("Book not found or access denied.");
  }

  // Any chapter that has been written (draft/edited/approved) is included.
  // Pending/generating chapters have no content yet, so they're skipped.
  const statuses: ChapterStatusDb[] = ["draft", "edited", "approved"];
  const { data: chapters, error: chError } = await supabase
    .from("chapters")
    .select("chapter_number, title, content")
    .eq("book_id", bookId)
    .in("status", statuses)
    .order("chapter_number", { ascending: true });

  if (chError) {
    throw new Error("Could not load chapters.");
  }

  const rows: DocxCompileChapter[] = chapters ?? [];

  return buildDocxBufferFromData(
    { title: book.title, genre: book.genre },
    rows,
    isFreeTier,
    { trimSize: options?.trimSize, authorName },
  );
}
