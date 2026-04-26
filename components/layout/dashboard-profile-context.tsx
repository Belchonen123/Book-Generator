"use client";

import { createContext, useContext } from "react";

import type { SubscriptionTierDb } from "@/types/database.types";

export type DashboardProfileValue = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  penName: string | null;
  website: string | null;
  location: string | null;
  twitterHandle: string | null;
  subscriptionTier: SubscriptionTierDb;
  /** ISO timestamp if the last renewal invoice failed; null when billing is healthy. */
  paymentFailedAt: string | null;
  paymentFailureReason: string | null;
};

const DashboardProfileContext = createContext<DashboardProfileValue | null>(null);

export function DashboardProfileProvider({
  value,
  children,
}: {
  value: DashboardProfileValue;
  children: React.ReactNode;
}) {
  return (
    <DashboardProfileContext.Provider value={value}>{children}</DashboardProfileContext.Provider>
  );
}

export function useDashboardProfile(): DashboardProfileValue {
  const ctx = useContext(DashboardProfileContext);
  if (!ctx) {
    throw new Error("useDashboardProfile must be used within DashboardProfileProvider");
  }
  return ctx;
}
