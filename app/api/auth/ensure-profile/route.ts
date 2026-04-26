import { apiJsonError, ApiErrorCode } from "@/lib/utils/errors";
import { createClient } from "@/lib/supabase/server";
import { ensureProfileRowForUser } from "@/lib/supabase/ensure-profile-row";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiJsonError("No session on server.", ApiErrorCode.UNAUTHORIZED, 401);
    }

    const ensured = await ensureProfileRowForUser(supabase, user);

    if (!ensured.ok) {
      return Response.json(
        {
          ok: false,
          error: ensured.error,
          code: ensured.code,
          hint: ensured.hint,
        },
        { status: 500 },
      );
    }

    return Response.json({ ok: true, created: ensured.created });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return apiJsonError(
      `ensure-profile API failed: ${message}`,
      ApiErrorCode.INTERNAL,
      500,
    );
  }
}
