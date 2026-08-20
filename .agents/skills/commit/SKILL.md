---
name: commit
description: Standard workflow and guidelines for crafting atomic, conventional git commits with high-clarity messages and contextual descriptions in Tracklet.
---

# Skill: Git Commit Standards & Workflow in Tracklet

This skill defines the rules and best practices for creating clean, atomic, and informative git commits across the Tracklet repository.

---

## 1. Core Principles

1. **Atomic Commits Only**:
   - Every commit must represent **one logical change** (one bugfix, one feature, one refactor, one doc update).
   - **Never create monolithic "catch-all" commits** (e.g. `git add . && git commit -m "updates"` is strictly forbidden).
   - If multiple unrelated changes exist in the working directory, stage and commit them separately.

2. **Always Green History**:
   - Every single commit must build cleanly.
   - Run type checks (`npx tsc --noEmit`) and ensure no syntax or type regressions are introduced.

3. **No Secrets or Ignored Artifacts**:
   - Check `git status` carefully before staging.
   - Never stage `.env`, local credentials, build outputs (`dist/`, `build/`), or temporary logs.

---

## 2. Commit Message Format

Follow the **Conventional Commits** specification:

```
<type>(<scope>): <short imperative subject>

[optional body: explanation of why, context, and structural breakdown]

[optional footer(s): BREAKING CHANGE, Closes #123, etc.]
```

### A. Types
- `feat`: New feature or user-facing capability
- `fix`: Bugfix or error correction
- `refactor`: Code restructuring with no behavior or visual changes
- `perf`: Performance improvement
- `build`: Build system, Vite config, bundler, or dependency changes
- `ci`: CI/CD workflows and automated pipelines
- `docs`: Documentation, specifications, or markdown updates
- `test`: Adding or updating test suites
- `style`: Code style, formatting, or whitespace adjustments (no UI change)
- `chore`: Maintenance tasks, repo tooling, or config housekeeping

### B. Common Scopes in Tracklet
- `auth`: Authentication, AuthContext, login, signup, verification
- `pipeline`: Kanban pipeline board, columns, drag/drop, stage cards
- `table`: All applications table, sorting, filters, column visibility
- `detail`: Application detail modal/panel, activity history, tasks, contacts
- `repository`: Data access layer, Firestore syncing, localStorage cache
- `a11y`: Accessibility, ARIA roles, focus traps, WCAG AA compliance
- `ui`: Reusable UI components, design tokens, icons, modals, snackbars
- `export`: CSV export and import functionality
- `types`: Data models, interfaces, TypeScript declarations
- `config`: Environment variables, Firebase setup, Vite config

### C. Subject Line Rules
- Use imperative, present tense ("add", "fix", "refactor" — not "added", "fixes", "refactoring").
- Start with a lowercase letter after the colon.
- Do **not** end with a period.
- Keep the subject line under **72 characters**.

---

## 3. When & How to Write a Useful Description (Body)

### When is a Body Required?
- **Subtle Bugfixes**: Explain the root cause of the bug and why the fix works.
- **Architectural Changes**: Explain the motivation, architectural trade-offs, and design decisions.
- **Breaking Changes**: Detail what changed and what migration actions are required.
- **Multi-file Refactors**: Summarize the affected components and structural movements.

*Note: Simple, self-evident one-line changes (e.g. `docs: fix typo in README.md` or `style: remove unused import`) do not need a description body.*

### Recommended Body Structure
Separate the body from the subject with a blank line. Focus on **why** the change was made rather than simply reciting the diff:

```
<type>(<scope>): <subject>

Why:
- Explain the problem, edge case, or context motivating this change.

What:
- High-level summary of the approach and key files changed.
- Mention any architectural patterns applied (e.g. Repository pattern, pure utility extraction).

Impact / Verification:
- State how the change was verified (e.g. `npx tsc --noEmit`, build test, browser verification).
```

---

## 4. Step-by-Step Commit Workflow

### Step 1: Review Working Directory Status
```bash
git status
git diff
```
Identify the distinct logical changes present.

### Step 2: Verify Code Integrity
Ensure all TypeScript types and builds pass before staging:
```bash
npx tsc --noEmit
npm run build
```

### Step 3: Stage Specific Files Atomically
Stage only the files related to the specific logical change:
```bash
# Stage specific files (DO NOT use git add .)
git add src/lib/firebase.ts src/vite-env.d.ts .env.example
```

### Step 4: Commit with Clear Message
```bash
git commit -m "fix(firebase): remove local json import in favor of vite env variables" -m "Why:
The previous implementation imported a gitignored JSON config file directly, causing clean clones and deployment builds on Vercel/Netlify to fail with module resolution errors.

What:
- Switched Firebase initialization strictly to import.meta.env.VITE_FIREBASE_* variables.
- Added isFirebaseConfigured check with console warnings and safe offline fallbacks.
- Updated vite-env.d.ts with typed environment declarations.
- Documented optional VITE_FIREBASE_DATABASE_ID in .env.example.

Verification:
- Verified npx tsc --noEmit and npm run build pass cleanly."
```

### Step 5: Verify the Commit
Check the commit history and file list:
```bash
git log -n 1 --stat
```

---

## 5. Good vs. Bad Commit Examples

### Good Examples

```
feat(auth): add guest data migration modal on first sign-in

Why:
When visitors create applications as guests and later sign up for an account, their guest data was left orphaned in localStorage.

What:
- Created GuestMigrationModal component with preview of unmigrated applications.
- Added batch migration logic in ApplicationRepository to transfer local items to Firestore.
- Added migration status toasts with undo capability.
```

```
fix(pipeline): prevent stage card drag collision on touch devices

Why:
On mobile/touch viewports, dragging a stage card could trigger simultaneous scroll events, resulting in stuck drag previews.

What:
- Added touch-action: none to drag handles on touch screens.
- Updated ActivePipelineBoard drag event listeners with passive: false.
```

### Bad Examples to Avoid

| Bad Commit | Why It Fails |
| :--- | :--- |
| `git commit -m "misc fixes and updates"` | Vague, combines multiple changes, no conventional prefix. |
| `git commit -m "Fixed bug"` | Non-imperative, no scope, zero context on what bug was fixed. |
| `git commit -m "WIP"` | Incomplete work with potential broken build; commit only working states. |
| `git add . && git commit -m "feat: app changes"` | Monolithic dump mixing unrelated files across features and refactors. |
