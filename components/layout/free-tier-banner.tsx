"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useDashboardProfile } from "@/components/layout/dashboard-profile-context";

export function FreeTierBanner() {
  const { subscriptionTier } = useDashboardProfile();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (subscriptionTier !== "free") {
    return null;
  }

  const onUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent("/dashboard")}`);
        return;
      }
      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Checkout unavailable.");
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("Could not start checkout.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-b border-gold/25 bg-gold/10 px-4 py-2.5 text-center text-sm text-editorial-cream sm:px-6">
      <span className="text-editorial-muted">You&apos;re on the free plan.</span>{" "}
      <button
        type="button"
        disabled={loading}
        onClick={() => void onUpgrade()}
        className="font-semibold text-gold underline-offset-2 hover:underline disabled:opacity-60"
      >
        {loading ? "Redirecting…" : "Upgrade for unlimited books →"}
      </button>
      <span className="mx-2 text-editorial-muted/50">·</span>
      <Link
        href="/dashboard/settings#coupon"
        className="text-editorial-muted underline-offset-2 hover:text-gold hover:underline"
      >
        Have a coupon?
      </Link>
    </div>
  );
}
