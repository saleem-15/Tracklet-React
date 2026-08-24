# Feature Specification: Seamless Notes Editor

**Feature Branch**: `003-seamless-notes-editor`

**Created**: 2026-08-24

**Status**: Draft

**Input**: Fix notes bugs (view/edit not seamless), remove toolbar, Linear-style "/" slash commands, interactive checkboxes, quote callouts, starter templates, extract a shared reusable rich-text editor component usable anywhere with an extensible selection bubble reflecting all offered functionality, and add Notion-style local crash-recovery drafts.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Uninterrupted Typing While Saving (Priority: P1)

A candidate types interview notes continuously. Background auto-save fires mid-session. Their caret, text selection, and scroll position stay exactly where they were — the note never jumps, flickers, or loses focus. There are no separate "view" and "edit" states; clicking anywhere and typing just works. If the browser crashes mid-typing, the lost window of edits is recovered.

**Why this priority**: This is the core reported bug. Every other improvement is worthless if typing is interrupted. Independently delivers a stable, crash-safe editor.

**Independent Test**: Type continuously for over one auto-save interval; verify zero caret/scroll resets and that content persists after closing. Simulate a tab crash mid-typing and verify recovery on reopen.

**Acceptance Scenarios**:

1. **Given** a note being typed, **When** the background save completes, **Then** caret position, selection, and scroll remain unchanged.
2. **Given** unsaved edits, **When** the detail panel closes, **Then** all edits persist without manual saving.
3. **Given** a saved note reopened later, **When** displayed, **Then** its content and spacing match exactly what was saved (no drift).
4. **Given** unsaved edits when the browser tab crashes or closes unexpectedly, **When** the record is reopened, **Then** an inline dismissible chip ("Restored unsaved draft") appears above the notes and the lost text is recovered.
5. **Given** a local recovery draft older than the durably stored version (e.g., the note was edited on another device), **When** the record is opened, **Then** the durable version is shown and the stale draft is silently discarded.

---

### User Story 2 - Formatting Without a Toolbar (Priority: P2)

The permanent formatting toolbar is removed. The user types "/" on an empty line to open a compact command menu (arrow keys to navigate, Enter to apply, Escape to dismiss, typing filters the list). Selecting existing text shows a small floating bubble above the selection offering every formatting action the editor supports — including any added in the future — without configuration changes at call sites. Keyboard shortcuts (bold, italic, link, code block) still work.

**Why this priority**: Delivers the requested Linear-style feel; second-most visible change after stability.

**Independent Test**: Press "/" on an empty line → menu appears and applies formats; select text → bubble appears listing all supported actions.

**Acceptance Scenarios**:

1. **Given** an empty line, **When** "/" is typed, **Then** a command menu appears near the caret with all supported block/inline formats.
2. **Given** the open menu, **When** arrow keys + Enter are pressed, **Then** the highlighted action is applied at the current line/selection.
3. **Given** active text selection, **When** the selection exists, **Then** a bubble above it lists every registered formatting action, and applying one updates the note immediately.
4. **Given** "/" typed mid-word or mid-sentence, **When** released, **Then** no menu opens (it is literal text).

---

### User Story 3 - Actionable Checklists & Callouts (Priority: P3)

Candidates track next steps as to-dos using "- [ ]" / "- [x]". Checkboxes render as real clickable boxes inside the editor and in read-only views; clicking toggles the state and persists it as standard Markdown. Lines starting with "> " render as visually distinct callout/quote blocks for red flags, compensation highlights, or key takeaways.

**Why this priority**: Turns notes into actionable tracking; high value for job seekers, builds directly on the stable editor from US1.

**Independent Test**: Toggle a checkbox, close and reopen — state persists; quote lines render with accent styling.

**Acceptance Scenarios**:

1. **Given** a line "- [ ] Send thank-you email", **When** rendered, **Then** an unchecked clickable checkbox appears before the text.
2. **Given** a rendered unchecked item, **When** clicked, **Then** the box becomes checked and stored Markdown becomes "- [x] …".
3. **Given** a line "> Target comp: $210k", **When** rendered, **Then** it displays as a callout block with a distinct accent border.
4. **Given** exported data, **When** inspected, **Then** checkboxes and quotes remain plain standard Markdown syntax.

---

### User Story 4 - One-Click Starter Templates (Priority: P4)

When notes are empty, subtle template pills appear: Recruiter Screen, Tech Prep, Offer Breakdown. Clicking one inserts a structured Markdown skeleton (Role Info / Compensation Band / Next Steps, etc.). Clicking into the surface and typing directly still starts a blank note normally.

**Why this priority**: Delight + speed for the four dominant note types; depends on nothing else and degrades gracefully.

**Independent Test**: Open an application with empty notes, click a pill, verify structured headings appear and persist through auto-save.

