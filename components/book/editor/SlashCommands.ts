import type { Editor, Range } from "@tiptap/core";
import { Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import type { Instance as TippyInstance } from "tippy.js";
import tippy from "tippy.js";

import {
  filterSlashCommands,
  type SlashCommandItem,
  SLASH_COMMAND_ITEMS,
} from "./slash-command-items";
import {
  SlashCommandMenu,
  type SlashCommandMenuHandle,
} from "./SlashCommandMenu";

/**
 * Payload passed to the host component when a slash command is chosen.
 * The `range` is the editor position range of the `/command` trigger
 * text that TipTap's Suggestion plugin detected — the Extension removes
 * it before invoking `onCommand` so the host only has to handle the
 * action + surrounding context.
 */
export type SlashCommandInvocation = {
  editor: Editor;
  item: SlashCommandItem;
  /** Cursor position AFTER the `/command` trigger text was deleted. */
  cursorPos: number;
};

export type SlashCommandsOptions = {
  /** Called when a user selects an item; host wires this to the API call + replacement. */
  onCommand: (payload: SlashCommandInvocation) => void;
  suggestion: Omit<
    SuggestionOptions<SlashCommandItem, SlashCommandItem>,
    "editor"
  >;
};

/**
 * TipTap extension that adds a slash-command palette triggered by typing
 * `/` at the start of a paragraph.
 *
 * The heavy lifting (calling the API, replacing the range with the model's
 * response, showing the "✨ thinking…" placeholder) is owned by the host
 * component so the extension stays pure — it only detects the trigger,
 * renders the menu, deletes the `/command` text on selection, and
 * delegates via `options.onCommand`.
 */
export const SlashCommands = Extension.create<SlashCommandsOptions>({
  name: "slashCommands",

  addOptions() {
    return {
      onCommand: () => {
        /* overridden per-editor */
      },
      suggestion: {
        char: "/",
        startOfLine: true,
        /* The Suggestion `command` is invoked when the user chooses an item
         * (via Enter/Tab/click). Delete the `/command` trigger text first so
         * the host can insert placeholder / replacement content at a clean
         * cursor position, then hand off. */
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor;
          range: Range;
          props: SlashCommandItem;
        }) => {
          editor.chain().focus().deleteRange(range).run();
          const cursorPos = editor.state.selection.from;
          const ext = editor.extensionManager.extensions.find(
            (e) => e.name === "slashCommands",
          );
          const onCommand =
            (ext?.options as SlashCommandsOptions | undefined)?.onCommand;
          if (onCommand) {
            onCommand({ editor, item: props, cursorPos });
          }
        },
        items: ({ query }: { query: string }): SlashCommandItem[] => {
          const filtered = filterSlashCommands(query);
          return filtered.length > 0 ? filtered : SLASH_COMMAND_ITEMS;
        },
        render: () => {
          let renderer: ReactRenderer<SlashCommandMenuHandle> | null = null;
          let popup: TippyInstance[] | null = null;

          return {
            onStart: (props) => {
              renderer = new ReactRenderer(SlashCommandMenu, {
                props,
                editor: props.editor,
              });

              if (!props.clientRect) return;

              popup = tippy("body", {
                getReferenceClientRect: () =>
                  props.clientRect?.() ?? new DOMRect(0, 0, 0, 0),
                appendTo: () => document.body,
                content: renderer.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
                arrow: false,
                offset: [0, 6],
                popperOptions: {
                  modifiers: [
                    { name: "flip", options: { fallbackPlacements: ["top-start"] } },
                  ],
                },
                /* Zero fade so the palette feels keyboard-snappy. */
                duration: 0,
              });
            },
            onUpdate: (props) => {
              renderer?.updateProps(props);
              if (!props.clientRect) return;
              popup?.[0]?.setProps({
                getReferenceClientRect: () =>
                  props.clientRect?.() ?? new DOMRect(0, 0, 0, 0),
              });
            },
            onKeyDown: (props) => {
              if (props.event.key === "Escape") {
                popup?.[0]?.hide();
                return true;
              }
              return renderer?.ref?.onKeyDown(props.event) ?? false;
            },
            onExit: () => {
              popup?.[0]?.destroy();
              renderer?.destroy();
              popup = null;
              renderer = null;
            },
          };
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
