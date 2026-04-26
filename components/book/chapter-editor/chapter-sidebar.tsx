"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

import { Button } from "@/components/ui/button";
import { BookOpen, Check, ChevronLeft, ChevronRight, GripVertical, Loader2, Pencil, X } from "@/lib/lucide-icons";
import { cn } from "@/lib/utils/cn";
import type { ChapterStatusDb } from "@/types/database.types";

import type { ChapterListItem } from "./types";

const MAX_BOOK_TITLE_LEN = 160;
const MAX_SUBTITLE_LEN = 240;
const MAX_CHAPTER_TITLE_LEN = 160;

const SIDEBAR_COLLAPSED_KEY = "chapterai.chapter-sidebar-collapsed";

function StatusDot({ status }: { status: ChapterStatusDb }) {
  if (status === "generating") {
    return <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-gold" aria-hidden />;
  }
  const color =
    status === "pending"
      ? "bg-editorial-muted"
      : status === "draft"
        ? "bg-sky-400"
        : "bg-emerald-400";
  return <span className={cn("h-2 w-2 shrink-0 rounded-full", color)} aria-hidden />;
}

export type ChapterSidebarProps = {
  bookId: string;
  bookTitle: string;
  bookSubtitle: string;
  chapterId: string;
  sortedChapters: ChapterListItem[];
  totalWords: number;
  batchBusy: boolean;
  isGenerating: boolean;
  aiBusy: boolean;
  /** Chapters still in `pending` or `generating` status. Zero means nothing to do. */
  remainingCount: number;
  /** Localized bulk-generate button label (varies by remainingCount). */
  bulkGenerateLabel: string;
  onBookTitleChange: (next: string) => void;
  onBookTitleCommit: () => void;
  onBookSubtitleChange: (next: string) => void;
  onBookSubtitleCommit: () => void;
  onRenameChapter: (chapterId: string, nextTitle: string) => Promise<boolean>;
  onGenerateAll: () => void;
  /**
   * Pro: drag on the grip to reorder. Emits the full new id list (stable order)
   * so the parent can call `reorderChaptersAction`.
   */
  onChaptersReordered?: (orderedIds: string[], detail: { activeId: string; newIndex: number }) => void;
  /** When true, the chapter list is sortable (grip + DnD). */
  reorderEnabled: boolean;
};

/**
 * Chapter title row in the sidebar.
 *
 * Default mode renders a navigation <Link>; hovering reveals a pencil that
 * swaps the row into an input (still inside the <li>, without the link) so the
 * author can rename without navigating. Enter/blur saves; Escape reverts.
 */
function SidebarChapterRow({
  item,
  active,
  href,
  onRename,
}: {
  item: ChapterListItem;
  active: boolean;
  href: string;
  onRename: (chapterId: string, nextTitle: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.title);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editing) setDraft(item.title);
  }, [editing, item.title]);

  useEffect(() => {
    if (editing) {
      const el = inputRef.current;
      el?.focus();
      el?.select();
    }
  }, [editing]);

  const startEdit = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraft(item.title);
    setEditing(true);
  };

  const cancel = () => {
    setDraft(item.title);
    setEditing(false);
  };

  const commit = async () => {
    if (saving) return;
    const next = draft.trim();
    if (!next || next === item.title) {
      cancel();
      return;
    }
    setSaving(true);
    const ok = await onRename(item.id, next);
    setSaving(false);
    if (ok) {
      setEditing(false);
    } else {
      setDraft(item.title);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    // If focus is moving to the confirm/cancel button we let those handle it.
    const next = e.relatedTarget as HTMLElement | null;
    if (next?.dataset.sidebarEditAction) return;
    void commit();
  };

  if (editing) {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm",
          active ? "bg-gold/15" : "bg-muted/20",
        )}
      >
        <StatusDot status={item.status} />
        <span className="shrink-0 text-gold/80">{item.chapter_number}.</span>
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_CHAPTER_TITLE_LEN))}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={saving}
          maxLength={MAX_CHAPTER_TITLE_LEN}
          className="min-w-0 flex-1 rounded bg-editorial-bg/60 px-1.5 py-0.5 text-sm text-editorial-cream outline-none ring-1 ring-gold/40 focus:ring-2 focus:ring-gold/60"
        />
        <button
          type="button"
          data-sidebar-edit-action="save"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => void commit()}
          disabled={saving}
          className="shrink-0 rounded p-1 text-emerald-400 hover:bg-emerald-400/10 disabled:opacity-50"
          aria-label="Save chapter name"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Check className="h-3.5 w-3.5" aria-hidden />
          )}
        </button>
        <button
          type="button"
          data-sidebar-edit-action="cancel"
          onMouseDown={(e) => e.preventDefault()}
          onClick={cancel}
          disabled={saving}
          className="shrink-0 rounded p-1 text-editorial-muted hover:bg-muted/30 hover:text-editorial-cream disabled:opacity-50"
          aria-label="Cancel rename"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div className="group relative">
      <Link
        href={href}
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-2 pr-8 text-sm transition-colors",
          active
            ? "bg-gold/15 text-editorial-cream"
            : "text-editorial-muted hover:bg-muted/30 hover:text-editorial-cream",
        )}
      >
        <StatusDot status={item.status} />
        <span className="min-w-0 flex-1 truncate">
          <span className="text-gold/80">{item.chapter_number}.</span> {item.title}
        </span>
      </Link>
      <button
        type="button"
        onClick={startEdit}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-editorial-muted opacity-0 transition hover:bg-muted/40 hover:text-editorial-cream focus:opacity-100 focus:outline-none group-hover:opacity-100"
        aria-label={`Rename chapter ${item.chapter_number}`}
        title="Rename chapter"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}

