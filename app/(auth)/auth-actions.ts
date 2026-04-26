"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { ensureProfileRowForUser } from "@/lib/supabase/ensure-profile-row";

/**
 * Ensures `public.profiles` has a row for the current session user.
 * Call after browser `signInWithPassword` / signup so the dashboard layout can load the profile
 * even when the DB trigger or backfill was never applied.
 */
export async function ensureProfileAfterSignIn(): Promise<{
  ok: boolean;
  error?: string;
  code?: string;
  hint?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        ok: false,
        error:
          "No session on the server yet. Wait a second and try again, or hard-refresh. If this persists, check Site URL / cookies for localhost.",
      };
    }

    const result = await ensureProfileRowForUser(supabase, user);

    if (!result.ok) {
      const withCode = result.code ? ` (code ${result.code})` : "";
      const withHint = result.hint ? ` Hint: ${result.hint}` : "";
      return {
        ok: false,
        error: `${result.error}${withCode}${withHint} — open Supabase → Table Editor → profiles and confirm RLS allows your user to insert/update their row. Run SQL migrations through 018_profiles_rls_explicit.sql.`,
        code: result.code,
        hint: result.hint,
      };
    }

    revalidatePath("/dashboard");
    revalidatePath("/login");
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `ensureProfileAfterSignIn failed: ${message}`,
    };
  }
}
