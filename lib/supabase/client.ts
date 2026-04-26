import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

/** Raw browser client from @supabase/ssr (structural typing). */
export type BrowserSupabaseClient = ReturnType<typeof createBrowserClient<Database>>;

/**
 * Browser Supabase client. Uses @supabase/ssr singleton + cookie storage (do not wrap in a
 * second module-level cache — that kept a stale client after sign-out).
 */
export function createClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createBrowserClient<Database>(url, anonKey) as unknown as SupabaseClient<Database>;
}
