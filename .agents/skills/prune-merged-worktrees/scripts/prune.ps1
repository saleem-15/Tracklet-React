<#
.SYNOPSIS
    Safely prune and delete merged Git worktrees, branches, and Antigravity IDE environments in Tracklet.

.DESCRIPTION
    Scans all local branches, Git worktrees, and Antigravity project environments.
    Cross-references GitHub PR merge status and git commit ancestor graphs, and deletes
    ONLY verified merged worktrees and branches.
    
    Strictly preserves:
    - Protected branches (main, master)
    - Worktrees with uncommitted/unstaged changes or untracked files
    - Unmerged branches (branches with commits not yet integrated into main)
    - Freshly created branches pointing to trunk (new tasks / pending work)
    - Active execution worktrees (current working directory)

    Optional Antigravity IDE Synchronization (-PruneAntigravityConfig):
    - Synchronizes Antigravity project memory (~/.gemini/config/projects/<id>.json)
    - Prunes ghost environments and removed worktrees from the Antigravity UI dropdown
    - Removes residual untracked folders (e.g. leftover node_modules) left behind by git

.PARAMETER Execute
    Perform actual deletion. If omitted, runs in DryRun mode.

.PARAMETER PruneAntigravityConfig
    Synchronize and remove deleted/ghost worktree entries from Antigravity's project memory
    (~/.gemini/config/projects/<id>.json). Always prompts in agentic workflows.

.PARAMETER SkipRemotePrune
    Skip pruning stale remote tracking refs via 'git fetch --prune origin'.

.PARAMETER RepoPath
    Optional path to the Git repository root.

.EXAMPLE
    .\prune.ps1
    # Runs safe preview (DryRun) including Git and Antigravity memory audits

.EXAMPLE
    .\prune.ps1 -Execute
    # Deletes verified merged worktrees and branches in Git only

.EXAMPLE
    .\prune.ps1 -Execute -PruneAntigravityConfig
    # Deletes verified merged worktrees/branches in Git AND prunes Antigravity project memory
#>

