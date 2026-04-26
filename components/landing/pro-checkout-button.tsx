"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function ProCheckoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };

      if (res.status === 401) {
        toast.info("Sign in to upgrade", {
          description: "Create an account or log in, then try again.",
        });
        router.push(`/login?next=${encodeURIComponent("/?checkout=pro#pricing")}`);
        return;
      }

      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Checkout is temporarily unavailable.");
        return;
      }

      window.location.href = data.url;
    } catch {
      toast.error("Could not reach checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      className="mt-8 w-full bg-gold font-semibold text-editorial-bg hover:bg-gold/90"
      disabled={loading}
      onClick={() => void onClick()}
    >
      {loading ? "Redirecting…" : "Upgrade with Stripe"}
    </Button>
  );
}
