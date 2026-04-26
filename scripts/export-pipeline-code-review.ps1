# Curated single-file export for external review: pipeline + small Anthropic client + editor toolbar.
# Output: CODE_REVIEW_EXPORT.md (repo root)

param(
  [string]$OutFile = "CODE_REVIEW_EXPORT.md"
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

$files = @(
  "lib/anthropic/client.ts",
  "lib/anthropic/message-attempts.ts",
  "lib/anthropic/text-model.ts",
  "lib/openai/literary-chapter-system-prompts.ts",
  "lib/openai/prompts.ts",
  "lib/openai/idea-refinement-briefs.ts",
  "lib/openai/outline-briefs.ts",
  "app/api/ai/generate-chapter/route.ts",
  "app/api/ai/generate-outline/route.ts",
  "types/book.types.ts",
  "components/book/IdeaChat.tsx",
  "components/book/OutlineEditor.tsx",
  "components/book/chapter-editor/toolbar.tsx"
)

$extToLang = @{
  ".ts"   = "ts"
  ".tsx"  = "tsx"
}

$fence = "~~~"
$sb = [System.Text.StringBuilder]::new()
[void]$sb.AppendLine("# ChapterAI - code review export")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("Single-file bundle of the **idea to outline to chapter** pipeline, prompts, types, key UI, Anthropic client usage, and the chapter **editor toolbar**. Generated for external review. The full app lives in the repository; this is not a complete copy of every file.")
[void]$sb.AppendLine("")
[void]$sb.AppendLine(("Generated: {0}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss")))
[void]$sb.AppendLine(("Files: {0}" -f $files.Count))
[void]$sb.AppendLine("")
[void]$sb.AppendLine("Fences use tilde (three) so triple backticks inside source (e.g. markdown strings) do not break the bundle.")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("## Contents (search for these path headings)")
[void]$sb.AppendLine("")

$idx = 1
foreach ($f in $files) {
  $relPosix = $f -replace '\\', '/'
  [void]$sb.AppendLine(('{0}. ``{1}``' -f $idx, $relPosix))
  $idx++
}
[void]$sb.AppendLine("")
[void]$sb.AppendLine("---")
[void]$sb.AppendLine("")

foreach ($f in $files) {
  $path = Join-Path $repoRoot $f
  if (-not (Test-Path -LiteralPath $path)) {
    throw "Missing file: $path"
  }
  $ext = [System.IO.Path]::GetExtension($path).ToLower()
  $lang = $extToLang[$ext]
  if (-not $lang) { $lang = "text" }
  $relPosix = $f -replace '\\', '/'
  $raw = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

  [void]$sb.AppendLine(('## ``{0}``' -f $relPosix))
  [void]$sb.AppendLine("")
  [void]$sb.AppendLine(("{0}{1}" -f $fence, $lang))
  [void]$sb.AppendLine($raw.TrimEnd("`r", "`n"))
  [void]$sb.AppendLine($fence)
  [void]$sb.AppendLine("")
}

$outPath = Join-Path $repoRoot $OutFile
[System.IO.File]::WriteAllText($outPath, $sb.ToString(), [System.Text.UTF8Encoding]::new($false))
$size = (Get-Item -LiteralPath $outPath).Length
Write-Host ("Wrote {0} ({1:N1} KB)" -f $outPath, ($size / 1KB))
