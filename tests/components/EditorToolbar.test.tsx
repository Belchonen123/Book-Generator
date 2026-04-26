import { fireEvent, render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  EditorToolbar,
  type ToolbarProps,
} from "@/components/book/chapter-editor/toolbar";

vi.mock("next/link", () => {
  function MockLink(
    props: PropsWithChildren<
      { href: string; prefetch?: boolean } & AnchorHTMLAttributes<HTMLAnchorElement>
    >,
  ) {
    const { children, href, prefetch: _prefetch, ...rest } = props;
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }
  return { default: MockLink };
});

function createEditorMock() {
  const chainOps = {
    focus: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    setParagraph: vi.fn(),
    setHeading: vi.fn(),
    toggleBold: vi.fn(),
    toggleItalic: vi.fn(),
    toggleUnderline: vi.fn(),
    toggleStrike: vi.fn(),
    toggleCode: vi.fn(),
    toggleBulletList: vi.fn(),
    toggleOrderedList: vi.fn(),
    toggleBlockquote: vi.fn(),
    toggleCodeBlock: vi.fn(),
    setHorizontalRule: vi.fn(),
    run: vi.fn(),
  };
  chainOps.focus.mockReturnValue(chainOps);
  chainOps.undo.mockReturnValue(chainOps);
  chainOps.redo.mockReturnValue(chainOps);
  chainOps.setParagraph.mockReturnValue(chainOps);
  chainOps.setHeading.mockReturnValue(chainOps);
  chainOps.toggleBold.mockReturnValue(chainOps);
  chainOps.toggleItalic.mockReturnValue(chainOps);
  chainOps.toggleUnderline.mockReturnValue(chainOps);
  chainOps.toggleStrike.mockReturnValue(chainOps);
  chainOps.toggleCode.mockReturnValue(chainOps);
  chainOps.toggleBulletList.mockReturnValue(chainOps);
  chainOps.toggleOrderedList.mockReturnValue(chainOps);
  chainOps.toggleBlockquote.mockReturnValue(chainOps);
  chainOps.toggleCodeBlock.mockReturnValue(chainOps);
  chainOps.setHorizontalRule.mockReturnValue(chainOps);

  const editor = {
    can: () => ({
      undo: () => true,
      redo: () => true,
    }),
    isActive: () => false,
    chain: () => chainOps,
  };
  return { editor, chainOps };
}

function createProps(): ToolbarProps {
  const { editor } = createEditorMock();
  return {
    editor: editor as ToolbarProps["editor"],
    toolbarDisabled: false,
    aiBusy: false,
    findOpen: false,
    spellcheckOn: false,
    zenMode: false,
    focusMode: false,
    typewriterMode: false,
    expandPromptOpen: false,
    rewritePromptOpen: false,
    versionHistoryHref: "/projects/abc/revisions",
    isMacPlatform: false,
    onRegenerate: vi.fn(),
    onOpenExpand: vi.fn(),
    onOpenRewrite: vi.fn(),
    onShorten: vi.fn(),
    onProofread: vi.fn(),
    onCheckSlop: vi.fn(),
    onDeepSlopScan: vi.fn(),
    slopScanBusy: false,
    deepSlopBusy: false,
    onContinue: vi.fn(),
    onTone: vi.fn(),
    onToggleFind: vi.fn(),
    onToggleSpellcheck: vi.fn(),
    onToggleZen: vi.fn(),
    onToggleFocus: vi.fn(),
    onToggleTypewriter: vi.fn(),
    onShowCheatsheet: vi.fn(),
    onOpenLink: vi.fn(),
    bookTypeFiction: true,
    isPro: true,
    onOpenVoiceMemo: vi.fn(),
    chapterReadyForConsistency: true,
    consistencyLoading: false,
    onCheckConsistency: vi.fn(),
    chatOpen: false,
    onToggleChat: vi.fn(),
    generationRunning: true,
    onStopGeneration: vi.fn(),
    codexEntryOptions: [
      { id: "11111111-1111-4111-8111-111111111111", name: "Aharon", entryType: "character" },
    ],
    forcedCodexEntryIds: [],
    onToggleForcedCodexEntry: vi.fn(),
    onClearForcedCodexEntries: vi.fn(),
  };
}

