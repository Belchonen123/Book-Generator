"use client";

import type { Editor } from "@tiptap/core";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  AlignCenterVertical,
  Bold,
  ChevronDown,
  ChevronUp,
  Code,
  Code2,
  Expand,
  History,
  Italic,
  Keyboard,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Maximize,
  MessageSquareText,
  Mic,
  Maximize2,
  Minimize2,
  PenLine,
  Quote,
  Redo2,
  Search,
  Shield,
  Sparkles,
  SpellCheck2,
  Square,
  Strikethrough,
  Target,
  FileText,
  Trash2,
  Type,
  Underline,
  Undo2,
  Wand2,
} from "@/lib/lucide-icons";
import { cn } from "@/lib/utils/cn";

import type { AssistToneOption } from "./types";

export type CodexToolbarEntryOption = {
  id: string;
  name: string;
  entryType: string;
};

export type ToolbarProps = {
  editor: Editor | null;
  toolbarDisabled: boolean;
  aiBusy: boolean;
  findOpen: boolean;
  spellcheckOn: boolean;
  zenMode: boolean;
  /**
   * `focusMode` is the aggressive distraction-free mode that hides the
   * whole toolbar. The button here toggles it *on*; exit is handled
   * elsewhere (overlay chip + Esc). We still accept the prop so the
   * button can reflect pressed state for the rare case where the
   * toolbar is rendered during an edge-case transition.
   */
  focusMode: boolean;
  typewriterMode: boolean;
  expandPromptOpen: boolean;
  rewritePromptOpen: boolean;
  /** Destination for the Version history link (chapter-specific revisions page). */
  versionHistoryHref: string;
  /** True on macOS / iPadOS so the tooltip can show ⌘ instead of Ctrl for the Cmd+. shortcut. */
  isMacPlatform: boolean;
  onRegenerate: () => void;
  onOpenExpand: () => void;
  onOpenRewrite: () => void;
  onShorten: () => void;
  onProofread: () => void;
  /** Banned-phrase / slop scan (Prompt 16). */
  onCheckSlop: () => void;
  onDeepSlopScan: () => void;
  slopScanBusy: boolean;
  deepSlopBusy: boolean;
  onContinue: () => void;
  onTone: (tone: AssistToneOption) => void;
  onToggleFind: () => void;
  onToggleSpellcheck: () => void;
  onToggleZen: () => void;
  onToggleFocus: () => void;
  onToggleTypewriter: () => void;
  onShowCheatsheet: () => void;
  onOpenLink: () => void;
  /** When false, the consistency button is not rendered. */
  bookTypeFiction: boolean;
  isPro: boolean;
  /** Pro voice memo to chapter. */
  onOpenVoiceMemo: () => void;
  /** Chapter has a draft (or later) so analysis is meaningful. */
  chapterReadyForConsistency: boolean;
  consistencyLoading: boolean;
  onCheckConsistency: () => void;
  /** Story-chat sidebar toggle. */
  chatOpen: boolean;
  onToggleChat: () => void;
  /** Active chapter generation stream can be cancelled. */
  generationRunning: boolean;
  onStopGeneration: () => void;
  /** Optional codex entries to force-include in chapter generation. */
  codexEntryOptions: readonly CodexToolbarEntryOption[];
  forcedCodexEntryIds: readonly string[];
  onToggleForcedCodexEntry: (entryId: string) => void;
  onClearForcedCodexEntries: () => void;
};

