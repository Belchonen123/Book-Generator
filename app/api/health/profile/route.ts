import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Check =
  | { name: string; ok: true; detail?: string }
  | { name: string; ok: false; detail: string; code?: string; hint?: string };

function migrationHintForColumn(col: string): string | undefined {
  switch (col) {
    case "full_name":
    case "avatar_url":
    case "subscription_tier":
      return "Apply supabase/migrations/001_create_profiles.sql.";
    case "bio":
    case "pen_name":
    case "website":
    case "location":
    case "twitter_handle":
      return "Apply supabase/migrations/020_profile_author_fields.sql.";
    case "payment_failed_at":
    case "payment_failure_reason":
      return "Apply supabase/migrations/017_payment_failed.sql.";
    default:
      return undefined;
  }
}

function safeHost(value: string): string {
  try {
    return new URL(value).host;
  } catch {
    return "invalid URL";
  }
}

export async function GET() {
  const checks: Check[] = [];

  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (envUrl.length > 0) {
    checks.push({
      name: "env.NEXT_PUBLIC_SUPABASE_URL",
      ok: true,
      detail: `configured (${safeHost(envUrl)})`,
    });
  } else {
    checks.push({
      name: "env.NEXT_PUBLIC_SUPABASE_URL",
      ok: false,
      detail: "missing",
    });
  }
  if (envKey.length > 0) {
    checks.push({
      name: "env.NEXT_PUBLIC_SUPABASE_ANON_KEY",
      ok: true,
      detail: "configured",
    });
  } else {
    checks.push({
      name: "env.NEXT_PUBLIC_SUPABASE_ANON_KEY",
      ok: false,
      detail: "missing",
    });
  }

  const supabase = await createClient();

  const userRes = await supabase.auth.getUser();
  if (userRes.error || !userRes.data?.user) {
    checks.push({
      name: "auth.getUser",
      ok: false,
      detail: userRes.error?.message ?? "no user on session",
    });
    return NextResponse.json({ ok: false, checks }, { status: 401 });
  }
  const user = userRes.data.user;
  checks.push({ name: "auth.getUser", ok: true, detail: user.id });

  const tableRes = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });
  if (tableRes.error) {
    checks.push({
      name: "profiles.table_exists",
      ok: false,
      code: tableRes.error.code ?? undefined,
      detail: tableRes.error.message,
      hint:
        tableRes.error.code === "42P01"
          ? "Apply supabase/migrations/001_create_profiles.sql."
          : tableRes.error.hint ?? undefined,
    });
    return NextResponse.json(
      { ok: false, user: { id: user.id }, checks },
      { status: 500 },
    );
  }
  checks.push({ name: "profiles.table_exists", ok: true });

  const probeColumns = [
    "full_name",
    "avatar_url",
    "subscription_tier",
    "bio",
    "pen_name",
    "website",
    "location",
    "twitter_handle",
    "payment_failed_at",
    "payment_failure_reason",
  ];
  for (const col of probeColumns) {
    const res = await supabase
      .from("profiles")
      .select(`id, ${col}`)
      .eq("id", user.id)
      .maybeSingle();
    if (res.error && res.error.code === "42703") {
      checks.push({
        name: `profiles.column.${col}`,
        ok: false,
        code: "42703",
        detail: res.error.message,
        hint: migrationHintForColumn(col),
      });
    } else if (res.error) {
      checks.push({
        name: `profiles.column.${col}`,
        ok: false,
        code: res.error.code ?? undefined,
        detail: res.error.message,
      });
    } else {
      checks.push({ name: `profiles.column.${col}`, ok: true });
    }
  }

  const rowRes = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (rowRes.error) {
    checks.push({
      name: "profiles.row_readable",
      ok: false,
      code: rowRes.error.code ?? undefined,
      detail: rowRes.error.message,
      hint:
        rowRes.error.code === "42501"
          ? "Apply supabase/migrations/018_profiles_rls_explicit.sql — SELECT policy is missing."
          : undefined,
    });
  } else if (!rowRes.data) {
    checks.push({
      name: "profiles.row_readable",
      ok: false,
      detail:
        "no profiles row for this user. The after-signup trigger may not have fired; use 'Repair and continue' on the login page.",
    });
  } else {
    checks.push({ name: "profiles.row_readable", ok: true });
  }

  const overallOk = checks.every((check) => check.ok);
  return NextResponse.json(
    { ok: overallOk, user: { id: user.id, email: user.email }, checks },
    { status: overallOk ? 200 : 500 },
  );
}
