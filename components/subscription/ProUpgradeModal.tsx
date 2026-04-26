"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  responsiveModalBackdrop,
  responsiveModalPanel,
  responsiveModalRoot,
} from "@/lib/ui/responsive-modal";

export type ProUpgradeModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
};

export function ProUpgradeModal({
  open,
  onClose,
  title,
  description,
}: ProUpgradeModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!open) {
    return null;
  }

  const startCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };

      if (res.status === 401) {
        toast.info("Sign in to upgrade", {
          description: "Create an account or log in, then try again.",
        });
        router.push(`/login?next=${encodeURIComponent("/dashboard")}`);
        onClose();
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
    <div
      className={responsiveModalRoot("z-[100]")}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pro-upgrade-title"
    >
      <button
        type="button"
        className={responsiveModalBackdrop()}
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div className={responsiveModalPanel("max-w-md border-gold/30 bg-editorial-card p-6")}>
        <h2 id="pro-upgrade-title" className="font-serif text-2xl text-gold">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-editorial-muted">{description}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="border-editorial-muted/50 text-editorial-cream hover:bg-editorial-bg/60"
            disabled={loading}
            onClick={onClose}
          >
            Not now
          </Button>
          <Button
            type="button"
            className="bg-gold font-semibold text-editorial-bg hover:bg-gold/90"
            disabled={loading}
            onClick={() => void startCheckout()}
          >
            {loading ? "Redirecting…" : "Upgrade to Pro"}
          </Button>
        </div>
      </div>
    </div>
  );
}
