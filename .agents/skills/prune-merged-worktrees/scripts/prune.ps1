<#
.SYNOPSIS
    Safely prune and delete merged Git worktrees and branches in Tracklet.

.DESCRIPTION
    Scans all local branches and Git worktrees, cross-references GitHub PR merge
    status and git commit ancestor graphs, and deletes ONLY verified merged
    worktrees and branches. Strictly preserves:
    - Protected branches (main, master)
    - Worktrees with uncommitted/unstaged changes or untracked files
    - Unmerged branches (branches with commits not yet integrated into main)
    - Freshly created branches pointing to trunk (new tasks / pending work)
    - Active execution worktrees (current working directory)

.PARAMETER Execute
    Perform actual deletion. If omitted, runs in DryRun mode.

.PARAMETER SkipRemotePrune
    Skip pruning stale remote tracking refs via 'git fetch --prune origin'.

.PARAMETER RepoPath
    Optional path to the Git repository root.

.EXAMPLE
    .\prune.ps1
    # Runs safe preview (DryRun)

.EXAMPLE
    .\prune.ps1 -Execute
    # Deletes verified merged worktrees and branches
#>

[CmdletBinding()]
param(
    [switch]$Execute,
    [switch]$SkipRemotePrune,
    [string]$RepoPath = ""
)

$ErrorActionPreference = "Continue"
if (Get-Variable -Name "PSNativeCommandUseErrorActionPreference" -ErrorAction SilentlyContinue) {
    $PSNativeCommandUseErrorActionPreference = $false
}

if (-not $RepoPath) {
    try {
        $RepoPath = (git rev-parse --show-toplevel 2>$null)
    } catch {}
}
if (-not $RepoPath -or -not (Test-Path $RepoPath)) {
    # Resolve from script location: .agents/skills/prune-merged-worktrees/scripts -> root is 4 levels up
    $scriptRootCand = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
    if (Test-Path "$scriptRootCand\.git") {
        $RepoPath = $scriptRootCand
    }
}

if (-not $RepoPath -or -not (Test-Path "$RepoPath\.git")) {
    Write-Error "Could not locate Git repository root. Specify -RepoPath <path>."
    exit 1
}

$repoRoot = (Resolve-Path $RepoPath).Path
Push-Location $repoRoot

