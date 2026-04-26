"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CreateSeriesModal } from "@/components/dashboard/CreateSeriesModal";
import { Plus } from "@/lib/lucide-icons";

export function NewSeriesLauncher({
  isPro,
  variant = "header",
}: {
  isPro: boolean;
  variant?: "header" | "cta";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        size={variant === "cta" ? "default" : "sm"}
        onClick={() => setOpen(true)}
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        New series
      </Button>
      <CreateSeriesModal open={open} onClose={() => setOpen(false)} isPro={isPro} />
    </>
  );
}
