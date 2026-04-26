/**
 * TipTap decorations for post-hoc banned-phrase / "slop" detection (Prompt 16).
 * Same regex sources as `lib/ai/slop-scan.ts` / `phrasesForSlopScan`.
 */
import { Extension } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

import { phrasesForSlopScan } from "@/lib/ai/slop-scan";
import type { BannedPhraseCategory } from "@/lib/ai/banned-phrases";
import type { BookTypeDb } from "@/types/database.types";

const slopPluginKey = new PluginKey<SlopPluginState>("slopHighlight");

export type SlopDecorationInfo = {
  order: number;
  pattern: string;
  from: number;
  to: number;
  matchedText: string;
};

type SlopPluginState = {
  bookType: BookTypeDb;
  enabled: boolean;
  decorations: DecorationSet;
  infoByFrom: Map<number, SlopDecorationInfo>;
  lastScanAt: number;
  scanPending: boolean;
};

type ConfigMeta = {
  type: "config";
  bookType: BookTypeDb;
  enabled: boolean;
};

type RescanMeta = { type: "rescan" };

function effectiveSlopBookType(bt: BookTypeDb | null | undefined): "fiction" | "non_fiction" {
  return bt === "non_fiction" ? "non_fiction" : "fiction";
}

function buildSlopDecorations(
  doc: PMNode,
  bookType: BookTypeDb,
): { set: DecorationSet; info: Map<number, SlopDecorationInfo> } {
  const scanType = effectiveSlopBookType(bookType);
  const phrases = phrasesForSlopScan(scanType);
  const decos: Decoration[] = [];
  const info = new Map<number, SlopDecorationInfo>();

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) {
      return true;
    }
    const text = node.text;
    const base = pos + 1;
    for (const phrase of phrases) {
      if (!phrase.detectRegex) {
        continue;
      }
      const re = new RegExp(phrase.detectRegex.source, phrase.detectRegex.flags);
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        const from = base + m.index;
        const to = from + m[0].length;
        decos.push(
          Decoration.inline(from, to, {
            class: "slop-highlight",
            "data-slop-order": String(phrase.order),
            "data-slop-pattern": phrase.pattern.slice(0, 240),
            "data-slop-category": phrase.category,
            "data-slop-from": String(from),
            "data-slop-to": String(to),
          }),
        );
        info.set(from, {
          order: phrase.order,
          pattern: phrase.pattern,
          from,
          to,
          matchedText: m[0],
        });
        if (!re.global) {
          break;
        }
      }
    }
    return true;
  });

  return { set: DecorationSet.create(doc, decos), info };
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    slopHighlight: {
      setSlopHighlightConfig: (c: { bookType: BookTypeDb; enabled: boolean }) => ReturnType;
      rescanSlopHighlights: () => ReturnType;
    };
  }
}

export type SlopHighlightOptions = {
  debounceMs: number;
};

export const SlopHighlight = Extension.create<SlopHighlightOptions>({
  name: "slopHighlight",

  addOptions() {
    return { debounceMs: 450 };
  },

  addCommands() {
    return {
      setSlopHighlightConfig:
        (c: { bookType: BookTypeDb; enabled: boolean }) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            const meta: ConfigMeta = {
              type: "config",
              bookType: c.bookType,
              enabled: c.enabled,
            };
            dispatch(tr.setMeta(slopPluginKey, meta));
          }
          return true;
        },
      rescanSlopHighlights:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            dispatch(tr.setMeta(slopPluginKey, { type: "rescan" } as RescanMeta));
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const debounceMs = this.options.debounceMs;

    return [
      new Plugin<SlopPluginState>({
        key: slopPluginKey,

        state: {
          init(): SlopPluginState {
            return {
              bookType: "fiction",
              enabled: false,
              decorations: DecorationSet.empty,
              infoByFrom: new Map(),
              lastScanAt: 0,
              scanPending: false,
            };
          },

          apply(tr, prev, _oldState, newState): SlopPluginState {
            const meta = tr.getMeta(slopPluginKey) as ConfigMeta | RescanMeta | undefined;

            if (meta && "type" in meta && meta.type === "config") {
              if (!meta.enabled) {
                return {
                  ...prev,
                  bookType: meta.bookType,
                  enabled: false,
                  decorations: DecorationSet.empty,
                  infoByFrom: new Map(),
                  scanPending: false,
                };
              }
              const { set, info } = buildSlopDecorations(newState.doc, meta.bookType);
              return {
                bookType: meta.bookType,
                enabled: true,
                decorations: set,
                infoByFrom: info,
                lastScanAt: Date.now(),
                scanPending: false,
              };
            }

            if (meta && "type" in meta && meta.type === "rescan") {
              if (!prev.enabled) {
                return prev;
              }
              const { set, info } = buildSlopDecorations(newState.doc, prev.bookType);
              return {
                ...prev,
                decorations: set,
                infoByFrom: info,
                lastScanAt: Date.now(),
                scanPending: false,
              };
            }

            if (!tr.docChanged) {
              return prev;
            }

            if (!prev.enabled) {
              return prev;
            }

            return {
              ...prev,
              decorations: prev.decorations.map(tr.mapping, tr.doc),
            };
          },
        },

        props: {
          decorations(state) {
            return slopPluginKey.getState(state)?.decorations ?? null;
          },
        },

        view(editorView) {
          let timer: ReturnType<typeof setTimeout> | null = null;
          return {
            update(view, prevState) {
              const prevDocChanged = !prevState.doc.eq(view.state.doc);
              const st = slopPluginKey.getState(view.state);
              if (!prevDocChanged || !st?.enabled) {
                return;
              }
              if (timer) {
                clearTimeout(timer);
              }
              timer = setTimeout(() => {
                timer = null;
                view.dispatch(view.state.tr.setMeta(slopPluginKey, { type: "rescan" } as RescanMeta));
              }, debounceMs);
            },
            destroy() {
              if (timer) {
                clearTimeout(timer);
              }
            },
          };
        },
      }),
    ];
  },
});

export function slopDecorationFromEvent(event: Event): {
  order: number;
  pattern: string;
  category: BannedPhraseCategory;
  matchedText: string;
  from: number;
  to: number;
  rect: DOMRect;
} | null {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) {
    return null;
  }
  const el = target.closest(".slop-highlight");
  if (!el) {
    return null;
  }
  const order = el.getAttribute("data-slop-order");
  const pattern = el.getAttribute("data-slop-pattern") ?? "";
  const category = (el.getAttribute("data-slop-category") ??
    "descriptive_tics") as BannedPhraseCategory;
  const fromAttr = el.getAttribute("data-slop-from");
  const toAttr = el.getAttribute("data-slop-to");
  if (!order || fromAttr == null || toAttr == null) {
    return null;
  }
  const from = parseInt(fromAttr, 10);
  const to = parseInt(toAttr, 10);
  if (Number.isNaN(from) || Number.isNaN(to)) {
    return null;
  }
  return {
    order: parseInt(order, 10),
    pattern,
    category,
    matchedText: el.textContent ?? "",
    from,
    to,
    rect: el.getBoundingClientRect(),
  };
}
