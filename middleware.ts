import { type NextRequest, NextResponse } from "next/server";

import { ensurePlatformDefaults } from "@/lib/ai/ensure-platform-defaults";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateSession } from "@/lib/supabase/middleware";
import { getServerEnvSafe } from "@/lib/utils/env";

let serverEnvChecked = false;
let platformDefaultsEnsured = false;
let platformDefaultsEnsuring: Promise<void> | null = null;

/**
 * Validate server env once per process. NEVER throws — middleware runs on every
 * matched request via the edge runtime, so a thrown error here would 500 the
 * whole app with no actionable client message. Instead we log and let the
 * request through; per-route handlers already validate the specific env keys
 * they need before using them.
 */
function ensureServerEnvOnce(): void {
  if (serverEnvChecked) {
    return;
  }
  serverEnvChecked = true;
  const { errors } = getServerEnvSafe();
  if (errors.length > 0) {
    console.error("[env] validation failed:", errors);
  }
}

async function ensurePlatformDefaultsOnce(): Promise<void> {
  if (platformDefaultsEnsured) {
    return;
  }
  if (platformDefaultsEnsuring) {
    await platformDefaultsEnsuring;
    return;
  }
  platformDefaultsEnsuring = (async () => {
    try {
      const supabase = createAdminClient();
      await ensurePlatformDefaults(supabase);
      platformDefaultsEnsured = true;
    } catch (err) {
      console.error("[prompt-defaults] reconcile failed:", err);
    } finally {
      platformDefaultsEnsuring = null;
    }
  })();
  await platformDefaultsEnsuring;
}

function copySessionCookies(from: NextResponse, to: NextResponse): void {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value);
  });
}

const STATIC_IMAGES = /\.(svg|png|jpg|jpeg|gif|webp|ico)$/i;

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  /**
   * Never run Supabase for dev/build assets. If the matcher is wrong or a Next
   * quirk still invokes middleware for `/_next/*`, `getUser()` would run per
   * chunk and can serialize/saturate the network, causing
   * `ChunkLoadError: Loading chunk app/layout failed (timeout)`.
   */
  if (pathname.startsWith("/_next")) {
    return NextResponse.next();
  }
  if (
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    STATIC_IMAGES.test(pathname)
  ) {
    return NextResponse.next();
  }

  ensureServerEnvOnce();
  await ensurePlatformDefaultsOnce();
  const { response, user } = await updateSession(request);

  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/profile");

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    const nextPath = `${pathname}${request.nextUrl.search}`;
    if (nextPath !== "/dashboard" && nextPath !== "/login") {
      loginUrl.searchParams.set("next", nextPath);
    }
    const redirectResponse = NextResponse.redirect(loginUrl);
    copySessionCookies(response, redirectResponse);
    return redirectResponse;
  }

  /**
   * Logged-in users normally skip auth pages. When `recover=1`, allow them to stay so they can
   * sign out — otherwise dashboard layout redirects here (no profile row) and middleware would
   * send them back to /dashboard → infinite redirect / blank RedirectErrorBoundary.
   */
  const authRecover = request.nextUrl.searchParams.get("recover") === "1";
  if (user && (pathname === "/login" || pathname === "/signup") && !authRecover) {
    const dashboardUrl = new URL("/dashboard", request.url);
    const redirectResponse = NextResponse.redirect(dashboardUrl);
    copySessionCookies(response, redirectResponse);
    return redirectResponse;
  }

  return response;
}

/**
 * Skip all `/_next/*` (chunks, CSS, HMR, RSC data) and common static paths — but still run on
 * `/api/*` so Supabase can refresh the session cookie before server handlers.
 * Excluding only `_next/static` + `_next/image` still ran middleware on `/_next/chunks/*`,
 * which can cause 404/unstyled pages in dev (Windows / multiple Node processes).
 */
export const config = {
  matcher: [
    "/((?!_next|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
