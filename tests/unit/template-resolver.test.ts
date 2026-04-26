import { describe, expect, it, vi } from "vitest";

import {
  extractVariables,
  hasAllVariables,
  missingRequiredVariables,
  resolveTemplate,
  validateTemplate,
} from "@/lib/ai/template-resolver";

describe("resolveTemplate", () => {
  it("substitutes known variables", () => {
    const result = resolveTemplate(
      "Write a {project.genre} novel called {project.title}.",
      {
        "project.genre": "thriller",
        "project.title": "Split Tongue",
      },
    );
    expect(result.text).toBe("Write a thriller novel called Split Tongue.");
    expect(result.variablesUsed.sort()).toEqual([
      "project.genre",
      "project.title",
    ]);
    expect(result.unknownVariables).toEqual([]);
    expect(result.emptyVariables).toEqual([]);
  });

  it("renders unknown variables as empty strings and reports them", () => {
    const onUnknown = vi.fn();
    const result = resolveTemplate(
      "Hello {user.name}, from {unknown_var}.",
      { "user.name": "Ada" },
      { onUnknownVariable: onUnknown },
    );
    expect(result.text).toBe("Hello Ada, from .");
    expect(result.unknownVariables).toEqual(["unknown_var"]);
    expect(onUnknown).toHaveBeenCalledWith("unknown_var");
  });

  it("tracks known-but-empty variables", () => {
    const result = resolveTemplate("pov: {project.pov}", {
      "project.pov": "",
    });
    expect(result.text).toBe("pov: ");
    expect(result.variablesUsed).toEqual(["project.pov"]);
    expect(result.emptyVariables).toEqual(["project.pov"]);
  });

  it("escapes {{ and }} to literal braces and does NOT interpolate escaped tokens", () => {
    const result = resolveTemplate("Use {{syntax}} to mean {syntax}.", {
      syntax: "mustache",
    });
    expect(result.text).toBe("Use {syntax} to mean mustache.");
  });

  it("treats null and undefined values as empty", () => {
    const result = resolveTemplate("A={a};B={b}", {
      a: null,
      b: undefined,
    });
    expect(result.text).toBe("A=;B=");
    expect(result.emptyVariables.sort()).toEqual(["a", "b"]);
  });

  it("coerces numbers and booleans", () => {
    const result = resolveTemplate("n={n} flag={flag}", {
      n: 42,
      flag: false,
    });
    expect(result.text).toBe("n=42 flag=false");
  });

  it("joins array values with newlines and JSON-stringifies objects", () => {
    const result = resolveTemplate("arr={list} obj={obj}", {
      list: ["one", "two"],
      obj: { a: 1 },
    });
    expect(result.text).toBe('arr=one\ntwo obj={"a":1}');
  });

  it("ignores malformed tokens without throwing", () => {
    const result = resolveTemplate("hi { bad name } ok", {});
    expect(result.text).toBe("hi { bad name } ok");
    expect(result.unknownVariables).toEqual([]);
  });

  it("returns an empty result for non-string input", () => {
    const result = resolveTemplate(
      undefined as unknown as string,
      {},
    );
    expect(result.text).toBe("");
    expect(result.variablesUsed).toEqual([]);
  });

  it("warns on empty only when warnOnEmpty is true", () => {
    const onUnknown = vi.fn();
    resolveTemplate(
      "pov: {project.pov}",
      { "project.pov": "" },
      { onUnknownVariable: onUnknown, warnOnEmpty: true },
    );
    expect(onUnknown).toHaveBeenCalledWith("project.pov");
  });
});

describe("validateTemplate", () => {
  it("returns per-variable usage with allowed flag", () => {
    const usage = validateTemplate(
      "Hello {project.title}. Use {selection} here. {project.title}",
      ["project.title", "selection"],
    );

    const title = usage.find((u) => u.variable === "project.title");
    const selection = usage.find((u) => u.variable === "selection");
    expect(title).toMatchObject({ count: 2, valid: true, allowed: true });
    expect(selection).toMatchObject({ count: 1, valid: true, allowed: true });
  });

  it("flags disallowed but syntactically valid variables", () => {
    const usage = validateTemplate("{project.title} {codex}", ["project.title"]);
    const codex = usage.find((u) => u.variable === "codex");
    expect(codex).toMatchObject({ valid: true, allowed: false });
  });

  it("ignores escaped braces", () => {
    const usage = validateTemplate("{{not_a_var}} {real_var}", ["real_var"]);
    expect(usage.map((u) => u.variable)).toEqual(["real_var"]);
  });

  it("returns empty for empty input", () => {
    expect(validateTemplate("", ["x"])).toEqual([]);
  });
});

describe("extractVariables / hasAllVariables / missingRequiredVariables", () => {
  const template = "{project.title} and {selection} with {preceding_context}";

  it("extractVariables returns the set of valid names", () => {
    expect(extractVariables(template).sort()).toEqual([
      "preceding_context",
      "project.title",
      "selection",
    ]);
  });

  it("hasAllVariables is true when the template contains all required names", () => {
    expect(hasAllVariables(template, ["selection"])).toBe(true);
    expect(
      hasAllVariables(template, ["selection", "project.title"]),
    ).toBe(true);
    expect(hasAllVariables(template, [])).toBe(true);
  });

  it("hasAllVariables is false when any required name is missing", () => {
    expect(hasAllVariables(template, ["selection", "codex"])).toBe(false);
  });

  it("missingRequiredVariables returns only the missing names", () => {
    expect(
      missingRequiredVariables(template, [
        "selection",
        "codex",
        "following_context",
      ]).sort(),
    ).toEqual(["codex", "following_context"]);
  });
});
