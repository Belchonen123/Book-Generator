/**
 * Writes all review-relevant source into one UTF-8 text file at repo root.
 * Usage: node scripts/bundle-for-review.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "code-review-bundle.txt");

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".next",
  ".git",
  "coverage",
  "dist",
  "build",
]);

const EXT_ALLOW = new Set([
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".js",
  ".css",
  ".sql",
  ".json",
]);

const FILE_ALLOW = new Set(["package.json", "tsconfig.json", ".eslintrc.json"]);

const SKIP_FILE_NAMES = new Set([
  "package-lock.json",
  "code-review-bundle.txt",
]);

function shouldIncludeFile(rel, base) {
  if (SKIP_FILE_NAMES.has(base)) return false;
  if (FILE_ALLOW.has(base)) return true;
  const ext = path.extname(base);
  return EXT_ALLOW.has(ext);
}

function walk(dir, acc) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIR_NAMES.has(e.name)) continue;
      walk(full, acc);
    } else if (e.isFile() && shouldIncludeFile(path.relative(ROOT, full), e.name)) {
      acc.push(full);
    }
  }
}

const files = [];
walk(ROOT, files);
files.sort((a, b) => a.localeCompare(b, "en"));

const parts = [
  `# ChapterAI — code review bundle`,
  ``,
  `Generated: ${new Date().toISOString()}`,
  `Root: ${ROOT}`,
  `Files: ${files.length}`,
  ``,
  repeat("=", 80),
  ``,
];

function repeat(s, n) {
  return s.repeat(n);
}

for (const full of files) {
  const rel = path.relative(ROOT, full).split(path.sep).join("/");
  let body;
  try {
    body = fs.readFileSync(full, "utf8");
  } catch {
    body = `<< could not read file >>\n`;
  }
  parts.push(`FILE: ${rel}`);
  parts.push(repeat("-", 80));
  parts.push(body);
  if (!body.endsWith("\n")) parts.push("");
  parts.push("");
  parts.push(repeat("=", 80));
  parts.push("");
}

fs.writeFileSync(OUT, parts.join("\n"), "utf8");
console.log(`Wrote ${files.length} files to ${OUT}`);
console.log(`Size: ${(fs.statSync(OUT).size / 1024 / 1024).toFixed(2)} MB`);
