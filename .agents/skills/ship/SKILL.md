---
name: ship
description: End-to-end workflow to verify code integrity, commit changes atomically (using the commit skill), push to remote, and create or open a Pull Request with the title and description already filled in inside GitHub (zero manual copy-pasting). Triggers on /ship, "ship this", "ship", "make a pr", "push and pr", /pr.
---

# Skill: End-to-End Shipping & Pull Request Workflow (`/ship`)

This skill automates the entire process of taking uncommitted or committed feature work in Tracklet, syncing with latest `main`, verifying it, staging and committing it cleanly according to the `commit` skill standards, pushing the branch to GitHub, and creating or opening a Pull Request with the **Title and Description already written inside GitHub** (zero copy-pasting required).

---

## 1. Core Principles

1. **Trunk Synchronization Before Shipping (Mandatory)**:
   - Always fetch and rebase against `origin/main` before running tests, building, or pushing.
   - When developing multiple features in parallel with AI, branches take snapshots of `main` at different times. If PR A merges into `main`, PR B will silently regress or fail CI unless rebased onto `origin/main`.
   - Never push or PR a branch that has drifted behind `origin/main`.

2. **Leverage the `commit` Skill**:
   - Never bypass quality checks or commit standards.
   - Every commit must follow Conventional Commits (`type(scope): subject` with `Why:`, `What:`, `Verification:`).
   - Never create catch-all monolithic commits (`git add . && git commit -m "updates"` is forbidden).
   - Only commit when the user explicitly requests to commit, push, or open a PR.

3. **Zero Copy-Paste into GitHub (Mandatory)**:
   - **NEVER** just dump the PR title and description markdown into chat and ask the user to manually copy and paste it into GitHub.
   - The AI must synthesize the full PR title and markdown description, then feed it directly into GitHub via `gh pr create` or the pre-filled GitHub Compare URL helper script (`.agents/skills/ship/scripts/create-pr.ps1` or `.cjs`).
   - When the user's browser opens GitHub, the **Title** field and the **Description** box MUST already be populated with the AI's content, ready for the user to click "Create pull request".

4. **Always Branch from `main`**:
   - PRs must target `main` as the base branch.
   - Never open a PR from `main` to `main`. If work is on `main`, create a feature branch first (`git checkout -b <type>/<feature-name>`).

---

## 2. Step-by-Step Workflow

### Step 0: Fetch & Rebase onto `origin/main`
Before running test suites or building, bring your branch up to date with the latest merged work on `main`:
```bash
# 1. Fetch latest commits on remote main
git fetch origin main

# 2. Check if main is ahead of current branch's base
# If origin/main has advanced, rebase:
git rebase origin/main
```

#### Rebase Conflict Resolution Rules:
- **Code Conflicts**: Resolve the textual conflict, verify logic, `git add <resolved-files>`, and run `git rebase --continue`.
- **Knowledge Graph (`graphify-out/`) Conflicts**: If intermediate `chore(graphify)` commits conflict during rebase, run `git rebase --skip`. The graph will be freshly regenerated and committed at the end of Step 1 anyway.
- **Uncommitted Working Changes**: If you have unstaged or uncommitted code changes in progress before rebasing, stash or commit them before running `git rebase origin/main`, then pop or verify.

---

### Step 1: Verify Code Integrity on Modern `main`
Now that your branch contains the latest merged PRs from `main`, run all standard verification checks:
```bash
# 1. TypeScript type check
npx tsc --noEmit

# 2. Run relevant unit tests (or full suite)
npx vitest run

# 3. Production bundle check
npm run build
```

If code files were added or modified in Tracklet, update the persistent knowledge graph:
```bash
graphify update .
```

---