function ToolbarBtn({
  children,
  onClick,
  disabled,
  active,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={label}
      title={label}
      disabled={disabled}
      className={cn(
        "h-9 min-w-9 px-2 text-editorial-muted hover:text-gold",
        active && "bg-gold/15 text-gold",
      )}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function HeadingPicker({
  editor,
  disabled,
}: {
  editor: Editor | null;
  disabled: boolean;
}) {
  const currentLevel = editor
    ? [1, 2, 3, 4].find((l) => editor.isActive("heading", { level: l })) ?? 0
    : 0;
  const value = currentLevel === 0 ? "p" : `h${currentLevel}`;
  return (
    <select
      className="h-9 rounded-md border border-border/60 bg-editorial-bg/70 px-2 text-xs text-editorial-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 disabled:opacity-60"
      disabled={disabled || !editor}
      value={value}
      onChange={(e) => {
        if (!editor) return;
        const v = e.target.value;
        if (v === "p") {
          editor.chain().focus().setParagraph().run();
        } else {
          const level = Number(v.slice(1)) as 1 | 2 | 3 | 4;
          editor.chain().focus().setHeading({ level }).run();
        }
      }}
      title="Paragraph / heading level"
      aria-label="Paragraph or heading level"
    >
      <option value="p">Paragraph</option>
      <option value="h1">Heading 1</option>
      <option value="h2">Heading 2</option>
      <option value="h3">Heading 3</option>
      <option value="h4">Heading 4</option>
    </select>
  );
}

function CodexIncludePicker({
  options,
  selectedIds,
  disabled,
  onToggle,
  onClear,
}: {
  options: readonly CodexToolbarEntryOption[];
  selectedIds: readonly string[];
  disabled: boolean;
  onToggle: (entryId: string) => void;
  onClear: () => void;
}) {
  if (options.length === 0) return null;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedSet = new Set(selectedIds);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!rootRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={cn(
          "flex h-9 cursor-pointer list-none items-center rounded-md border border-border/60 bg-editorial-bg/70 px-2 text-xs text-editorial-cream hover:text-gold",
          disabled && "pointer-events-none opacity-60",
        )}
        title="Force-include specific codex entries in chapter generation"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        Codex include
        {selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
      </button>
      {open ? (
        <div className="absolute z-40 mt-1 w-72 rounded-md border border-border/70 bg-editorial-bg/95 p-2 shadow-lg backdrop-blur">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-editorial-muted">Include in prompt</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="text-xs text-editorial-muted hover:text-gold disabled:opacity-60"
                onClick={onClear}
                disabled={selectedIds.length === 0}
              >
                Clear
              </button>
              <button
                type="button"
                className="text-xs text-editorial-muted hover:text-gold"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
        </div>
        <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
          {options.map((entry) => (
            <label
              key={entry.id}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs text-editorial-cream hover:bg-white/5"
            >
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-border/60 bg-editorial-bg/80"
                checked={selectedSet.has(entry.id)}
                onChange={() => onToggle(entry.id)}
              />
              <span className="truncate">{entry.name}</span>
              <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide text-editorial-muted">
                {entry.entryType}
              </span>
            </label>
          ))}
        </div>
        </div>
      ) : null}
    </div>
  );
}

export function EditorToolbar({
  editor,
  toolbarDisabled,
  aiBusy,
  findOpen,
  spellcheckOn,
  zenMode,
  focusMode,
  typewriterMode,
  expandPromptOpen,
  rewritePromptOpen,
  versionHistoryHref,
  isMacPlatform,
  onRegenerate,
  onOpenExpand,
  onOpenRewrite,
  onShorten,
  onProofread,
  onCheckSlop,
  onDeepSlopScan,
  slopScanBusy,
  deepSlopBusy,
  onContinue,
  onTone,
  onToggleFind,
  onToggleSpellcheck,
  onToggleZen,
  onToggleFocus,
  onToggleTypewriter,
  onShowCheatsheet,
  onOpenLink,
  bookTypeFiction,
  isPro,
  onOpenVoiceMemo,
  chapterReadyForConsistency,
  consistencyLoading,
  onCheckConsistency,
  chatOpen,
  onToggleChat,
  generationRunning,
  onStopGeneration,
  codexEntryOptions,
  forcedCodexEntryIds,
  onToggleForcedCodexEntry,
  onClearForcedCodexEntries,
}: ToolbarProps) {
  const focusShortcut = isMacPlatform ? "⌘." : "Ctrl+.";
  const voiceMemoDisabled = toolbarDisabled || !isPro;
  const voiceMemoTitle = !isPro
    ? "Pro feature — use voice to draft from dictation"
    : "Record voice notes and draft this chapter (Pro)";
  const consistencyDisabled =
    !isPro || !chapterReadyForConsistency || toolbarDisabled || consistencyLoading;
  const consistencyTitle = !isPro
    ? "Pro feature — upgrade to check consistency"
    : !chapterReadyForConsistency
      ? "Available once this chapter is in draft (or later)"
      : "Check character and story continuity (fiction)";
  const canUndo = editor?.can().undo() ?? false;
  const canRedo = editor?.can().redo() ?? false;
  return (
    <div className="flex flex-wrap items-center gap-1 bg-transparent px-4 py-2">
      <ToolbarBtn
        disabled={toolbarDisabled || !editor || !canUndo}
        onClick={() => editor?.chain().focus().undo().run()}
        label="Undo (Ctrl+Z)"
      >
        <Undo2 className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        disabled={toolbarDisabled || !editor || !canRedo}
        onClick={() => editor?.chain().focus().redo().run()}
        label="Redo (Ctrl+Shift+Z)"
      >
        <Redo2 className="h-4 w-4" />
      </ToolbarBtn>
      <div className="mx-1 h-6 w-px bg-border" aria-hidden />
      <HeadingPicker editor={editor} disabled={toolbarDisabled} />
      <div className="mx-1 h-6 w-px bg-border" aria-hidden />
      <ToolbarBtn
        disabled={toolbarDisabled || !editor}
        active={editor?.isActive("bold")}
        onClick={() => editor?.chain().focus().toggleBold().run()}
        label="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        disabled={toolbarDisabled || !editor}
        active={editor?.isActive("italic")}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
        label="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        disabled={toolbarDisabled || !editor}
        active={editor?.isActive("underline")}
        onClick={() => editor?.chain().focus().toggleUnderline().run()}
        label="Underline (Ctrl+U)"
      >
        <Underline className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        disabled={toolbarDisabled || !editor}
        active={editor?.isActive("strike")}
        onClick={() => editor?.chain().focus().toggleStrike().run()}
        label="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        disabled={toolbarDisabled || !editor}
        active={editor?.isActive("code")}
        onClick={() => editor?.chain().focus().toggleCode().run()}
        label="Inline code (Ctrl+E)"
      >
        <Code className="h-4 w-4" />
      </ToolbarBtn>
      <div className="mx-1 h-6 w-px bg-border" aria-hidden />
      <ToolbarBtn
        disabled={toolbarDisabled || !editor}
        active={editor?.isActive("bulletList")}
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
        label="Bulleted list"
      >
        <List className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        disabled={toolbarDisabled || !editor}
        active={editor?.isActive("orderedList")}
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        label="Numbered list"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        disabled={toolbarDisabled || !editor}
        active={editor?.isActive("blockquote")}
        onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        label="Blockquote"
      >
        <Quote className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        disabled={toolbarDisabled || !editor}
        active={editor?.isActive("codeBlock")}
        onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
        label="Code block"
      >
        <Code2 className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        disabled={toolbarDisabled || !editor}
        active={editor?.isActive("link")}
        onClick={onOpenLink}
        label="Add / edit link (Ctrl+K)"
      >
        <Link2 className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        disabled={toolbarDisabled || !editor}
        onClick={() => editor?.chain().focus().setHorizontalRule().run()}
        label="Scene break (* * *)"
      >
        <span className="font-serif text-sm tracking-[0.3em]">***</span>
      </ToolbarBtn>
      <div className="mx-1 h-6 w-px bg-border" aria-hidden />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1 text-editorial-muted hover:text-gold"
        disabled={toolbarDisabled}
        onClick={onRegenerate}
        title="Regenerate this chapter from scratch"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
        <Sparkles className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Regenerate</span>
      </Button>
      {generationRunning ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1 border border-rose-400/50 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25 hover:text-rose-100"
          disabled={false}
          onClick={onStopGeneration}
          title="Stop chapter generation"
          aria-label="Stop chapter generation"
        >
          <Square className="h-3.5 w-3.5 fill-current" aria-hidden />
          <span className="hidden sm:inline">Stop</span>
        </Button>
      ) : null}
      <CodexIncludePicker
        options={codexEntryOptions}
        selectedIds={forcedCodexEntryIds}
        disabled={toolbarDisabled}
        onToggle={onToggleForcedCodexEntry}
        onClear={onClearForcedCodexEntries}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1 text-editorial-muted hover:text-gold"
        disabled={toolbarDisabled}
        onClick={onContinue}
        title="Continue writing from the cursor position"
      >
        {aiBusy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <PenLine className="h-4 w-4" aria-hidden />
        )}
        <span className="hidden sm:inline">Continue</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1 text-editorial-muted hover:text-gold"
        disabled={voiceMemoDisabled}
        title={voiceMemoTitle}
        onClick={onOpenVoiceMemo}
        aria-label="Voice memo to chapter"
      >
        <Mic className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Voice</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          "gap-1 text-editorial-muted hover:text-gold",
          expandPromptOpen && "bg-gold/15 text-gold",
        )}
        disabled={toolbarDisabled}
        onClick={onOpenExpand}
        aria-expanded={expandPromptOpen}
        title="Expand selection with optional custom instruction"
      >
        <Expand className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Expand</span>
        {expandPromptOpen ? (
          <ChevronUp className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          "gap-1 text-editorial-muted hover:text-gold",
          rewritePromptOpen && "bg-gold/15 text-gold",
        )}
        disabled={toolbarDisabled}
        onClick={onOpenRewrite}
        aria-expanded={rewritePromptOpen}
        title="Rewrite selection with a custom instruction"
      >
        <Wand2 className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Rewrite</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1 text-editorial-muted hover:text-gold"
        disabled={toolbarDisabled}
        onClick={onShorten}
        title="Shorten selection (~30% tighter)"
      >
        <span className="hidden sm:inline">Shorten</span>
        <span className="sm:hidden">−</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1 text-editorial-muted hover:text-gold"
        disabled={toolbarDisabled}
        onClick={onProofread}
        title="Proofread selection (grammar & spelling only)"
      >
        <SpellCheck2 className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Proofread</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1 text-editorial-muted hover:text-gold"
        disabled={toolbarDisabled || slopScanBusy}
        onClick={onCheckSlop}
        title="Run banned-phrase scan on the chapter and underline matches"
        aria-label="Check slop"
      >
        {slopScanBusy ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
        ) : (
          <FileText className="h-4 w-4" aria-hidden />
        )}
        <span className="hidden sm:inline">Check slop</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1 text-editorial-muted hover:text-gold"
        disabled={toolbarDisabled || deepSlopBusy}
        onClick={onDeepSlopScan}
        title="LLM pass for generic AI-style prose a regex can miss (uses your rate limit)"
        aria-label="Deep slop scan"
      >
        {deepSlopBusy ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
        ) : (
          <Target className="h-4 w-4" aria-hidden />
        )}
        <span className="hidden sm:inline">Deep slop</span>
      </Button>
      {bookTypeFiction ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1 text-editorial-muted hover:text-gold"
          disabled={consistencyDisabled}
          title={consistencyTitle}
          aria-label="Check consistency"
          onClick={onCheckConsistency}
        >
          {consistencyLoading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          ) : (
            <Shield className="h-4 w-4" aria-hidden />
          )}
          <span className="hidden sm:inline">Check consistency</span>
        </Button>
      ) : null}
      <label className="flex items-center gap-1 text-xs text-editorial-muted">
        <span className="hidden sm:inline">Tone</span>
        <select
          className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
          disabled={toolbarDisabled}
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value as "" | AssistToneOption;
            e.target.value = "";
            if (!v) return;
            onTone(v);
          }}
        >
          <option value="">Change tone…</option>
          <option value="formal">More formal</option>
          <option value="casual">More casual</option>
          <option value="dramatic">More dramatic</option>
        </select>
      </label>
      <div className="ml-auto flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={chatOpen}
          className={cn(
            "gap-1 text-editorial-muted hover:text-gold",
            chatOpen && "bg-gold/15 text-gold",
          )}
          title={
            chatOpen
              ? "Close story chat"
              : "Ask about this chapter, brainstorm, or @mention codex entries"
          }
          aria-label="Toggle story chat panel"
          onClick={onToggleChat}
        >
          <MessageSquareText className="h-4 w-4" aria-hidden />
          <span className="hidden lg:inline">Chat</span>
        </Button>
        <Button
          asChild
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1 text-editorial-muted hover:text-gold"
          title="Chapter version history"
        >
          <Link href={versionHistoryHref}>
            <History className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Version history</span>
          </Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!editor}
          aria-pressed={findOpen}
          className={cn(
            "gap-1 text-editorial-muted hover:text-gold",
            findOpen && "bg-gold/15 text-gold",
          )}
          title="Find and replace (Ctrl+F)"
          onClick={onToggleFind}
        >
          <Search className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Find</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={spellcheckOn}
          className={cn(
            "gap-1 text-editorial-muted hover:text-gold",
            spellcheckOn && "bg-gold/15 text-gold",
          )}
          title={`Spell check ${spellcheckOn ? "on" : "off"}`}
          onClick={onToggleSpellcheck}
        >
          <Type className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">
            Spell check {spellcheckOn ? "on" : "off"}
          </span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={typewriterMode}
          aria-label="Typewriter mode (keeps cursor centered)"
          className={cn(
            "gap-1 text-editorial-muted hover:text-gold",
            typewriterMode && "bg-gold/15 text-gold",
          )}
          title="Typewriter mode (keeps cursor centered)"
          onClick={onToggleTypewriter}
        >
          <AlignCenterVertical className="h-4 w-4" aria-hidden />
          <span className="hidden md:inline">Typewriter</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={focusMode}
          aria-label={`Distraction-free focus mode (${focusShortcut})`}
          className={cn(
            "gap-1 text-editorial-muted hover:text-gold",
            focusMode && "bg-gold/15 text-gold",
          )}
          title={
            focusMode
              ? `Exit focus mode (Esc)`
              : `Distraction-free focus mode (${focusShortcut})`
          }
          onClick={onToggleFocus}
        >
          <Maximize className="h-4 w-4" aria-hidden />
          <span className="hidden lg:inline">Focus mode</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={zenMode}
          className={cn(
            "gap-1 text-editorial-muted hover:text-gold",
            zenMode && "bg-gold/15 text-gold",
          )}
          title={zenMode ? "Exit zen mode (Esc)" : "Zen mode (hide sidebars)"}
          onClick={onToggleZen}
        >
          {zenMode ? (
            <Minimize2 className="h-4 w-4" aria-hidden />
          ) : (
            <Maximize2 className="h-4 w-4" aria-hidden />
          )}
          <span className="hidden lg:inline">{zenMode ? "Exit zen" : "Zen"}</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1 text-editorial-muted hover:text-gold"
          title="Keyboard shortcuts (?)"
          onClick={onShowCheatsheet}
        >
          <Keyboard className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
