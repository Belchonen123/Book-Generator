"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isValidCoupon } from "@/lib/coupon/validate";

export type RedeemCouponResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Validate a coupon code and, if valid, upgrade the signed-in user to Pro.
 * Uses the admin client to bypass RLS so the tier update always lands.
 */
export async function redeemCouponAction(
  rawCode: string,
): Promise<RedeemCouponResult> {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "You must be signed in to redeem a coupon." };
  }

  // Already pro?
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .single();

  if (profile?.subscription_tier === "pro") {
    return { ok: false, error: "Your account is already on the Pro plan." };
  }

  // Validate coupon
  if (!rawCode.trim()) {
    return { ok: false, error: "Enter a coupon code." };
  }
  if (!isValidCoupon(rawCode)) {
    return { ok: false, error: "That coupon code is not valid." };
  }

  // Upgrade via admin client (bypasses RLS)
  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from("profiles")
    .update({ subscription_tier: "pro" })
    .eq("id", user.id);

  if (updateError) {
    console.error("[redeemCouponAction]", updateError);
    return { ok: false, error: "Could not apply the coupon. Please try again." };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
  return { ok: true };
}
