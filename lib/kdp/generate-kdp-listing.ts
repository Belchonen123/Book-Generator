import { z } from "zod";

import { KDP_LISTING_SYSTEM_PROMPT } from "@/lib/ai/prompt-templates";
import { getOpenAI } from "@/lib/openai/client";

export type KdpBookContext = {
  title: string;
  genre: string;
  refinedIdea: string | null;
  rawIdea: string | null;
  targetAudience: string | null;
  tone: string | null;
  wordCount: number;
  chapterCount: number;
  outlineSummary: string;
  authorDisplayName: string;
};

const listingResponseSchema = z.object({
  titleSuggestions: z.array(z.string()).length(3),
  subtitleSuggestions: z.array(z.string()).length(3),
  amazonDescription: z.string().min(80).max(4000),
  keywords: z.array(z.string().min(1)).length(7),
  aboutTheAuthorTwoSentences: z.string().min(20).max(1200),
  backCoverPaperbackBlurb: z.string().min(80).max(2500),
  bisacCategoryHints: z.tuple([z.string(), z.string()]),
});

export type KdpListingPayload = z.infer<typeof listingResponseSchema>;

function stripJsonFence(text: string): string {
  const t = text.trim();
  const m = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(t);
  return m?.[1]?.trim() ?? t;
}

function buildUserContent(ctx: KdpBookContext): string {
  const parts = [
    `## Working title\n${ctx.title}`,
    `## Genre\n${ctx.genre}`,
    `## Author name to assume (for About the author; user may use a pen name)\n${ctx.authorDisplayName}`,
    `## Word count / chapters\n${ctx.wordCount} words, ${ctx.chapterCount} chapters`,
  ];
  if (ctx.targetAudience?.trim()) {
    parts.push(`## Target audience\n${ctx.targetAudience.trim()}`);
  }
  if (ctx.tone?.trim()) {
    parts.push(`## Tone\n${ctx.tone.trim()}`);
  }
  if (ctx.refinedIdea?.trim()) {
    parts.push(`## Refined idea / brief\n${ctx.refinedIdea.trim().slice(0, 12_000)}`);
  } else if (ctx.rawIdea?.trim()) {
    parts.push(`## Raw idea\n${ctx.rawIdea.trim().slice(0, 12_000)}`);
  }
  if (ctx.outlineSummary.trim()) {
    parts.push(`## Outline summary (chapter titles & beats)\n${ctx.outlineSummary.slice(0, 8000)}`);
  }
  return parts.join("\n\n");
}

const SYSTEM = KDP_LISTING_SYSTEM_PROMPT;

export async function generateKdpListingPayload(
  ctx: KdpBookContext,
): Promise<KdpListingPayload> {
  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: buildUserContent(ctx),
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.65,
    max_tokens: 4096,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("Empty response from listing generator.");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(stripJsonFence(raw)) as unknown;
  } catch {
    throw new Error("Could not parse listing JSON from the model.");
  }

  const zResult = listingResponseSchema.safeParse(parsedJson);
  if (!zResult.success) {
    throw new Error("Listing JSON failed validation.");
  }
  return zResult.data;
}
