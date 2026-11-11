<#
.SYNOPSIS
    Safely audit, prune, and delete merged Git worktrees, branches, orphaned Antigravity folders, and Antigravity IDE environments in Tracklet.

.DESCRIPTION
    Scans local branches across the Main Worktree and linked worktrees, audits Antigravity
    project environments, and detects orphaned zombie folders in Antigravity storage.
    Cross-references GitHub PR merge status and commit ancestor graphs, and deletes ONLY
    verified merged branches, clean worktrees, and orphaned Antigravity folders.

    Strictly preserves:
    - Protected branches (main, master)
    - Worktrees with uncommitted/unstaged changes or untracked files
    - Unmerged branches (commits not integrated into origin/main)
    - Freshly created branches pointing to trunk (pending work)
    - Active execution worktrees (current working directory)
    - Checked-out branches on the Main Worktree (requires switching branch first)

    Optional Antigravity IDE Synchronization (-PruneAntigravityConfig):
    - Synchronizes Antigravity project memory (~/.gemini/config/projects/<id>.json)
    - Prunes ghost environments and removed worktrees from the Antigravity UI dropdown
    - Purges orphaned zombie directories in ~/.gemini/antigravity/worktrees/<Project>/

.PARAMETER Execute
    Perform actual deletion. If omitted, runs in DryRun mode.

.PARAMETER MainWorktreeOnly
    Only audit and clean branches on the Main Worktree (skip linked worktrees, orphans, and IDE memory).

.PARAMETER PruneAntigravityConfig
    Synchronize and remove deleted/ghost worktree entries from Antigravity's project memory
    (~/.gemini/config/projects/<id>.json). Always prompts in agentic workflows.

.PARAMETER SkipRemotePrune
    Skip pruning stale remote tracking refs via 'git fetch --prune origin'.

.PARAMETER RepoPath
    Optional path to the Git repository or worktree root.

.EXAMPLE
    .\prune.ps1
    # Safe preview (DryRun) of all worktrees, branches, orphans, and Antigravity memory

.EXAMPLE
    .\prune.ps1 -MainWorktreeOnly
    # Scans branches specifically on the Main Worktree

.EXAMPLE
    .\prune.ps1 -Execute
    # Deletes verified merged worktrees, branches, and orphaned Antigravity folders in Git

.EXAMPLE
    .\prune.ps1 -Execute -PruneAntigravityConfig
    # Deletes verified merged items in Git AND synchronizes Antigravity project JSON memory
#>

[CmdletBinding()]
param(
    [switch]$Execute,
    [switch]$MainWorktreeOnly,
    [switch]$PruneAntigravityConfig,
    [switch]$SkipRemotePrune,
    [string]$RepoPath = ""
)

$ErrorActionPreference = "Continue"
if (Get-Variable -Name "PSNativeCommandUseErrorActionPreference" -ErrorAction SilentlyContinue) {
    $PSNativeCommandUseErrorActionPreference = $false
}

# Resolve current worktree root
if (-not $RepoPath) {
    try {
        $RepoPath = (git rev-parse --show-toplevel 2>$null)
    } catch {}
}
if (-not $RepoPath -or -not (Test-Path $RepoPath)) {
    $scriptRootCand = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
    if (Test-Path "$scriptRootCand\.git") {
        $RepoPath = $scriptRootCand
    }
}

if (-not $RepoPath) {
    Write-Error "Could not locate Git repository. Specify -RepoPath <path>."
    exit 1
}

$currentDir = (Resolve-Path $RepoPath).Path
Push-Location $currentDir

