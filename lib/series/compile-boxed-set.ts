/**
 * Boxed-set compiler (Prompt 16 lines 308-326).
 *
 * Assembles a multi-book DOCX by reusing the chapter-rendering primitives in
 * `lib/docx/compiler.ts`. Front matter (series title / copyright / reading
 * order / dedication / author note) and back matter (combined about-author,
 * also-by-author, newsletter pitch) are composed from user-editable markdown
 * stored on `series_metadata`, with sensible fallbacks.
 *
 * Intentionally keeps the DOCX generation path in one place — the existing
 * single-book compiler is left alone so it stays the reference implementation
 * for chapter rendering.
 */

import {
  AlignmentType,
  Document,
  Footer,
  Header,
  Packer,
  PageNumber,
  Paragraph,
  TextRun,
} from "docx";

import {
  ACCENT_FONT,
  BODY_FONT,
  GOLD,
  HEADING_FONT,
  INK,
  MUTED,
  SCENE_BREAK_ORNAMENT,
  blankLine,
  buildChapterOpener,
  decorativeRule,
  inches,
  pageBreakParagraph,
  renderChapterBody,
  stripLeadingChapterHeading,
  type BodyChild,
} from "@/lib/docx/compiler";
import {
  TRIM_SPECS,
  resolveTrimSize,
  type TrimSize,
  type TrimSpec,
} from "@/lib/docx/trim-sizes";
import { createClient } from "@/lib/supabase/server";
import type { ChapterStatusDb } from "@/types/database.types";

/* ------------------------------------------------------------------ */
/* Public types                                                       */
/* ------------------------------------------------------------------ */

/** Options payload the API route hands to the compiler. */
export type SeriesCompileOptions = {
  seriesId: string;
  trimSize?: TrimSize;
  /** Ordered list of book ids to include (subset of the series). */
  includedBookIds?: string[];
  /** User-editable copy blocks. Falls back to defaults when null/empty. */
  frontMatter?: {
    boxedSetTitle?: string | null;
    dedicationMd?: string | null;
    authorNoteMd?: string | null;
    readingOrderCopyMd?: string | null;
  };
  backMatter?: {
    aboutAuthorMd?: string | null;
    alsoByAuthorMd?: string | null;
    newsletterSignupMd?: string | null;
  };
};

export type BoxedSetCompileResult = {
  buffer: Buffer;
  /** Book rows actually included (in reading order). */
  includedBooks: Array<{ id: string; title: string; chapters: number }>;
};

/* ------------------------------------------------------------------ */
/* Internal helpers                                                   */
/* ------------------------------------------------------------------ */

type BookForCompile = {
  id: string;
  title: string;
  subtitle: string | null;
  genre: string | null;
  series_order: number | null;
};

type ChapterForCompile = {
  chapter_number: number;
  title: string;
  content: string | null;
};

/**
 * The boxed-set uses slimmer chapter openers since we repeat them for every
 * included book. We still reuse `buildChapterOpener` verbatim to keep the
 * visual language consistent with single-book exports.
 */
function buildBookOpener(
  bookOrdinalLabel: string,
  bookTitle: string,
  bookSubtitle: string | null,
  spec: TrimSpec,
): Paragraph[] {
  const out: Paragraph[] = [];
  out.push(blankLine(800));
  out.push(blankLine(600));
  out.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 220 },
      children: [
        new TextRun({
          text: bookOrdinalLabel.toUpperCase(),
          bold: true,
          size: Math.round(spec.bodyHalfPt * 1.1),
          characterSpacing: 240,
          color: GOLD,
          font: ACCENT_FONT,
        }),
      ],
    }),
  );
  out.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 220 },
      children: [
        new TextRun({
          text: bookTitle,
          bold: true,
          size: Math.round(spec.coverTitleHalfPt * 0.7),
          color: INK,
          font: HEADING_FONT,
        }),
      ],
    }),
  );
  if (bookSubtitle) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 200 },
        children: [
          new TextRun({
            text: bookSubtitle,
            italics: true,
            size: Math.round(spec.bodyHalfPt * 1.1),
            color: MUTED,
            font: ACCENT_FONT,
          }),
        ],
      }),
    );
  }
  out.push(decorativeRule());
  out.push(pageBreakParagraph());
  return out;
}

/** Cheap markdown renderer for front/back matter paragraphs. */
function renderMarkdownSection(
  markdown: string,
  spec: TrimSpec,
  pageContentTwips: number,
): BodyChild[] {
  return renderChapterBody(markdown, spec, pageContentTwips);
}

