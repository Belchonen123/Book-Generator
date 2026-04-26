import Stripe from "stripe";

/** Lazily constructed Stripe SDK client (singleton for the Node process). */
let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  if (!stripe) {
    stripe = new Stripe(key, {
      typescript: true,
    });
  }
  return stripe;
}
