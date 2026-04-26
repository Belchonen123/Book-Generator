import { marked } from "marked";

/**
 * Strips chapter markdown to plain text for TTS. Headings become plain lines.
 */
export function markdownToPlainText(markdown: string): string {
  if (!markdown.trim()) return "";
  const html = marked.parse(markdown.trim(), { async: false }) as string;
  const noTags = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ");
  return noTags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\u0022")
    .replace(/&#39;/g, "\u0027")
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();
}
