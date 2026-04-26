"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useDashboardProfile } from "@/components/layout/dashboard-profile-context";

/** Reason strings we want to render with friendlier copy. */
function humanizeReason(raw: string | null): string {
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (lower.includes("insufficient")) return "Insufficient funds on the card on file.";
  if (lower.includes("expired")) return "The card on file has expired.";
  if (lower.includes("card_declined") || lower.includes("declined")) {
    return "The card on file was declined.";
  }
  if (lower.includes("authentication")) return "The bank requested additional authentication.";
  // Fall back to showing a trimmed version of Stripe's message.
  return raw.length > 140 ? `${raw.slice(0, 140)}…` : raw;
}

export function PaymentIssueBanner() {
  const { paymentFailedAt, paymentFailureReason, subscriptionTier } = useDashboardProfile();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!paymentFailedAt) return null;

  const openPortal = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (res.status === 401) {
        router.push("/login?next=/dashboard");
        return;
      }
      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Billing portal unavailable.");
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("Could not open billing portal.");
    } finally {
      setLoading(false);
    }
  };

  const detail = humanizeReason(paymentFailureReason);
  const stillPro = subscriptionTier === "pro";

  return (
    <div
      role="alert"
      className="border-b border-destructive/40 bg-destructive/15 px-4 py-2.5 text-sm text-editorial-cream sm:px-6"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-2 text-left sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <span className="font-semibold text-destructive-foreground">
            Payment issue on your ChapterAI subscription.
          </span>{" "}
          <span className="text-editorial-cream/90">
            {detail ||
              "Your most recent renewal charge failed. Stripe will retry, but your Pro access may lapse if it keeps failing."}
          </span>
          {stillPro ? (
            <span className="ml-1 text-editorial-muted">
              You still have Pro access for now.
            </span>
          ) : (
            <span className="ml-1 text-editorial-muted">Your account has dropped to Free.</span>
          )}
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => void openPortal()}
          className="shrink-0 rounded-md border border-destructive/60 bg-destructive/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-destructive-foreground hover:bg-destructive/30 disabled:opacity-60"
        >
          {loading ? "Opening…" : "Update payment method"}
        </button>
      </div>
    </div>
  );
}
