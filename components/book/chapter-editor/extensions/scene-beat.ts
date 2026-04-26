/**
 * SceneBeat — TipTap custom Node for Novelcrafter-style beat expansion.
 *
 * The author inserts one of these via the slash menu (`/beat` or
 * `/continue`), writes a short description of what should happen in the
 * scene (plain English with optional [bracketed stage directions]),
 * picks a length, and clicks Generate. The node view streams ~200–700
 * words of prose back from `/api/ai/scene-beat` and offers an acceptance
 * flow (keep & collapse / regenerate / discard prose / discard
 * everything).
 *
 * STORAGE
 * The node is an ATOM — no inline ProseMirror content. All state lives
 * on attributes:
 *   beatText        — plain-text beat the author typed.
 *   generatedProse  — streamed prose (null until status='generated').
 *   generatedAt     — ISO timestamp of the last successful generation.
 *   status          — 'draft' | 'generating' | 'generated' | 'error'.
 *   lengthHint      — 'short' | 'medium' | 'long'.
 *   collapsed       — true after "Keep & collapse beat"; chip-only UI.
 *
 * ROUND-TRIP
 * `renderHTML` emits a `<div data-scene-beat>` with all state on data-*
 * attributes. `parseHTML` reads them back. The chapter editor persists
 * content as MARKDOWN via `turndown`; a dedicated turndown rule in
 * `markdown.ts` serializes the scene-beat div to a literal HTML block
 * that `marked` echoes back unchanged on reload.
 *
 * RATIONALE FOR ATOM
 * Storing the generated prose as actual ProseMirror `<p>` children would
 * let the author edit it inline, but it would also make the node model
 * dependent on the saved HTML structure (one extra paragraph and
 * suddenly the Regenerate button acts on stale state). Keeping the node
 * opaque means the React view owns the whole UX contract. When the
 * author clicks "Keep & collapse beat" we explicitly flatten the prose
 * into real paragraphs AFTER the node and collapse the node itself —
 * that's the one-way door into the regular editor flow.
 */
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import { SceneBeatNodeView } from "./scene-beat-node-view";

/** Valid `status` values. Runtime coerces anything else to 'draft'. */
export const SCENE_BEAT_STATUSES = [
  "draft",
  "generating",
  "generated",
  "error",
] as const;
export type SceneBeatStatus = (typeof SCENE_BEAT_STATUSES)[number];

export type SceneBeatOptions = {
  /**
   * Returns the current chapter ID the editor is attached to. We use a
   * getter instead of a plain string because ChapterEditor reuses a
   * single TipTap instance across chapter navigation — a cached string
   * would go stale. Returns `null` when no chapter is loaded yet, which
   * the node view uses to disable its Generate button.
   */
  getChapterId: () => string | null;
};

export type SceneBeatInsertCommandOptions = {
  /** Pre-populated beat text. Used by `/continue` to drop in a default. */
  beatText?: string;
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    sceneBeat: {
      /**
       * Insert a new SceneBeat node at the current selection. A trailing
       * empty paragraph is appended so the author always has somewhere
       * to type next; otherwise hitting the end of the document with a
       * SceneBeat as the last node leaves nowhere to place the cursor.
       */
      insertSceneBeat: (opts?: SceneBeatInsertCommandOptions) => ReturnType;
    };
  }
}

function coerceStatus(v: unknown): SceneBeatStatus {
  return typeof v === "string" && SCENE_BEAT_STATUSES.includes(v as SceneBeatStatus)
    ? (v as SceneBeatStatus)
    : "draft";
}

export const SceneBeat = Node.create<SceneBeatOptions>({
  name: "sceneBeat",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,
  isolating: true,

  addOptions() {
    return {
      getChapterId: () => null,
    };
  },

  addAttributes() {
    return {
      beatText: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-beat-text") ?? "",
        renderHTML: (attrs) => ({
          "data-beat-text": typeof attrs.beatText === "string" ? attrs.beatText : "",
        }),
      },
      generatedProse: {
        default: null as string | null,
        parseHTML: (el) => el.getAttribute("data-generated-prose"),
        renderHTML: (attrs) =>
          typeof attrs.generatedProse === "string" && attrs.generatedProse.length > 0
            ? { "data-generated-prose": attrs.generatedProse }
            : {},
      },
      generatedAt: {
        default: null as string | null,
        parseHTML: (el) => el.getAttribute("data-generated-at"),
        renderHTML: (attrs) =>
          typeof attrs.generatedAt === "string" && attrs.generatedAt.length > 0
            ? { "data-generated-at": attrs.generatedAt }
            : {},
      },
      status: {
        default: "draft" as SceneBeatStatus,
        parseHTML: (el) => coerceStatus(el.getAttribute("data-status")),
        /* Never persist a transient `generating` state — if the author
         * closes the tab mid-stream, the beat should reload as `draft`
         * (or `generated` if the stream happened to finish before the
         * page was serialized). Persisting `generating` would leave the
         * UI stuck with a spinner and no stream to recover. */
        renderHTML: (attrs) => {
          const s = coerceStatus(attrs.status);
          return {
            "data-status": s === "generating" ? "draft" : s,
          };
        },
      },
      lengthHint: {
        default: "medium",
        parseHTML: (el) => {
          const v = el.getAttribute("data-length-hint");
          return v === "short" || v === "medium" || v === "long" ? v : "medium";
        },
        renderHTML: (attrs) => ({
          "data-length-hint":
            attrs.lengthHint === "short" ||
            attrs.lengthHint === "medium" ||
            attrs.lengthHint === "long"
              ? attrs.lengthHint
              : "medium",
        }),
      },
      collapsed: {
        default: false,
        parseHTML: (el) => el.getAttribute("data-collapsed") === "true",
        renderHTML: (attrs) => ({
          "data-collapsed": attrs.collapsed ? "true" : "false",
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-scene-beat]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-scene-beat": "" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SceneBeatNodeView);
  },

  addCommands() {
    return {
      insertSceneBeat:
        (opts = {}) =>
        ({ chain }) => {
          const beatText = opts.beatText ?? "";
          /* Insert the SceneBeat + a trailing empty paragraph in one go.
           * The trailing paragraph keeps the caret placeable when the
           * beat is the last node in the document (atom nodes can't
           * host a cursor themselves). The React node view handles its
           * own focus-on-mount for the textarea. */
          return chain()
            .focus()
            .insertContent([
              {
                type: this.name,
                attrs: {
                  beatText,
                  generatedProse: null,
                  generatedAt: null,
                  status: "draft",
                  lengthHint: "medium",
                  collapsed: false,
                },
              },
              { type: "paragraph" },
            ])
            .run();
        },
    };
  },
});

export default SceneBeat;
