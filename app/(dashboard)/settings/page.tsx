import { redirect } from "next/navigation";

/** Canonical settings live under `/dashboard/settings` (same layout). */
export default function SettingsAliasPage() {
  redirect("/dashboard/settings");
}
