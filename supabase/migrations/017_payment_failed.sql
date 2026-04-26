-- Adds fields for surfacing Stripe `invoice.payment_failed` events.
-- `payment_failed_at`: last time a renewal charge failed (NULL = healthy).
-- `payment_failure_reason`: human-readable reason from Stripe (for banner detail).
-- Cleared when a subsequent successful invoice or subscription.updated arrives.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS payment_failed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_failure_reason TEXT;

COMMENT ON COLUMN public.profiles.payment_failed_at IS
  'Set by the Stripe webhook when invoice.payment_failed fires. Cleared on invoice.payment_succeeded.';
COMMENT ON COLUMN public.profiles.payment_failure_reason IS
  'Short human-readable reason (e.g. "card_declined") for the most recent failed charge.';
