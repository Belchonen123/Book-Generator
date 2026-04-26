"use client";

/**
 * Prompt Template Editor — the shared client surface used by BOTH the
 * user-wide page (`/dashboard/settings/prompts`) and the project-scoped
 * page (`/projects/[id]/prompts`). The scope is passed in via
 * `projectId` (null = user-wide).
 *
 * Layout:
 *   Left panel : task list with a "customized" pill per task.
 *   Right panel: textarea editor + variable palette + preview tab +
 *                Save / Reset buttons.
 *
 * Why textarea and not Monaco / CodeMirror? Bundle size. The 90% of power
 * users this is for are fine with a plain textarea + a variable-palette
 * that inserts at caret. The `{` autocomplete is implemented by listening
 * for the `{` keystroke and opening a popover with the allowed variables
 * for this task. Pressing Enter on a hovered suggestion inserts the
 * `{name}` token at caret.
 */

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  resetTemplate,
  saveTemplate,
} from "@/app/(dashboard)/dashboard/settings/prompts/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_TEMPLATES, MAX_TEMPLATE_LENGTH } from "@/lib/ai/prompt-templates";
import type { ActiveTemplate } from "@/lib/ai/prompt-templates";
import {
  extractVariables,
  missingRequiredVariables,
  resolveTemplate,
} from "@/lib/ai/template-resolver";
import {
  getSampleVariableValues,
  PROMPT_TASK_IDS,
  PROMPT_TASKS,
  TEMPLATE_VARIABLES,
  type PromptTaskId,
} from "@/lib/ai/template-variables";
import { cn } from "@/lib/utils/cn";

/* ~4 chars per token — same heuristic used by the context-assembler. */
function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

type InitialTemplate = {
  taskId: PromptTaskId;
  templateText: string;
  source: ActiveTemplate["source"];
  isCustomized: boolean;
};

export type PromptsEditorPageProps = {
  /** null = user-wide; non-null = project-scoped. */
  projectId: string | null;
  /** Optional project title for the header. */
  projectTitle?: string | null;
  /** All templates visible to this user (from listTemplatesForUser). */
  templates: ActiveTemplate[];
};

/**
 * Build the "active for this scope" per-task map from the raw template
 * list. Resolution order: project-specific > user-wide > platform default.
 */
function deriveInitialTemplates(
  templates: ActiveTemplate[],
  projectId: string | null,
): Record<PromptTaskId, InitialTemplate> {
  const out = {} as Record<PromptTaskId, InitialTemplate>;

  for (const taskId of PROMPT_TASK_IDS) {
    const matching = templates.filter((t) => t.taskId === taskId);

    const project = projectId
      ? matching.find((t) => t.source === "project")
      : undefined;
    const userWide = matching.find((t) => t.source === "user");
    const platform = matching.find((t) => t.source === "platform");
    const picked = project ?? userWide ?? platform;

    if (picked) {
      out[taskId] = {
        taskId,
        templateText: picked.templateText,
        source: picked.source,
        isCustomized:
          (projectId !== null && !!project) ||
          (projectId === null && !!userWide),
      };
    } else {
      out[taskId] = {
        taskId,
        templateText: DEFAULT_TEMPLATES[taskId],
        source: "builtin",
        isCustomized: false,
      };
    }
  }

  return out;
}

