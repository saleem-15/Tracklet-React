<#
.SYNOPSIS
  Automates GitHub Pull Request creation with zero copy-pasting.

.DESCRIPTION
  Checks if GitHub CLI (`gh`) is available and authenticated:
    - If YES: Runs `gh pr create` directly via API with Title and Description.
    - If NO: Generates the official GitHub Compare URL with RFC-3986 encoded
             `title` and `body` query parameters, and automatically opens the
             user's default browser with the Title and Description already
             populated in GitHub's form.

.PARAMETER Title
  The title of the Pull Request (Conventional Commit format recommended).

.PARAMETER Body
  The markdown description content as a direct string.

.PARAMETER BodyFile
  Path to a UTF-8 markdown file containing the PR description. Avoids shell escaping issues.

.PARAMETER Base
  Target base branch to merge into. Defaults to 'main'.

.PARAMETER NoBrowser
  If specified, prevents automatically launching the browser.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Title,

    [Parameter(Mandatory = $false)]
    [string]$Body,

    [Parameter(Mandatory = $false)]
    [string]$BodyFile,

    [Parameter(Mandatory = $false)]
    [string]$Base = "main",

    [Parameter(Mandatory = $false)]
    [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

# 1. Resolve Body Content
if ($BodyFile) {
    if (-not (Test-Path $BodyFile)) {
        Write-Error "PR body file not found: $BodyFile"
        exit 1
    }
    $resolvedBody = Get-Content -Path $BodyFile -Raw -Encoding UTF8
} elseif ($Body) {
    $resolvedBody = $Body
} else {
    Write-Error "Either -Body or -BodyFile must be provided."
    exit 1
}

# 2. Detect Remote & Branch
$remoteUrl = git remote get-url origin 2>$null
if (-not $remoteUrl) {
    Write-Error "Could not get origin remote URL. Ensure this command is run inside a git repository."
    exit 1
}

if ($remoteUrl -match 'github\.com[:/](.+?)(?:\.git)?$') {
    $ownerRepo = $matches[1]
} else {
    Write-Error "Remote URL '$remoteUrl' is not a recognized GitHub repository."
    exit 1
}

$branch = git branch --show-current 2>$null
if (-not $branch) {
    Write-Error "Could not determine the current git branch."
    exit 1
}

if ($branch -eq $Base) {
    Write-Error "Cannot create a pull request from '$branch' to itself. Switch to a feature/fix branch first."
    exit 1
}

# 3. Check for GitHub CLI (gh)
$hasGh = $false
try {
    $ghCmd = Get-Command gh -ErrorAction SilentlyContinue
    if ($ghCmd) {
        $null = & gh auth status 2>$null
        if ($LASTEXITCODE -eq 0) {
            $hasGh = $true
        }
    }
} catch {
    $hasGh = $false
}

if ($hasGh) {
    Write-Host "[Ship Skill] GitHub CLI (gh) detected and authenticated." -ForegroundColor Cyan
    Write-Host "[Ship Skill] Creating Pull Request directly on GitHub via API..." -ForegroundColor Cyan
    
    $tempBodyPath = [System.IO.Path]::GetTempFileName()
    try {
        Set-Content -Path $tempBodyPath -Value $resolvedBody -Encoding UTF8
        $prUrl = & gh pr create --base $Base --head $branch --title $Title --body-file $tempBodyPath
        if ($LASTEXITCODE -eq 0 -and $prUrl) {
            Write-Host "[Ship Skill] Pull Request created successfully:" -ForegroundColor Green
            Write-Host $prUrl -ForegroundColor Green
            exit 0
        }
    } catch {
        Write-Warning "[Ship Skill] 'gh pr create' encountered an issue: $_"
    } finally {
        if (Test-Path $tempBodyPath) {
            Remove-Item -Path $tempBodyPath -Force -ErrorAction SilentlyContinue
        }
    }
    Write-Warning "[Ship Skill] Falling back to pre-filled GitHub Compare URL..."
}

# 4. Fallback: Pre-filled GitHub Compare URL
$encodedTitle = [System.Uri]::EscapeDataString($Title)
$encodedBody = [System.Uri]::EscapeDataString($resolvedBody)
$compareUrl = "https://github.com/$ownerRepo/compare/$Base...$branch`?expand=1&title=$encodedTitle&body=$encodedBody"

Write-Host "[Ship Skill] Pre-filled Pull Request URL generated:" -ForegroundColor Cyan
Write-Host $compareUrl -ForegroundColor Green

if (-not $NoBrowser) {
    Write-Host "[Ship Skill] Opening GitHub in your browser with Title and Description already filled in..." -ForegroundColor Cyan
    Start-Process $compareUrl
}

return $compareUrl
