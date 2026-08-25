# Quickstart: Seamless Notes Editor Validation

**Feature**: 003-seamless-notes-editor | **Date**: 2026-08-24
Proves the spec's success criteria end-to-end. Implementation details live in [plan.md](./plan.md) and [contracts/editor-contracts.md](./contracts/editor-contracts.md).

## Prerequisites

- Node + dependencies installed (`npm install`)
- `.env` Firebase credentials configured (existing app behavior)
- Baseline: `npm run lint` and `npm test` pass before manual scenarios

## Automated checks

```powershell
npm run lint        # tsc --noEmit gate
npm test            # Vitest unit suite, includes:
                    #  - round-trip idempotency cases (SC-002)
                    #  - checkbox/quote parse+serialize both directions (FR-010/011)
                    #  - draft lifecycle & stale guard (FR-016–FR-019)
                    #  - template skeleton validity (FR-012)
```

## Manual validation scenarios

### S1 — Uninterrupted typing through auto-save (SC-001, SC-009)

1. `npm run dev` → open an application with existing notes.
2. Click into notes; type continuously for >60 s without pausing past the 3 s debounce.
3. **Expect**: "Saving…" appears mid-typing at least once; caret never moves on its own; no scroll jump; no flicker of content.
4. Pause typing → **Expect**: status flows Saving… → Saved → fades to idle.
5. Type a long paste (~8–10K chars) then keep typing → keystrokes feel instant.

### S2 — Zero drift on reopen (SC-002)

1. Note exact rendered layout/spacing after S1; close panel.
2. Reopen the same application.
3. **Expect**: identical content & spacing; Firestore `notes` value byte-stable across repeated open/close cycles (verify via console/network if desired).

### S3 — Slash menu (FR-006/007, SC-003)

1. On empty line type `/` → menu opens near caret listing ≥: Heading 1/2/3, Bullet, Numbered, To-do, Quote, Code block, Link.
2. Type `he` → list filters to headings. ↑/↓ navigate; Enter applies → line becomes that heading.
3. Esc dismisses. Type `/x` then Backspace to empty query → menu closes leaving `/`.
4. Type `/` then Space immediately → literal "/ " stays in text.
5. Mid-word "/" does **not** open the menu.

### S4 — Selection bubble (FR-008, FR-023)

1. Select a word → bubble appears above selection with all registry actions.
2. Apply Bold via bubble → text bolds in place, bubble dismisses.
3. Select text inside an existing link → invoke Link → dialog pre-fills URL; Remove unlinks cleanly.

### S5 — Checklists (FR-010, FR-021, SC-004)

1. Via slash menu insert To-do; add three items; check one by clicking its box.
2. Close panel → reopen → **Expect**: checked state persisted.
3. Focus a checkbox with keyboard → Space toggles it.
4. Press Enter at end of a checked item → new unchecked item appears beneath.
5. Export CSV/JSON → task syntax present as plain `- [ ]` / `- [x]`.

### S6 — Quotes/callouts (FR-011)

1. Type `> Red flag: recruiter ghosted` → renders as accent-bordered callout in editor.
2. Confirm read-only renderer path (unit-covered) matches styling source.

### S7 — Templates (FR-012, SC-005)

1. Open application with empty notes → three pills visible (📋 💻 💰).
2. Click Recruiter Screen → structured skeleton fills note; pills vanish; autosave persists it.
3. Undo (Ctrl+Z) returns to empty state. Any direct typing also dismisses pills.

### S8 — Crash recovery (FR-016–019, SC-008)

1. Type text and, within the 3 s debounce window, kill the tab (`Ctrl+W`) or simulate crash.
2. Reopen app → same record → **Expect**: inline chip "Restored unsaved draft"; text recovered (<1 s).
3. Dismiss chip. Repeat crash but wait for "Saved" first → reopen → **no** chip (draft cleared).
4. Stale guard: with DevTools, hand-set localStorage draft `savedAt` older than doc update → reopen → durable version wins silently.

### S9 — Parity & regression (SC-007, FR-001/009)

