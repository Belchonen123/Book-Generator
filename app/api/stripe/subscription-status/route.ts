import { NextResponse } from "next/server";

import { getStripe } from "@/lib/stripe/client";
import { createClient } from "@/lib/supabase/server";
import { apiJsonError, ApiErrorCode, logServerError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiJsonError("Please sign in to continue.", ApiErrorCode.UNAUTHORIZED, 401);
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_tier, stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return apiJsonError("Profile not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    if (profile.subscription_tier !== "pro" || !profile.stripe_customer_id) {
      return NextResponse.json({
        tier: profile.subscription_tier,
        renewsAt: null as string | null,
        cancelAtPeriodEnd: false,
      });
    }

    let stripe;
    try {
      stripe = getStripe();
    } catch {
      return apiJsonError(
        "Billing is not configured yet.",
        ApiErrorCode.CONFIGURATION,
        503,
      );
    }

    const subs = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: "all",
      limit: 10,
    });

    const active = subs.data.find(
      (s) => s.status === "active" || s.status === "trialing" || s.status === "past_due",
    );

    if (!active) {
      return NextResponse.json({
        tier: profile.subscription_tier,
        renewsAt: null as string | null,
        cancelAtPeriodEnd: false,
      });
    }

    const renewsAt = new Date(active.current_period_end * 1000).toISOString();

    return NextResponse.json({
      tier: "pro" as const,
      renewsAt,
      cancelAtPeriodEnd: active.cancel_at_period_end,
    });
  } catch (e) {
    logServerError("subscription-status", e);
    return apiJsonError(
      "Could not load subscription details.",
      ApiErrorCode.INTERNAL,
      500,
    );
  }
}
