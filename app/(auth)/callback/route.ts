import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { ensureProfileRowForUser } from "@/lib/supabase/ensure-profile-row";
import type { Database } from "@/types/database.types";

function safeInternalPath(next: string | null, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }
  return next;
}

/**
 * Parse a raw HTTP `Cookie` header into a name -> value map.
 *
 * We parse off the incoming Request rather than importing `next/headers`'
 * `cookies()` because writes to that store do NOT reliably propagate to a
 * `NextResponse.redirect(...)` — the redirect response is constructed after
 * the handler returns and its `Set-Cookie` headers live on the response
 * object itself. See BUG 2.1 in the audit for why this matters.
 */
function parseRequestCookies(cookieHeader: string | null): Map<string, string> {
  const map = new Map<string, string>();
  if (!cookieHeader) return map;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const name = part.slice(0, eq).trim();
    if (!name) continue;
    const value = part.slice(eq + 1).trim();
    try {
      map.set(name, decodeURIComponent(value));
    } catch {
      map.set(name, value);
    }
  }
  return map;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeInternalPath(
    requestUrl.searchParams.get("next"),
    "/dashboard",
  );

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.redirect(
      new URL("/login?error=config", requestUrl.origin),
    );
  }
  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=oauth", requestUrl.origin),
    );
  }

  /* Build the redirect response up-front so every cookie write from the
   * Supabase client (exchangeCodeForSession mutates the session cookies)
   * lands on THIS response object's Set-Cookie headers rather than on
   * next/headers' cookies() store, which does not always propagate onto
   * the final redirect under Next.js 14.2's edge/node runtimes. */
  const response = NextResponse.redirect(new URL(next, requestUrl.origin));
  const cookieMap = parseRequestCookies(request.headers.get("cookie"));

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieMap.get(name);
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieMap.set(name, value);
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieMap.delete(name);
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL("/login?error=oauth", requestUrl.origin),
    );
  }

  /* Session cookies are now on `response`. Still ensure the profile row
   * exists (trigger may not have run); failures here must not block the
   * redirect — the /login?recover=1 UI can repair on next load. */
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      /* @supabase/ssr's createServerClient returns a slightly different
       * generic form than @supabase/supabase-js's SupabaseClient<Database>;
       * structurally identical for our tables. Same cast pattern as
       * lib/supabase/server.ts. */
      const ensured = await ensureProfileRowForUser(
        supabase as unknown as SupabaseClient<Database>,
        user,
      );
      if (!ensured.ok) {
        console.warn("[auth-callback] ensureProfileRowForUser failed", {
          error: ensured.error,
          code: ensured.code,
          hint: ensured.hint,
        });
      }
    }
  } catch {
    /* non-fatal */
  }

  return response;
}