[CmdletBinding()]
param(
    [switch]$Execute,
    [switch]$PruneAntigravityConfig,
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
    Write-Host "Execution Mode: $(if ($Execute) { 'EXECUTE (Live Deletion)' } else { 'DRY RUN (Preview Only)' })" -ForegroundColor Yellow
    Write-Host "Antigravity Sync: $(if ($PruneAntigravityConfig) { 'ENABLED' } else { 'DISABLED (Git only)' })" -ForegroundColor $(if ($PruneAntigravityConfig) { 'Green' } else { 'Gray' })
    Write-Host ""

    $operationFailed = $false

    # -------------------------------------------------------------------------
    # Helper: Find Antigravity Project Configuration
    # -------------------------------------------------------------------------
    function Get-AntigravityProjectConfig {
        param([string]$TargetRepoPath)

        $projectsDir = Join-Path $env:USERPROFILE ".gemini\config\projects"
        if (-not (Test-Path $projectsDir)) { return $null }

        $targetNorm = $TargetRepoPath.Replace('\', '/').TrimEnd('/').ToLower()

        foreach ($file in (Get-ChildItem $projectsDir -Filter "*.json" -File)) {
            try {
                $raw = Get-Content $file.FullName -Raw -Encoding utf8
                $proj = $raw | ConvertFrom-Json
                $resources = $proj.projectResources.resources
                foreach ($r in $resources) {
                    if ($r.gitFolder -and $r.gitFolder.folderUri) {
                        $uri = $r.gitFolder.folderUri
                        $decoded = [System.Uri]::UnescapeDataString($uri).Replace("file:///", "").Replace('\', '/').TrimEnd('/').ToLower()
                        if ($decoded -eq $targetNorm) {
                            return [PSCustomObject]@{
                                FilePath  = $file.FullName
                                Data      = $proj
                                Raw       = $raw
                                ProjectId = $proj.id
                                Name      = $proj.name
                            }
                        }
                    }
                }
            } catch {}
        }
        return $null
    }

    # 1. Prune stale remote tracking branches
    if (-not $SkipRemotePrune) {
        Write-Host "[1/5] Pruning stale remote tracking references (git fetch --prune origin)..." -ForegroundColor Cyan
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
        $prListJson = gh pr list --state merged --limit 200 --json headRefName,headRefOid,number,title 2>$null
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
    Write-Host "`n[2/5] Auditing Git Worktrees..." -ForegroundColor Cyan

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
    Write-Host "`n[3/5] Auditing Local Branches..." -ForegroundColor Cyan

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

    # 5. Audit Antigravity Project Memory (~/.gemini/config/projects/*.json)
    Write-Host "`n[4/5] Auditing Antigravity Project Memory..." -ForegroundColor Cyan

    $wtsToDelete = @($worktreeActions | Where-Object { $_.Status -eq "DELETE" })
    $branchesToDelete = @($branchActions | Where-Object { $_.Status -eq "DELETE" })

    $antigravityConfig = Get-AntigravityProjectConfig -TargetRepoPath $repoRoot
    $envActions = @()

    if ($antigravityConfig) {
        Write-Host "Found project config: $($antigravityConfig.Name) ($($antigravityConfig.FilePath))" -ForegroundColor Gray
        $wtsToDeletePathsNorm = @($wtsToDelete | ForEach-Object { $_.Path.Replace('\', '/').TrimEnd('/').ToLower() })

        if ($antigravityConfig.Data.environments -and $antigravityConfig.Data.environments.environments) {
            foreach ($envItem in $antigravityConfig.Data.environments.environments) {
                $eName = $envItem.name
                $eUri = ""
                $eLocalPath = ""
                if ($envItem.resources -and $envItem.resources.resources -and $envItem.resources.resources.Count -gt 0) {
                    $eUri = $envItem.resources.resources[0].folderUri
                    if ($eUri -and $eUri.StartsWith("file:///")) {
                        $eLocalPath = [System.Uri]::UnescapeDataString($eUri.Substring(8)).Replace('/', '\')
                    }
                }

                $eLocalNorm = if ($eLocalPath) { $eLocalPath.Replace('\', '/').TrimEnd('/').ToLower() } else { "" }

                $matchesDeletedWt = ($eLocalNorm -and ($eLocalNorm -in $wtsToDeletePathsNorm))
                $isGhost = $false
                if ($eLocalPath) {
                    if (-not (Test-Path $eLocalPath) -or -not (Test-Path (Join-Path $eLocalPath ".git"))) {
                        $isGhost = $true
                    }
                }

                $decision = "PRESERVE"
                $reason = ""

                if ($matchesDeletedWt) {
                    $decision = "DELETE"
                    $reason = "Matches Git worktree scheduled for deletion"
                } elseif ($isGhost) {
                    $decision = "DELETE"
                    $reason = "Ghost environment (directory missing or has no .git on disk)"
                } else {
                    $reason = "Active linked worktree on disk"
                }

                $envActions += [PSCustomObject]@{
                    Id        = $envItem.id
                    Name      = $eName
                    LocalPath = $eLocalPath
                    Status    = $decision
                    Reason    = $reason
                    EnvObject = $envItem
                }
            }
        }

        if ($envActions.Count -gt 0) {
            foreach ($eItem in $envActions) {
                $color = if ($eItem.Status -eq "DELETE") { "Red" } else { "Green" }
                Write-Host ("[{0}] Environment: {1} ({2})" -f $eItem.Status, $eItem.Name, $eItem.LocalPath) -ForegroundColor $color
                Write-Host ("       Reason: {0}" -f $eItem.Reason) -ForegroundColor Gray
            }
        } else {
            Write-Host "[OK] No environments registered in Antigravity project memory." -ForegroundColor Green
        }
    } else {
        Write-Host "[INFO] No matching Antigravity project configuration found in ~/.gemini/config/projects/." -ForegroundColor Gray
    }

    $envsToDelete = @($envActions | Where-Object { $_.Status -eq "DELETE" })

    # 6. Execution or Dry Run Summary
    Write-Host "`n[5/5] Execution Plan Summary" -ForegroundColor Cyan

    Write-Host "Worktrees eligible for deletion:   $($wtsToDelete.Count)" -ForegroundColor $(if ($wtsToDelete.Count -gt 0) { 'Green' } else { 'Gray' })
    Write-Host "Branches eligible for deletion:    $($branchesToDelete.Count)" -ForegroundColor $(if ($branchesToDelete.Count -gt 0) { 'Green' } else { 'Gray' })
    Write-Host "Antigravity environments to prune: $($envsToDelete.Count)" -ForegroundColor $(if ($envsToDelete.Count -gt 0) { 'Green' } else { 'Gray' })

    if (-not $Execute) {
        Write-Host "`n[DRY RUN COMPLETE] Zero changes were made." -ForegroundColor Yellow
        Write-Host "To execute deletion of verified merged items in Git:    .\prune.ps1 -Execute" -ForegroundColor Yellow
        Write-Host "To also prune deleted entries from Antigravity memory:  .\prune.ps1 -Execute -PruneAntigravityConfig" -ForegroundColor Yellow
        return
    }

    if ($wtsToDelete.Count -eq 0 -and $branchesToDelete.Count -eq 0 -and ($envsToDelete.Count -eq 0 -or -not $PruneAntigravityConfig)) {
        Write-Host "`nEverything is already clean! Nothing to delete." -ForegroundColor Green
        return
    }

    # Perform Worktree Deletions
    foreach ($wtItem in $wtsToDelete) {
        Write-Host "Removing merged worktree: $($wtItem.Path)..." -ForegroundColor Yellow
        git -C $repoRoot worktree remove $wtItem.Path
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Removed worktree from Git successfully." -ForegroundColor Green
        } else {
            Write-Warning "Could not remove worktree $($wtItem.Path) with git worktree remove (exit code: $LASTEXITCODE)."
            $operationFailed = $true
        }

        # Clean residual folder if git left untracked artifacts behind (e.g. node_modules)
        if (Test-Path $wtItem.Path) {
            $hasRemainingGit = Test-Path (Join-Path $wtItem.Path ".git")
            if (-not $hasRemainingGit) {
                Write-Host "Cleaning residual directory: $($wtItem.Path)..." -ForegroundColor Yellow
                Remove-Item -Path $wtItem.Path -Recurse -Force -ErrorAction SilentlyContinue
            }
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

    # Perform Antigravity Memory Pruning (When requested)
    if ($PruneAntigravityConfig) {
        if ($antigravityConfig -and $envsToDelete.Count -gt 0) {
            Write-Host "`nPruning Antigravity project memory ($($antigravityConfig.FilePath))..." -ForegroundColor Yellow

            # Create safety backup
            Copy-Item -Path $antigravityConfig.FilePath -Destination "$($antigravityConfig.FilePath).bak" -Force
            Write-Host "Backup created: $($antigravityConfig.FilePath).bak" -ForegroundColor Gray

            $survivingEnvs = @($envActions | Where-Object { $_.Status -eq "PRESERVE" } | ForEach-Object { $_.EnvObject })
            $antigravityConfig.Data.environments.environments = $survivingEnvs

            # Cleanly save JSON
            $updatedJson = $antigravityConfig.Data | ConvertTo-Json -Depth 20
            [System.IO.File]::WriteAllText($antigravityConfig.FilePath, $updatedJson, [System.Text.Encoding]::UTF8)

            Write-Host "Pruned $($envsToDelete.Count) environment(s) from Antigravity memory successfully." -ForegroundColor Green
        } elseif ($envsToDelete.Count -eq 0) {
            Write-Host "`nAntigravity project memory is already clean." -ForegroundColor Green
        }
    } else {
        if ($envsToDelete.Count -gt 0) {
            Write-Host "`n[INFO] Antigravity project memory was NOT modified ($($envsToDelete.Count) environment(s) eligible)." -ForegroundColor Gray
            Write-Host "To remove them from Antigravity's UI dropdown, rerun with: -PruneAntigravityConfig" -ForegroundColor Gray
        }
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