### Step 2: Atomic Commits (Commit Skill Integration)
Stage and commit changes atomically following [commit/SKILL.md](file:///d:/Programming/Tracklet/.agents/skills/commit/SKILL.md):
```bash
# Stage specific code files (never git add .)
git add src/components/... src/hooks/...

# Commit with high-clarity Conventional Commit message
git commit -m "<type>(<scope>): <subject>" -m "Why:
<problem or motivation>

What:
- <key architectural / functional changes>

Verification:
- npx tsc --noEmit (0 errors)
- vitest passed"
```

If `graphify-out/` was updated, commit it as a separate chore commit:
```bash
git add graphify-out/
git commit -m "chore(graphify): update AST knowledge graph" -m "Why:
Keep persistent knowledge graph in graphify-out/ in sync with recent changes."
```

---

### Step 3: Push Branch to Remote
Push the branch to `origin`:
- For a **new branch**:
  ```bash
  git push -u origin <current-branch>
  ```
- For an **existing branch that was rebased onto `main`**:
  ```bash
  git push --force-with-lease origin <current-branch>
  ```
  *(Always use `--force-with-lease` rather than `--force` to guarantee you never overwrite unexpected remote commits).*

---

### Step 4: Synthesize the PR Title and Description
Inspect the branch commits against `main`:
```bash
git log origin/main..<current-branch> --oneline
git diff --stat origin/main..<current-branch>
```

Draft a high-clarity PR Title and Markdown Description following this structure:

```markdown
## Summary
[1-2 sentences summarizing the core capability or bugfix delivered]

---

### Why
[Bullet points explaining the pain point, customer issue, or architectural gap motivating this PR]

---

### Key Changes
- **[Component/Module]**: [Specific changes, patterns used, or logic refactored]
- **[UI/UX Polish]**: [Interactions, micro-states, accessibility, or visual adjustments]
- **[Tests & Quality]**: [New test files, scenarios covered, or edge cases handled]

---

### Verification & Quality Checks
- [x] **Trunk Sync**: Rebased cleanly onto latest `origin/main`.
- [x] **Type Check**: `npx tsc --noEmit` passed with 0 errors.
- [x] **Unit Tests**: Vitest suite passed cleanly.
- [x] **Production Build**: `npm run build` succeeded with clean bundles.
```

---

### Step 5: Execute Zero-Copy-Paste PR Creation
Save the drafted PR description to a temporary file to prevent shell escaping issues:
```bash
# Save PR description to temporary file
Set-Content -Path ".git/pr-description.md" -Value @"
<DRAFTED_PR_MARKDOWN_BODY>
"@ -Encoding UTF8
```

Run the automated PR helper script:
```powershell
# Using PowerShell:
powershell -ExecutionPolicy Bypass -File .agents/skills/ship/scripts/create-pr.ps1 -Title "<PR_TITLE>" -BodyFile ".git/pr-description.md"

# OR using cross-platform Node.js:
node .agents/skills/ship/scripts/create-pr.cjs --title "<PR_TITLE>" --body-file ".git/pr-description.md"
```

#### How It Works:
1. **GitHub CLI Mode (`gh`)**: If `gh` is installed and logged in (`gh auth status`), the script calls `gh pr create --base main --head <branch> --title "..." --body-file "..."` and outputs the live GitHub PR link.
2. **Pre-filled Compare URL Mode**: If `gh` is not installed or authenticated, the script:
   - RFC-3986 URL-encodes the title and markdown description.
   - Constructs the GitHub Compare URL:
     `https://github.com/<owner>/<repo>/compare/main...<branch>?expand=1&title=<encodedTitle>&body=<encodedBody>`
   - Automatically launches the user's default browser (`Start-Process`).
   - GitHub natively reads `title` and `body` query parameters and **pre-populates the input fields immediately**. The user simply clicks "Create pull request".

After running, remove the temporary file:
```powershell
Remove-Item -Path ".git/pr-description.md" -Force -ErrorAction SilentlyContinue
```

---

### Step 6: User Reporting
Present a concise receipt to the user containing:
1. Branch name and commit hashes pushed.
2. Direct clickable link to the PR (or pre-filled GitHub page).
3. A 2-3 bullet highlight of what was shipped.
