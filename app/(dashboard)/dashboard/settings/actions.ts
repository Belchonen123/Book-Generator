"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ASK_REWRITE_ON_OUTLINE_KEY, AUTO_SLOP_SCAN_KEY } from "@/lib/utils/profile-preferences";
import type { Json } from "@/types/database.types";

const DISPLAY_NAME_MAX = 120;

async function purgeStoragePrefix(
  admin: ReturnType<typeof createAdminClient>,
  bucket: string,
  prefix: string,
): Promise<void> {
  const { data: items } = await admin.storage.from(bucket).list(prefix, { limit: 500 });
  if (!items?.length) return;

  for (const item of items) {
    const path = `${prefix}/${item.name}`;
    const { data: nested } = await admin.storage.from(bucket).list(path, { limit: 500 });
    if (nested && nested.length > 0) {
      await purgeStoragePrefix(admin, bucket, path);
    } else {
      await admin.storage.from(bucket).remove([path]);
    }
  }
}

async function purgeUserStoragePrefixes(userId: string): Promise<void> {
  const admin = createAdminClient();
  for (const bucket of ["covers", "exports", "avatars"] as const) {
    try {
      await purgeStoragePrefix(admin, bucket, userId);
    } catch {
      /* best-effort cleanup */
    }
  }
}

export async function updateDisplayNameOnBlurAction(
  fullName: string,
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = fullName.trim().slice(0, DISPLAY_NAME_MAX);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: trimmed.length > 0 ? trimmed : null })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: "Could not update display name." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/profile");
  return { ok: true };
}

export async function saveProfileSettingsAction(
  fullName: string,
): Promise<{ ok: boolean; error?: string }> {
  return updateDisplayNameOnBlurAction(fullName);
}

export async function updateAskRewriteOnOutlineEditAction(
  value: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  const { data: row, error: fetchError } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", user.id)
    .single();

  if (fetchError || !row) {
    return { ok: false, error: "Could not load profile." };
  }

  const prev = row.preferences;
  const merged: Record<string, unknown> =
    prev && typeof prev === "object" && !Array.isArray(prev)
      ? { ...(prev as Record<string, unknown>) }
      : {};
  merged[ASK_REWRITE_ON_OUTLINE_KEY] = value;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ preferences: merged as Json })
    .eq("id", user.id);

  if (updateError) {
    return { ok: false, error: "Could not save editor preference." };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/projects", "layout");
  return { ok: true };
}

export async function updateAutoSlopScanAction(
  value: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  const { data: row, error: fetchError } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", user.id)
    .single();

  if (fetchError || !row) {
    return { ok: false, error: "Could not load profile." };
  }

  const prev = row.preferences;
  const merged: Record<string, unknown> =
    prev && typeof prev === "object" && !Array.isArray(prev)
      ? { ...(prev as Record<string, unknown>) }
      : {};
  merged[AUTO_SLOP_SCAN_KEY] = value;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ preferences: merged as Json })
    .eq("id", user.id);

  if (updateError) {
    return { ok: false, error: "Could not save slop-check preference." };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/projects", "layout");
  return { ok: true };
}

export async function deleteAccountAction(
  confirmation: string,
): Promise<{ ok: boolean; error?: string }> {
  if (confirmation !== "DELETE") {
    return { ok: false, error: "Type DELETE to confirm." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  const userId = user.id;

  try {
    try {
      await purgeUserStoragePrefixes(userId);
    } catch {
      /* continue — auth removal is authoritative */
    }

    const admin = createAdminClient();
    const { error: delAuthError } = await admin.auth.admin.deleteUser(userId);

    if (delAuthError) {
      return { ok: false, error: "Could not delete your account. Contact support." };
    }

    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "Account deletion is temporarily unavailable." };
  }
}
