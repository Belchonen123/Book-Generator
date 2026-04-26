import type { Metadata } from "next";
import Link from "next/link";

import {
  PROMPT_TASK_IDS,
  PROMPT_TASKS,
  TEMPLATE_VARIABLES,
} from "@/lib/ai/template-variables";

export const metadata: Metadata = {
  title: "Prompt template variables",
};

/**
 * Reference doc listing every task and the variables it exposes to the
 * template. Deliberately a server component — no interaction, just
 * documentation. Links back to the editor for each task.
 */
export default function PromptTemplateVariablesDocsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-editorial-muted">
          Reference
        </p>
        <h1 className="mt-1 font-serif text-3xl text-editorial-cream sm:text-4xl">
          Prompt template variables
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-editorial-muted">
          Every AI task in ChapterAI exposes a set of variables to its system
          prompt. Write them inside curly braces — e.g.{" "}
          <code className="font-mono">{"{project.title}"}</code>. Unknown
          variables render empty and are logged. Write literal braces with{" "}
          <code className="font-mono">{"{{"}</code> and{" "}
          <code className="font-mono">{"}}"}</code>.
        </p>
        <p className="mt-3 text-sm">
          <Link
            href="/dashboard/settings/prompts"
            className="text-gold underline-offset-2 hover:underline"
          >
            Back to the template editor →
          </Link>
        </p>
      </header>

      <div className="space-y-8">
        {PROMPT_TASK_IDS.map((taskId) => {
          const task = PROMPT_TASKS[taskId];
          return (
            <section
              key={taskId}
              className="rounded-lg border border-border/60 bg-editorial-bg/50 p-5"
            >
              <h2 className="font-serif text-xl text-editorial-cream">
                {task.label}
              </h2>
              <p className="mt-1 text-sm text-editorial-muted">
                {task.longDescription}
              </p>
              <p className="mt-2 font-mono text-xs text-editorial-muted">
                Task id: {task.id} · Route: {task.routePath}
              </p>

              <div className="mt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-editorial-muted">
                  Variables
                </h3>
                <ul className="mt-2 divide-y divide-border/40">
                  {task.allowedVariables.map((name) => {
                    const def = TEMPLATE_VARIABLES[name];
                    const critical = task.criticalVariables.includes(name);
                    return (
                      <li
                        key={name}
                        className="flex flex-col gap-1 py-2 sm:flex-row sm:items-baseline sm:gap-4"
                      >
                        <div className="flex items-center gap-2 sm:w-56 sm:shrink-0">
                          <code className="font-mono text-sm text-editorial-cream">{`{${name}}`}</code>
                          {critical ? (
                            <span className="rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-300">
                              Critical
                            </span>
                          ) : null}
                        </div>
                        <div className="text-sm text-editorial-muted">
                          <p>
                            <span className="text-editorial-cream">
                              {def?.label ?? name}
                            </span>
                            {def?.description ? ` — ${def.description}` : null}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {task.criticalVariables.length > 0 ? (
                <p className="mt-4 text-xs text-editorial-muted">
                  Critical variables are expected by the downstream AI. Removing
                  them is allowed but the editor will ask you to confirm the
                  save.
                </p>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
