import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextResponse } from "next/server";

import { apiJsonError, ApiErrorCode } from "@/lib/utils/errors";
import type { Database } from "@/types/database.types";

/**
 * Explicit book ownership check for API routes (defense in depth with RLS).
 * @returns `null` if the user owns the book; otherwise a ready `NextResponse` (403/404/500).
 */
export async function requireBookOwnedByUser(
  supabase: SupabaseClient<Database>,
  bookId: string,
  userId: string,
): Promise<NextResponse | null> {
  const { data, error } = await supabase
    .from("books")
    .select("id, user_id")
    .eq("id", bookId)
    .maybeSingle();

  if (error) {
    return apiJsonError("Could not verify book access.", ApiErrorCode.INTERNAL, 500);
  }
  if (!data) {
    return apiJsonError("Book not found.", ApiErrorCode.NOT_FOUND, 404);
  }
  if (data.user_id !== userId) {
    return apiJsonError("You do not have access to this book.", ApiErrorCode.FORBIDDEN, 403);
  }
  return null;
}
