import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SettingsPageClient } from "@/components/settings/settings-page-client";
import { createClient } from "@/lib/supabase/server";
import { getAskRewriteOnOutlineEdit, getAutoSlopScan } from "@/lib/utils/profile-preferences";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, subscription_tier, preferences")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    redirect("/login");
  }

  const tier = profile.subscription_tier === "pro" ? "pro" : "free";

  return (
    <SettingsPageClient
      authEmail={user.email ?? ""}
      initialFullName={profile.full_name}
      initialAvatarUrl={profile.avatar_url}
      subscriptionTier={tier}
      askRewriteOnOutlineEdit={getAskRewriteOnOutlineEdit(profile.preferences)}
      autoSlopScanGeneratedChapters={getAutoSlopScan(profile.preferences)}
    />
  );
}
