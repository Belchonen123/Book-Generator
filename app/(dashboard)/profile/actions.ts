"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const LIMITS = {
  fullName: 120,
  penName: 120,
  bio: 600,
  location: 120,
  website: 200,
  twitterHandle: 32,
} as const;

// Normalised-on-submit: we strip leading "@" and any URL wrappers so the DB
// stores a clean handle regardless of how the user types it.
function normaliseTwitterHandle(raw: string): string {
  const stripped = raw
    .trim()
    .replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//i, "")
    .replace(/^@+/, "")
    .split(/[?/]/)[0]
    .trim();
  return stripped;
}

function normaliseWebsite(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const profileSchema = z.object({
  fullName: z.string().max(LIMITS.fullName, "Display name is too long."),
  penName: z.string().max(LIMITS.penName, "Pen name is too long."),
  bio: z.string().max(LIMITS.bio, "Bio must be 600 characters or fewer."),
  location: z.string().max(LIMITS.location, "Location is too long."),
  website: z.string().max(LIMITS.website, "Website URL is too long."),
  twitterHandle: z
    .string()
    .max(LIMITS.twitterHandle + 40, "Handle is too long.") // slack for pasted URLs pre-normalise
    .refine(
      (v) => {
        const h = normaliseTwitterHandle(v);
        return h.length === 0 || /^[A-Za-z0-9_]{1,32}$/.test(h);
      },
      { message: "Handle can only contain letters, numbers, and underscores." },
    ),
});

export type ProfileFormInput = z.input<typeof profileSchema>;

function nullIfEmpty(s: string): string | null {
  const t = s.trim();
  return t.length === 0 ? null : t;
}

export async function saveProfileAction(
  input: ProfileFormInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Invalid profile data." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  const websiteRaw = parsed.data.website.trim();
  const website = websiteRaw.length === 0 ? null : normaliseWebsite(websiteRaw);
  if (website && !/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(website)) {
    return { ok: false, error: "Website must be a valid URL." };
  }

  const handleNormalised = normaliseTwitterHandle(parsed.data.twitterHandle);
  const twitterHandle = handleNormalised.length === 0 ? null : handleNormalised;

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: nullIfEmpty(parsed.data.fullName),
      pen_name: nullIfEmpty(parsed.data.penName),
      bio: nullIfEmpty(parsed.data.bio),
      location: nullIfEmpty(parsed.data.location),
      website,
      twitter_handle: twitterHandle,
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: "Could not save your profile. Please try again." };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}
