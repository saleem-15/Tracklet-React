---
name: add-feature
description: >
  End-to-end architectural workflow for implementing new features or feature views across Tracklet.
  Autonomous Triggers: Use whenever the user asks to "build a new feature", "add a feature for X",
  "implement feature view", "add support for X", "build out the contact log", "add an analytics tab",
  or any request spanning multiple system layers (data model, repository, business logic, UI, routing).
  Enforces: Clean separation of concerns (no spaghetti code), Repository Pattern persistence, pure utility
  functions in src/lib/, single source of truth in src/lib/constants.ts, pre-flight component discovery,
  and verification with npx tsc --noEmit and npm test.
  Boundaries: Use this skill for full-stack frontend feature lifecycle. For isolated component creation, use
  add-component. For schema-only updates, use modify-data-model. For code review or PR creation, use ship.
---

# Skill: Adding a Feature to Tracklet

When implementing a new feature in Tracklet, follow this step-by-step workflow:

## Step 1: Design & Scope
- Check `PRODUCT.md` and `DESIGN.md` to ensure alignment with product principles and design tokens.
- Identify which layer the feature touches: Data (`types.ts`/`repository`), Logic (`lib/`), or UI (`components/`).

## Step 2: Types & Constants
- If the feature introduces new data shapes, update `src/types.ts`.
- If it introduces fixed categories, statuses, or keys, add them to `src/lib/constants.ts`.

## Step 3: Persistence Layer (if applicable)
- Add necessary CRUD or helper methods to `src/lib/applicationRepository.ts`.
- Never put raw `addDoc`, `updateDoc`, or `localStorage` calls inside UI component files.

## Step 4: Logic Layer (if applicable)
- Create pure, testable utility functions in `src/lib/` (e.g. `src/lib/<feature>Utils.ts`).

## Step 5: UI Layer
- Execute the **Step 0 Pre-Flight Component Discovery Protocol** (see `.agents/rules/component-registry.md` and `docs/COMPONENT_REGISTRY.md`).
- Emit the Pre-Flight Discovery Manifest resolving UI intent to Tracklet's 8 canonical component classes.
- Follow `.agents/skills/add-component/SKILL.md` when creating or modifying components.
- Run `.agents/skills/anti-slop-craft/SKILL.md` to ensure zero AI slop (container depth ≤ 1, no icon clutter, no tag soup, no `transition-all`, strict `UI_TOKENS` consumption).
- Keep component files under 300 lines.
- Ensure all hooks are declared at the top before any early return statements.

## Step 6: Verification
Run:
```bash
npx tsc --noEmit
npm test
npm run build
```
Verify zero modifications were made outside the intended scope and that all 6 Anti-Slop checks pass.
