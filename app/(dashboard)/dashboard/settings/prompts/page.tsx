import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PromptsEditorPage } from "@/app/(dashboard)/dashboard/settings/prompts/_components/prompts-editor-page";
import { listTemplatesForUser } from "@/lib/ai/prompt-templates";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Prompt templates",
};

export default async function PromptTemplatesSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const templates = await listTemplatesForUser(supabase, {
    userId: user.id,
    projectId: null,
  });

  return <PromptsEditorPage projectId={null} templates={templates} />;
}
