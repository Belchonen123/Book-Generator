import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

export type EnsureProfileResult =
  | { ok: true; created: boolean }
  | { ok: false; error: string; code?: string; hint?: string };

/**
 * Ensures `public.profiles` has a row for the auth user while tolerating
 * common drift states (missing trigger, partial RLS policies, stale rows).
 */
export async function ensureProfileRowForUser(
  supabase: SupabaseClient<Database>,
  user: User,
): Promise<EnsureProfileResult> {
  const email = (user.email ?? "").trim();
  const fallbackEmail = email.length > 0 ? email : `${user.id}@users.local`;

  const existingRes = await supabase
    .from("profiles")
    .select("id, email")
    .eq("id", user.id)
    .maybeSingle();

  if (existingRes.error) {
    return {
      ok: false,
      error: `profiles.select failed: ${existingRes.error.message}`,
      code: existingRes.error.code ?? undefined,
      hint: existingRes.error.hint ?? undefined,
    };
  }

  if (existingRes.data) {
    if (existingRes.data.email !== fallbackEmail) {
      const updateRes = await supabase
        .from("profiles")
        .update({ email: fallbackEmail })
        .eq("id", user.id);
      if (updateRes.error) {
        return {
          ok: false,
          error: `profiles.update failed: ${updateRes.error.message}`,
          code: updateRes.error.code ?? undefined,
          hint:
            updateRes.error.hint ??
            "Apply supabase/migrations/018_profiles_rls_explicit.sql — the UPDATE policy is missing.",
        };
      }
    }
    return { ok: true, created: false };
  }

  const insertRes = await supabase.from("profiles").insert({
    id: user.id,
    email: fallbackEmail,
  });

  if (insertRes.error) {
    const reselect = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (reselect.data) {
      return { ok: true, created: false };
    }
    return {
      ok: false,
      error: `profiles.insert failed: ${insertRes.error.message}`,
      code: insertRes.error.code ?? undefined,
      hint:
        insertRes.error.code === "42501" ||
        /row-level security/i.test(insertRes.error.message ?? "")
          ? "Apply supabase/migrations/018_profiles_rls_explicit.sql — the INSERT policy is missing."
          : insertRes.error.hint ?? undefined,
    };
  }

  return { ok: true, created: true };
}
