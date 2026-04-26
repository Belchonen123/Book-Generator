import { describe, expect, it } from "vitest";

import { pickActiveTemplate } from "@/lib/ai/prompt-templates";
import {
  getAllowedVariables,
  getSampleVariableValues,
  isKnownTaskId,
  isVariableAllowed,
  PROMPT_TASK_IDS,
  TEMPLATE_VARIABLES,
} from "@/lib/ai/template-variables";

type Row = {
  id: string;
  user_id: string | null;
  project_id: string | null;
  task_id: string;
  name: string;
  template_text: string;
  is_default: boolean;
};

function row(overrides: Partial<Row>): Row {
  return {
    id: overrides.id ?? "row",
    user_id: overrides.user_id ?? null,
    project_id: overrides.project_id ?? null,
    task_id: overrides.task_id ?? "chapter-gen",
    name: overrides.name ?? "n",
    template_text: overrides.template_text ?? "t",
    is_default: overrides.is_default ?? false,
  };
}

describe("pickActiveTemplate resolution order", () => {
  const userId = "user-1";
  const projectId = "proj-1";
  const taskId = "chapter-gen" as const;

  it("prefers project-scoped override over user-wide and platform default", () => {
    const rows: Row[] = [
      row({
        id: "platform",
        user_id: null,
        project_id: null,
        task_id: taskId,
        is_default: true,
        template_text: "PLATFORM",
      }),
      row({
        id: "user",
        user_id: userId,
        project_id: null,
        task_id: taskId,
        template_text: "USER",
      }),
      row({
        id: "project",
        user_id: userId,
        project_id: projectId,
        task_id: taskId,
        template_text: "PROJECT",
      }),
    ];
    const picked = pickActiveTemplate(rows, userId, projectId, taskId);
    expect(picked?.source).toBe("project");
    expect(picked?.templateText).toBe("PROJECT");
  });

  it("falls back to user-wide when no project override exists", () => {
    const rows: Row[] = [
      row({
        id: "platform",
        user_id: null,
        task_id: taskId,
        is_default: true,
        template_text: "PLATFORM",
      }),
      row({
        id: "user",
        user_id: userId,
        project_id: null,
        task_id: taskId,
        template_text: "USER",
      }),
    ];
    const picked = pickActiveTemplate(rows, userId, projectId, taskId);
    expect(picked?.source).toBe("user");
    expect(picked?.templateText).toBe("USER");
  });

  it("falls back to platform default when no user override exists", () => {
    const rows: Row[] = [
      row({
        id: "platform",
        user_id: null,
        task_id: taskId,
        is_default: true,
        template_text: "PLATFORM",
      }),
    ];
    const picked = pickActiveTemplate(rows, userId, projectId, taskId);
    expect(picked?.source).toBe("platform");
    expect(picked?.isDefault).toBe(true);
  });

  it("ignores another user's overrides", () => {
    const rows: Row[] = [
      row({
        id: "platform",
        user_id: null,
        task_id: taskId,
        is_default: true,
        template_text: "PLATFORM",
      }),
      row({
        id: "other",
        user_id: "other-user",
        project_id: null,
        task_id: taskId,
        template_text: "LEAKED",
      }),
    ];
    const picked = pickActiveTemplate(rows, userId, projectId, taskId);
    expect(picked?.source).toBe("platform");
  });

  it("ignores rows for other tasks", () => {
    const rows: Row[] = [
      row({
        id: "platform-other",
        user_id: null,
        task_id: "generate-outline",
        is_default: true,
        template_text: "OTHER",
      }),
    ];
    expect(pickActiveTemplate(rows, userId, projectId, taskId)).toBeNull();
  });

  it("returns null when no rows match", () => {
    expect(pickActiveTemplate([], userId, projectId, taskId)).toBeNull();
  });
});

describe("template-variables registry", () => {
  it("exposes every documented task", () => {
    for (const id of PROMPT_TASK_IDS) {
      expect(isKnownTaskId(id)).toBe(true);
    }
    expect(isKnownTaskId("nope")).toBe(false);
  });

  it("every allowed variable has a matching TEMPLATE_VARIABLES entry", () => {
    for (const taskId of PROMPT_TASK_IDS) {
      for (const name of getAllowedVariables(taskId)) {
        expect(
          TEMPLATE_VARIABLES[name],
          `${taskId} lists ${name} but it's not in TEMPLATE_VARIABLES`,
        ).toBeDefined();
      }
    }
  });

  it("isVariableAllowed respects task allowlists", () => {
    expect(isVariableAllowed("inline-command", "selection")).toBe(true);
    expect(isVariableAllowed("generate-outline", "selection")).toBe(false);
  });

  it("getSampleVariableValues returns a sample for every allowed variable", () => {
    const samples = getSampleVariableValues("inline-command");
    expect(Object.keys(samples)).toEqual(
      expect.arrayContaining(["selection", "user_instruction"]),
    );
    for (const value of Object.values(samples)) {
      expect(typeof value).toBe("string");
    }
  });
});
