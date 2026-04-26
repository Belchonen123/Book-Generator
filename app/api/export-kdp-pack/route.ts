import { NextResponse } from "next/server";

import { requireBookOwnedByUser } from "@/lib/api/book-access";
import { buildKdpPackZip } from "@/lib/kdp/build-kdp-pack-zip";
import { formatKdpListingMarkdown } from "@/lib/kdp/format-listing-markdown";
import {
  type KdpBookContext,
  generateKdpListingPayload,
} from "@/lib/kdp/generate-kdp-listing";
import { summarizeOutlineSections } from "@/lib/kdp/outline-summary";
import { getStaticKdpWalkthroughMarkdown } from "@/lib/kdp/walkthrough-markdown";
import { createClient } from "@/lib/supabase/server";
import { refinedIdeaToKdpText } from "@/lib/refined-idea/parse";
import { trackEvent } from "@/lib/utils/analytics";
import { openAIRequestFailureResponse } from "@/lib/openai/request-errors";
import { apiJsonError, ApiErrorCode, logServerError } from "@/lib/utils/errors";
import { KdpPackRequestSchema } from "@/lib/utils/schemas";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function zipBasename(title: string | null | undefined): string {
  const raw = (title ?? "book").trim().slice(0, 72);
  const ascii = raw.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
  const base = ascii.length > 0 ? ascii : "book";
  return `${base}-KDP-Pack.zip`;
}

const README = `ChapterAI — KDP listing pack
=============================

This ZIP contains:

1. README.txt (this file)
2. KDP-Listing-Metadata.md — AI-assisted title/subtitle ideas, description, 7 keywords,
   About the author (2 sentences), back-of-book copy for paperback, and category hints.
3. KDP-Signup-Publish-Walkthrough.md — step-by-step KDP signup and publishing checklist.

Your manuscript (.docx) is downloaded separately from the Export page ("Compile & Download Book").

Edit all listing copy before publishing. You are responsible for accuracy and compliance with Amazon KDP.

https://kdp.amazon.com
`;

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

    const parsed = KdpPackRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiJsonError("Invalid request.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const { bookId } = parsed.data;

    const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
    if (denied) {
      return denied;
    }

    const { data: book, error: bookError } = await supabase
      .from("books")
      .select(
        "id, user_id, title, genre, target_audience, tone, raw_idea, refined_idea, word_count, chapter_count",
      )
      .eq("id", bookId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (bookError || !book) {
      return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    const [{ data: profile }, { data: outline }] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("outlines").select("sections").eq("book_id", bookId).maybeSingle(),
    ]);

    const authorDisplayName =
      profile?.full_name?.trim() ||
      profile?.email?.split("@")[0]?.trim() ||
      "the author";

    const title = book.title?.trim() || "Untitled";
    const genre = book.genre?.trim() || "General fiction";

    const ctx: KdpBookContext = {
      title,
      genre,
      refinedIdea: refinedIdeaToKdpText(book.refined_idea, "export-kdp", {
        bookId,
        maxLen: 12_000,
      }),
      rawIdea: book.raw_idea,
      targetAudience: book.target_audience,
      tone: book.tone,
      wordCount: book.word_count,
      chapterCount: book.chapter_count,
      outlineSummary: summarizeOutlineSections(outline?.sections ?? []),
      authorDisplayName,
    };

    let listingPayload;
    try {
      listingPayload = await generateKdpListingPayload(ctx);
    } catch (err) {
      return openAIRequestFailureResponse(err, "export-kdp-pack.openai", {
        fallbackMessage:
          "Could not generate KDP listing copy. Check your OpenAI configuration and try again.",
      });
    }

    const listingMd = formatKdpListingMarkdown(title, listingPayload);
    const walkthroughMd = getStaticKdpWalkthroughMarkdown();

    let zipBuffer: Buffer;
    try {
      zipBuffer = await buildKdpPackZip([
        { path: "README.txt", content: README },
        { path: "KDP-Listing-Metadata.md", content: listingMd },
        { path: "KDP-Signup-Publish-Walkthrough.md", content: walkthroughMd },
      ]);
    } catch (err) {
      logServerError("export-kdp-pack.zip", err);
      return apiJsonError(
        "Could not build the download package.",
        ApiErrorCode.INTERNAL,
        500,
      );
    }

    try {
      await supabase
        .from("books")
        .update({ kdp_instructions: listingMd })
        .eq("id", bookId)
        .eq("user_id", user.id);
    } catch (err) {
      logServerError("export-kdp-pack.kdp_instructions", err);
    }

    await trackEvent(user, "kdp_pack_downloaded", bookId);

    const filename = zipBasename(book.title);
    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    logServerError("export-kdp-pack", err);
    return apiJsonError(
      "Something went wrong. Please try again.",
      ApiErrorCode.INTERNAL,
      500,
    );
  }
}
