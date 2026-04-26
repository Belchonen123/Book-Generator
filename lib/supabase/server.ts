import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import type { Database } from "@/types/database.types";

async function createServerSupabase() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          /* Called from a Server Component where cookies are read-only */
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          /* Called from a Server Component where cookies are read-only */
        }
      },
    },
  });
}

/**
 * SSR client shape from @supabase/ssr (structural typing).
 * Prefer {@link createClient} return type for application code.
 */
export type ServerSupabaseClient = Awaited<ReturnType<typeof createServerSupabase>>;

/**
 * Server Supabase client bound to the current request cookies (session).
 * Cast to `SupabaseClient<Database>` so table CRUD is fully typed.
 */
export async function createClient(): Promise<SupabaseClient<Database>> {
  const client = await createServerSupabase();
  return client as unknown as SupabaseClient<Database>;
}
