import { createAdminClient } from "@/lib/supabase/admin";
import { healStuckChapters } from "@/lib/background/heal-stuck-chapters";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Vercel Cron: every 15m (see `vercel.json`). Set `CRON_SECRET` in the project
 * and the same value in the Vercel Cron auth header, or use Vercel's managed secret.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json(
      { ok: false, error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const result = await healStuckChapters(admin);
  return Response.json({ ok: true, ...result });
}
