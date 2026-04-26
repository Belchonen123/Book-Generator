import { marked } from "marked";
import TurndownService from "turndown";

import type { ChapterStatusDb } from "@/types/database.types";

marked.setOptions({ gfm: true, breaks: true });

/**
 * Shared Turndown instance. `atx` headings keep round-trip parity with the
 * compiler (`## `, `### `, ...). We add rules for extensions StarterKit alone
 * does not round-trip cleanly:
 *
 * - `<u>…</u>`         → `<u>…</u>` (inline HTML — marked echoes it back)
 * - `<hr>`             → `\n\n* * *\n\n` (scene break / dinkus). Turndown's
 *    default rule emits `* * *` already; we keep it explicit for legibility.
 * - `<a href="…">`     → standard Markdown link (Turndown default handles it)
 */
function isSceneBeatDiv(node: Node): node is HTMLElement {
  return node.nodeName === "DIV" && (node as HTMLElement).hasAttribute?.("data-scene-beat");
}

function serializeSceneBeatDiv(el: HTMLElement): string {
  const attrs: string[] = ['data-scene-beat=""'];
  const copy = [
    "data-beat-text",
    "data-generated-prose",
    "data-generated-at",
    "data-status",
    "data-length-hint",
    "data-collapsed",
  ];
  for (const a of copy) {
    const v = el.getAttribute(a);
    if (v != null) {
      const esc = v
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      attrs.push(`${a}="${esc}"`);
    }
  }
  return `\n\n<div ${attrs.join(" ")}></div>\n\n`;
}

const turndown = new TurndownService({
  headingStyle: "atx",
  blankReplacement: (_content, node) => {
    if (isSceneBeatDiv(node)) return serializeSceneBeatDiv(node);
    return "";
  },
});

turndown.addRule("underline", {
  filter: ["u"],
  replacement: (content) => `<u>${content}</u>`,
});

turndown.addRule("sceneBreak", {
  filter: (node) => node.nodeName === "HR",
  replacement: () => "\n\n* * *\n\n",
});

turndown.addRule("sceneBeat", {
  filter: (node) => isSceneBeatDiv(node),
  replacement: (_content, node) => serializeSceneBeatDiv(node as HTMLElement),
});

turndown.addRule("strike", {
  filter: (node) => {
    const name = node.nodeName.toLowerCase();
    return name === "s" || name === "del" || name === "strike";
  },
  replacement: (content) => `~~${content}~~`,
});

export { turndown };

export function markdownToHtml(md: string): string {
  if (!md.trim()) return "<p></p>";
  return marked(md, { async: false }) as string;
}

export function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

export function countChars(text: string): number {
  return text.length;
}

/** 250 words ≈ 1 minute of reading; round up, never below 1 for >0 words. */
export function estimateReadingMinutes(words: number): number {
  if (words <= 0) return 0;
  return Math.max(1, Math.ceil(words / 250));
}

/**
 * Heuristic that decides whether a pasted string *looks* like Markdown so we
 * can route it through `marked` instead of letting TipTap paste it as plain
 * text. Intentionally conservative — we'd rather miss a subtle link than
 * corrupt a literal paste.
 */
export function isLikelyMarkdown(text: string): boolean {
  if (!text || text.length < 3) return false;
  const patterns: RegExp[] = [
    /^#{1,6}\s+\S/m, // headings
    /\*\*[^*\n]+\*\*/, // bold
    /(^|\s)_[^_\n]+_(\s|$)/, // underscore italics
    /~~[^~\n]+~~/, // strike
    /`[^`\n]+`/, // inline code
    /^```/m, // code block
    /^>\s+\S/m, // blockquote
    /^\s*[-*+]\s+\S/m, // unordered list
    /^\s*\d+\.\s+\S/m, // ordered list
    /\[[^\]\n]+\]\([^)\s]+\)/, // link
    /^\s*\*\s\*\s\*\s*$/m, // dinkus
  ];
  return patterns.some((re) => re.test(text));
}

export function statusBadgeClass(status: ChapterStatusDb): string {
  switch (status) {
    case "pending":
      return "bg-muted text-muted-foreground";
    case "generating":
      return "bg-gold/20 text-gold";
    case "draft":
      return "bg-sky-500/15 text-sky-300";
    case "edited":
    case "approved":
      return "bg-emerald-500/15 text-emerald-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}
