---
name: prune-merged-worktrees
description: Safe audit and cleanup workflow to scan all worktrees and branches, inspect branches on the main worktree, identify unmerged work, purge orphaned Antigravity folders, and delete verified merged worktrees while synchronizing Antigravity project workspace memory. Triggers on /scan-worktrees, /audit-worktrees, /prune-merged-worktrees, /prune-worktrees, /prune, "scan worktrees", "audit worktrees", "scan branches on main worktree", "check merged worktrees", "prune merged worktrees", "clean merged worktrees".
---

# Skill: Scan & Prune Merged Worktrees (`/scan-worktrees` | `/prune-worktrees`)

This skill safely scans, audits, and prunes Git worktrees, branches, and orphaned directories across Tracklet. It inspects what has been merged into `origin/main`, audits branches on the **Main Worktree** (the root repository), audits linked Antigravity worktrees, detects orphaned zombie folders in Antigravity storage, and provides safe execution to delete verified merged items while synchronizing Antigravity's workspace memory.

---

## 1. Architectural Model & Safety Invariants

### Invariant 1: The Main Worktree vs Linked Worktrees
- **Main Worktree (`D:/Programming/Tracklet`)**: The primary root repository where the shared `.git` directory lives. Hosts branches that are unattached to any separate linked worktrees (e.g. `main` or local feature branches), as well as whichever branch is currently checked out on the main worktree.
- **Linked Antigravity Worktrees (`~/.gemini/antigravity/worktrees/Tracklet/*`)**: Isolated worktrees created by Antigravity for parallel feature development.
- **Checked-Out Branch Protection**: A branch currently checked out on the Main Worktree cannot be deleted directly by Git (`git branch -D`). The script warns the user to switch branches on the Main Worktree if it has been merged.

### Invariant 2: The Non-Destructive Working Tree Invariant
- **Rule**: Never delete a worktree that contains uncommitted changes (unstaged, staged, or untracked files).
- **The "Why"**: In parallel AI pair programming, worktrees often hold experimental components, draft rules, or work-in-progress tests before a PR is opened. Deleting a dirty worktree with `git worktree remove --force` destroys uncommitted code permanently.
- **Verification**: Always inspect `git -C <path> status --porcelain`. If any lines are returned, the worktree is classified as **DIRTY / UNCOMMITTED WORK** and marked **PRESERVE**.

### Invariant 3: Squash-and-Merge Awareness vs Simple Git Merged Checks
- **Rule**: Never rely solely on `git branch --merged main`.
- **The "Why"**: Tracklet uses GitHub **Squash and Merge** for all PRs. Squash-merging creates a brand-new squashed commit on `main` with a unique commit SHA. The original feature branch commits are *not* in `main`'s DAG! Consequently:
  - `git branch --merged main` will falsely report merged feature branches as unmerged.
  - Relying on simple git merge commands causes either failure to delete completed branches or dangerous manual forced deletions without verification.
- **The Solution**: Cross-reference GitHub PR merge records (`gh pr list --state merged --json headRefName,number,title`) alongside `git merge-base --is-ancestor`.

### Invariant 4: The "Fresh Trunk Checkout" Trap
- **Rule**: Never assume `git merge-base --is-ancestor <branch> origin/main` means a branch is safe to delete.
- **The "Why"**: When a developer or agent creates a fresh feature branch directly from `main` to start a task, its `HEAD` is identical to `origin/main`. Because it is an ancestor of `main`, a naive ancestry check would report it as "merged" and delete it before the developer even writes their first commit!
- **The Solution**: A branch pointing to `origin/main` without a verified merged GitHub PR is classified as **Fresh branch at trunk / pending work** and marked **PRESERVE**.

### Invariant 5: Antigravity IDE Memory Synchronization & Explicit User Consent
- **Rule**: Never modify or remove entries from Antigravity's project memory file (`~/.gemini/config/projects/<id>.json`) without **explicit user consent**.
- **The "Why"**: Antigravity maintains its own registry of worktree "environments" inside `~/.gemini/config/projects/<project-id>.json`. Removing a worktree via Git (`git worktree remove`) deletes it from Git's tree, but Antigravity's UI dropdown will continue to show it indefinitely as a ghost environment unless pruned from the project's JSON configuration. Because modifying application-level configuration alters Antigravity's internal state, the AI agent must always ask the user for confirmation first.

