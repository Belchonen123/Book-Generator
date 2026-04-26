import { NextResponse } from "next/server";

import { getStripe } from "@/lib/stripe/client";
import { createClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/utils/analytics";
import { apiJsonError, ApiErrorCode } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

function priceId(): string | null {
  return (
    process.env.STRIPE_PRO_PRICE_ID ??
    process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ??
    null
  );
}

function appOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  return raw && raw.length > 0 ? raw : null;
}

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiJsonError("Please sign in to continue.", ApiErrorCode.UNAUTHORIZED, 401);
    }

    const pid = priceId();
    const origin = appOrigin();
    if (!pid || !origin) {
      return apiJsonError(
        "Checkout is not configured yet.",
        ApiErrorCode.CONFIGURATION,
        503,
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return apiJsonError("Profile not found.", ApiErrorCode.NOT_FOUND, 404);
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: pid, quantity: 1 }],
      success_url: `${origin}/dashboard?upgraded=true`,
      cancel_url: `${origin}/dashboard`,
      client_reference_id: user.id,
      allow_promotion_codes: true,
      metadata: {
        supabase_user_id: user.id,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
        },
      },
      ...(profile.stripe_customer_id
        ? { customer: profile.stripe_customer_id }
        : {
            customer_email: profile.email?.trim() || user.email || undefined,
          }),
    });

    if (!session.url) {
      return apiJsonError(
        "Could not start checkout.",
        ApiErrorCode.CHECKOUT_FAILED,
        500,
      );
    }

    await trackEvent(user.id, "upgrade_clicked", null, { checkout: "pro" });

    return NextResponse.json({ url: session.url });
  } catch {
    return apiJsonError(
      "Could not start checkout.",
      ApiErrorCode.CHECKOUT_FAILED,
      500,
    );
  }
}
