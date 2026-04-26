import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { apiJsonError, ApiErrorCode, logServerError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) {
    return apiJsonError(
      "Admin access is not configured (set ADMIN_EMAIL).",
      ApiErrorCode.CONFIGURATION,
      503,
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return apiJsonError("Please sign in to continue.", ApiErrorCode.UNAUTHORIZED, 401);
    }

    if (user.email.trim().toLowerCase() !== adminEmail) {
      return apiJsonError("Forbidden.", ApiErrorCode.FORBIDDEN, 403);
    }

    const admin = createAdminClient();

    const { count: totalUsers, error: usersError } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true });

    if (usersError) {
      logServerError("admin-stats.profiles-count", usersError);
      return apiJsonError("Could not load stats.", ApiErrorCode.INTERNAL, 500);
    }

    const { data: booksRows, error: booksError } = await admin.from("books").select("word_count");

    if (booksError) {
      logServerError("admin-stats.books", booksError);
      return apiJsonError("Could not load stats.", ApiErrorCode.INTERNAL, 500);
    }

    const rows = booksRows ?? [];
    const totalBooks = rows.length;
    const totalWords = rows.reduce((acc, r) => acc + (r.word_count ?? 0), 0);

    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);

    const { data: dauRows, error: dauError } = await admin
      .from("book_events")
      .select("user_id")
      .gte("created_at", start.toISOString());

    if (dauError) {
      logServerError("admin-stats.dau", dauError);
      return apiJsonError("Could not load stats.", ApiErrorCode.INTERNAL, 500);
    }

    const dailyActiveUsers = new Set((dauRows ?? []).map((r) => r.user_id)).size;

    return NextResponse.json({
      totalUsers: totalUsers ?? 0,
      totalBooks,
      totalWords,
      dailyActiveUsers,
      asOf: new Date().toISOString(),
    });
  } catch (e) {
    logServerError("admin-stats", e);
    return apiJsonError("Could not load stats.", ApiErrorCode.INTERNAL, 500);
  }
}