/** Build the series title page. */
function buildSeriesTitlePage(
  boxedSetTitle: string,
  seriesTagline: string | null,
  authorName: string | null,
  spec: TrimSpec,
): Paragraph[] {
  const out: Paragraph[] = [];
  out.push(blankLine(800));
  out.push(blankLine(600));
  out.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 320 },
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
  out.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 280 },
      children: [
        new TextRun({
          text: boxedSetTitle,
          bold: true,
          size: spec.coverTitleHalfPt,
          font: HEADING_FONT,
          color: INK,
        }),
      ],
    }),
  );
  out.push(decorativeRule());
  if (seriesTagline) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 240 },
        children: [
          new TextRun({
            text: seriesTagline,
            italics: true,
            size: Math.round(spec.bodyHalfPt * 1.2),
            color: MUTED,
            font: ACCENT_FONT,
          }),
        ],
      }),
    );
  }
  if (authorName) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 1200, after: 100 },
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
    out.push(
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
  out.push(pageBreakParagraph());
  return out;
}

/** Combined copyright page. */
function buildCopyrightPage(
  boxedSetTitle: string,
  authorName: string | null,
  books: ReadonlyArray<{ title: string; series_order: number | null }>,
  spec: TrimSpec,
): Paragraph[] {
  const out: Paragraph[] = [];
  out.push(blankLine(600));
  out.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 80 },
      children: [
        new TextRun({
          text: boxedSetTitle,
          italics: true,
          size: Math.round(spec.bodyHalfPt * 1.1),
          font: HEADING_FONT,
          color: MUTED,
        }),
      ],
    }),
  );
  const year = new Date().getFullYear();
  const ownerLine = authorName ? ` ${authorName}` : "";
  out.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [
        new TextRun({
          text: `Copyright \u00A9 ${year}${ownerLine}. All rights reserved.`,
          size: Math.round(spec.bodyHalfPt * 0.85),
          font: ACCENT_FONT,
          color: MUTED,
        }),
      ],
    }),
  );
  out.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 280 },
      children: [
        new TextRun({
          text: "This boxed set edition compiles the following titles, each previously available as a standalone book:",
          size: Math.round(spec.bodyHalfPt * 0.85),
          font: ACCENT_FONT,
          color: MUTED,
          italics: true,
        }),
      ],
    }),
  );
  for (const b of books) {
    const label = b.series_order != null ? `Book ${b.series_order}` : "";
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: `${label}${label ? " — " : ""}${b.title}  \u00B7  \u00A9 ${year}${ownerLine}`,
            size: Math.round(spec.bodyHalfPt * 0.85),
            font: ACCENT_FONT,
            color: MUTED,
          }),
        ],
      }),
    );
  }
  out.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 320, after: 160 },
      children: [
        new TextRun({
          text: "No part of this publication may be reproduced, distributed, or transmitted in any form without prior written permission of the copyright holder.",
          size: Math.round(spec.bodyHalfPt * 0.78),
          font: ACCENT_FONT,
          color: MUTED,
          italics: true,
        }),
      ],
    }),
  );
  out.push(
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
  out.push(pageBreakParagraph());
  return out;
}

/** Auto-compose a reading-order page when no custom markdown was provided. */
function composeReadingOrderFallbackMarkdown(
  seriesName: string,
  books: ReadonlyArray<{ title: string; series_order: number | null }>,
): string {
  const lines: string[] = [];
  lines.push(`## Reading order — ${seriesName}`);
  lines.push("");
  for (let i = 0; i < books.length; i++) {
    const b = books[i];
    const num = b.series_order ?? i + 1;
    lines.push(`${num}. ${b.title}`);
  }
  return lines.join("\n");
}

/** Section heading used for dedication / author note / back matter. */
function sectionHeading(label: string, spec: TrimSpec): Paragraph[] {
  return [
    blankLine(600),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 1600, after: 160 },
      children: [
        new TextRun({
          text: label.toUpperCase(),
          color: GOLD,
          bold: true,
          size: Math.round(spec.bodyHalfPt * 1.0),
          characterSpacing: 220,
          font: HEADING_FONT,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: SCENE_BREAK_ORNAMENT,
          color: GOLD,
          size: Math.round(spec.bodyHalfPt * 1.1),
          characterSpacing: 120,
          font: ACCENT_FONT,
        }),
      ],
    }),
  ];
}

function ordinalLabel(n: number): string {
  // Reserving "First / Second / …" for the first few keeps the opener elegant;
  // fall back to a numeric label for longer series.
  const WORDS = [
    "",
    "BOOK ONE",
    "BOOK TWO",
    "BOOK THREE",
    "BOOK FOUR",
    "BOOK FIVE",
    "BOOK SIX",
    "BOOK SEVEN",
    "BOOK EIGHT",
    "BOOK NINE",
    "BOOK TEN",
  ];
  if (n >= 1 && n < WORDS.length) return WORDS[n];
  return `BOOK ${n}`;
}

