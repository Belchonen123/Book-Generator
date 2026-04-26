"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { promoteCharacterBibleToSeriesAction } from "@/app/(dashboard)/dashboard/series/actions";
import { Button } from "@/components/ui/button";
import { Loader2 } from "@/lib/lucide-icons";
import { ProUpgradeModal } from "@/components/subscription/ProUpgradeModal";

type SeriesBiblePromoteProps = {
  bookId: string;
  hasSeries: boolean;
  hasCharacterBible: boolean;
  isPro: boolean;
};

export function SeriesBiblePromote({
  bookId,
  hasSeries,
  hasCharacterBible,
  isPro,
}: SeriesBiblePromoteProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (!hasSeries || !hasCharacterBible) {
    return null;
  }

  const run = async () => {
    if (!isPro) {
      setUpgradeOpen(true);
      return;
    }
    setBusy(true);
    const res = await promoteCharacterBibleToSeriesAction(bookId);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error ?? "Could not update series.");
      if ((res.error ?? "").toLowerCase().includes("pro")) {
        setUpgradeOpen(true);
      }
      return;
    }
    toast.success("Series character bible updated.");
    router.refresh();
  };

  return (
    <div className="mt-6 rounded-lg border border-gold/25 bg-gold/5 px-4 py-3 text-sm">
      <p className="text-editorial-cream">This project has a character bible and belongs to a series.</p>
      <p className="mt-1 text-editorial-muted">
        Promote your book’s bible entries into the shared series character bible (merges with existing
        series data).
      </p>
      <Button
        type="button"
        className="mt-3"
        size="sm"
        variant="secondary"
        disabled={busy}
        onClick={() => void run()}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Promote to series-wide"}
      </Button>
      <ProUpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        title="Series is a Pro feature"
        description="Use a shared character bible across every book in a series."
      />
    </div>
  );
}