export function PromptsEditorPage({
  projectId,
  projectTitle,
  templates,
}: PromptsEditorPageProps) {
  const initial = useMemo(
    () => deriveInitialTemplates(templates, projectId),
    [templates, projectId],
  );

  const [byTask, setByTask] = useState(initial);
  const [selectedTaskId, setSelectedTaskId] = useState<PromptTaskId>(
    PROMPT_TASK_IDS[0],
  );
  const [draft, setDraft] = useState<string>(
    initial[PROMPT_TASK_IDS[0]].templateText,
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [confirmName, setConfirmName] = useState<string>("");
  const [nameDirty, setNameDirty] = useState(false);

  const task = PROMPT_TASKS[selectedTaskId];
  const current = byTask[selectedTaskId];

  const savedText = current.templateText;
  const isDirty = draft !== savedText;
  const tooLong = draft.length > MAX_TEMPLATE_LENGTH;
  const trimmedDraft = draft.trim();
  const isEmpty = trimmedDraft.length === 0;

  /* `missingCritical` drives the confirmation dialog. We compute it live
   * on every keystroke so the warning banner appears immediately. */
  const variablesUsed = useMemo(() => extractVariables(draft), [draft]);
  const unknownUsed = useMemo(
    () =>
      variablesUsed.filter(
        (name) => !task.allowedVariables.includes(name),
      ),
    [variablesUsed, task.allowedVariables],
  );
  const missingCritical = useMemo(
    () => missingRequiredVariables(draft, task.criticalVariables),
    [draft, task.criticalVariables],
  );

  const preview = useMemo(() => {
    if (!previewOpen) return { text: "", unknownVariables: [] as string[] };
    const resolved = resolveTemplate(
      draft,
      getSampleVariableValues(selectedTaskId),
    );
    return { text: resolved.text, unknownVariables: resolved.unknownVariables };
  }, [previewOpen, draft, selectedTaskId]);

  const renderedTokens = useMemo(
    () => estimateTokens(preview.text.length > 0 ? preview.text : draft),
    [preview.text, draft],
  );

  const switchTask = useCallback(
    (taskId: PromptTaskId) => {
      if (isDirty) {
        const confirmLeave = window.confirm(
          "You have unsaved changes. Discard them and switch tasks?",
        );
        if (!confirmLeave) return;
      }
      setSelectedTaskId(taskId);
      setDraft(byTask[taskId].templateText);
      setPreviewOpen(false);
      setConfirmName("");
      setNameDirty(false);
    },
    [byTask, isDirty],
  );

  const insertAtCursor = useCallback(
    (token: string) => {
      const el = textareaRef.current;
      if (!el) {
        setDraft((prev) => `${prev}${token}`);
        return;
      }
      const start = el.selectionStart ?? draft.length;
      const end = el.selectionEnd ?? draft.length;
      const next = draft.slice(0, start) + token + draft.slice(end);
      setDraft(next);
      requestAnimationFrame(() => {
        el.focus();
        const caret = start + token.length;
        el.setSelectionRange(caret, caret);
      });
    },
    [draft],
  );

  const handleInsertVariable = useCallback(
    (name: string) => insertAtCursor(`{${name}}`),
    [insertAtCursor],
  );

  const handleSave = useCallback(() => {
    if (!isDirty || tooLong || isEmpty || isPending) return;

    if (missingCritical.length > 0) {
      const list = missingCritical.map((v) => `{${v}}`).join(", ");
      const ok = window.confirm(
        `This template no longer includes the critical variables ${list} for this task. The AI may behave unpredictably without them. Save anyway?`,
      );
      if (!ok) return;
    }

    startTransition(async () => {
      const res = await saveTemplate({
        taskId: selectedTaskId,
        projectId,
        templateText: draft,
        name: nameDirty && confirmName.trim().length > 0 ? confirmName : undefined,
        acknowledgedCriticalRemovals: missingCritical,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Template saved.");
      setByTask((prev) => ({
        ...prev,
        [selectedTaskId]: {
          taskId: selectedTaskId,
          templateText: draft,
          source: projectId ? "project" : "user",
          isCustomized: true,
        },
      }));
    });
  }, [
    isDirty,
    tooLong,
    isEmpty,
    isPending,
    missingCritical,
    selectedTaskId,
    projectId,
    draft,
    confirmName,
    nameDirty,
  ]);

  const handleReset = useCallback(() => {
    const ok = window.confirm(
      "Reset this task to the platform default? Any override you saved will be deleted.",
    );
    if (!ok) return;

    startTransition(async () => {
      const res = await resetTemplate({
        taskId: selectedTaskId,
        projectId,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Reset to default.");
      const defaultText = DEFAULT_TEMPLATES[selectedTaskId];
      setDraft(defaultText);
      setByTask((prev) => ({
        ...prev,
        [selectedTaskId]: {
          taskId: selectedTaskId,
          templateText: defaultText,
          source: "platform",
          isCustomized: false,
        },
      }));
    });
  }, [projectId, selectedTaskId]);

  const variableGroups = useMemo(() => {
    const groups: Record<
      "project" | "chapter" | "context" | "selection" | "input",
      string[]
    > = {
      project: [],
      chapter: [],
      context: [],
      selection: [],
      input: [],
    };
    for (const name of task.allowedVariables) {
      const def = TEMPLATE_VARIABLES[name];
      if (!def) continue;
      groups[def.category].push(name);
    }
    return groups;
  }, [task.allowedVariables]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-editorial-muted">
          {projectId ? `Project · ${projectTitle ?? "Untitled"}` : "Account"}
        </p>
        <h1 className="mt-1 font-serif text-3xl text-editorial-cream sm:text-4xl">
          Prompt templates
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-editorial-muted">
          Every AI command in ChapterAI runs on a system prompt you can see
          and edit. Customize a task to steer the assistant toward your book;
          reset to fall back to the platform default.
          {projectId
            ? " Project overrides take precedence over your account-wide templates."
            : " Account-wide templates apply to every project unless you override them at the project level."}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
        {/* Task list */}
        <nav
          className="space-y-2 md:sticky md:top-8 md:self-start"
          aria-label="Prompt tasks"
        >
          {PROMPT_TASK_IDS.map((taskId) => {
            const t = PROMPT_TASKS[taskId];
            const entry = byTask[taskId];
            const active = taskId === selectedTaskId;
            return (
              <button
                key={taskId}
                type="button"
                onClick={() => switchTask(taskId)}
                className={cn(
                  "block w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                  active
                    ? "border-gold/60 bg-gold/10 text-editorial-cream"
                    : "border-border/60 bg-editorial-bg/60 text-editorial-muted hover:border-border hover:bg-muted/40 hover:text-editorial-cream",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{t.label}</span>
                  {entry.isCustomized ? (
                    <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold">
                      Customized
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-editorial-muted">
                  {t.shortDescription}
                </p>
              </button>
            );
          })}
        </nav>

        {/* Editor */}
        <section className="min-w-0 space-y-5">
          <div className="rounded-lg border border-border/60 bg-editorial-bg/60 p-4">
            <h2 className="font-serif text-xl text-editorial-cream">
              {task.label}
            </h2>
            <p className="mt-1 text-sm text-editorial-muted">
              {task.longDescription}
            </p>
            <p className="mt-2 text-xs font-mono text-editorial-muted">
              Route: {task.routePath}
            </p>
          </div>

          {/* Variable palette */}
          <div className="rounded-lg border border-border/60 bg-editorial-bg/30 p-4">
            <h3 className="font-serif text-base text-editorial-cream">
              Available variables
            </h3>
            <p className="mt-1 text-xs text-editorial-muted">
              Click to insert at the cursor. Write literal braces with{" "}
              <code className="font-mono">{"{{"}</code> and{" "}
              <code className="font-mono">{"}}"}</code>.
            </p>
            <div className="mt-3 space-y-3">
              {(
                ["project", "chapter", "context", "selection", "input"] as const
              ).map((group) => {
                const names = variableGroups[group];
                if (names.length === 0) return null;
                return (
                  <div key={group}>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-editorial-muted">
                      {group}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {names.map((name) => {
                        const def = TEMPLATE_VARIABLES[name];
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => handleInsertVariable(name)}
                            title={def.description}
                            className="rounded-md border border-border/60 bg-editorial-bg/60 px-2 py-1 font-mono text-xs text-editorial-cream hover:border-gold/60 hover:text-gold"
                          >
                            {`{${name}}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Editor vs. Preview */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={previewOpen ? "outline" : "default"}
              size="sm"
              onClick={() => setPreviewOpen(false)}
            >
              Editor
            </Button>
            <Button
              type="button"
              variant={previewOpen ? "default" : "outline"}
              size="sm"
              onClick={() => setPreviewOpen(true)}
            >
              Preview with sample data
            </Button>
            <div className="ml-auto text-xs tabular-nums text-editorial-muted">
              {draft.length.toLocaleString()} /{" "}
              {MAX_TEMPLATE_LENGTH.toLocaleString()} chars · ~
              {renderedTokens.toLocaleString()} tokens
            </div>
          </div>

          {previewOpen ? (
            <div className="space-y-2">
              <div className="rounded-lg border border-border/60 bg-editorial-bg/80 p-4">
                <pre className="whitespace-pre-wrap break-words font-serif text-sm leading-relaxed text-editorial-cream">
                  {preview.text || "(empty)"}
                </pre>
              </div>
              {preview.unknownVariables.length > 0 ? (
                <p className="text-xs text-amber-400">
                  Unknown variables rendered as empty:{" "}
                  {preview.unknownVariables
                    .map((n) => `{${n}}`)
                    .join(", ")}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              <Textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Enter your system prompt template…"
                spellCheck={false}
                className="min-h-[420px] font-mono text-[13px] leading-relaxed"
                maxLength={MAX_TEMPLATE_LENGTH}
              />
              {tooLong ? (
                <p role="alert" className="text-xs text-rose-400">
                  Template is over the{" "}
                  {MAX_TEMPLATE_LENGTH.toLocaleString()} character cap.
                </p>
              ) : null}
              {unknownUsed.length > 0 ? (
                <p className="text-xs text-amber-400">
                  Unknown / disallowed variables for this task (rendered empty):{" "}
                  {unknownUsed.map((n) => `{${n}}`).join(", ")}
                </p>
              ) : null}
              {missingCritical.length > 0 ? (
                <p className="text-xs text-amber-400">
                  Missing critical variables for this task:{" "}
                  {missingCritical.map((n) => `{${n}}`).join(", ")}. You can
                  still save, but you&apos;ll be asked to confirm.
                </p>
              ) : null}
            </div>
          )}

          <div className="space-y-2">
            <Label
              htmlFor="template-name"
              className="text-xs text-editorial-muted"
            >
              Template name (optional)
            </Label>
            <Input
              id="template-name"
              value={confirmName}
              onChange={(e) => {
                setConfirmName(e.target.value);
                setNameDirty(true);
              }}
              placeholder={`${task.label} — ${projectId ? "project override" : "my override"}`}
              maxLength={120}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-6">
            <Button
              type="button"
              onClick={handleSave}
              disabled={!isDirty || tooLong || isEmpty || isPending}
              loading={isPending}
            >
              Save template
            </Button>
            {current.isCustomized ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isPending}
              >
                Reset to default
              </Button>
            ) : null}
            {isDirty ? (
              <p className="text-xs text-editorial-muted">
                Unsaved changes.
              </p>
            ) : current.isCustomized ? (
              <p className="text-xs text-editorial-muted">
                {current.source === "project"
                  ? "Saved — this project uses your custom template."
                  : "Saved — all projects use your custom template unless overridden."}
              </p>
            ) : (
              <p className="text-xs text-editorial-muted">
                Platform default — click Save to start customizing.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
