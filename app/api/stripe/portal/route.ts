import { NextResponse } from "next/server";

import { getStripe } from "@/lib/stripe/client";
import { createClient } from "@/lib/supabase/server";
import { apiJsonError, ApiErrorCode } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.stripe_customer_id) {
      return apiJsonError(
        "No billing account on file. Subscribe first.",
        ApiErrorCode.NOT_FOUND,
        400,
      );
    }

    const origin = appOrigin();
    if (!origin) {
      return apiJsonError(
        "App URL is not configured.",
        ApiErrorCode.CONFIGURATION,
        503,
      );
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch {
    return apiJsonError(
      "Could not open billing portal.",
      ApiErrorCode.INTERNAL,
      500,
    );
  }
}
