import { redirect } from "next/navigation";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type { DashboardProfileValue } from "@/components/layout/dashboard-profile-context";
import { DashboardInner } from "@/components/layout/dashboard-inner";
import { createClient } from "@/lib/supabase/server";
import { ensureProfileRowForUser } from "@/lib/supabase/ensure-profile-row";
import type { Database } from "@/types/database.types";

function logRecover(reason: string, extra: Record<string, unknown> = {}) {
  // eslint-disable-next-line no-console
  console.error("[dashboard-layout] redirect-to-recover", { reason, ...extra });
}

function recoverUrl(params: { code?: string; reason: string }): string {
  const q = new URLSearchParams({ recover: "1", reason: params.reason });
  if (params.code) q.set("code", params.code);
  return `/login?${q.toString()}`;
}

const REQUIRED_COLUMNS = ["id", "email", "subscription_tier"] as const;
const FULL_COLUMN_LIST: string[] = [
  "id",
  "email",
  "full_name",
  "avatar_url",
  "bio",
  "pen_name",
  "website",
  "location",
  "twitter_handle",
  "subscription_tier",
  "payment_failed_at",
  "payment_failure_reason",
];

type ProfileRow = {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  pen_name?: string | null;
  website?: string | null;
  location?: string | null;
  twitter_handle?: string | null;
  subscription_tier: Database["public"]["Tables"]["profiles"]["Row"]["subscription_tier"];
  payment_failed_at?: string | null;
  payment_failure_reason?: string | null;
};

/**
 * When Postgres reports `42703 undefined_column`, the error message contains
 * the column name in the form `column "..." does not exist`. Extract it so
 * we can drop that column and retry. Returns null when the error is not a
 * missing-column error or we can't parse the name.
 */
function extractMissingColumn(error: PostgrestError | null): string | null {
  if (!error) return null;
  if (error.code !== "42703") return null;
  const msg = error.message ?? "";
  const patterns = [
    /column\s+[a-zA-Z_][a-zA-Z0-9_]*\.([a-zA-Z_][a-zA-Z0-9_]*)\s+does not exist/i,
    /column\s+"([a-zA-Z_][a-zA-Z0-9_]*)"\s+does not exist/i,
    /column\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+does not exist/i,
  ];
  for (const re of patterns) {
    const match = msg.match(re);
    if (match?.[1]) return match[1];
  }
  return null;
}

async function loadProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<
  | { ok: true; profile: ProfileRow; droppedColumns: string[] }
  | { ok: false; missing: true }
  | {
      ok: false;
      missing: false;
      error: PostgrestError;
      attemptedColumns: string[];
    }
