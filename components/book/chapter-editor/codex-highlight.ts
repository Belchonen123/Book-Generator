/**
 * CodexHighlight — TipTap extension that paints decorations over matches of
 * codex-entry names/aliases in the editor.
 *
 * Implementation notes:
 *  - We rebuild the matcher (cheap) whenever `setCodexEntries` is fired via
 *    the extension's command; rescans on doc changes are debounced at 300ms.
 *  - Decorations are inline (underline + entryId data-attr) so the host
 *    component can wire up hover/click listeners at the editor root without
 *    this extension owning any React/portal state.
 *  - The plugin stores the raw match list in a Map<entryId, CodexMatch[]>
 *    so the host can answer "what entry does the node at pos X belong to?"
 *    without re-scanning.
 *
 * The host component is responsible for:
 *  - Rendering the HoverCard / side panel triggered by a user interaction
 *    on a decorated span.
 *  - Deciding whether to navigate to the codex page or open an inline
 *    editor — this extension is UI-free.
 */
import { Extension } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

import {
  buildCodexMatcher,
  type CodexMatch,
  type CodexMatcher,
  type CodexMatchableEntry,
} from "@/lib/codex/matcher";
import { codexUnderlineColor } from "@/lib/codex/types";
import type { CodexEntryTypeDb } from "@/types/database.types";

const codexPluginKey = new PluginKey<CodexPluginState>("codexHighlight");

/**
 * Minimal entry shape the extension needs — color comes from entry_type.
 *
 * `scope` and `series_name` are optional so pre-16.3 call sites keep working.
 * When present, series-scoped entries get a different visual treatment (a
 * subtly different underline hue via a CSS variable) and the hover card
 * can surface the series name. */
export type CodexHighlightEntry = CodexMatchableEntry & {
  entry_type: CodexEntryTypeDb;
  scope?: "project" | "series" | "shared";
  series_name?: string | null;
};

/** A single painted decoration, keyed for hit-testing from the host. */
export type CodexDecorationInfo = {
  entryId: string;
  entryType: CodexEntryTypeDb;
  /** "project" when missing — used by the host to format the HoverCard. */
  scope: "project" | "series" | "shared";
  seriesName: string | null;
  from: number;
  to: number;
  matchedText: string;
};

type CodexPluginState = {
  entries: ReadonlyMap<string, CodexHighlightEntry>;
  matcher: CodexMatcher | null;
  decorations: DecorationSet;
  infoByFrom: Map<number, CodexDecorationInfo>;
  /** Timestamp of the last matcher run — used for debounce gating. */
  lastScanAt: number;
  /** Whether a debounced rescan is currently scheduled. */
  scanPending: boolean;
};

type SetEntriesMeta = {
  type: "set-entries";
  entries: CodexHighlightEntry[];
};

type RescanMeta = {
  type: "rescan";
};

function buildDecorations(
  doc: PMNode,
  matcher: CodexMatcher,
  entries: ReadonlyMap<string, CodexHighlightEntry>,
): { set: DecorationSet; info: Map<number, CodexDecorationInfo> } {
  const decos: Decoration[] = [];
  const info = new Map<number, CodexDecorationInfo>();

  /* ProseMirror stores the doc as a tree — we walk every text node and run
   * the matcher on its textContent, then translate match offsets back to
   * document positions by adding the node's `pos + 1` (pm text nodes have
   * a leading boundary at `pos`). Running the matcher once per text node
   * is O(sum of text lengths) just like a single-pass scan of the whole
   * document; we do it this way because pm's doc doesn't expose a single
   * flat string. */
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return true;
    const matches: CodexMatch[] = matcher.scanText(node.text);
    if (matches.length === 0) return true;
    for (const m of matches) {
      const entry = entries.get(m.entryId);
      if (!entry) continue;
      const from = pos + m.startIndex;
      const to = pos + m.endIndex;
      const color = codexUnderlineColor(entry.entry_type);
      const scope = entry.scope ?? "project";
      /* Series / shared entries get a dashed underline in CSS (see
       * `.codex-highlight[data-codex-scope="series"]` in globals.css) so
       * authors can tell at a glance which matches are book-local and
       * which span the whole series — matches the spec's "subtly
       * different underline" ask without changing the base hue. */
      decos.push(
        Decoration.inline(from, to, {
          class: "codex-highlight",
          "data-codex-entry-id": m.entryId,
          "data-codex-entry-type": entry.entry_type,
          "data-codex-scope": scope,
          /* Surface the series name via a data-attr so the host's
           * HoverCard can render "Series: {name}" without a second
           * lookup. Empty string is harmless when absent. */
          "data-codex-series-name": entry.series_name ?? "",
          style: `--codex-underline:${color};`,
        }),
      );
      info.set(from, {
        entryId: m.entryId,
        entryType: entry.entry_type,
        scope,
        seriesName: entry.series_name ?? null,
        from,
        to,
        matchedText: m.matchedString,
      });
    }
    return true;
  });

  return { set: DecorationSet.create(doc, decos), info };
}

