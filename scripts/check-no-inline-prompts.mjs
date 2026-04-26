import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const TARGET_DIR = join(ROOT, "app", "api", "ai");
const MAX_LITERAL_LENGTH = 200;
const PROMPT_HINT =
  /\b(you are|return only|respond with|rules:|output only|valid json|no markdown|no preamble)\b/i;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walk(full));
    } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

function collectStringLiterals(source) {
  const literals = [];
  let quote = null;
  let start = 0;
  let value = "";
  let escaped = false;

  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (!quote) {
      if (ch === "/" && source[i + 1] === "/") {
        while (i < source.length && source[i] !== "\n") i += 1;
        continue;
      }
      if (ch === "/" && source[i + 1] === "*") {
        i += 2;
        while (
          i < source.length &&
          !(source[i] === "*" && source[i + 1] === "/")
        ) {
          i += 1;
        }
        i += 1;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") {
        quote = ch;
        start = i;
        value = "";
        escaped = false;
      }
      continue;
    }

    if (escaped) {
      value += ch;
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      value += ch;
      escaped = true;
      continue;
    }

    if (ch === quote) {
      literals.push({ start, value });
      quote = null;
      continue;
    }

    value += ch;
  }

  return literals;
}

function lineNumber(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

const failures = [];

for (const file of walk(TARGET_DIR)) {
  const source = readFileSync(file, "utf8");
  for (const literal of collectStringLiterals(source)) {
    const compact = literal.value.replace(/\s+/g, " ").trim();
    if (
      compact.length > MAX_LITERAL_LENGTH &&
      PROMPT_HINT.test(compact) &&
      !compact.startsWith("@/lib/ai/prompt-templates")
    ) {
      failures.push({
        file: relative(ROOT, file),
        line: lineNumber(source, literal.start),
        preview: compact.slice(0, 160),
      });
    }
  }
}

if (failures.length > 0) {
  console.error(
    "Inline prompt-like strings are not allowed under app/api/ai. Move them to lib/ai/prompt-templates.ts.\n",
  );
  for (const failure of failures) {
    console.error(`${failure.file}:${failure.line} ${failure.preview}`);
  }
  process.exit(1);
}

console.log("No inline prompt-like strings found under app/api/ai.");
