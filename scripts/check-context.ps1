param(
  [string]$ConversationId,
  [switch]$All
)

$ErrorActionPreference = "Stop"
$ContextLimit = 1000000
$BrainDir = Join-Path $HOME ".gemini\antigravity\brain"

if (-not (Test-Path $BrainDir)) {
  Write-Host "No Antigravity conversation directory found at: $BrainDir" -ForegroundColor Red
  exit 1
}

$convDirs = Get-ChildItem -Path $BrainDir -Directory | Where-Object { -not $_.Name.StartsWith(".") } | ForEach-Object {
  $logPath = Join-Path $_.FullName ".system_generated\logs\transcript.jsonl"
  if (Test-Path $logPath) {
    [PSCustomObject]@{
      Id      = $_.Name
      LogPath = $logPath
      Mtime   = (Get-Item $logPath).LastWriteTime
    }
  }
} | Sort-Object Mtime -Descending

if (-not $convDirs -or $convDirs.Count -eq 0) {
  Write-Host "No conversation transcript logs found in: $BrainDir" -ForegroundColor Red
  exit 1
}

function Get-PlannerTokens($filePath) {
  $lines = Get-Content $filePath -Tail 30
  for ($i = $lines.Count - 1; $i -ge 0; $i--) {
    $line = $lines[$i]
    if ($line.Contains('"type":"PLANNER_RESPONSE"')) {
      try {
        $json = $line | ConvertFrom-Json
        if ($json.type -eq "PLANNER_RESPONSE" -and ($null -ne $json.input_tokens -or $null -ne $json.cache_read_tokens)) {
          return $json
        }
      } catch {}
    }
  }
  return $null
}

if ($All) {
  Write-Host ""
  Write-Host "=== Antigravity Conversations Context Summary ===" -ForegroundColor Cyan
  Write-Host "Found $($convDirs.Count) total sessions (showing latest 10):"
  Write-Host ""

  $convDirs | Select-Object -First 10 | ForEach-Object {
    $data = Get-PlannerTokens $_.LogPath
    if ($data) {
      $total = $data.input_tokens + $data.cache_read_tokens
      $pct = [Math]::Round(($total / $ContextLimit) * 100, 1)
      $shortId = $_.Id.Substring(0, [Math]::Min(8, $_.Id.Length))
      Write-Host "  $shortId...  " -NoNewline
      Write-Host "$($pct.ToString().PadLeft(5))% " -ForegroundColor Yellow -NoNewline
      Write-Host "($($total.ToString('N0').PadLeft(8)) tokens)  ·  $($_.Mtime.ToString('g'))"
    }
  }
  Write-Host ""
  Write-Host "Tip: Run with conversation ID: .\scripts\check-context.ps1 -ConversationId <id>"
  Write-Host ""
  exit 0
}

$selected = $convDirs[0]
if ($ConversationId) {
  $matched = $convDirs | Where-Object { $_.Id.ToLower().StartsWith($ConversationId.ToLower()) } | Select-Object -First 1
  if (-not $matched) {
    Write-Host "Conversation ID starting with '$ConversationId' not found." -ForegroundColor Red
    exit 1
  }
  $selected = $matched
}

$data = Get-PlannerTokens $selected.LogPath
if (-not $data) {
  Write-Host "No tokens recorded yet in conversation $($selected.Id)." -ForegroundColor Red
  exit 1
}

$inputTok = $data.input_tokens
$cacheTok = $data.cache_read_tokens
$outTok   = $data.output_tokens
$totalTok = $inputTok + $cacheTok
$pct = [Math]::Round(($totalTok / $ContextLimit) * 100, 1)
$barWidth = 30
$filled = [Math]::Min($barWidth, [Math]::Max(0, [Math]::Round(($totalTok / $ContextLimit) * $barWidth)))
$empty = $barWidth - $filled
$bar = ("#" * $filled) + ("-" * $empty)

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║               Antigravity Chat Context Inspector                 ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "  Conversation ID:     " -NoNewline
Write-Host "$($selected.Id)" -ForegroundColor Yellow
Write-Host "  Last Activity:       $($selected.Mtime)"
Write-Host "  Status:              " -NoNewline

if ($pct -gt 75) {
  Write-Host "🔴 High context usage (Consider /compact)" -ForegroundColor Red
} else {
  if ($pct -gt 40) {
    Write-Host "🟡 Moderate context usage" -ForegroundColor Yellow
  } else {
    Write-Host "🟢 Healthy context headroom" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "  Context Utilization (Gemini 1M Window):"
Write-Host "  [$bar] " -NoNewline -ForegroundColor Green
Write-Host "$pct% " -ForegroundColor White -NoNewline
Write-Host "($($totalTok.ToString('N0')) / 1,000,000 tokens)"

$headroom = $ContextLimit - $totalTok

Write-Host ""
Write-Host "  Detailed Breakdown:"
Write-Host "    ├─ Cached Context (Prompt Cache):   $($cacheTok.ToString('N0').PadLeft(9)) tokens" -ForegroundColor Green
Write-Host "    ├─ New Turn Input & State:          $($inputTok.ToString('N0').PadLeft(9)) tokens" -ForegroundColor Cyan
Write-Host "    ├─ Last Assistant Response:         $($outTok.ToString('N0').PadLeft(9)) tokens" -ForegroundColor Magenta
Write-Host "    └─ Remaining Headroom:              $($headroom.ToString('N0').PadLeft(9)) tokens" -ForegroundColor Gray
Write-Host ""