export type CodexHighlightOptions = {
  /**
   * Milliseconds to wait after the last doc change before rescanning. 300ms
   * matches the spec and keeps typing latency invisible on a ~10k-word
   * chapter. Tuning down further doesn't buy anything perceptible.
   */
  debounceMs: number;
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    codexHighlight: {
      /** Replace the entry set; rescans on next tick. */
      setCodexEntries: (entries: CodexHighlightEntry[]) => ReturnType;
    };
  }
}

export const CodexHighlight = Extension.create<CodexHighlightOptions>({
  name: "codexHighlight",

  addOptions() {
    return { debounceMs: 300 };
  },

  onCreate() {
    /* Kick one safety rescan so decorations still paint if entries were
     * pushed before the editor finished its first layout pass. */
    queueMicrotask(() => {
      const meta: RescanMeta = { type: "rescan" };
      this.editor.view.dispatch(this.editor.view.state.tr.setMeta(codexPluginKey, meta));
    });
  },

  addCommands() {
    return {
      setCodexEntries:
        (entries: CodexHighlightEntry[]) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            const meta: SetEntriesMeta = { type: "set-entries", entries };
            dispatch(tr.setMeta(codexPluginKey, meta));
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const debounceMs = this.options.debounceMs;

    return [
      new Plugin<CodexPluginState>({
        key: codexPluginKey,

        state: {
          init(): CodexPluginState {
            return {
              entries: new Map(),
              matcher: null,
              decorations: DecorationSet.empty,
              infoByFrom: new Map(),
              lastScanAt: 0,
              scanPending: false,
            };
          },

          apply(tr, prev, _oldState, newState): CodexPluginState {
            const setMeta = tr.getMeta(codexPluginKey) as
              | SetEntriesMeta
              | RescanMeta
              | undefined;

            if (setMeta?.type === "set-entries") {
              const entryMap = new Map<string, CodexHighlightEntry>();
              for (const e of setMeta.entries) entryMap.set(e.id, e);
              const matcher = buildCodexMatcher(setMeta.entries);
              const { set, info } = buildDecorations(newState.doc, matcher, entryMap);
              return {
                entries: entryMap,
                matcher,
                decorations: set,
                infoByFrom: info,
                lastScanAt: Date.now(),
                scanPending: false,
              };
            }

            if (setMeta?.type === "rescan") {
              if (!prev.matcher) return prev;
              const { set, info } = buildDecorations(
                newState.doc,
                prev.matcher,
                prev.entries,
              );
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
            /* Doc changed. Map the existing decoration set forward so we
             * keep painting while a debounced rescan is pending. This
             * avoids the "highlights flicker off while typing" issue that
             * bites naive DecorationSet.create-on-every-keystroke impls. */
            return {
              ...prev,
              decorations: prev.decorations.map(tr.mapping, tr.doc),
            };
          },
        },

        props: {
          decorations(state) {
            return codexPluginKey.getState(state)?.decorations ?? null;
          },
        },

        view(editorView) {
          let timer: ReturnType<typeof setTimeout> | null = null;
          return {
            update(view, prevState) {
              const prevDocChanged = !prevState.doc.eq(view.state.doc);
              const pluginState = codexPluginKey.getState(view.state);
              if (!prevDocChanged || !pluginState?.matcher) return;
              if (timer) clearTimeout(timer);
              timer = setTimeout(() => {
                timer = null;
                const meta: RescanMeta = { type: "rescan" };
                view.dispatch(view.state.tr.setMeta(codexPluginKey, meta));
              }, debounceMs);
            },
            destroy() {
              if (timer) clearTimeout(timer);
            },
          };
        },
      }),
    ];
  },
});

/**
 * Host helpers: look up the codex decoration (if any) at a given DOM event.
 * The host calls this from a `mouseover` / `click` listener on the editor
 * root and uses the returned info to open a hover card or side panel.
 */
export function codexDecorationFromEvent(event: Event):
  | {
      entryId: string;
      entryType: CodexEntryTypeDb;
      scope: "project" | "series" | "shared";
      seriesName: string | null;
      matchedText: string;
      rect: DOMRect;
    }
  | null {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return null;
  const el = target.closest("[data-codex-entry-id]");
  if (!el) return null;
  const entryId = el.getAttribute("data-codex-entry-id");
  const entryType = el.getAttribute("data-codex-entry-type") as
    | CodexEntryTypeDb
    | null;
  if (!entryId || !entryType) return null;
  const scopeAttr = el.getAttribute("data-codex-scope");
  const scope: "project" | "series" | "shared" =
    scopeAttr === "series" || scopeAttr === "shared" ? scopeAttr : "project";
  const seriesNameAttr = el.getAttribute("data-codex-series-name");
  return {
    entryId,
    entryType,
    scope,
    seriesName: seriesNameAttr && seriesNameAttr.length > 0 ? seriesNameAttr : null,
    matchedText: el.textContent ?? "",
    rect: el.getBoundingClientRect(),
  };
}
