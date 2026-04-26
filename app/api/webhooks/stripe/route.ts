import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { trackEventAdmin } from "@/lib/utils/analytics";
import { apiJsonError, ApiErrorCode, logServerError } from "@/lib/utils/errors";
import type { SubscriptionTierDb } from "@/types/database.types";

export const dynamic = "force-dynamic";

/** Stripe webhook: no end-user session — uses {@link createAdminClient} for profile updates only. */

function tierFromSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionTierDb {
  if (
    status === "active" ||
    status === "trialing" ||
    status === "past_due" ||
    status === "paused"
  ) {
    return "pro";
  }
  return "free";
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.supabase_user_id ?? session.client_reference_id ?? null;
  if (!userId) {
    return;
  }

  const cust = session.customer;
  if (!cust) {
    return;
  }
  if (typeof cust === "object" && "deleted" in cust && cust.deleted) {
    return;
  }
  const customerId = typeof cust === "string" ? cust : cust.id;

  const paid =
    session.payment_status === "paid" ||
    session.payment_status === "no_payment_required";
  if (!paid) {
    return;
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      subscription_tier: "pro",
      stripe_customer_id: customerId,
    })
    .eq("id", userId);

  if (error) {
    throw new Error(`Profile update failed: ${error.message}`);
  }

  await trackEventAdmin(userId, "subscription_started", null, {
    customerId,
    sessionId: session.id,
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({ subscription_tier: "free" })
    .eq("stripe_customer_id", customerId);

  if (error) {
    throw new Error(`Profile downgrade failed: ${error.message}`);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const tier = tierFromSubscriptionStatus(subscription.status);

  const supabase = createAdminClient();

  const patch: {
    subscription_tier: SubscriptionTierDb;
    payment_failed_at?: string | null;
    payment_failure_reason?: string | null;
  } = { subscription_tier: tier };

  // A healthy status clears any stale "payment failed" flag so the dashboard banner drops.
  if (subscription.status === "active" || subscription.status === "trialing") {
    patch.payment_failed_at = null;
    patch.payment_failure_reason = null;
  }

  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("stripe_customer_id", customerId);

  if (error) {
    throw new Error(`Profile sync failed: ${error.message}`);
  }
}

function reasonFromInvoice(invoice: Stripe.Invoice): string | null {
  // Stripe surfaces the most useful detail on the latest charge's outcome / decline code.
  const charge = (invoice as unknown as { charge?: Stripe.Charge | string | null }).charge;
  if (charge && typeof charge === "object") {
    const outcomeReason = charge.outcome?.reason ?? null;
    if (outcomeReason) return outcomeReason;
    if (charge.failure_message) return charge.failure_message;
  }
  const lastError = (invoice as unknown as { last_finalization_error?: { message?: string | null } })
    .last_finalization_error;
  if (lastError?.message) return lastError.message;
  return null;
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // Only act on subscription renewals; one-off invoices don't affect access.
  const billingReason = (invoice as unknown as { billing_reason?: string | null }).billing_reason;
  if (
    billingReason &&
    billingReason !== "subscription_cycle" &&
    billingReason !== "subscription_update" &&
    billingReason !== "subscription_create"
  ) {
    return;
  }

  const cust = invoice.customer;
  if (!cust) return;
  const customerId = typeof cust === "string" ? cust : cust.id;

  const reason = (reasonFromInvoice(invoice) ?? "payment_failed").slice(0, 200);

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      payment_failed_at: new Date().toISOString(),
      payment_failure_reason: reason,
    })
    .eq("stripe_customer_id", customerId);

  if (error) {
    throw new Error(`Profile payment_failed flag write failed: ${error.message}`);
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const cust = invoice.customer;
  if (!cust) return;
  const customerId = typeof cust === "string" ? cust : cust.id;

  const supabase = createAdminClient();
  // Idempotent clear: no-op if there was no prior failure on file.
  const { error } = await supabase
    .from("profiles")
    .update({ payment_failed_at: null, payment_failure_reason: null })
    .eq("stripe_customer_id", customerId);

  if (error) {
    throw new Error(`Profile payment_failed flag clear failed: ${error.message}`);
  }
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return apiJsonError(
      "Webhook is not configured.",
      ApiErrorCode.CONFIGURATION,
      503,
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return apiJsonError("Missing signature.", ApiErrorCode.WEBHOOK_INVALID, 400);
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return apiJsonError("Invalid signature.", ApiErrorCode.WEBHOOK_INVALID, 400);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription") {
          await handleCheckoutSessionCompleted(session);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    logServerError("stripe-webhook", e);
    return apiJsonError(
      "Webhook processing failed.",
      ApiErrorCode.WEBHOOK_HANDLER,
      500,
    );
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
