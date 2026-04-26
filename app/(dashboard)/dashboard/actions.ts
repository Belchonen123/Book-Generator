"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { DASHBOARD_BOOKS_PAGE_SIZE } from "@/lib/dashboard/pagination";
import { createClient } from "@/lib/supabase/server";
import { FREE_BOOK_LIMIT } from "@/lib/subscription/limits";
import { trackEvent } from "@/lib/utils/analytics";
import type { DashboardBook } from "@/types/book.types";

const DASHBOARD_BOOK_LIST_COLUMNS =
  "id, title, genre, status, word_count, chapter_count, updated_at, series_id, series_order, series(id, name)" as const;

export async function createBookAction(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    redirect("/dashboard?error=profile");
  }

  if (profile.subscription_tier === "free") {
    const { count, error: countError } = await supabase
      .from("books")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (!countError && (count ?? 0) >= FREE_BOOK_LIMIT) {
      redirect("/dashboard?error=limit");
    }
  }

  const { data: book, error: insertError } = await supabase
    .from("books")
    .insert({
      user_id: user.id,
      title: "Untitled Book",
      status: "idea",
    })
    .select("id")
    .single();

  if (insertError || !book) {
    redirect("/dashboard?error=create");
  }

  await trackEvent(user.id, "book_created", book.id);
  revalidatePath("/dashboard");
  redirect(`/projects/${book.id}`);
}

export async function renameBookAction(
  bookId: string,
  newTitle: string,
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = newTitle.trim();
  if (!trimmed) {
    return { ok: false, error: "Title cannot be empty." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  const { error } = await supabase
    .from("books")
    .update({ title: trimmed })
    .eq("id", bookId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: "Could not rename this book." };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/projects/${bookId}`);
  return { ok: true };
}

export async function deleteBookAction(
  bookId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  const { error } = await supabase
    .from("books")
    .delete()
    .eq("id", bookId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: "Could not delete this book." };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function loadMoreDashboardBooksAction(
  offset: number,
): Promise<{ books: DashboardBook[]; hasMore: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { books: [], hasMore: false };
  }

  const { data: rows, error } = await supabase
    .from("books")
    .select(DASHBOARD_BOOK_LIST_COLUMNS)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .range(offset, offset + DASHBOARD_BOOKS_PAGE_SIZE - 1);

  if (error || !rows) {
    return { books: [], hasMore: false };
  }

  const books: DashboardBook[] = rows.map((b) => {
    const s = b.series as { id: string; name: string } | null;
    return {
      id: b.id,
      title: b.title,
      genre: b.genre,
      status: b.status,
      word_count: b.word_count,
      chapter_count: b.chapter_count,
      updated_at: b.updated_at,
      seriesId: b.series_id,
      seriesName: s?.name ?? null,
      seriesOrder: b.series_order,
    };
  });

  return {
    books,
    hasMore: rows.length === DASHBOARD_BOOKS_PAGE_SIZE,
  };
}

export async function recordBookDownloadAction(bookId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return;
  }
  await trackEvent(user.id, "book_downloaded", bookId);
}

export async function completeOnboardingAction(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ has_seen_onboarding: true })
    .eq("id", user.id);

  if (error) {
    return { ok: false };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}