### Invariant 6: Residual Untracked Files & Zombie Orphaned Folders
- Antigravity IDE populates its workspace selectors and chat dropdown (*"Search past worktrees..."*) by scanning:
  1. Active Git worktrees via `git worktree list`.
  2. Physical filesystem directories under `~/.gemini/antigravity/worktrees/<Project>/`.
- When worktrees are unlinked in Git, leftover untracked files (such as `node_modules` or build caches) often cause Windows to retain the directory, creating "zombie" folders that Antigravity continues to detect.
- **The Sweeper**:
  1. Detects any directory under `~/.gemini/antigravity/worktrees/<Project>/` that has no `.git` link and is not registered in `git worktree list`.
  2. Purges it with `Remove-Item -Recurse -Force`.

---

## 2. Step-by-Step Procedure

### Step 1: Run the Audit in Preview Mode
Run the built-in PowerShell helper in safe dry-run mode:
```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/prune-merged-worktrees/scripts/prune.ps1
```
Or for the Main Worktree only:
```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/prune-merged-worktrees/scripts/prune.ps1 -MainWorktreeOnly
```

The script will:
1. Prune obsolete remote tracking branches (`git fetch --prune origin`).
2. Fetch merged PR names from GitHub via `gh pr list --state merged`.
3. Audit branches on the Main Worktree (`$mainWorktreePath`).
4. Audit every active linked worktree (`git worktree list --porcelain`) and check for uncommitted files (`git status --porcelain`).
5. Scan Antigravity storage for orphaned zombie folders.
6. Audit Antigravity project memory in `~/.gemini/config/projects/*.json` for linked environments and orphaned ghosts.
7. Output a colorized audit table with explicit reasons for each decision.

### Step 2: Review Categories and Ask the User

Present the audit summary clearly:
- **Main Worktree Branches**: Merged branches unattached to any separate worktree.
- **Linked Worktrees**: Clean worktrees whose PRs have closed into `main`.
- **Orphaned Folders**: Leftover unlinked directories in Antigravity storage.
- **Preserved (Active/Dirty)**: Worktrees with uncommitted files, branches with unmerged commits, or fresh pending branches.
- **Antigravity Environments**: Worktree entries registered in Antigravity's project memory file that are either scheduled for deletion or are orphaned ghosts.

#### Mandatory AI Agent Interaction:
> [!IMPORTANT]
> If any worktrees are marked for deletion OR if ghost environments exist in Antigravity's project memory:
> **The AI agent MUST prompt the user via `ask_question`:**
> 
> ```json
> {
>   "questions": [
>     {
>       "question": "Do you want to delete the pruned worktree(s) from Antigravity's project memory (~/.gemini/config/projects/<id>.json) as well?",
>       "options": [
>         "(Recommended) Yes, prune from Antigravity memory and remove ghost folders",
>         "No, keep Antigravity memory untouched (Git-only cleanup)"
>       ],
>       "is_multi_select": false
>     }
>   ]
> }
> ```

### Step 3: Execute Deletion (When Authorized)

#### Case A: User consented to Antigravity memory synchronization
Execute with both `-Execute` and `-PruneAntigravityConfig`:
```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/prune-merged-worktrees/scripts/prune.ps1 -Execute -PruneAntigravityConfig
```

#### Case B: User chose Git-only cleanup
Execute with `-Execute` only:
```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/prune-merged-worktrees/scripts/prune.ps1 -Execute
```

#### Case C: Main Worktree branches only
```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/prune-merged-worktrees/scripts/prune.ps1 -Execute -MainWorktreeOnly
```

---

## 3. Helper Script Reference

The automated audit and prune script is located at:
- [prune.ps1](./scripts/prune.ps1)

Options:
- `.\prune.ps1`: Safe full audit (dry run, zero changes).
- `.\prune.ps1 -MainWorktreeOnly`: Focus audit strictly on branches on the Main Worktree.
- `.\prune.ps1 -Execute`: Deletes verified clean merged worktrees, branches, and orphaned Antigravity folders in Git only.
- `.\prune.ps1 -Execute -PruneAntigravityConfig`: Deletes verified merged items in Git AND synchronizes Antigravity project JSON memory.
- `.\prune.ps1 -SkipRemotePrune`: Skips remote fetch prune.
- `.\prune.ps1 -RepoPath <path>`: Explicit repository root override.
