---
name: prune-merged-worktrees
description: Safe cleanup workflow to audit, prune, and delete verified merged Git worktrees and branches while strictly preserving active, dirty, freshly branched, or unmerged work. Triggers on /prune-merged-worktrees, /prune-worktrees, /prune, "prune merged worktrees", "clean merged worktrees", "delete merged branches", "sweep worktrees".
---

# Skill: Prune Merged Worktrees & Branches (`/prune-merged-worktrees`)

This skill safely audits, prunes, and deletes completed Git worktrees and merged branches across Tracklet. It enforces an absolute non-destructive safety contract so that **no active, uncommitted, freshly created, or unmerged work is ever deleted**.

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
5. Output a colorized audit table with explicit reasons for each decision.

### Step 2: Review Categories with the User
Present the audit results clearly to the user:
- **Eligible for Deletion**: Merged branches and clean worktrees whose PRs have closed into `main`.
- **Preserved (Active/Dirty)**: Worktrees with uncommitted files, branches with unmerged commits, or fresh pending branches.

If any ambiguous branches exist (e.g., an abandoned unmerged spike or dirty worktree the user might want to abandon), use `ask_question` to let the user decide whether to preserve or force-discard.

### Step 3: Execute Deletion (When Authorized)
When the user confirms or requests live execution:
```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/prune-merged-worktrees/scripts/prune.ps1 -Execute
```

Or manually perform the verified operations:
```bash
# 1. Remove verified clean, merged worktree
git worktree remove <worktree-path>

# 2. Delete corresponding local merged branch
git branch -D <branch-name>

# 3. Prune internal git worktree administrative refs
git worktree prune
```

---

## 3. Helper Script Reference

The automated audit and prune script is located at:
- [prune.ps1](./scripts/prune.ps1)

Options:
- `.\prune.ps1`: Default safe audit / dry run.
- `.\prune.ps1 -Execute`: Performs deletions on verified merged items only.
- `.\prune.ps1 -SkipRemotePrune`: Skips remote prune step.
- `.\prune.ps1 -RepoPath <path>`: Explicit repository root override.
