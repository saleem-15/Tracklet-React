# Tasks: Seamless Notes Editor

**Input**: Design documents from `/specs/003-seamless-notes-editor/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/editor-contracts.md ✅ | quickstart.md ✅

**Tests**: Included. Plan's constitution gates mandate test coverage for changed logic (research.md R9); pure-logic modules are test-first.

**Organization**: Grouped by user story (spec.md US1–US5) so each story is independently implementable and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Owning user story ([US1]…[US5]); omitted in Setup/Foundational/Polish
- Every description names exact file path(s)

## Path Conventions

Single-project React layout per plan.md: `src/components/editor/` (new shared primitives), `src/lib/` (logic), `tests/unit/` (Vitest + happy-dom).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish safe starting point and the module surface all stories extend.

- [x] T001 Verify green baseline: run `npm run lint` and `npm test`; both MUST pass before any source change (record failures as pre-existing if any)
- [x] T002 [P] Create public API barrel `src/components/editor/index.ts` with named re-export slots for RichTextEditor, SlashMenu, SelectionBubble, TemplatePills, editorActions (populated by later phases)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Serializer correctness law, action registry, and the generic caret-safe editor — prerequisites for ALL user stories.

**⚠️ CRITICAL**: No user-story work until this phase completes.

### Tests First

- [x] T003 [P] Write failing round-trip idempotency tests in `tests/unit/richTextMarkdownUtils.test.ts`: corpus covering headings (#/##/###), bullet/numbered lists, blank-line handling, links, inline bold/italic/code, fenced code — assert `htmlToMarkdown(markdownToHtml(m)) === m` and canonical newline policy (exactly one blank line between blocks, trimmed ends)

### Implementation

- [x] T004 Make serialization canonical/idempotent in `src/lib/richTextMarkdownUtils.ts` to satisfy T003: enforce `\n\n` block separation, collapse 3+ newlines, trim-once; export `compareCanonical(a, b)` helper for sync-equality checks (contracts §2 round-trip law)
- [x] T005 Implement formatting-action registry `src/components/editor/editorActions.tsx`: typed `FormattingAction` (id/label/icon/keywords/shortcut/scope/appliesTo/apply) with FR-007 minimum set — bold, italic, h1, h2, h3, bullet, numbered, todo, quote, code, link — porting apply logic from `src/lib/useRichTextNotesEditor.ts`; todo/quote `apply` bodies may be stubs until US3 (T022)
- [x] T006 Extract generic hook `src/lib/useRichTextEditor.ts` from `useRichTextNotesEditor.ts` implementing research R2 sync rules: identity-keyed full replace only, `compareCanonical` equality no-op, caret/scroll snapshot-restore on replace; retain keyboard shortcuts (Ctrl+B/I/K, Ctrl+Shift+K), smart URL paste, Ctrl+Click links, Enter-in-heading escape, ArrowRight format-escape behaviors verbatim
- [x] T007 Build `src/components/editor/RichTextEditor.tsx` per contracts §1: contentEditable surface bound to hook, `value`/`onChange` Markdown contract, placeholder overlay, aria textbox/multiline attrs, props for templates/draft-restore consumed by US4/US1; export via barrel T002

- [x] T008 [P] Registry contract tests in `tests/unit/editorActions.test.ts`: every FR-007 id present exactly once; unique labels/icons; valid scope values; `filterActions` placeholder suite extended in US2 (T015)

**Checkpoint**: Foundation ready — user stories can begin (US1 recommended first; US3–US5 assume foundation only).

---

## Phase 3: User Story 1 — Uninterrupted Typing While Saving (Priority: P1) 🎯 MVP

**Goal**: Typing never interrupted by saves (caret/selection/scroll stable); crash-window recovery drafts with stale-guard and inline chip.

**Independent Test**: Type continuously past ≥1 auto-save cycle with zero resets (quickstart S1); reopen shows zero drift (S2); kill tab mid-typing → chip restores text (S8).

### Tests for User Story 1

- [x] T009 [P] [US1] Write failing draft-store tests in `tests/unit/noteDrafts.test.ts`: save/clear/read round-trip under key `tracklet_note_draft_<appId>`; `resolveDraftOnOpen` decision table (none / restore / discard-stale / discard-identical); silent degradation when localStorage throws

### Implementation

- [x] T010 [US1] Implement `src/lib/noteDrafts.ts` per contracts §6 (`saveNoteDraft`, `clearNoteDraft`, `readNoteDraft`, `resolveDraftOnOpen`) satisfying T009; all ops wrapped in try/catch (FR-016–FR-019)
- [x] T011 [US1] Fix resync root cause in `src/components/ApplicationDetailPanel.tsx`: narrow state-resync effect dependency from `app?.notes` to record identity `app?.id` only; make save-compare/flush comparisons canonical via `compareCanonical` (T004) preserving `.trim()` persistence payload semantics; keep 3 s debounce + flush-on-close behavior intact (FR-002/003/005)
- [x] T012 [US1] Host `RichTextEditor` in `src/components/detail/ApplicationNotesSection.tsx`: remove permanent toolbar and link-modal UI (superseded by US2 surfaces); wire `onNotesChange` → `setNotes` + `saveNoteDraft(appId, md)`; clear draft after successful `performSaveNotes` and successful flush-on-close in `ApplicationDetailPanel.tsx` (FR-001/016/017)
- [x] T013 [US1] Draft-restore UX in `ApplicationNotesSection.tsx`: on record open call `resolveDraftOnOpen(app.id, notes, updatedAt)`; on `restore` seed editor value + render dismissible inline chip "Restored unsaved draft" above the card (chip dismiss clears draft only); stale/identical outcomes stay silent (FR-018/019)
- [x] T014 [US1] Accessibility: wrap the Unsaved/Saving/Saved indicator block in `ApplicationNotesSection.tsx` header with `aria-live="polite"` (FR-022)

**Checkpoint**: US1 fully functional alone — S1/S2/S8 pass; MVP shippable.

---

## Phase 4: User Story 2 — Formatting Without a Toolbar (Priority: P2)

**Goal**: "/" command menu (keyboard-first, filtered, ARIA) + selection bubble driven entirely by the registry; link update/remove.

**Independent Test**: "/" on empty line opens menu, filters, applies via Enter (S3); selecting text shows bubble listing all registry actions (S4); mid-word "/" stays literal.

### Tests for User Story 2

- [x] T015 [P] [US2] Export `filterActions(query): FormattingAction[]` from `src/components/editor/editorActions.tsx` (case-insensitive substring over label+keywords) with failing unit tests added to `tests/unit/editorActions.test.ts`

### Implementation

- [x] T016 [US2] Build `src/components/editor/SlashMenu.tsx` per contracts §4: trigger "/" at start of empty paragraph/list-item/quote-line; caret-rect positioning with viewport flip; ↑/↓ wrap, Enter applies, Esc closes + refocuses editor; Backspace-to-empty leaves literal `/`; Space immediately after `/` commits literal; re-trigger replaces (never stacks); `role="combobox"`/`listbox`/`option` + `aria-activedescendant` (FR-006/020)
- [x] T017 [US2] Build `src/components/editor/SelectionBubble.tsx` per contracts §5: non-collapsed selections fully inside editor anchored above selection rect (flip below near top); render only `appliesTo`-true actions; keep selection active through inline actions; dismiss on scroll/collapse/outside-blur (FR-008)
- [x] T018 [US2] Link flow as registry-driven surface: port link insertion (saved-selection restore, `createLink` vs domain-label `insertHTML`) into bubble/menu invocations within `src/lib/useRichTextEditor.ts`; invoking Link on already-linked text pre-fills URL and offers Update/Remove (FR-023)
- [x] T019 [US2] Delete dead read-only renderer `src/components/MarkdownNoteView.tsx` (zero imports verified) and sweep leftover toolbar/link-modal artifacts from `src/components/detail/ApplicationNotesSection.tsx` (FR-001/015)

**Checkpoint**: US2 independently demonstrable — S3/S4 pass alongside US1.

---

## Phase 5: User Story 3 — Actionable Checklists & Callouts (Priority: P3)

**Goal**: `- [ ]`/`- [x]` interactive checkboxes (pointer + keyboard) and `> ` quote callouts, persisted as plain Markdown everywhere.

**Independent Test**: Toggle persists across close/reopen (S5); quotes render accent-bordered (S6); CSV/JSON exports contain raw syntax.

### Tests for User Story 3

- [x] T020 [P] [US3] Write failing serializer tests in `tests/unit/richTextMarkdownUtils.test.ts`: `- [ ]`/`- [x]` ↔ `li.task > input[type=checkbox]` both directions; `> ` ↔ `blockquote` both directions; `toggleTaskItem` flips only target item; `spawnNextTaskItem` appends unchecked sibling; `isInsideCodeFence` gating; extend T003 corpus so round-trip law covers new syntax

### Implementation

- [x] T021 [US3] Implement checkbox + quote support in `src/lib/richTextMarkdownUtils.ts`: `markdownToHtml` emits interactive `li.task` items and styled blockquotes; `domNodeToMarkdown` serializes them back; export `toggleTaskItem`, `spawnNextTaskItem`, `isInsideCodeFence` per contracts §2 — satisfying T020 without breaking legacy notes
- [x] T022 [US3] Activate `todo`/`quote` registry actions in `src/components/editor/editorActions.tsx` using T021 utilities (line-level wrap/toggle at caret block); add Enter-at-end auto-spawn of next unchecked item in `src/lib/useRichTextEditor.ts` keydown handling (FR-010 extension)
- [x] T023 [US3] Keyboard accessibility for checkboxes: Space/Enter toggles focused checkbox inside editor context; inputs labelled by their item text; force inert inside fenced code blocks (FR-021 + edge case)

**Checkpoint**: US3 independently functional — S5/S6 pass; stored/exported format remains plain Markdown (FR-014).

---

## Phase 6: User Story 4 — One-Click Starter Templates (Priority: P4)

**Goal**: Three template pills on empty notes inserting Appendix-A skeletons.

**Independent Test**: Empty notes show pills; click fills structured note and persists (S7); typing manually never triggers pills; Undo returns to empty.

### Tests for User Story 4

- [x] T024 [P] [US4] Template validity tests in `tests/unit/noteTemplates.test.ts`: each template parses via `markdownToHtml` without error, contains required Appendix-A section headers, and round-trips stably per T004 law

### Implementation

- [x] T025 [P] [US4] Define typed `NoteTemplate` records (recruiter-screen / tech-prep / offer-breakdown with label, emoji, exact skeletons) in `src/lib/noteTemplates.ts` from spec Appendix A
- [x] T026 [US4] Build `src/components/editor/TemplatePills.tsx`: rendered only while `value` empty, alongside placeholder; click inserts skeleton via `onChange` with caret at end; pills disappear on any content (empty-state condition suffices); export via barrel (FR-012)
- [x] T027 [US4] Wire `templates={NOTE_TEMPLATES}` prop from both hosts: `src/components/detail/ApplicationNotesSection.tsx` and `src/components/add-modal/AddApplicationNotesSection.tsx` (prep for SC-007 parity)

**Checkpoint**: US4 independently functional — S7 passes.

---

## Phase 7: User Story 5 — One Editor Everywhere (Priority: P5)

**Goal**: Detail panel and Add modal share the generic editor; zero notes-specific logic inside editor primitives.

**Independent Test**: Add-modal notes behave identically to detail-panel notes (S9.1).

### Implementation

- [x] T028 [US5] Migrate `src/components/add-modal/AddApplicationNotesSection.tsx` from raw textarea to `RichTextEditor` (keep `NoteLinksBar` beneath; NO autosave/draft pipeline — modal save path unchanged) (FR-013)
- [x] T029 [US5] Parity + purity audit: grep `src/components/editor/**` for notes/Firestore/app-id leakage (must be none); confirm identical registry exposure in both hosts; finalize `src/components/editor/index.ts` exports (SC-007, FR-013)

**Checkpoint**: All five stories independently functional — S9 passes fully.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, performance proof, end-to-end validation.

- [x] T030 [P] Record architecture decision: add `docs/adr/0007-notes-editor-shared-surface-slash-menu-drafts.md` superseding toolbar aspects of `docs/adr/0006` (custom-editor-over-framework rationale from research R1, sync rules R2, draft design R7)
- [ ] T031 (browser pass pending user) Execute full `specs/003-seamless-notes-editor/quickstart.md` scenarios S1–S9; log and fix deviations against failing scenario IDs
- [x] T032 Performance proof for SC-009: type into an ~10K-character note in dev; if input-to-paint exceeds ~50 ms, memoize/throttle serialization in `src/lib/useRichTextEditor.ts` (e.g., rAF-batched `htmlToMarkdown`) and re-measure
- [x] T033 Final gates: `npm run lint` && `npm test` green; stage and commit in logical groups (serializer/foundation, US1, US2, US3, US4, US5, polish)

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) ──► Phase 2 (Foundational) ──► Phase 3 (US1 🎯 MVP) ──► Phase 4 (US2) ──► Phase 5 (US3) ──► Phase 6 (US4) ──► Phase 7 (US5) ──► Phase 8 (Polish)
                        │                        │
                        └── US3/US4 may start    └── US2 depends on US1's host swap (T012 removed toolbar surface)
                            after Phase 2 too
```

- **Setup**: none — start immediately
- **Foundational**: blocks ALL stories (registry + hook + editor + serializer law)
- **US1**: first story; its T011/T012 host changes unblock clean US2 integration
- **US2**: after US1 (toolbar removal lands there); registry stubs from T005 get real surfaces
- **US3**: needs only Foundation, but sequencing after US2 avoids merge friction in the same files (editorActions/useRichTextEditor)
- **US4**: needs Foundation (+T027 touches both hosts post-T012/T028)
- **US5**: after US1 (shared host exists) and ideally US4 (templates prop)
- **Polish**: last

### Cross-Story File Heatmap (merge-friction warning)

`src/components/detail/ApplicationNotesSection.tsx` is touched by T012, T013, T014 (US1), T019 sweep (US2), T027 (US4) — implement sequentially. `src/components/editor/editorActions.tsx`: T005 (foundation), T015 (US2), T022 (US3). `src/lib/useRichTextEditor.ts`: T006 (foundation), T018 (US2), T022 (US3), T032 (polish).

### Parallel Opportunities

- Within Foundation: T003 ∥ T005 prep ∥ T008-after-T005; T004 after T003
- Story-internal test tasks marked [P] run before their implementation siblings
- Different stories are separable across contributors once Phase 2 lands (respect heatmap above)

```bash
# Example: Foundation parallel batch
Task T003 "failing serializer idempotency tests"
Task T005 "action registry module"

# Example: US1 parallel batch
Task T009 "failing draft-store tests"          # then T010
# T011–T014 sequential (same host files)
```

---

## Implementation Strategy

### MVP First (Phases 1–3 only)

1. T001–T002 → T003–T008 (foundation)
2. T009–T014 (US1: stability + crash recovery)
3. **STOP & VALIDATE**: quickstart S1/S2/S8 — this alone resolves the reported bugs

### Incremental Delivery

- +US2 → Linear-style formatting feel (S3/S4)
- +US3 → actionable notes (S5/S6)
- +US4 → delight layer (S7)
- +US5 → consistency guarantee (S9)
- Polish → ADR, perf proof, final gates

### Notes

- Tests marked as failing must FAIL before their implementation task runs, then PASS after
- Commit after each task or logical group (repo follows conventional commits)
- Manual scenarios reference quickstart.md section IDs; record deviations per scenario ID

---

## Task Count Summary

| Phase | Tasks | IDs |
|---|---|---|
| Setup | 2 | T001–T002 |
| Foundational | 6 | T003–T008 |
| US1 (MVP) | 6 | T009–T014 |
| US2 | 5 | T015–T019 |
| US3 | 4 | T020–T023 |
| US4 | 4 | T024–T027 |
| US5 | 2 | T028–T029 |
| Polish | 4 | T030–T033 |
| **Total** | **33** | |