> {
  let columns = [...FULL_COLUMN_LIST];
  const dropped: string[] = [];

  for (let attempt = 0; attempt < FULL_COLUMN_LIST.length; attempt += 1) {
    const result = await supabase
      .from("profiles")
      .select(columns.join(", "))
      .eq("id", userId)
      .maybeSingle();

    if (!result.error) {
      if (!result.data) return { ok: false, missing: true };
      return {
        ok: true,
        profile: result.data as unknown as ProfileRow,
        droppedColumns: dropped,
      };
    }

    const missingColumn = extractMissingColumn(result.error);
    if (!missingColumn) {
      return {
        ok: false,
        missing: false,
        error: result.error,
        attemptedColumns: columns,
      };
    }
    if (
      (REQUIRED_COLUMNS as readonly string[]).includes(missingColumn) ||
      !columns.includes(missingColumn)
    ) {
      return {
        ok: false,
        missing: false,
        error: result.error,
        attemptedColumns: columns,
      };
    }

    // eslint-disable-next-line no-console
    console.warn(
      `[dashboard-layout] profiles column "${missingColumn}" is missing — dropping and retrying. ` +
        "Apply the migration that introduces it.",
    );
    columns = columns.filter((column) => column !== missingColumn);
    dropped.push(missingColumn);
  }

  return {
    ok: false,
    missing: false,
    error: {
      code: "42703",
      message: "Too many missing columns on profiles.",
      details: "",
      hint: "",
    } as PostgrestError,
    attemptedColumns: columns,
  };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let loaded = await loadProfile(supabase, user.id);

  if (!loaded.ok && !loaded.missing) {
    // eslint-disable-next-line no-console
    console.error("[dashboard-layout] profile SELECT failed", {
      userId: user.id,
      code: loaded.error.code,
      message: loaded.error.message,
      details: loaded.error.details,
      hint: loaded.error.hint,
      attemptedColumns: loaded.attemptedColumns,
    });
    logRecover("profile_select_failed", {
      userId: user.id,
      code: loaded.error.code,
      message: loaded.error.message,
      details: loaded.error.details,
      hint: loaded.error.hint,
      attemptedColumns: loaded.attemptedColumns,
    });
    redirect(
      recoverUrl({
        code: loaded.error.code ?? undefined,
        reason: `profile_select_failed:${loaded.error.message.slice(0, 120)}`,
      }),
    );
  }

  if (!loaded.ok && loaded.missing) {
    const ensured = await ensureProfileRowForUser(supabase, user);
    if (!ensured.ok) {
      // eslint-disable-next-line no-console
      console.error(
        "[dashboard-layout] ensureProfileRowForUser failed:",
        {
          error: ensured.error,
          code: ensured.code,
          hint: ensured.hint,
        },
      );
      logRecover("profile_create_failed", {
        userId: user.id,
        code: ensured.code,
        message: ensured.error,
        hint: ensured.hint,
      });
      redirect(
        recoverUrl({
          reason: `profile_create_failed:${(ensured.error ?? "unknown").slice(0, 120)}`,
          code: ensured.code,
        }),
      );
    }
    loaded = await loadProfile(supabase, user.id);
    if (!loaded.ok) {
      // eslint-disable-next-line no-console
      console.error(
        "[dashboard-layout] profile still unreadable after ensure",
        loaded.missing
          ? { missing: true }
          : {
              code: loaded.error.code,
              message: loaded.error.message,
              details: loaded.error.details,
              hint: loaded.error.hint,
              attemptedColumns: loaded.attemptedColumns,
            },
      );
      logRecover("profile_still_unreadable_after_repair", {
        userId: user.id,
        ...(loaded.missing
          ? { missing: true }
          : {
              code: loaded.error.code,
              message: loaded.error.message,
              details: loaded.error.details,
              hint: loaded.error.hint,
              attemptedColumns: loaded.attemptedColumns,
            }),
      });
      redirect(
        recoverUrl({ reason: "profile_still_unreadable_after_repair" }),
      );
    }
  }

  if (loaded.droppedColumns.length > 0) {
    // eslint-disable-next-line no-console
    console.warn("[dashboard-layout] profile loaded after dropping columns", {
      userId: user.id,
      droppedColumns: loaded.droppedColumns,
    });
  }

  const profile = loaded.profile;

  const profileValue: DashboardProfileValue = {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name ?? null,
    avatarUrl: profile.avatar_url ?? null,
    bio: profile.bio ?? null,
    penName: profile.pen_name ?? null,
    website: profile.website ?? null,
    location: profile.location ?? null,
    twitterHandle: profile.twitter_handle ?? null,
    subscriptionTier: profile.subscription_tier,
    paymentFailedAt: profile.payment_failed_at ?? null,
    paymentFailureReason: profile.payment_failure_reason ?? null,
  };

  // Active-series count powers the badge next to the Series link in the
  // dashboard header. We use HEAD + exact count so this query does not ship
  // row bodies — just the number. Errors fall through to zero so a broken
  // count never prevents the layout from rendering.
  const { count: activeSeriesCount } = await supabase
    .from("series")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "active");

  return (
    <DashboardInner
      profile={profileValue}
      activeSeriesCount={activeSeriesCount ?? 0}
    >
      {children}
    </DashboardInner>
  );
}
