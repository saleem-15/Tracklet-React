---
name: add-feature
description: Guide for adding a new feature or feature view to Tracklet cleanly without creating spaghetti code.
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
