/**
 * Mustache-lite template resolver for the Prompt Template Editor.
 *
 * The language is deliberately tiny:
 *   - `{variable}` — replaced with the matching value (string-coerced).
 *   - `{{` / `}}` — literal braces. Escape sequence applied only outside
 *     variable bodies, so `{{foo}}` in a template renders as `{foo}`.
 *   - Unknown variables render to an empty string and are logged so the
 *     editor can surface "warning: unknown variable" without failing the
 *     generation at runtime.
 *   - Variable names may contain letters, digits, `_`, `.`, `-`.
 *
 * Explicitly NOT supported:
 *   - Conditionals (`{#if}`)
 *   - Loops (`{#each}`)
 *   - Nested / computed lookups (`{project[field]}`)
 *   - Helper functions (`{upper title}`)
 *
 * This narrow surface keeps user-editable templates safe to execute
 * server-side: there is no parser that could be tricked into running
 * arbitrary code, and the output is always a string. If power users ask
 * for more, the resolver can be versioned via an `engine` column on the
 * templates table before conditionals / loops land.
 */

const VARIABLE_NAME_RE = /^[A-Za-z0-9_.\-]+$/;
const VARIABLE_TOKEN_RE = /\{([A-Za-z0-9_.\-]+)\}/g;

/** Match `{{` and `}}` (escape sequences) in a single pass. */
const ESCAPED_BRACE_RE = /\{\{|\}\}/g;

/** Sentinel characters that won't appear in prose. Used during the
 *  two-pass render to temporarily stand in for `{{` / `}}` so the
 *  variable-token pass can't see them. */
const LEFT_ESCAPE_SENTINEL = "\u0000__LB__\u0000";
const RIGHT_ESCAPE_SENTINEL = "\u0000__RB__\u0000";

/* ------------------------------------------------------------------ */
/*   Types                                                            */
/* ------------------------------------------------------------------ */

export type ResolveTemplateOptions = {
  /**
   * Called for every `{unknown}` token. Default writes a console.warn so
   * the server logs show it; the editor UI overrides this to collect
   * warnings per-render.
   */
  onUnknownVariable?: (name: string) => void;
  /**
   * When a variable IS known but its value is `undefined` or `null`
   * (common for optional fields like `chapter.beat`), the resolver
   * treats it as empty by default. Pass `true` to also call
   * `onUnknownVariable` for empties — useful in the preview tab where
   * the author wants to see every placeholder that didn't bind.
   */
  warnOnEmpty?: boolean;
};

export type ResolveTemplateResult = {
  text: string;
  variablesUsed: string[];
  /** Variables in the template but NOT in the `variables` dict. */
  unknownVariables: string[];
  /** Variables in the template AND in the dict but rendered to "". */
  emptyVariables: string[];
};

export type TemplateVariableUsage = {
  variable: string;
  /** True when the variable passed the shape check (`/^[A-Za-z0-9_.\-]+$/`). */
  valid: boolean;
  /** True when the caller declared the variable allowed for this task. */
  allowed: boolean;
  /** Occurrence count in the template. */
  count: number;
};

/* ------------------------------------------------------------------ */
/*   Internal                                                         */
/* ------------------------------------------------------------------ */

function coerceValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  /* Arrays and objects: prefer newline-joined string for arrays, JSON for
   * objects. Templates should rarely see these — we handle them for
   * safety, not as a feature. */
  if (Array.isArray(value)) {
    return value.map(coerceValue).filter((s) => s.length > 0).join("\n");
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

/* ------------------------------------------------------------------ */
/*   Public API                                                       */
/* ------------------------------------------------------------------ */

/**
 * Resolve a template to a final string. Two-pass:
 *   1. Replace `{{` / `}}` with sentinels so the variable pass cannot
 *      match them.
 *   2. Replace `{var}` tokens with their values.
 *   3. Swap the sentinels back to literal `{` / `}`.
 *
 * Unknown variables render empty and invoke `onUnknownVariable`.
 */
export function resolveTemplate(
  templateText: string,
  variables: Readonly<Record<string, unknown>>,
  options: ResolveTemplateOptions = {},
): ResolveTemplateResult {
  if (typeof templateText !== "string") {
    return {
      text: "",
      variablesUsed: [],
      unknownVariables: [],
      emptyVariables: [],
    };
  }

  const { onUnknownVariable, warnOnEmpty = false } = options;
  const usedSet = new Set<string>();
  const unknownSet = new Set<string>();
  const emptySet = new Set<string>();

  /* Pass 1: escape sequences. */
  const escaped = templateText.replace(ESCAPED_BRACE_RE, (match) => {
    return match === "{{" ? LEFT_ESCAPE_SENTINEL : RIGHT_ESCAPE_SENTINEL;
  });

  /* Pass 2: variable substitution. */
  const interpolated = escaped.replace(VARIABLE_TOKEN_RE, (_match, name) => {
    if (!Object.prototype.hasOwnProperty.call(variables, name)) {
      unknownSet.add(name);
      if (onUnknownVariable) {
        try {
          onUnknownVariable(name);
        } catch {
          /* reporter must never break generation */
        }
      } else {
        console.warn(
          `[template-resolver] unknown variable "{${name}}" — rendered empty`,
        );
      }
      return "";
    }

    usedSet.add(name);
    const coerced = coerceValue(variables[name]).trim();
    if (coerced.length === 0) {
      emptySet.add(name);
      if (warnOnEmpty && onUnknownVariable) {
        try {
          onUnknownVariable(name);
        } catch {
          /* ignore */
        }
      }
      return "";
    }
    return coerceValue(variables[name]);
  });

  /* Pass 3: unescape. */
  const final = interpolated
    .split(LEFT_ESCAPE_SENTINEL)
    .join("{")
    .split(RIGHT_ESCAPE_SENTINEL)
    .join("}");

  return {
    text: final,
    variablesUsed: Array.from(usedSet),
    unknownVariables: Array.from(unknownSet),
    emptyVariables: Array.from(emptySet),
  };
}

/**
 * Lint a template without rendering: returns a per-variable summary of
 * occurrences, whether it's syntactically valid, and whether it's in the
 * `allowedVariables` set for the task.
 *
 * Used by the editor's "save" handler to warn before writing. Does not
 * throw — the editor decides whether warnings block the save.
 */
export function validateTemplate(
  templateText: string,
  allowedVariables: readonly string[],
): TemplateVariableUsage[] {
  if (typeof templateText !== "string" || templateText.length === 0) {
    return [];
  }

  /* Strip escape sequences first so we don't double-count `{{x}}`. */
  const stripped = templateText
    .replace(ESCAPED_BRACE_RE, (match) =>
      match === "{{" ? LEFT_ESCAPE_SENTINEL : RIGHT_ESCAPE_SENTINEL,
    );

  const allowed = new Set(allowedVariables);
  const counts = new Map<string, { valid: boolean; count: number }>();

  stripped.replace(VARIABLE_TOKEN_RE, (_match, name: string) => {
    const entry = counts.get(name);
    if (entry) {
      entry.count += 1;
    } else {
      counts.set(name, {
        valid: VARIABLE_NAME_RE.test(name),
        count: 1,
      });
    }
    return "";
  });

  /* Also catch `{malformed name}` — VARIABLE_TOKEN_RE won't match them, so
   * we probe with a looser pattern and flag the mismatches. */
  const LOOSE_RE = /\{([^{}]+)\}/g;
  stripped.replace(LOOSE_RE, (_match, raw: string) => {
    const name = raw.trim();
    if (counts.has(name)) return "";
    if (VARIABLE_NAME_RE.test(name)) return "";
    counts.set(name, { valid: false, count: 1 });
    return "";
  });

  return Array.from(counts.entries()).map(([variable, info]) => ({
    variable,
    valid: info.valid,
    allowed: allowed.has(variable),
    count: info.count,
  }));
}

/**
 * Extract the set of variable names referenced by a template. Convenience
 * wrapper around `validateTemplate` — useful for "which critical variables
 * did the user remove?" warnings in the UI.
 */
export function extractVariables(templateText: string): string[] {
  return validateTemplate(templateText, [])
    .filter((u) => u.valid)
    .map((u) => u.variable);
}

/**
 * True when the template contains EVERY variable in `required`.
 */
export function hasAllVariables(
  templateText: string,
  required: readonly string[],
): boolean {
  if (required.length === 0) return true;
  const used = new Set(extractVariables(templateText));
  return required.every((name) => used.has(name));
}

/**
 * Return the variables from `required` that are MISSING from the
 * template. Used by the editor to confirm before saving when a critical
 * variable has been removed.
 */
export function missingRequiredVariables(
  templateText: string,
  required: readonly string[],
): string[] {
  if (required.length === 0) return [];
  const used = new Set(extractVariables(templateText));
  return required.filter((name) => !used.has(name));
}
