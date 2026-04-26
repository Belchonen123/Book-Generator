import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

type Supabase = SupabaseClient<Database>;

/**
 * First chapter that still needs drafting work, else first chapter in the book.
 * Used when routing `writing` / `editing` projects into the chapter editor.
 */
export async function resolveChapterEntryId(
  supabase: Supabase,
  bookId: string,
): Promise<string | null> {
  const { data: active } = await supabase
    .from("chapters")
    .select("id")
    .eq("book_id", bookId)
    .in("status", ["pending", "generating", "draft"])
    .order("chapter_number", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (active?.id) {
    return active.id;
  }

  const { data: first } = await supabase
    .from("chapters")
    .select("id")
    .eq("book_id", bookId)
    .order("chapter_number", { ascending: true })
    .limit(1)
    .maybeSingle();

  return first?.id ?? null;
}
