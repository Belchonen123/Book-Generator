param(
  [string]$OutFile = "CODE_REVIEW_BUNDLE.md"
)

$ErrorActionPreference = "Stop"

$extToLang = @{
  ".ts"   = "ts"
  ".tsx"  = "tsx"
  ".js"   = "js"
  ".jsx"  = "jsx"
  ".mjs"  = "js"
  ".cjs"  = "js"
  ".sql"  = "sql"
  ".css"  = "css"
  ".json" = "json"
  ".md"   = "md"
}

$includeExts = $extToLang.Keys

$excludePattern = "(\\|/)(node_modules|\.next|\.git|\.cursor|public)(\\|/)|package-lock\.json$|CODE_REVIEW_BUNDLE\.md$"

$repoRoot = (Resolve-Path ".").Path

$files = Get-ChildItem -Path $repoRoot -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object {
    $includeExts -contains $_.Extension.ToLower() -and
    $_.FullName -notmatch $excludePattern
  } |
  Sort-Object FullName

Write-Host ("Collecting {0} files..." -f $files.Count)

$fence = "~~~"

$sb = [System.Text.StringBuilder]::new()
[void]$sb.AppendLine("# ChapterAI Code Review Bundle")
[void]$sb.AppendLine("")
[void]$sb.AppendLine(("Generated: {0}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz")))
[void]$sb.AppendLine(("Files: {0}" -f $files.Count))
[void]$sb.AppendLine("")
[void]$sb.AppendLine("Note: code blocks use tilde fences so triple backticks inside source (markdown strings, regex, etc.) don't break rendering.")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("## Table of Contents")
[void]$sb.AppendLine("")

foreach ($f in $files) {
  $rel = $f.FullName.Substring($repoRoot.Length).TrimStart('\','/')
  $relPosix = $rel -replace '\\', '/'
  $anchor = ($relPosix -replace '[^a-zA-Z0-9]+', '-').ToLower().Trim('-')
  [void]$sb.AppendLine(("- [{0}](#{1})" -f $relPosix, $anchor))
}
[void]$sb.AppendLine("")
[void]$sb.AppendLine("---")
[void]$sb.AppendLine("")

foreach ($f in $files) {
  $rel = $f.FullName.Substring($repoRoot.Length).TrimStart('\','/')
  $relPosix = $rel -replace '\\', '/'
  $lang = $extToLang[$f.Extension.ToLower()]
  if (-not $lang) { $lang = "" }

  $raw = Get-Content -LiteralPath $f.FullName -Raw -ErrorAction SilentlyContinue
  if ($null -eq $raw) { $raw = "" }

  [void]$sb.AppendLine(("## {0}" -f $relPosix))
  [void]$sb.AppendLine("")
  [void]$sb.AppendLine(("{0}{1}" -f $fence, $lang))
  [void]$sb.AppendLine($raw.TrimEnd())
  [void]$sb.AppendLine($fence)
  [void]$sb.AppendLine("")
}

$outPath = Join-Path $repoRoot $OutFile
Set-Content -LiteralPath $outPath -Value $sb.ToString() -Encoding UTF8

$size = (Get-Item -LiteralPath $outPath).Length
Write-Host ("Wrote {0} ({1:N1} KB)" -f $outPath, ($size / 1KB))