describe("EditorToolbar", () => {
  it("wires top-level toolbar actions", () => {
    const props = createProps();
    render(<EditorToolbar {...props} />);

    fireEvent.click(screen.getByRole("button", { name: /regenerate/i }));
    const stopButton = screen.getByRole("button", {
      name: /stop chapter generation/i,
    });
    expect((stopButton as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(stopButton);
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("button", { name: /voice memo to chapter/i }));
    fireEvent.click(screen.getByRole("button", { name: /check consistency/i }));
    fireEvent.click(screen.getByRole("button", { name: /toggle story chat panel/i }));
    fireEvent.click(screen.getByRole("button", { name: /^find$/i }));
    fireEvent.click(screen.getByRole("button", { name: /spell check off/i }));
    fireEvent.click(screen.getByRole("button", { name: /typewriter mode/i }));
    fireEvent.click(screen.getByRole("button", { name: /distraction-free focus mode/i }));

    expect(props.onRegenerate).toHaveBeenCalledTimes(1);
    expect(props.onStopGeneration).toHaveBeenCalledTimes(1);
    expect(props.onContinue).toHaveBeenCalledTimes(1);
    expect(props.onOpenVoiceMemo).toHaveBeenCalledTimes(1);
    expect(props.onCheckConsistency).toHaveBeenCalledTimes(1);
    expect(props.onToggleChat).toHaveBeenCalledTimes(1);
    expect(props.onToggleFind).toHaveBeenCalledTimes(1);
    expect(props.onToggleSpellcheck).toHaveBeenCalledTimes(1);
    expect(props.onToggleTypewriter).toHaveBeenCalledTimes(1);
    expect(props.onToggleFocus).toHaveBeenCalledTimes(1);
  });

  it("wires codex include interactions", () => {
    const props = {
      ...createProps(),
      forcedCodexEntryIds: ["11111111-1111-4111-8111-111111111111"],
    };
    render(<EditorToolbar {...props} />);

    fireEvent.click(screen.getByRole("button", { name: /codex include/i }));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /clear/i }));
    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    expect(props.onToggleForcedCodexEntry).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
    );
    expect(props.onClearForcedCodexEntries).toHaveBeenCalledTimes(1);
  });

  it("executes formatting commands through editor chain", () => {
    const { editor, chainOps } = createEditorMock();
    const props = { ...createProps(), editor: editor as ToolbarProps["editor"] };
    render(<EditorToolbar {...props} />);

    fireEvent.change(screen.getByLabelText(/paragraph or heading level/i), {
      target: { value: "h2" },
    });
    fireEvent.click(screen.getByRole("button", { name: /bold/i }));
    fireEvent.click(screen.getByRole("button", { name: /italic/i }));
    fireEvent.click(screen.getByRole("button", { name: /underline/i }));
    fireEvent.click(screen.getByRole("button", { name: /strikethrough/i }));
    fireEvent.click(screen.getByRole("button", { name: /inline code/i }));
    fireEvent.click(screen.getByRole("button", { name: /bulleted list/i }));
    fireEvent.click(screen.getByRole("button", { name: /numbered list/i }));
    fireEvent.click(screen.getByRole("button", { name: /blockquote/i }));
    fireEvent.click(screen.getByRole("button", { name: /code block/i }));
    fireEvent.click(screen.getByRole("button", { name: /scene break/i }));
    fireEvent.click(screen.getByRole("button", { name: /add \/ edit link/i }));

    expect(chainOps.setHeading).toHaveBeenCalledWith({ level: 2 });
    expect(chainOps.toggleBold).toHaveBeenCalled();
    expect(chainOps.toggleItalic).toHaveBeenCalled();
    expect(chainOps.toggleUnderline).toHaveBeenCalled();
    expect(chainOps.toggleStrike).toHaveBeenCalled();
    expect(chainOps.toggleCode).toHaveBeenCalled();
    expect(chainOps.toggleBulletList).toHaveBeenCalled();
    expect(chainOps.toggleOrderedList).toHaveBeenCalled();
    expect(chainOps.toggleBlockquote).toHaveBeenCalled();
    expect(chainOps.toggleCodeBlock).toHaveBeenCalled();
    expect(chainOps.setHorizontalRule).toHaveBeenCalled();
    expect(props.onOpenLink).toHaveBeenCalledTimes(1);
  });
});
