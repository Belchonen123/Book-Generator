import { z } from "zod";

export const beatTypeSchema = z.enum([
  "opening",
  "rising",
  "midpoint",
  "setback",
  "climax",
  "resolution",
  "transition",
]);

export const narrativeBeatSchema = z
  .object({
    start_paragraph: z.number().int().min(1),
    end_paragraph: z.number().int().min(1),
    type: beatTypeSchema,
    tension: z.number().int().min(1).max(10),
    summary: z.string().min(1).max(220),
  })
  .refine((b) => b.end_paragraph >= b.start_paragraph, {
    path: ["end_paragraph"],
    message: "end_paragraph must be >= start_paragraph",
  });

export const narrativeBeatsArraySchema = z
  .array(narrativeBeatSchema)
  .min(1)
  .max(12);

export type BeatType = z.infer<typeof beatTypeSchema>;
export type NarrativeBeat = z.infer<typeof narrativeBeatSchema>;
