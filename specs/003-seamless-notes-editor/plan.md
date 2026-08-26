# Implementation Plan: Seamless Notes Editor

**Branch**: `003-seamless-notes-editor` | **Date**: 2026-08-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-seamless-notes-editor/spec.md`

## Summary

Fix the caret/scroll resets that break continuous note typing during auto-save, remove the permanent toolbar in favor of a Linear-style "/" command menu plus an extensible selection bubble, add interactive task-list checkboxes, quote callouts, starter templates, and Notion-style local crash-recovery drafts. All of this is delivered by extracting one shared, generic rich-text editor component (value/Markdown-change contract) reused by the application detail panel and the Add Application modal, backed by an idempotent Markdown serializer so stored/exported notes remain plain Markdown.

## Technical Context

**Language/Version**: TypeScript ~5.8.2, React 19, Vite 6 (ESM)

**Primary Dependencies**: react/react-dom 19, firebase 12 (Firestore), tailwindcss 4 (@tailwindcss/vite), lucide-react (icons), motion (animation)

**Storage**: Firebase Firestore (durable notes) + browser localStorage (recovery drafts, device-local)

**Testing**: Vitest 4 + happy-dom (`npm test`), type-check gate `npm run lint` (tsc --noEmit)

**Target Platform**: Modern desktop web browsers (Chrome/Edge/Firefox/Safari current); keyboard + pointer interaction

**Project Type**: Single-page web application (React SPA, no backend code — Firebase is BaaS)

**Performance Goals**: Typing input-to-paint <50 ms at ≤10K characters (SC-009); zero observable caret resets across auto-save cycles (SC-001)

**Constraints**: Firestore free-tier write quota → keep ~3 s debounced saves + flush-on-close unchanged; no new runtime dependencies for the editor; stored format stays plain Markdown compatible with CSV/JSON exports

**Scale/Scope**: 2 consuming surfaces today (detail panel, add modal); 1 editor component, 1 action registry, serializer extensions (checkboxes/quotes), slash menu, selection bubble, draft layer

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution (`.specify/memory/constitution.md`) is an unfilled template — no binding principles are defined. Adopting repo conventions as provisional gates:

| Gate | Status | Notes |
|------|--------|-------|
| Follow existing patterns/conventions | PASS | Extends existing `src/lib/richTextMarkdownUtils.ts` + hook architecture; no parallel systems |
| Test coverage for changed logic | PASS | Serializer changes covered in `tests/unit/richTextMarkdownUtils.test.ts`; new units for drafts/menu filtering |
| No unnecessary dependencies | PASS | Custom contentEditable approach retained; no TipTap/Lexical/Slate added |
| Type safety | PASS | `npm run lint` (tsc --noEmit) must pass |

Post-Phase-1 re-check: no violations introduced (see Complexity Tracking — empty).

## Project Structure

### Documentation (this feature)

```text
specs/003-seamless-notes-editor/
├── plan.md              # This file
├── research.md          # Phase 0 output: decisions & rationale
├── data-model.md        # Phase 1 output: entities, state transitions
├── quickstart.md        # Phase 1 output: validation guide
├── contracts/
│   └── editor-contracts.md  # Component/registry/draft-store interfaces
├── checklists/
│   └── requirements.md  # Spec quality checklist (16/16 passing)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── editor/
│   │   ├── RichTextEditor.tsx        # NEW: generic editable surface (value/onChange)
│   │   ├── SlashMenu.tsx             # NEW: "/" command menu (ARIA combobox)
│   │   ├── SelectionBubble.tsx       # NEW: floating bubble above selection
│   │   ├── TemplatePills.tsx         # NEW: empty-state starter templates
│   │   └── editorActions.tsx         # NEW: formatting-action registry (single source of truth)
│   ├── detail/
│   │   └── ApplicationNotesSection.tsx  # EDIT: host shared editor; drop toolbar; add draft chip
│   └── add-modal/
│       └── AddApplicationNotesSection.tsx  # EDIT: swap textarea → shared editor
├── lib/
│   ├── richTextMarkdownUtils.ts      # EDIT: checkboxes, quotes, idempotent round-trip
│   ├── useRichTextNotesEditor.ts     # REWORK → generic useRichTextEditor hook
│   ├── noteDrafts.ts                 # NEW: recovery-draft store (localStorage)
│   └── noteTemplates.ts              # NEW: Appendix A template definitions
└── components/ApplicationDetailPanel.tsx  # EDIT: resync keyed on record identity only

tests/
└── unit/
    ├── richTextMarkdownUtils.test.ts # EDIT: checkbox/quote/idempotency cases
    ├── noteDrafts.test.ts            # NEW: draft lifecycle + stale-draft guard
    └── noteTemplates.test.ts         # NEW: templates are valid Markdown skeletons
```

**Structure Decision**: Single-project React layout already established in the repo; feature extends `src/components/editor/` (new folder for reusable editor primitives), `src/lib/` (logic + stores), `tests/unit/` (Vitest). No backend directory applies (Firebase BaaS accessed via existing `applicationRepository.ts`).

## Complexity Tracking

> No constitution violations — table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