/* ------------------------------------------------------------------ */
/* Main compile                                                       */
/* ------------------------------------------------------------------ */

/**
 * Compile a boxed set to a DOCX buffer. Verifies RLS-equivalent ownership
 * before touching book content so the caller can treat the returned buffer
 * as safe to stream to the user.
 */
export async function compileBoxedSetToDocx(
  userId: string,
  opts: SeriesCompileOptions,
): Promise<BoxedSetCompileResult> {
  const supabase = await createClient();

  const { data: series, error: seriesErr } = await supabase
    .from("series")
    .select("id, name, tagline")
    .eq("id", opts.seriesId)
    .eq("user_id", userId)
    .maybeSingle();
  if (seriesErr || !series) {
    throw new Error("Series not found or access denied.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, full_name, pen_name, bio")
    .eq("id", userId)
    .maybeSingle();

  const isFreeTier = (profile?.subscription_tier ?? "free") === "free";
  const authorName =
    profile?.pen_name?.trim() || profile?.full_name?.trim() || null;

  const { data: bookRows, error: bookErr } = await supabase
    .from("books")
    .select("id, title, subtitle, genre, series_order, status")
    .eq("series_id", opts.seriesId)
    .eq("user_id", userId)
    .order("series_order", { ascending: true, nullsFirst: false });
  if (bookErr) {
    throw new Error("Could not load series books.");
  }

  const allBooks: BookForCompile[] = (bookRows ?? []).map((b) => ({
    id: b.id,
    title: b.title,
    subtitle: b.subtitle ?? null,
    genre: b.genre ?? null,
    series_order: b.series_order ?? null,
  }));

  // Determine which books to include. Explicit includedBookIds win; otherwise
  // default to every book in the series regardless of status — the UI already
  // pre-checks "complete" books but the caller may want to include drafts.
  const includeSet = new Set(opts.includedBookIds ?? []);
  const included = opts.includedBookIds
    ? allBooks.filter((b) => includeSet.has(b.id))
    : allBooks;

  if (included.length === 0) {
    throw new Error("Select at least one book to include in the boxed set.");
  }

  // Preserve reading order. The compiler always walks included books by
  // their series_order (nulls last); callers cannot override this because
  // publishing-order surprises are expensive to debug post-export.
  included.sort((a, b) => {
    const ao = a.series_order ?? Number.POSITIVE_INFINITY;
    const bo = b.series_order ?? Number.POSITIVE_INFINITY;
    if (ao !== bo) return ao - bo;
    return a.title.localeCompare(b.title);
  });

  // Fetch all chapters for the included books in one round-trip. Anything
  // without content yet is skipped silently (matches single-book behavior).
  const statuses: ChapterStatusDb[] = ["draft", "edited", "approved"];
  const includedIds = included.map((b) => b.id);
  const { data: chapterRows, error: chErr } = await supabase
    .from("chapters")
    .select("book_id, chapter_number, title, content, status")
    .in("book_id", includedIds)
    .in("status", statuses)
    .order("chapter_number", { ascending: true });
  if (chErr) {
    throw new Error("Could not load chapters for the boxed set.");
  }

  const chaptersByBook = new Map<string, ChapterForCompile[]>();
  for (const row of chapterRows ?? []) {
    const list = chaptersByBook.get(row.book_id) ?? [];
    list.push({
      chapter_number: row.chapter_number,
      title: row.title,
      content: row.content,
    });
    chaptersByBook.set(row.book_id, list);
  }

  /* ---------------------------------------------------------------- */
  /* Assemble the DOCX                                                */
  /* ---------------------------------------------------------------- */

  const trim = resolveTrimSize(opts.trimSize);
  const spec = TRIM_SPECS[trim];
  const pageWidthTwips = Math.round(spec.widthIn * 1440);
  const marginLeftTwips = Math.round(spec.margin.left * 1440);
  const marginRightTwips = Math.round(spec.margin.right * 1440);
  const contentTwips = Math.max(
    2000,
    pageWidthTwips - marginLeftTwips - marginRightTwips,
  );

  const boxedSetTitle =
    opts.frontMatter?.boxedSetTitle?.trim() ||
    `The Complete ${series.name}`;

  // --- Front matter ------------------------------------------------------

  const frontMatter: BodyChild[] = [];
  frontMatter.push(
    ...buildSeriesTitlePage(
      boxedSetTitle,
      series.tagline ?? null,
      authorName,
      spec,
    ),
  );
  frontMatter.push(
    ...buildCopyrightPage(
      boxedSetTitle,
      authorName,
      included.map((b) => ({ title: b.title, series_order: b.series_order })),
      spec,
    ),
  );

  // Reading order page.
  frontMatter.push(...sectionHeading("Reading order", spec));
  const readingOrderMd =
    opts.frontMatter?.readingOrderCopyMd?.trim() ||
    composeReadingOrderFallbackMarkdown(
      series.name,
      included.map((b) => ({ title: b.title, series_order: b.series_order })),
    );
  frontMatter.push(
    ...renderMarkdownSection(readingOrderMd, spec, contentTwips),
  );
  frontMatter.push(pageBreakParagraph());

  if (opts.frontMatter?.dedicationMd?.trim()) {
    frontMatter.push(...sectionHeading("Dedication", spec));
    frontMatter.push(
      ...renderMarkdownSection(
        opts.frontMatter.dedicationMd,
        spec,
        contentTwips,
      ),
    );
    frontMatter.push(pageBreakParagraph());
  }

  if (opts.frontMatter?.authorNoteMd?.trim()) {
    frontMatter.push(...sectionHeading("A note from the author", spec));
    frontMatter.push(
      ...renderMarkdownSection(
        opts.frontMatter.authorNoteMd,
        spec,
        contentTwips,
      ),
    );
    frontMatter.push(pageBreakParagraph());
  }

  // --- Body: each included book ------------------------------------------

  const bodyBlocks: BodyChild[] = [];
  const includedBooksSummary: BoxedSetCompileResult["includedBooks"] = [];

  included.forEach((book, bookIdx) => {
    const chapters = chaptersByBook.get(book.id) ?? [];
    includedBooksSummary.push({
      id: book.id,
      title: book.title,
      chapters: chapters.length,
    });

    const ord = book.series_order ?? bookIdx + 1;
    if (bookIdx > 0) {
      bodyBlocks.push(pageBreakParagraph());
    }
    bodyBlocks.push(...buildBookOpener(ordinalLabel(ord), book.title, book.subtitle, spec));

    // Render the book's chapters using the single-book pipeline.
    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i];
      if (i > 0) {
        bodyBlocks.push(pageBreakParagraph());
      }
      bodyBlocks.push(...buildChapterOpener(ch.chapter_number, ch.title, spec));
      const md = stripLeadingChapterHeading(
        (ch.content ?? "").trim(),
        ch.chapter_number,
      );
      bodyBlocks.push(...renderChapterBody(md, spec, contentTwips));
    }
  });

  // --- Back matter -------------------------------------------------------

  const aboutAuthor =
    opts.backMatter?.aboutAuthorMd?.trim() || profile?.bio?.trim() || null;
  if (aboutAuthor) {
    bodyBlocks.push(pageBreakParagraph());
    bodyBlocks.push(...sectionHeading("About the author", spec));
    bodyBlocks.push(
      ...renderMarkdownSection(aboutAuthor, spec, contentTwips),
    );
  }

  const alsoBy = opts.backMatter?.alsoByAuthorMd?.trim();
  if (alsoBy) {
    bodyBlocks.push(pageBreakParagraph());
    bodyBlocks.push(...sectionHeading("Also by this author", spec));
    bodyBlocks.push(...renderMarkdownSection(alsoBy, spec, contentTwips));
  }

  const newsletter = opts.backMatter?.newsletterSignupMd?.trim();
  if (newsletter) {
    bodyBlocks.push(pageBreakParagraph());
    bodyBlocks.push(...sectionHeading("Stay in touch", spec));
    bodyBlocks.push(...renderMarkdownSection(newsletter, spec, contentTwips));
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
  }

  // --- Sections, headers, footers ----------------------------------------

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
            text: boxedSetTitle,
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
    title: boxedSetTitle,
    description: `${boxedSetTitle} — boxed set`,
    styles: {
      default: {
        document: {
          run: { font: BODY_FONT, size: spec.bodyHalfPt, color: INK },
          paragraph: { spacing: { line: 320 } },
        },
      },
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
        headers: {
          default: runningHeader,
          first: new Header({
            children: [new Paragraph({ children: [new TextRun({ text: "" })] })],
          }),
        },
        footers: {
          default: runningFooter,
          first: new Footer({
            children: [new Paragraph({ children: [new TextRun({ text: "" })] })],
          }),
        },
        children: bodyBlocks,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return { buffer: Buffer.from(buffer), includedBooks: includedBooksSummary };
}