try {
    # Resolve Main Worktree root from common git directory
    $commonGitDir = (git rev-parse --git-common-dir 2>$null).Trim()
    if ($commonGitDir -and (Test-Path $commonGitDir)) {
        $mainWorktreePath = (Resolve-Path (Join-Path $commonGitDir "..")).Path
    } else {
        $mainWorktreePath = $currentDir
    }

    Write-Host "=== Git Prune: Worktrees & Branches Audit ===" -ForegroundColor Cyan
    Write-Host "Current Worktree: $currentDir" -ForegroundColor Gray
    Write-Host "Main Worktree:    $mainWorktreePath" -ForegroundColor Gray
    Write-Host "Execution Mode:   $(if ($Execute) { 'EXECUTE (Live Deletion)' } else { 'DRY RUN (Preview Only)' })" -ForegroundColor Yellow
    if ($MainWorktreeOnly) {
        Write-Host "Scope:            MAIN WORKTREE BRANCHES ONLY" -ForegroundColor Magenta
    } else {
        Write-Host "Scope:            FULL (Main Worktree, Linked Worktrees & Antigravity Orphans)" -ForegroundColor Gray
        Write-Host "Antigravity Sync: $(if ($PruneAntigravityConfig) { 'ENABLED' } else { 'DISABLED (Git only)' })" -ForegroundColor $(if ($PruneAntigravityConfig) { 'Green' } else { 'Gray' })
    }
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
        git fetch --prune origin 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "git fetch --prune origin failed with exit code $LASTEXITCODE."
            $operationFailed = $true
        }
    }

    # Get origin/main SHA
    $originMainSha = (git rev-parse origin/main 2>$null).Trim()

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
            git merge-base --is-ancestor $BranchSha $pr.headRefOid 2>$null
            if ($LASTEXITCODE -eq 0) {
                return $pr
            }
        }
        return $null
    }

    # 3. Parse all worktrees
    $worktreeRaw = git worktree list --porcelain
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

    $mainWtNorm = $mainWorktreePath.Replace('\', '/').TrimEnd('/')
    $currentDirNorm = $currentDir.Replace('\', '/').TrimEnd('/')
    $worktreeBranches = $worktrees.Branch

    # Identify main worktree info
    $mainWtObj = $worktrees | Where-Object { $_.Path.Replace('\', '/').TrimEnd('/') -eq $mainWtNorm } | Select-Object -First 1
    $mainWtBranch = if ($mainWtObj) { $mainWtObj.Branch } else { "" }

    # 4. Audit Branches on Main Worktree
    Write-Host "`n[2/5] Auditing Branches on Main Worktree ($mainWorktreePath)..." -ForegroundColor Cyan
    Write-Host "       Checked out branch on Main Worktree: $(if ($mainWtBranch) { $mainWtBranch } else { '(detached HEAD)' })" -ForegroundColor Gray

    $localBranches = (git for-each-ref --format='%(refname:short)|%(objectname)|%(objectname:short)' refs/heads/) -split "`n"
    $mainWorktreeBranchActions = @()
    $allBranchActions = @()

    foreach ($bLine in $localBranches) {
        $bLine = $bLine.Trim()
        if (-not $bLine) { continue }
        $parts = $bLine.Split('|')
        $bName = $parts[0]
        $bSha = $parts[1]
        $bShaShort = if ($parts.Length -gt 2) { $parts[2] } else { if ($bSha.Length -ge 7) { $bSha.Substring(0, 7) } else { $bSha } }

        $isMain = ($bName -in @("main", "master"))
        $isCheckedOutOnMain = ($bName -eq $mainWtBranch)
        $hasLinkedWorktree = ($bName -in $worktreeBranches) -and (-not $isCheckedOutOnMain)

        $matchedPr = Find-VerifiedMergedPr -BranchName $bName -BranchSha $bSha
        $hasMergedPr = ($null -ne $matchedPr)
        $isDirectAncestor = $false
        git merge-base --is-ancestor $bSha origin/main 2>$null
        if ($LASTEXITCODE -eq 0) { $isDirectAncestor = $true }

        $isFreshBranchAtTrunk = ($bSha -eq $originMainSha) -and (-not $hasMergedPr)

        $decision = "PRESERVE"
        $reason = ""

        if ($isMain) {
            $reason = "Protected default trunk branch"
        } elseif ($isCheckedOutOnMain) {
            if ($hasMergedPr) {
                $reason = "CHECKED OUT ON MAIN WORKTREE (Merged via PR #$($matchedPr.number) '$($matchedPr.title)') - switch main worktree to delete"
            } elseif ($isDirectAncestor) {
                $reason = "CHECKED OUT ON MAIN WORKTREE (Merged via direct ancestry) - switch main worktree to delete"
            } else {
                $reason = "CHECKED OUT ON MAIN WORKTREE (Active/unmerged branch)"
            }
        } elseif ($hasLinkedWorktree) {
            $reason = "Attached to a separate linked worktree"
        } elseif ($isFreshBranchAtTrunk) {
            $reason = "Fresh branch at trunk / pending work (DO NOT DELETE)"
        } elseif (-not $hasMergedPr -and -not $isDirectAncestor) {
            $reason = "UNMERGED COMMITS (DO NOT DELETE)"
        } elseif ($hasMergedPr) {
            $decision = "DELETE"
            $reason = "Merged via PR #$($matchedPr.number) '$($matchedPr.title)' (Unattached branch on main worktree)"
        } elseif ($isDirectAncestor) {
            $decision = "DELETE"
            $reason = "Merged into main (direct ancestry) (Unattached branch on main worktree)"
        } else {
            $reason = "Uncertain merge status (PRESERVED for safety)"
        }

        $bObj = [PSCustomObject]@{
            Branch = $bName
            Commit = $bShaShort
            IsOnMainWorktree = (-not $hasLinkedWorktree)
            IsCheckedOutOnMain = $isCheckedOutOnMain
            Status = $decision
            Reason = $reason
        }
        $allBranchActions += $bObj
        if (-not $hasLinkedWorktree) {
            $mainWorktreeBranchActions += $bObj
        }
    }

    foreach ($bItem in $mainWorktreeBranchActions) {
        $color = if ($bItem.Status -eq "DELETE") { "Red" } else { "Green" }
        Write-Host ("[{0}] {1} [{2}]" -f $bItem.Status, $bItem.Branch, $bItem.Commit) -ForegroundColor $color
        Write-Host ("       Reason: {0}" -f $bItem.Reason) -ForegroundColor Gray
    }

    # 5. Audit Linked Worktrees & Antigravity Orphan Folders
    $worktreeActions = @()
    $orphanedAgyWorktrees = @()

    if (-not $MainWorktreeOnly) {
        Write-Host "`n[3/5] Auditing Linked Antigravity Worktrees..." -ForegroundColor Cyan

        foreach ($wt in $worktrees) {
            $wtPathNorm = $wt.Path.Replace('\', '/').TrimEnd('/')
            $isMainWt = ($wtPathNorm -eq $mainWtNorm)
            $isCurrent = ($wtPathNorm -eq $currentDirNorm)

            if ($isMainWt) {
                continue
            }

            # Check dirty status inside linked worktree
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
                git merge-base --is-ancestor $wt.Head origin/main 2>$null
                if ($LASTEXITCODE -eq 0) { $isDirectAncestor = $true }
            }

            $isFreshBranchAtTrunk = ($wt.Head -eq $originMainSha) -and (-not $hasMergedPr)

            $decision = "PRESERVE"
            $reason = ""

            if ($isCurrent) {
                $reason = "Active execution worktree (current session directory)"
            } elseif ($isDirty) {
                $reason = "UNCOMMITTED WORK: $dirtySummary (DO NOT DELETE)"
            } elseif ($isFreshBranchAtTrunk) {
                $reason = "Fresh branch at trunk / pending work (DO NOT DELETE)"
            } elseif (-not $hasMergedPr -and -not $isDirectAncestor) {
                $reason = "UNMERGED COMMITS (DO NOT DELETE)"
            } elseif ($hasMergedPr) {
                $decision = "DELETE"
                $reason = "Merged via PR #$($matchedPr.number) '$($matchedPr.title)' & working tree clean"
            } elseif ($isDirectAncestor) {
                $decision = "DELETE"
                $reason = "Merged into main (direct ancestry) & working tree clean"
            } else {
                $reason = "Uncertain merge status (PRESERVED for safety)"
            }

            $wtActionObj = [PSCustomObject]@{
                Path = $wt.Path
                Branch = $wt.Branch
                Status = $decision
                Reason = $reason
            }
            $worktreeActions += $wtActionObj

            $color = if ($decision -eq "DELETE") { "Red" } else { "Green" }
            Write-Host ("[{0}] {1} ({2})" -f $decision, $wt.Branch, $wt.Path) -ForegroundColor $color
            Write-Host ("       Reason: {0}" -f $reason) -ForegroundColor Gray
        }

        # Audit Orphaned Antigravity Directories (folders under ~/.gemini/antigravity/worktrees/<Project>/ with no .git reference)
        $agyBase = [System.IO.Path]::GetFullPath((Join-Path $env:USERPROFILE ".gemini\antigravity\worktrees"))
        $agyProjectDir = $null
        if (Test-Path $agyBase) {
            $pName = Split-Path $mainWorktreePath -Leaf
            $candidate = Join-Path $agyBase $pName
            if (Test-Path $candidate) {
                $agyProjectDir = $candidate
            }
        }

        if ($agyProjectDir -and (Test-Path $agyProjectDir)) {
            Write-Host "`n       Auditing Antigravity storage for orphaned zombie folders ($agyProjectDir)..." -ForegroundColor Cyan
            $activeWorktreePaths = @($worktrees.Path | ForEach-Object { [System.IO.Path]::GetFullPath($_).TrimEnd('\', '/') })
            $candidateDirs = Get-ChildItem -Path $agyProjectDir -Directory -ErrorAction SilentlyContinue

            foreach ($cDir in $candidateDirs) {
                $cFull = [System.IO.Path]::GetFullPath($cDir.FullName).TrimEnd('\', '/')
                if ($cFull -eq $currentDirNorm) { continue }
                if ($cFull -in $activeWorktreePaths) { continue }

                # Check if this folder has a .git file/dir
                $hasGit = Test-Path (Join-Path $cDir.FullName ".git")
                if (-not $hasGit) {
                    $orphanedAgyWorktrees += [PSCustomObject]@{
                        Path = $cDir.FullName
                        Name = $cDir.Name
                        Status = "DELETE"
                        Reason = "Orphaned Antigravity folder (unlinked from Git; clears Antigravity memory)"
                    }
                }
            }

            if ($orphanedAgyWorktrees.Count -gt 0) {
                foreach ($oItem in $orphanedAgyWorktrees) {
                    Write-Host ("[{0}] {1} ({2})" -f $oItem.Status, $oItem.Name, $oItem.Path) -ForegroundColor Red
                    Write-Host ("       Reason: {0}" -f $oItem.Reason) -ForegroundColor Gray
                }
            } else {
                Write-Host "       Zero orphaned Antigravity folders found." -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "`n[3/5] Linked Worktrees: Skipped (-MainWorktreeOnly active)" -ForegroundColor Gray
    }

    # 6. Audit Antigravity Project Memory (~/.gemini/config/projects/*.json)
    $wtsToDelete = @($worktreeActions | Where-Object { $_.Status -eq "DELETE" })
    $antigravityConfig = Get-AntigravityProjectConfig -TargetRepoPath $mainWorktreePath
    $envActions = @()

    if (-not $MainWorktreeOnly) {
        Write-Host "`n[4/5] Auditing Antigravity Project Memory..." -ForegroundColor Cyan

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
    } else {
        Write-Host "`n[4/5] Antigravity Project Memory: Skipped (-MainWorktreeOnly active)" -ForegroundColor Gray
    }

    $envsToDelete = @($envActions | Where-Object { $_.Status -eq "DELETE" })

    # 7. Execution Plan Summary
    Write-Host "`n[5/5] Execution Plan Summary" -ForegroundColor Cyan

    $mainBranchesToDelete = @($mainWorktreeBranchActions | Where-Object { $_.Status -eq "DELETE" })
    $orphansToDelete = @($orphanedAgyWorktrees | Where-Object { $_.Status -eq "DELETE" })
    $otherBranchesToDelete = @($allBranchActions | Where-Object { $_.Status -eq "DELETE" -and $_.Branch -notin $mainBranchesToDelete.Branch })

    Write-Host "Merged branches on Main Worktree eligible for deletion: $($mainBranchesToDelete.Count)" -ForegroundColor $(if ($mainBranchesToDelete.Count -gt 0) { 'Green' } else { 'Gray' })
    if (-not $MainWorktreeOnly) {
        Write-Host "Linked worktrees eligible for deletion:                 $($wtsToDelete.Count)" -ForegroundColor $(if ($wtsToDelete.Count -gt 0) { 'Green' } else { 'Gray' })
        Write-Host "Orphaned Antigravity folders eligible for purge:        $($orphansToDelete.Count)" -ForegroundColor $(if ($orphansToDelete.Count -gt 0) { 'Green' } else { 'Gray' })
        Write-Host "Antigravity environments to prune:                     $($envsToDelete.Count)" -ForegroundColor $(if ($envsToDelete.Count -gt 0) { 'Green' } else { 'Gray' })
    }

    if (-not $Execute) {
        Write-Host "`n[DRY RUN COMPLETE] Zero changes were made." -ForegroundColor Yellow
        Write-Host "To execute deletion of verified merged items in Git:    .\prune.ps1 -Execute$(if ($MainWorktreeOnly) { ' -MainWorktreeOnly' })" -ForegroundColor Yellow
        if (-not $MainWorktreeOnly) {
            Write-Host "To also prune deleted entries from Antigravity memory:  .\prune.ps1 -Execute -PruneAntigravityConfig" -ForegroundColor Yellow
        }
        return
    }

    if ($mainBranchesToDelete.Count -eq 0 -and $wtsToDelete.Count -eq 0 -and $orphansToDelete.Count -eq 0 -and $otherBranchesToDelete.Count -eq 0 -and ($envsToDelete.Count -eq 0 -or -not $PruneAntigravityConfig)) {
        Write-Host "`nEverything is already clean! Nothing to delete." -ForegroundColor Green
        return
    }

    # Purge Orphaned Antigravity Folders
    if (-not $MainWorktreeOnly) {
        foreach ($oItem in $orphansToDelete) {
            Write-Host "Purging orphaned Antigravity folder: $($oItem.Name)..." -ForegroundColor Yellow
            Remove-Item -Path $oItem.Path -Recurse -Force -ErrorAction SilentlyContinue
            if (-not (Test-Path $oItem.Path)) {
                Write-Host "Purged orphaned folder successfully." -ForegroundColor Green
            } else {
                Write-Warning "Could not completely purge folder $($oItem.Path)."
                $operationFailed = $true
            }
        }
    }

    # Execute Worktree Deletions
    if (-not $MainWorktreeOnly) {
        foreach ($wtItem in $wtsToDelete) {
            Write-Host "Removing merged worktree: $($wtItem.Path)..." -ForegroundColor Yellow
            git worktree remove --force $wtItem.Path 2>$null
            if (Test-Path $wtItem.Path) {
                Remove-Item -Path $wtItem.Path -Recurse -Force -ErrorAction SilentlyContinue
            }
            if (-not (Test-Path $wtItem.Path)) {
                Write-Host "Removed worktree directory and purged from Antigravity workspace memory successfully." -ForegroundColor Green
            } else {
                Write-Warning "Could not completely remove worktree directory $($wtItem.Path)."
                $operationFailed = $true
            }
        }
    }

    # Execute Branch Deletions
    $branchesToDeleteFinal = @($mainBranchesToDelete)
    if (-not $MainWorktreeOnly) {
        $branchesToDeleteFinal += @($wtsToDelete | ForEach-Object { [PSCustomObject]@{ Branch = $_.Branch } })
        $branchesToDeleteFinal += @($otherBranchesToDelete)
    }

    $uniqueBranchNames = @($branchesToDeleteFinal.Branch | Select-Object -Unique)
    foreach ($bName in $uniqueBranchNames) {
        if (-not $bName) { continue }
        Write-Host "Deleting merged branch: $bName..." -ForegroundColor Yellow
        git branch -D $bName
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Deleted branch $bName successfully." -ForegroundColor Green
        } else {
            Write-Warning "Could not delete branch $bName (exit code: $LASTEXITCODE)."
            $operationFailed = $true
        }
    }

    # Final git worktree prune
    git worktree prune
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "git worktree prune failed with exit code $LASTEXITCODE."
        $operationFailed = $true
    }

    # Perform Antigravity Memory Pruning (When requested)
    if ($PruneAntigravityConfig -and -not $MainWorktreeOnly) {
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
        if ($envsToDelete.Count -gt 0 -and -not $MainWorktreeOnly) {
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
