/**
 * Server-action entrypoints for the auto-summarizer.
 *
 * Kept in a separate file because Next's `"use server"` directive
 * requires EVERY export of the module to be an async server-action
 * (serializable args, serializable return). The core `summarizeChapter`
 * / `isSummaryStale` helpers in `./auto-summarize.ts` stay callable from
 * any server context without that constraint.
 *
 * Call `enqueueChapterSummary(chapterId)` from a client component after
 * a successful chapter save — WITHOUT awaiting it. It detaches from the
 * current request so the summarizer's OpenAI round-trip doesn't slow
 * the save UX. On serverless runtimes where the handler may be killed
 * after the response, the staleness check on the NEXT save picks up any
 * dropped work, so the worst case is "summary refreshes a save late".
 */
"use server";

import { summarizeChapter } from "@/lib/ai/auto-summarize";
import { logServerError } from "@/lib/utils/errors";

/**
 * Fire-and-forget wrapper around `summarizeChapter`. Returns immediately
 * after kicking off the detached promise — callers should NOT await the
 * inner work. (They can still await the action itself; the action
 * resolves as soon as the detach happens.)
 */
export async function enqueueChapterSummary(chapterId: string): Promise<void> {
  if (typeof chapterId !== "string" || chapterId.length === 0) {
    return;
  }
  /* Detach: the inner promise is intentionally not awaited. If the
   * serverless runtime tears the function down before summarization
   * completes, the next save will notice the staleness and try again. */
  void summarizeChapter(chapterId).catch((e) => {
    logServerError("auto-summarize.enqueue", e);
  });
}