1. Add Application modal → notes area supports slash menu, bubble, checkboxes, shortcuts identically to detail panel.
2. Detail panel shows **no toolbar** anywhere.
3. Ctrl+B / Ctrl+I / Ctrl+K (link) / Ctrl+Shift+K (code), smart URL paste, Ctrl+Click links all still work.
4. Global "/" still focuses top-bar search when focus is outside editor/modals.

### S10 — Slash-command matrix (post-refactor regression, deterministic transforms)

For each command **h1, h2, h3, bullet, numbered, todo, quote, code**, apply it in all four contexts and verify:

| Context | Expectation |
|---|---|
| Fresh empty line (just pressed Enter) | Command applies; caret stays on that line; typing continues inside the new block |
| Continuation line (2nd line of a soft-wrapped paragraph) | Only that line is transformed; the preceding line is untouched; no merge |
| Non-empty line with text | Text is preserved inside the new block format |
| Inside an existing list/quote | Transformation applies relative to that item/quote; sibling items survive |

Plus:
- Applying the same block command twice toggles back to a paragraph (headings, quote, lists).
- Bullet applied directly under a bullet list merges into it (never nests two `<ul>`s).
- To-do on a line containing inline bold/link keeps the formatting.
- Enter mid-to-do splits the line: remainder becomes the new unchecked item (bullet-list parity).
- Slash dialog no longer lists Bold/Italic (still Ctrl+B/I and on the selection bubble).
- Undo after each transform returns the previous state or at minimum never corrupts content.
- Auto-save firing mid-menu never resets the menu or caret.

### S11 — Popovers, callout, dividers, discoverability (post-refactor round 2)

1. **Link via popover**: select text → bubble → Link (or Ctrl+K) → floating dark popover opens at the selection; Apply wraps it; popover closes on outside press, Escape, or X.
2. **Link edit/remove**: Ctrl+K inside an existing link → popover pre-fills URL with a Remove button; Remove unwraps the link.
3. **Link hover preview**: hovering linked text shows a dark pill above it with the URL + "Ctrl+Click to open" (purely informational, never blocks editing).
4. **Callout**: slash → "Callout" applies the blue left-bar block on fresh empty AND non-empty lines; applying again unwraps. **Enter inside a callout exits to a normal paragraph below (never stacks another callout); Shift+Enter adds a line within the same callout.** Callout corners are rounded on all sides.
5. **Divider**: slash → "Divider" inserts `---` rule and moves caret to a new paragraph after it; persists across reopen as `---`.
6. **No phantom heading rule**: H1 shows bold 18px with no underline/divider below; hierarchy reads 18/16/14 — all ordinary slate color (no blue headings). H3 is **bold like the other headings**.
7. **Checkbox done state**: compact 14px boxes with a visible white ✓ on blue when checked; text struck through. Bold renders in the same body color (weight only, never tinted).
8. **Hint pill**: focused + empty notes show "Press [/] for commands" bottom-right; fades once typing starts.
9. **Sizes**: selection bubble buttons ~32px with 16px icons; slash menu rows comfortably sized.
10\. **Smart placement**: with the caret near the end of a long notes section, \/\ opens the menu **above** the caret instead of clipping off-screen.
13\. **Slash on empty notes**: opening an application with empty notes and typing \/\ immediately opens the command menu.
14\. **Checklist caret**: creating a to-do from a fresh line places the caret inside the item — first keystroke lands in the task, no phantom second line.
15\. **Checkbox done state**: compact 14px native boxes show a clear checkmark when checked.
16\. **Resizable notes**: dragging the bottom-edge handle resizes the notes card (double-click resets).
11. **Copy fidelity**: copying a selection into a plain-text target yields Markdown (`## Heading`, `- [ ] task`, `**bold**`); pasting rich content from other apps preserves headings/lists/bold via sanitized HTML; multi-line plain-text paste still normalizes into blocks.

## Pass criteria

All automated suites green + S1–S9 expectations observed. Record deviations as tasks/issues referencing the failing scenario ID.
