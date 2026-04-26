import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

/**
 * Service-role client (bypasses RLS). Use only for trusted server tasks such as Stripe webhooks.
 * User-facing API routes must use the session-scoped `createClient` from `@/lib/supabase/server`.
 * Do not import from client components.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