try {
    Write-Host "=== Git Prune: Merged Worktrees & Branches Audit ===" -ForegroundColor Cyan
    Write-Host "Repository root: $repoRoot" -ForegroundColor Gray
    Write-Host "Mode: $(if ($Execute) { 'EXECUTE (Live Deletion)' } else { 'DRY RUN (Preview Only)' })" -ForegroundColor Yellow
    Write-Host ""

    $operationFailed = $false

    # 1. Prune stale remote tracking branches
    if (-not $SkipRemotePrune) {
        Write-Host "[1/4] Pruning stale remote tracking references (git fetch --prune origin)..." -ForegroundColor Cyan
        git -C $repoRoot fetch --prune origin 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "git fetch --prune origin failed with exit code $LASTEXITCODE."
            $operationFailed = $true
        }
    }

    # Get origin/main SHA
    $originMainSha = (git -C $repoRoot rev-parse origin/main 2>$null).Trim()

    # 2. Get GitHub PR merge history for squash-and-merge detection
    $mergedPrBranches = @{}
    try {
        $prListJson = gh pr list --state merged --limit 100 --json headRefName,headRefOid,number,title 2>$null
        if ($prListJson) {
            $prs = $prListJson | ConvertFrom-Json
            foreach ($pr in $prs) {
                if (-not $mergedPrBranches.ContainsKey($pr.headRefName)) {
                    $mergedPrBranches[$pr.headRefName] = @()
                }
                $mergedPrBranches[$pr.headRefName] += $pr
            }
        }
    } catch {
        Write-Warning "GitHub CLI (gh) query failed. Falling back to git commit ancestry checks."
    }

    function Find-VerifiedMergedPr {
        param(
            [string]$BranchName,
            [string]$BranchSha
        )
        if (-not $BranchName -or -not $BranchSha) { return $null }
        if (-not $mergedPrBranches.ContainsKey($BranchName)) { return $null }

        $candidatePrs = $mergedPrBranches[$BranchName]
        foreach ($pr in $candidatePrs) {
            if (-not $pr.headRefOid) { continue }
            if ($BranchSha -eq $pr.headRefOid) {
                return $pr
            }
            git -C $repoRoot merge-base --is-ancestor $BranchSha $pr.headRefOid 2>$null
            if ($LASTEXITCODE -eq 0) {
                return $pr
            }
        }
        return $null
    }

    # 3. Audit Worktrees
    Write-Host "`n[2/4] Auditing Git Worktrees..." -ForegroundColor Cyan

    $worktreeRaw = git -C $repoRoot worktree list --porcelain
    $worktrees = @()
    $currentWt = @{}

    foreach ($line in ($worktreeRaw -split "`n")) {
        $line = $line.Trim()
        if ($line -like "worktree *") {
            if ($currentWt.Path) { $worktrees += [PSCustomObject]$currentWt }
            $currentWt = @{ Path = $line.Substring(9).Trim(); Branch = ""; Head = "" }
        } elseif ($line -like "HEAD *") {
            $currentWt.Head = $line.Substring(5).Trim()
        } elseif ($line -like "branch *") {
            $branchRef = $line.Substring(7).Trim()
            $currentWt.Branch = $branchRef.Replace("refs/heads/", "")
        }
    }
    if ($currentWt.Path) { $worktrees += [PSCustomObject]$currentWt }

    $currentDir = (Get-Location).Path.Replace('\', '/').TrimEnd('/')
    $worktreeActions = @()

    foreach ($wt in $worktrees) {
        $wtPathNorm = $wt.Path.Replace('\', '/').TrimEnd('/')
        $isMain = ($wtPathNorm -eq $repoRoot.Replace('\', '/').TrimEnd('/')) -or ($wt.Branch -in @("main", "master"))
        $isCurrent = ($wtPathNorm -eq $currentDir)

        # Check dirty status inside worktree
        $isDirty = $false
        $dirtySummary = ""
        if (Test-Path $wt.Path) {
            $statusOut = git -C $wt.Path status --porcelain 2>$null
            if ($statusOut) {
                $isDirty = $true
                $dirtyCount = ($statusOut -split "`n").Count
                $dirtySummary = "$dirtyCount uncommitted change(s)"
            }
        }

        # Check merge status
        $matchedPr = if ($wt.Head) { Find-VerifiedMergedPr -BranchName $wt.Branch -BranchSha $wt.Head } else { $null }
        $hasMergedPr = ($null -ne $matchedPr)
        $isDirectAncestor = $false
        if ($wt.Head) {
            git -C $repoRoot merge-base --is-ancestor $wt.Head origin/main 2>$null
            if ($LASTEXITCODE -eq 0) { $isDirectAncestor = $true }
        }

        # Fresh branch check: points directly to origin/main with no merged PR
        $isFreshBranchAtTrunk = ($wt.Head -eq $originMainSha) -and (-not $hasMergedPr)

        $decision = "PRESERVE"
        $reason = ""

        if ($isMain) {
            $reason = "Main repository trunk"
        } elseif ($isCurrent) {
            $reason = "Active execution worktree (current directory)"
        } elseif ($isDirty) {
            $reason = "UNCOMMITTED WORK: $dirtySummary (DO NOT DELETE)"
        } elseif ($isFreshBranchAtTrunk) {
            $reason = "Fresh branch at trunk / pending work (DO NOT DELETE)"
        } elseif (-not $hasMergedPr -and -not $isDirectAncestor) {
            $reason = "UNMERGED COMMITS (DO NOT DELETE)"
        } elseif ($hasMergedPr) {
            $decision = "DELETE"
            $reason = "Merged via PR #$($matchedPr.number) & working tree clean"
        } elseif ($isDirectAncestor) {
            $decision = "DELETE"
            $reason = "Merged into main (direct ancestry) & working tree clean"
        } else {
            $reason = "Uncertain merge status (PRESERVED for safety)"
        }

        $worktreeActions += [PSCustomObject]@{
            Path = $wt.Path
            Branch = $wt.Branch
            Status = $decision
            Reason = $reason
        }
    }

    foreach ($wtItem in $worktreeActions) {
        $color = if ($wtItem.Status -eq "DELETE") { "Red" } else { "Green" }
        Write-Host ("[{0}] {1} ({2})" -f $wtItem.Status, $wtItem.Branch, $wtItem.Path) -ForegroundColor $color
        Write-Host ("       Reason: {0}" -f $wtItem.Reason) -ForegroundColor Gray
    }

    # 4. Audit Local Branches
    Write-Host "`n[3/4] Auditing Local Branches..." -ForegroundColor Cyan

    $localBranches = (git -C $repoRoot for-each-ref --format='%(refname:short)|%(objectname)|%(objectname:short)' refs/heads/) -split "`n"
    $branchActions = @()
    $worktreeBranches = $worktrees.Branch

    foreach ($bLine in $localBranches) {
        $bLine = $bLine.Trim()
        if (-not $bLine) { continue }
        $parts = $bLine.Split('|')
        $bName = $parts[0]
        $bSha = $parts[1]
        $bShaShort = if ($parts.Length -gt 2) { $parts[2] } else { if ($bSha.Length -ge 7) { $bSha.Substring(0, 7) } else { $bSha } }

        $isMain = ($bName -in @("main", "master"))
        $hasWorktree = ($bName -in $worktreeBranches)

        $matchedPr = Find-VerifiedMergedPr -BranchName $bName -BranchSha $bSha
        $hasMergedPr = ($null -ne $matchedPr)
        $isDirectAncestor = $false
        git -C $repoRoot merge-base --is-ancestor $bSha origin/main 2>$null
        if ($LASTEXITCODE -eq 0) { $isDirectAncestor = $true }

        $isFreshBranchAtTrunk = ($bSha -eq $originMainSha) -and (-not $hasMergedPr)

        $decision = "PRESERVE"
        $reason = ""

        if ($isMain) {
            $reason = "Protected default branch"
        } elseif ($hasWorktree) {
            $wtMatch = $worktreeActions | Where-Object { $_.Branch -eq $bName } | Select-Object -First 1
            if ($wtMatch.Status -eq "PRESERVE") {
                $reason = "Attached to preserved worktree ($($wtMatch.Reason))"
            } elseif ($hasMergedPr) {
                $decision = "DELETE"
                $reason = "Merged via PR #$($matchedPr.number)"
            } elseif ($isDirectAncestor) {
                $decision = "DELETE"
                $reason = "Merged into main (direct ancestry)"
            }
        } elseif ($isFreshBranchAtTrunk) {
            $reason = "Fresh branch at trunk / pending work (DO NOT DELETE)"
        } elseif (-not $hasMergedPr -and -not $isDirectAncestor) {
            $reason = "UNMERGED COMMITS (DO NOT DELETE)"
        } elseif ($hasMergedPr) {
            $decision = "DELETE"
            $reason = "Merged via PR #$($matchedPr.number)"
        } elseif ($isDirectAncestor) {
            $decision = "DELETE"
            $reason = "Merged into main (direct ancestry)"
        } else {
            $reason = "Uncertain merge status (PRESERVED for safety)"
        }

        $branchActions += [PSCustomObject]@{
            Branch = $bName
            Commit = $bShaShort
            Status = $decision
            Reason = $reason
        }
    }

    foreach ($bItem in $branchActions) {
        $color = if ($bItem.Status -eq "DELETE") { "Red" } else { "Green" }
        Write-Host ("[{0}] {1} [{2}]" -f $bItem.Status, $bItem.Branch, $bItem.Commit) -ForegroundColor $color
        Write-Host ("       Reason: {0}" -f $bItem.Reason) -ForegroundColor Gray
    }

    # 5. Execution or Dry Run Summary
    Write-Host "`n[4/4] Execution Plan" -ForegroundColor Cyan

    $wtsToDelete = @($worktreeActions | Where-Object { $_.Status -eq "DELETE" })
    $branchesToDelete = @($branchActions | Where-Object { $_.Status -eq "DELETE" })

    Write-Host "Worktrees eligible for deletion: $($wtsToDelete.Count)" -ForegroundColor $(if ($wtsToDelete.Count -gt 0) { 'Green' } else { 'Gray' })
    Write-Host "Branches eligible for deletion:  $($branchesToDelete.Count)" -ForegroundColor $(if ($branchesToDelete.Count -gt 0) { 'Green' } else { 'Gray' })

    if (-not $Execute) {
        Write-Host "`n[DRY RUN COMPLETE] Zero changes were made." -ForegroundColor Yellow
        Write-Host "To execute deletion of verified merged items, rerun with: .\prune.ps1 -Execute" -ForegroundColor Yellow
        return
    }

    if ($wtsToDelete.Count -eq 0 -and $branchesToDelete.Count -eq 0) {
        Write-Host "`nEverything is already clean! Nothing to delete." -ForegroundColor Green
        return
    }

    # Perform Worktree Deletions
    foreach ($wtItem in $wtsToDelete) {
        Write-Host "Removing merged worktree: $($wtItem.Path)..." -ForegroundColor Yellow
        git -C $repoRoot worktree remove $wtItem.Path
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Removed worktree successfully." -ForegroundColor Green
        } else {
            Write-Warning "Could not remove worktree $($wtItem.Path) (exit code: $LASTEXITCODE)."
            $operationFailed = $true
        }
    }

    # Perform Branch Deletions
    foreach ($bItem in $branchesToDelete) {
        Write-Host "Deleting merged branch: $($bItem.Branch)..." -ForegroundColor Yellow
        git -C $repoRoot branch -D $bItem.Branch
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Deleted branch $($bItem.Branch) successfully." -ForegroundColor Green
        } else {
            Write-Warning "Could not delete branch $($bItem.Branch) (exit code: $LASTEXITCODE)."
            $operationFailed = $true
        }
    }

    # Final git worktree prune
    git -C $repoRoot worktree prune
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "git worktree prune failed with exit code $LASTEXITCODE."
        $operationFailed = $true
    }

    if ($operationFailed) {
        Write-Error "One or more pruning operations failed."
        exit 1
    } else {
        Write-Host "`n=== Prune Completed Successfully ===" -ForegroundColor Green
    }
} finally {
    Pop-Location
}

