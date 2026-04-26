"use client";

import type { Editor } from "@tiptap/core";
import { BubbleMenu } from "@tiptap/react";

import {
  INLINE_COMMANDS,
  type InlineCommandId,
} from "@/lib/ai/inline-commands";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Expand,
  Eye,
  Italic,
  Link2,
  Loader2,
  Minimize2,
  PenLine,
  Pencil,
  SpellCheck2,
  Underline,
  Wand2,
} from "@/lib/lucide-icons";
import { cn } from "@/lib/utils/cn";

import type { AssistToneOption } from "./types";

export type EditorBubbleMenuProps = {
  editor: Editor | null;
  /** Legacy `aiBusy` flag from the toolbar; still drives the rewrite-button spinner for visual continuity with the toolbar. */
  aiBusy: boolean;
  /** Global toolbar/disable flag (generating, batch-busy, read-only). */
  disabled: boolean;
  onProofread: () => void;
  onTone: (tone: AssistToneOption) => void;
  onOpenLink: () => void;
  /**
   * Fired when the user clicks one of the new preset inline-AI commands or
   * the Custom button. The parent (ChapterEditor) is responsible for
   * snapshotting the current selection + context and opening the
   * alternative card-stack panel.
   */
  onInlineCommand: (command: InlineCommandId) => void;
  /** Disable just the inline-command buttons (e.g. while a panel is streaming). */
  inlineCommandBusy: boolean;
};

const INLINE_COMMAND_ICONS: Record<InlineCommandId, React.ComponentType<{ className?: string }>> = {
  rewrite: Wand2,
  expand: Expand,
  shorten: Minimize2,
  describe: Eye,
  "show-dont-tell": PenLine,
  custom: Pencil,
};

/* Display order for the preset AI commands in the bubble menu. Keeps the
 * most-used actions (rewrite / expand / shorten) leftmost, with Custom as
 * the rightmost escape hatch. */
const INLINE_COMMAND_ORDER: InlineCommandId[] = [
  "rewrite",
  "expand",
  "shorten",
  "describe",
  "show-dont-tell",
  "custom",
];

/**
 * Floating toolbar shown above the current selection. Only renders when there
 * is a non-empty text selection; we explicitly hide it on code blocks/images
 * where mark-style formatting would be confusing.
 *
 * Layout: formatting marks (bold/italic/underline/link) → divider → preset
 * AI commands (rewrite/expand/shorten/describe/show-don't-tell/custom) →
 * divider → legacy assist actions (proofread / tone select) that we keep for
 * backwards-compatibility with any muscle memory built against the previous
 * menu.
 */
export function EditorBubbleMenu({
  editor,
  aiBusy,
  disabled,
  onProofread,
  onTone,
  onOpenLink,
  onInlineCommand,
  inlineCommandBusy,
}: EditorBubbleMenuProps) {
  if (!editor) return null;

  const aiDisabled = disabled || inlineCommandBusy;

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 120, placement: "top", maxWidth: 760 }}
      shouldShow={({ editor: ed, from, to }) => {
        if (from === to) return false;
        if (ed.isActive("codeBlock")) return false;
        return true;
      }}
      className="flex flex-wrap items-center gap-1 rounded-lg border border-border/70 bg-card/95 p-1 shadow-xl backdrop-blur"
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Bold"
        title="Bold"
        className={cn(
          "h-8 min-w-8 px-2 text-editorial-muted hover:text-gold",
          editor.isActive("bold") && "bg-gold/15 text-gold",
        )}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Italic"
        title="Italic"
        className={cn(
          "h-8 min-w-8 px-2 text-editorial-muted hover:text-gold",
          editor.isActive("italic") && "bg-gold/15 text-gold",
        )}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Underline"
        title="Underline"
        className={cn(
          "h-8 min-w-8 px-2 text-editorial-muted hover:text-gold",
          editor.isActive("underline") && "bg-gold/15 text-gold",
        )}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Add link"
        title="Add link (Ctrl+K)"
        className={cn(
          "h-8 min-w-8 px-2 text-editorial-muted hover:text-gold",
          editor.isActive("link") && "bg-gold/15 text-gold",
        )}
        onClick={onOpenLink}
      >
        <Link2 className="h-3.5 w-3.5" />
      </Button>
      <div className="mx-0.5 h-5 w-px bg-border" aria-hidden />
      {INLINE_COMMAND_ORDER.map((commandId) => {
        const def = INLINE_COMMANDS[commandId];
        const Icon = INLINE_COMMAND_ICONS[commandId];
        return (
          <Button
            key={commandId}
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`${def.label} with AI`}
            title={`${def.label} — ${def.description}`}
            disabled={aiDisabled}
            className={cn(
              "h-8 gap-1 px-2 text-editorial-muted hover:text-gold",
              commandId === "custom" && "text-gold/80",
            )}
            onClick={() => onInlineCommand(commandId)}
          >
            {aiBusy && commandId === "rewrite" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Icon className="h-3.5 w-3.5" aria-hidden />
            )}
            <span className="text-xs">{def.label}</span>
          </Button>
        );
      })}
      <div className="mx-0.5 h-5 w-px bg-border" aria-hidden />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Proofread with AI"
        title="Proofread — fix typos and grammar without changing voice"
        disabled={disabled}
        className="h-8 gap-1 px-2 text-editorial-muted hover:text-gold"
        onClick={onProofread}
      >
        <SpellCheck2 className="h-3.5 w-3.5" aria-hidden />
        <span className="text-xs">Proofread</span>
      </Button>
      <select
        className="h-8 rounded-md border border-border/60 bg-editorial-bg/70 px-1.5 text-xs text-editorial-cream focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/40"
        disabled={disabled}
        defaultValue=""
        onChange={(e) => {
          const v = e.target.value as "" | AssistToneOption;
          e.target.value = "";
          if (!v) return;
          onTone(v);
        }}
        title="Rewrite tone"
        aria-label="Rewrite tone"
      >
        <option value="">Tone…</option>
        <option value="formal">Formal</option>
        <option value="casual">Casual</option>
        <option value="dramatic">Dramatic</option>
      </select>
    </BubbleMenu>
  );
}
