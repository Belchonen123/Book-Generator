"use client";

import { useState } from "react";

import { ProUpgradeModal } from "@/components/subscription/ProUpgradeModal";
import { Button } from "@/components/ui/button";

export function PacingProUpsell() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mx-auto max-w-lg rounded-lg border border-border/60 bg-card/40 p-8 text-center">
      <h1 className="font-serif text-2xl text-editorial-cream">Scene pacing (Pro)</h1>
      <p className="mt-2 text-sm text-editorial-muted">
        See tension curves and scene beats for every chapter — fiction, Pro only.
      </p>
      <Button type="button" className="mt-6" onClick={() => setOpen(true)}>
        Upgrade to Pro
      </Button>
      <ProUpgradeModal
        open={open}
        onClose={() => setOpen(false)}
        title="Unlock pacing map"
        description="Visualize story tension and beat structure for each chapter, plus other Pro writing tools."
      />
    </div>
  );
}
