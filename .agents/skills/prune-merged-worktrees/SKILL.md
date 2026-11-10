---
name: prune-merged-worktrees
description: Safe cleanup workflow to audit, prune, and delete verified merged Git worktrees and branches while strictly preserving active, dirty, freshly branched, or unmerged work. Triggers on /prune-merged-worktrees, /prune-worktrees, /prune, "prune merged worktrees", "clean merged worktrees", "delete merged branches", "sweep worktrees".
---

# Skill: Prune Merged Worktrees & Branches (`/prune-merged-worktrees`)

This skill safely audits, prunes, and deletes completed Git worktrees, merged branches, and Antigravity IDE project environments across Tracklet. It enforces an absolute non-destructive safety contract so that **no active, uncommitted, freshly created, or unmerged work is ever deleted**.

---

## 1. Safety Invariants & Engineering Rationale

### Invariant 1: The Non-Destructive Working Tree Invariant
- **Rule**: Never delete a worktree that contains uncommitted changes (unstaged, staged, or untracked files).
- **The "Why"**: In parallel AI pair programming, worktrees often hold experimental components, draft rules, or work-in-progress tests before a PR is opened. Deleting a dirty worktree with `git worktree remove --force` destroys uncommitted code permanently.
- **Verification**: Always inspect `git -C <path> status --porcelain`. If any lines are returned, the worktree is classified as **DIRTY / UNCOMMITTED WORK** and marked **PRESERVE**.

### Invariant 2: Squash-and-Merge Awareness vs Simple Git Merged Checks
- **Rule**: Never rely solely on `git branch --merged main`.
- **The "Why"**: Tracklet uses GitHub **Squash and Merge** for all PRs. Squash-merging creates a brand-new squashed commit on `main` with a unique commit SHA. The original feature branch commits are *not* in `main`'s DAG! Consequently:
  - `git branch --merged main` will falsely report merged feature branches as unmerged.
  - Relying on simple git merge commands causes either failure to delete completed branches or dangerous manual forced deletions without verification.
- **The Solution**: Cross-reference GitHub PR merge records (`gh pr list --state merged --json headRefName,number,title`) alongside `git merge-base --is-ancestor`.

### Invariant 3: The "Fresh Trunk Checkout" Trap
- **Rule**: Never assume `git merge-base --is-ancestor <branch> origin/main` means a branch is safe to delete.
- **The "Why"**: When a developer or agent creates a fresh feature branch directly from `main` to start a task, its `HEAD` is identical to `origin/main`. Because it is an ancestor of `main`, a naive ancestry check would report it as "merged" and delete it before the developer even writes their first commit!
- **The Solution**: A branch pointing to `origin/main` without a verified merged GitHub PR is classified as **Fresh branch at trunk / pending work** and marked **PRESERVE**.

### Invariant 4: Protected Trunk & Active Workspace Invariant
- **Rule**: Never delete `main`, `master`, or the worktree hosting the current running session / IDE workspace.
- **The "Why"**: Deleting the active execution directory on Windows triggers `Permission denied` file lock errors and invalidates the session's current working directory.

### Invariant 5: Antigravity IDE Memory Synchronization & Explicit User Consent
- **Rule**: Never modify or remove entries from Antigravity's project memory file (`~/.gemini/config/projects/<id>.json`) without **explicit user consent**.
- **The "Why"**: Antigravity maintains its own registry of worktree "environments" inside `~/.gemini/config/projects/<project-id>.json`. Removing a worktree via Git (`git worktree remove`) deletes it from Git's tree, but Antigravity's UI dropdown will continue to show it indefinitely as a ghost environment unless pruned from the project's JSON configuration. Because modifying application-level configuration alters Antigravity's internal state, the AI agent must always ask the user for confirmation first.

### Invariant 6: Residual Untracked Files Cleanup
- **Rule**: When removing a worktree from disk, check for and clean up residual directories containing ignored untracked files (e.g. symlinked `node_modules` or `.next`).
- **The "Why"**: `git worktree remove` deletes Git-tracked files, but leaves directories behind if untracked files exist. This creates empty ghost directories that clutter `~/.gemini/antigravity/worktrees/`.

---

## 2. Step-by-Step Procedure

### Step 1: Run the Audit in Preview Mode
Run the built-in PowerShell helper in safe dry-run mode:
```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/prune-merged-worktrees/scripts/prune.ps1
```

The script will:
1. Prune obsolete remote tracking branches (`git fetch --prune origin`).
2. Fetch merged PR names from GitHub via `gh pr list --state merged`.
3. Audit every active worktree (`git worktree list --porcelain`) and check for uncommitted files (`git status --porcelain`).
4. Audit all local branches and categorize each into:
   - `PRESERVE`: Protected (`main`), dirty worktree, unmerged commits, or freshly branched trunk.
   - `DELETE`: Verified merged PR & clean worktree.
5. Audit Antigravity project memory in `~/.gemini/config/projects/*.json` for linked environments and orphaned ghosts.
6. Output a colorized audit table with explicit reasons for each decision.

### Step 2: Review Categories and Ask the User

Present the audit summary clearly:
- **Eligible for Deletion (Git)**: Merged branches and clean worktrees whose PRs have closed into `main`.
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

---

## 3. Helper Script Reference

The automated audit and prune script is located at:
- [prune.ps1](./scripts/prune.ps1)

Options:
- `.\prune.ps1`: Default safe audit / dry run.
- `.\prune.ps1 -Execute`: Performs deletions on verified merged Git items only.
- `.\prune.ps1 -Execute -PruneAntigravityConfig`: Performs deletions on Git items AND prunes Antigravity project JSON memory.
- `.\prune.ps1 -SkipRemotePrune`: Skips remote prune step.
- `.\prune.ps1 -RepoPath <path>`: Explicit repository root override.