**Acceptance Scenarios**:

1. **Given** empty notes, **When** the surface is shown, **Then** three template pills are visible alongside placeholder text.
2. **Given** visible pills, **When** one is clicked, **Then** its structured skeleton fills the note and pills disappear.
3. **Given** non-empty notes, **When** the surface is shown, **Then** no pills appear.

---

### User Story 5 - One Editor Everywhere (Priority: P5)

The notes surface in the application detail panel and the Add Application modal share the same underlying reusable rich-text editor component — identical behavior, typography, and features. The component is generic, not hard-wired to notes: any future surface (e.g., contact notes) adopts it via a simple value/Markdown-change contract.

**Why this priority**: Consistency and maintainability; enables reuse beyond notes without duplicating logic.

**Independent Test**: Add a new application via the modal and edit notes — slash menu, bubble, checkboxes, shortcuts behave identically to the detail panel.

**Acceptance Scenarios**:

1. **Given** the Add Application modal, **When** notes are edited, **Then** the same slash menu, bubble, checkboxes, and shortcuts work.
2. **Given** any future host surface, **When** the shared editor is embedded, **Then** it requires only a value/Markdown-change contract — no notes-specific logic.

### Edge Cases

- What happens when "/" is typed while a previous menu is open? (Repositions/replaces, never stacks.)
- How does the system handle checkbox toggling inside fenced code blocks? (Not interactive there.)
- What happens when pasting Markdown containing "- [ ]" or "> "? (Renders correctly after paste.)
- What happens when the selection bubble's selection spans multiple blocks? (Bubble still anchors above; actions apply sensibly or are disabled when inapplicable.)
- What happens when auto-save completes while the slash menu is open? (Menu stays put; no caret reset.)
- What happens with an unclosed code fence? (Treated as code until end of note, matching current behavior.)
- What happens when switching applications while the menu/bubble is open? (Menus close cleanly; new record's notes load.)
- What happens on Undo (Ctrl+Z) right after inserting a template? (Returns to empty state.)
- What happens when the recovery draft exactly matches the stored version? (Restore silently; no chip shown.)
- What happens when a user intentionally reverts/deletes note content? (Draft tracks the revert; no ghost restore on next open.)
- What happens when the "/" query is backspaced to empty? (Menu closes, leaving literal text.)
- What happens when the menu is invoked inside a list item or quote line? (Applies relative to that block.)
- What happens when Enter is pressed on the last checked to-do item? (A fresh unchecked item is appended beneath it.)
- What happens when Ctrl/Cmd+K fires with the caret inside an existing link? (Dialog pre-fills its URL and offers update/remove.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The notes surface MUST be a single always-editable document with no explicit view/edit mode toggle and no permanent formatting toolbar.
- **FR-002**: The system MUST preserve caret position, text selection, and scroll position whenever background persistence completes during editing.
- **FR-003**: Loading a different record MUST replace editor content only when the target record changes — never as a side effect of saving.
- **FR-004**: Re-rendering a saved note MUST NOT alter its stored Markdown (round-trip stable serialization; repeated open/save cycles produce identical output).
- **FR-005**: Background auto-save MUST remain debounced (~3 s idle) with a synchronous flush on panel close; status feedback (Unsaved/Saving/Saved) MUST remain visible and unobtrusive.
- **FR-006**: Typing "/" at the start of an empty line MUST open a floating command menu listing all supported formatting actions; arrow keys navigate, Enter applies, Escape dismisses; the list MUST filter as the query narrows. Backspacing the query to empty closes the menu (leaving literal text); a Space typed immediately after "/" commits a literal "/" character; the menu is also available at the start of list items and quote lines, applying relative to that block.
- **FR-007**: The command menu MUST offer at minimum: Heading 1/2/3, bullet list, numbered list, to-do item, quote/callout, code block, link.
- **FR-008**: Selecting text MUST display a floating bubble above the selection listing every currently registered formatting action; adding a future action to the registry MUST make it appear in both the bubble and the menu without per-call-site changes.
- **FR-009**: Existing keyboard shortcuts (bold, italic, link, code block), smart URL paste, and Ctrl/Cmd+Click link opening MUST be preserved.
- **FR-010**: Markdown task-list syntax ("- [ ]" / "- [x]") MUST render as interactive checkboxes in both the editable surface and read-only views; toggling MUST persist as standard Markdown. Pressing Enter at the end of a to-do line MUST create the next unchecked item beneath it (continuous checklist entry).
- **FR-011**: Blockquote syntax ("> ") MUST render as a visually distinct callout block in both the editable surface and read-only views.
- **FR-012**: When notes are empty, the surface MUST show three starter template options (Recruiter Screen, Tech Prep, Offer Breakdown); activating one inserts structured Markdown content; any manual input dismisses them.
- **FR-013**: All note-editing surfaces (application detail panel, Add Application modal) MUST use one shared reusable editor exposing a simple value/Markdown-change contract usable beyond notes.
- **FR-014**: Stored note format MUST remain standard Markdown compatible with existing CSV/JSON exports; no proprietary markup may be introduced.
- **FR-015**: Read-only rendering is a capability of the unified renderer shared with the editable surface (single visual truth); it exists for current and future consumers — no new read-only UI surfaces ship in this iteration.
- **FR-023**: Re-invoking the Link action on already-linked text MUST offer updating or removing the existing link (no dead-end links).
- **FR-020**: The slash command menu MUST be operable entirely by keyboard and expose proper combobox/listbox semantics so assistive technology announces items and selection changes.
- **FR-021**: Rendered checkboxes MUST be toggleable from the keyboard (Space/Enter while focused), not pointer-only.
- **FR-022**: Save status transitions (Unsaved/Saving/Saved) MUST be perceivable by assistive technology via a polite live-region announcement.
- **FR-016**: The system MUST persist an in-progress local recovery draft on every edit, keyed per record, at zero cloud cost.
- **FR-017**: The recovery draft MUST be cleared once its content is successfully persisted to durable storage.
- **FR-018**: On opening a record, a locally stored recovery draft MUST be restored only if it is newer than the durably stored version, accompanied by an inline dismissible chip above the notes; otherwise it MUST be discarded without disturbing displayed content.
- **FR-019**: Draft restoration MUST never overwrite newer durable data (stale-draft protection).

### Key Entities *(include if feature involves data)*

- **Application Note**: Freeform Markdown text attached to a job application; supports headings, lists, task lists, quotes, links, inline styles, and fenced code blocks.
- **Formatting Action**: A named editor capability (e.g., Bold, To-do Item) with its trigger, shortcut, and apply behavior; registered once and consumed by the slash menu, keyboard layer, and selection bubble alike.
- **Note Template**: A predefined Markdown skeleton (title, purpose, sections) offered when notes are empty.
- **Recovery Draft**: Device-local snapshot of in-progress note text with its save timestamp; ephemeral, cleared on successful persistence, never synced across devices.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: During a 60-second continuous typing session spanning at least one auto-save cycle, caret and scroll position remain unchanged 100% of the time (zero observable resets).
- **SC-002**: Reopening a saved note reproduces identical content and layout (zero round-trip drift across repeated sessions).
- **SC-003**: Applying any block format via "/" takes under 3 seconds (menu open → choose → applied).
- **SC-004**: Checkbox state changes persist reliably: 100% survive panel close and reopen without data loss.
- **SC-005**: A first-time user can produce a structured recruiter-screen note in under 10 seconds using a starter template.
- **SC-006**: The same Markdown renders identically in the editable surface and read-only contexts (typography parity, zero divergence).
- **SC-007**: Both note-editing surfaces (detail panel, add modal) demonstrate full feature parity — no action available in one is missing in the other.
- **SC-008**: Unsaved edits survive a simulated unexpected tab close 100% of the time and are offered back within 1 second of reopening.
- **SC-009**: Typing remains visually instantaneous (under 50 ms input-to-paint) for notes up to ~10,000 characters.

## Assumptions

- Markdown remains the storage/export format; no data migration required.
- The ~3-second debounced auto-save with flush-on-close pipeline is retained as-is; only its interaction with the editor is fixed.
- The global "/" search shortcut already ignores editable/modal contexts and will not conflict with the in-editor slash menu.
- Primary target is desktop pointer+keyboard interaction; mobile soft-keyboard behaviors (selection bubble placement) are out of scope for this iteration.
- The dead read-only note component found in the codebase will be replaced by the unified renderer rather than maintained separately.
- Recovery drafts are device-local by design (no cross-device sync); multi-device conflict resolution defers to last-cloud-write-wins as today.
- Undo preservation through programmatic updates (template insert, checkbox toggle) is best-effort; full transactional undo history is explicitly out of scope.
- If device-local storage is unavailable (private browsing, quota limits), the recovery-draft layer degrades silently to today's behavior with no error surface.

## Appendix A: Starter Template Skeletons

### Recruiter Screen

```markdown
## Role Info
- Company:
- Role / Team:
- Recruiter / Contact:
- Source:

## Compensation Band
- Base:
- Equity:
- Bonus / PTO:

## Next Steps
- [ ] 
```

### Tech Prep

```markdown
## Core Concepts
- 

## Questions Asked
1. 

## Code Snippets
```

### Offer Breakdown

```markdown
## Base Salary

## Equity / Vesting

## Benefits & Stipends

## Negotiation Notes
> 
```
