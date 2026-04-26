/**
 * Server-side coupon validation.
 *
 * Coupons bypass Stripe and set subscription_tier = "pro" directly in the DB.
 * Keep this list server-side only — never import from a client component.
 */

/** Normalise a raw coupon input for comparison. */
export function normaliseCoupon(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Returns true when the coupon grants Pro access. */
export function isValidCoupon(raw: string): boolean {
  const code = normaliseCoupon(raw);
  // Add more entries here as needed — keep server-side only.
  const VALID_COUPONS = new Set(["belchonen18@gmail.com"]);
  return VALID_COUPONS.has(code);
}