function SortableRowShell({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled: boolean;
  children: (dragHandle: ReactNode) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const handle = (
    <button
      type="button"
      className="mt-0.5 shrink-0 touch-none rounded p-0.5 text-editorial-muted hover:bg-muted/30 hover:text-gold"
      title="Drag to reorder"
      aria-label="Drag to reorder chapter"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" aria-hidden />
    </button>
  );
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn("list-none", isDragging && "z-[5] opacity-80")}
    >
      {children(handle)}
    </li>
  );
}

export function ChapterSidebar({
  bookId,
  bookTitle,
  bookSubtitle,
  chapterId,
  sortedChapters,
  totalWords,
  batchBusy,
  isGenerating,
  aiBusy,
  remainingCount,
  bulkGenerateLabel,
  onBookTitleChange,
  onBookTitleCommit,
  onBookSubtitleChange,
  onBookSubtitleCommit,
  onRenameChapter,
  onGenerateAll,
  onChaptersReordered,
  reorderEnabled = false,
}: ChapterSidebarProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      if (localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1") {
        setSidebarCollapsed(true);
      }
    } catch {
      /* storage unavailable */
    }
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
        }
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const busy = isGenerating || aiBusy;
  const bulkDisabled = batchBusy || isGenerating || aiBusy || remainingCount === 0;
  const bulkHelper =
    remainingCount === 0
      ? "All chapters have content. Use Regenerate on any chapter to rewrite it."
      : "Skips chapters you've already written. Use Regenerate on a chapter for a rewrite.";

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 6 } });
  const keyboardSensor = useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates });
  const sensors = useSensors(pointerSensor, keyboardSensor);
  const sortableIds = sortedChapters.map((c) => c.id);
  const canSort = Boolean(reorderEnabled && sortedChapters.length > 1);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !onChaptersReordered) return;
      const oldIndex = sortedChapters.findIndex((c) => c.id === active.id);
      const newIndex = sortedChapters.findIndex((c) => c.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;
      const next = arrayMove(sortedChapters, oldIndex, newIndex);
      const orderedIds = next.map((c) => c.id);
      onChaptersReordered(orderedIds, { activeId: String(active.id), newIndex });
    },
    [onChaptersReordered, sortedChapters],
  );

  const chapterList = canSort ? (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
        <ul className="space-y-1">
          {sortedChapters.map((c) => (
            <SortableRowShell key={c.id} id={c.id} disabled={busy}>
              {(dragHandle) => (
                <div className="flex items-start gap-0.5">
                  {dragHandle}
                  <div className="min-w-0 flex-1">
                    <SidebarChapterRow
                      item={c}
                      active={c.id === chapterId}
                      href={`/projects/${bookId}/chapters/${c.id}`}
                      onRename={onRenameChapter}
                    />
                  </div>
                </div>
              )}
            </SortableRowShell>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  ) : (
    <ul className="space-y-1">
      {sortedChapters.map((c) => (
        <li key={c.id} className="list-none">
          <SidebarChapterRow
            item={c}
            active={c.id === chapterId}
            href={`/projects/${bookId}/chapters/${c.id}`}
            onRename={onRenameChapter}
          />
        </li>
      ))}
    </ul>
  );

  if (sidebarCollapsed) {
    return (
      <aside
        className="flex w-12 shrink-0 flex-col border-r border-border/70 bg-card/40"
        aria-label="Chapter list (collapsed)"
      >
        <div className="flex flex-1 flex-col items-center gap-2 border-b border-border/60 py-2">
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            className="rounded-md p-2 text-gold/90 transition hover:bg-gold/10 hover:text-gold"
            aria-expanded={false}
            aria-label="Expand chapter list"
            title={`Show chapter list (${totalWords.toLocaleString()} words in book)`}
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
          <span
            className="mt-0.5 select-none text-center font-serif text-[10px] font-medium leading-tight text-editorial-muted/90"
            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
            aria-hidden
          >
            Chapters
          </span>
        </div>
        <div className="mt-auto border-t border-border/60 py-2">
          <Button
            asChild
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-gold hover:bg-gold/10"
            title="Export book"
          >
            <Link href={`/projects/${bookId}/export`} aria-label="Export book">
              <BookOpen className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="flex w-[280px] shrink-0 flex-col border-r border-border/70 bg-card/40 transition-[width] duration-200 ease-out"
      aria-label="Chapter list and book tools"
    >
      <div className="flex items-start gap-0.5 border-b border-border/60 pl-1 pr-3 pt-2">
        <button
          type="button"
          onClick={toggleSidebarCollapsed}
          className="mt-1.5 shrink-0 rounded-md p-1.5 text-editorial-muted transition hover:bg-muted/30 hover:text-gold"
          aria-expanded
          aria-label="Collapse chapter list"
          title="Hide sidebar"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <div className="min-w-0 flex-1 px-1 pb-3 pt-0.5">
        <label className="sr-only" htmlFor="sidebar-book-title">
          Book title
        </label>
        <input
          id="sidebar-book-title"
          type="text"
          value={bookTitle}
          onChange={(e) => onBookTitleChange(e.target.value.slice(0, MAX_BOOK_TITLE_LEN))}
          onBlur={onBookTitleCommit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
          disabled={busy}
          maxLength={MAX_BOOK_TITLE_LEN}
          placeholder="Book title"
          title="Click to edit the book title"
          className="w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 font-serif text-lg leading-snug text-gold outline-none transition placeholder:text-editorial-muted hover:border-border/60 hover:bg-editorial-bg/40 focus:border-gold/50 focus:bg-editorial-bg/60 focus:ring-0 disabled:opacity-60"
        />
        <label className="sr-only" htmlFor="sidebar-book-subtitle">
          Book subtitle
        </label>
        <input
          id="sidebar-book-subtitle"
          type="text"
          value={bookSubtitle}
          onChange={(e) => onBookSubtitleChange(e.target.value.slice(0, MAX_SUBTITLE_LEN))}
          onBlur={onBookSubtitleCommit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
          disabled={busy}
          maxLength={MAX_SUBTITLE_LEN}
          placeholder="Add subtitle…"
          title="Click to edit the book subtitle"
          className="mt-1 w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-xs italic leading-snug text-editorial-muted outline-none transition placeholder:text-editorial-muted/60 hover:border-border/60 hover:bg-editorial-bg/40 focus:border-gold/50 focus:bg-editorial-bg/60 focus:not-italic focus:text-editorial-cream focus:ring-0 disabled:opacity-60"
        />
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {reorderEnabled && !canSort ? (
          <p className="px-1 text-[11px] text-editorial-muted">Add another chapter to enable reordering.</p>
        ) : null}
        {chapterList}
        {!reorderEnabled ? (
          <p className="mt-2 px-1 text-[11px] text-editorial-muted/90">
            Pro: drag chapters in the list to change order and fix transition rewrites.
          </p>
        ) : null}
      </nav>
      <div className="border-t border-border/60 px-4 py-3 text-xs text-editorial-muted">
        Book total:{" "}
        <span className="font-medium text-editorial-cream">
          {totalWords.toLocaleString()} words
        </span>
      </div>
      <div className="space-y-2 border-t border-border/60 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-editorial-muted">
          Bulk write
        </p>
        <Button
          type="button"
          className="w-full border-gold/40 bg-transparent text-gold hover:bg-gold/10"
          variant="outline"
          disabled={bulkDisabled}
          onClick={onGenerateAll}
        >
          {batchBusy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Generating…
            </>
          ) : (
            bulkGenerateLabel
          )}
        </Button>
        <p className="text-[11px] leading-snug text-editorial-muted">{bulkHelper}</p>
      </div>
      <div className="p-3 pt-0">
        <Button
          asChild
          className="w-full bg-gold text-editorial-bg hover:bg-gold/90"
          variant="default"
        >
          <Link href={`/projects/${bookId}/export`}>Export book</Link>
        </Button>
      </div>
    </aside>
  );
}
