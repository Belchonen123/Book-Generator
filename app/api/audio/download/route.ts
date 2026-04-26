import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { apiJsonError, ApiErrorCode, logServerError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

/**
 * GET ?exportId= — signed download URL for the audiobook ZIP.
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
    const exportId = searchParams.get("exportId");
    if (!exportId || !/^[0-9a-f-]{36}$/i.test(exportId)) {
      return apiJsonError("exportId is required.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const { data: row, error } = await supabase
      .from("audio_exports")
      .select("id, user_id, book_id, status, zip_storage_path")
      .eq("id", exportId)
      .eq("user_id", user.id)
      .single();

    if (error || !row) {
      return apiJsonError("Export not found.", ApiErrorCode.NOT_FOUND, 404);
    }
    if (row.status !== "ready" || !row.zip_storage_path) {
      return apiJsonError("This export is not ready to download yet.", ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const { data: signed, error: signError } = await supabase.storage
      .from("audiobooks")
      .createSignedUrl(row.zip_storage_path, 3600);

    if (signError || !signed?.signedUrl) {
      logServerError("audio/download.signed", signError);
      return apiJsonError("Could not create download link.", ApiErrorCode.INTERNAL, 500);
    }

    return NextResponse.json({ url: signed.signedUrl, expiresIn: 3600 });
  } catch (e) {
    logServerError("api/audio/download", e);
    return apiJsonError("Unexpected error.", ApiErrorCode.INTERNAL, 500);
  }
}
