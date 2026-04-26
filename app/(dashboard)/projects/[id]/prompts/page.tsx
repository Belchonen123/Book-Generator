import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PromptsEditorPage } from "@/app/(dashboard)/dashboard/settings/prompts/_components/prompts-editor-page";
import { listTemplatesForUser } from "@/lib/ai/prompt-templates";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Prompt templates",
};

export default async function ProjectPromptTemplatesPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: book, error } = await supabase
    .from("books")
    .select("id, title")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (error || !book) {
    notFound();
  }

  const templates = await listTemplatesForUser(supabase, {
    userId: user.id,
    projectId: book.id,
  });

  return (
    <PromptsEditorPage
      projectId={book.id}
      projectTitle={book.title?.trim() || "Untitled"}
      templates={templates}
    />
  );
}
