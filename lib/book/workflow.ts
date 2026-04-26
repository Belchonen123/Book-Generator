import type { BookStatusDb } from "@/types/database.types";

/**
 * Maps the current URL to the workflow step shown in the nav.
 * Overrides DB status when the user is on a known phase page (e.g. export → Done).
 */
export function displayStatusForProjectPath(
  pathname: string,
  dbStatus: BookStatusDb,
): BookStatusDb {
  const p = pathname.replace(/\/$/, "") || "/";
  if (p.endsWith("/export")) {
    return "complete";
  }
  if (p.endsWith("/cover")) {
    return "cover";
  }
  if (p.includes("/outline")) {
    return "outlining";
  }
  if (p.includes("/chapters/")) {
    if (dbStatus === "cover" || dbStatus === "complete") {
      return dbStatus;
    }
    return "writing";
  }
  return dbStatus;
}

export const BOOK_STATUS_ORDER: BookStatusDb[] = [
  "idea",
  "refining",
  "outlining",
  "writing",
  "editing",
  "cover",
  "complete",
];

export function bookStatusIndex(status: BookStatusDb): number {
  const i = BOOK_STATUS_ORDER.indexOf(status);
  return i === -1 ? 0 : i;
}

/** Route for a workflow step (matches sidebar / project layout conventions). */
export function workflowStatusHref(
  bookId: string,
  firstChapterId: string | null,
  status: BookStatusDb,
): string {
  const base = `/projects/${bookId}`;
  switch (status) {
    case "idea":
    case "refining":
      return `${base}/idea`;
    case "outlining":
      return `${base}/outline`;
    case "writing":
    case "editing":
      return firstChapterId
        ? `${base}/chapters/${firstChapterId}`
        : `${base}/outline`;
    case "cover":
      return `${base}/cover`;
    case "complete":
      return `${base}/export`;
    default:
      return `${base}/idea`;
  }
}

/** 0–100 for progress bar (idea ≈ first segment, complete = 100%). */
export function bookWorkflowProgressPercent(status: BookStatusDb): number {
  const i = bookStatusIndex(status);
  return Math.round(((i + 1) / BOOK_STATUS_ORDER.length) * 100);
}
