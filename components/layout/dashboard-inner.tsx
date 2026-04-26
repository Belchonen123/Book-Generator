"use client";

import type { DashboardProfileValue } from "@/components/layout/dashboard-profile-context";
import { DashboardProfileProvider } from "@/components/layout/dashboard-profile-context";
import { DashboardChrome } from "@/components/layout/dashboard-chrome";
import { FreeTierBanner } from "@/components/layout/free-tier-banner";
import { PaymentIssueBanner } from "@/components/layout/payment-issue-banner";

export function DashboardInner({
  profile,
  activeSeriesCount,
  children,
}: {
  profile: DashboardProfileValue;
  /** Count of series with status='active'; surfaced as a badge next to the Series nav link. */
  activeSeriesCount: number;
  children: React.ReactNode;
}) {
  return (
    <DashboardProfileProvider value={profile}>
      <PaymentIssueBanner />
      <FreeTierBanner />
      <DashboardChrome activeSeriesCount={activeSeriesCount}>{children}</DashboardChrome>
    </DashboardProfileProvider>
  );
}
