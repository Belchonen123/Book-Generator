/**
 * Fails if the canonical series-fragment prefix appears outside the single
 * source file. Prevents hand-rolled prompt drift. Run: node scripts/lint-prompt-drift.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const CANONICAL = "This book is part of a series.";
const ALLOWED_RELATIVE = new Set([
  "lib/ai/series-prompt-fragments.ts",
  "scripts/lint-prompt-drift.mjs",
]);

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "coverage",
  "out",
]);

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");

/**
 * @param {string} dir
 * @param {string[]} files
 * @returns {string[]}
 */
function walk(dir, files = []) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    if (name.isDirectory() && name.name.startsWith(".")) {
      continue;
    }
    if (name.isDirectory()) {
      if (SKIP_DIRS.has(name.name)) {
        continue;
      }
      walk(join(dir, name.name), files);
    } else {
      const ext = extname(name.name);
      if (ext === ".ts" || ext === ".tsx" || ext === ".mjs" || ext === ".cjs") {
        files.push(join(dir, name.name));
      }
    }
  }
  return files;
}

const violations = [];
for (const abs of walk(REPO_ROOT)) {
  const rel = relative(REPO_ROOT, abs).split("\\").join("/");
  if (ALLOWED_RELATIVE.has(rel)) {
    continue;
  }
  const content = readFileSync(abs, "utf8");
  if (content.includes(CANONICAL)) {
    violations.push(rel);
  }
}

if (violations.length > 0) {
  console.error("Prompt drift: canonical series fragment substring must only live in");
  console.error("  lib/ai/series-prompt-fragments.ts — found in:");
  for (const v of violations) {
    console.error("  -", v);
  }
  process.exit(1);
}
