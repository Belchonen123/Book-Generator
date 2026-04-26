import { NextResponse } from "next/server";

import { requireBookOwnedByUser } from "@/lib/api/book-access";
import { createClient } from "@/lib/supabase/server";
import { apiJsonError, ApiErrorCode, logServerError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

/**
 * GET ?bookId= — latest audio_export for a book (polling).
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return apiJsonError("Please sign in.", ApiErrorCode.UNAUTHORIZED, 401);
    }

    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("bookId");
    if (!bookId || !/^[0-9a-f-]{36}$/i.test(bookId)) {
      return apiJsonError("bookId is required.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const denied = await requireBookOwnedByUser(supabase, bookId, user.id);
    if (denied) {
      return denied;
    }

    const { data, error } = await supabase
      .from("audio_exports")
      .select("id, status, progress, error, zip_storage_path, total_duration_seconds, voice_id, voice_name, chapter_states, created_at, updated_at")
      .eq("book_id", bookId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      logServerError("audio/exports", error);
      return apiJsonError("Could not load export.", ApiErrorCode.INTERNAL, 500);
    }

    return NextResponse.json({ export: data });
  } catch (e) {
    logServerError("api/audio/exports", e);
    return apiJsonError("Unexpected error.", ApiErrorCode.INTERNAL, 500);
  }
}
