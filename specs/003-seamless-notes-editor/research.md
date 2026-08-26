# Research: Seamless Notes Editor

**Feature**: 003-seamless-notes-editor | **Date**: 2026-08-24
**Status**: All spec NEEDS-CLARIFICATION items were resolved during specification (none open). This document records the engineering decisions required before implementation.

---

## R1: Editor architecture — extend custom contentEditable vs adopt a rich-text framework

**Decision**: Extend the existing custom `contentEditable` implementation into a generic shared component. Do **not** adopt TipTap/ProseMirror, Lexical, or Slate.

**Rationale**: The codebase already owns a working WYSIWYG pipeline (`useRichTextNotesEditor` + `richTextMarkdownUtils` with unit tests) whose stored format is plain Markdown. Requirements are bounded (block formats + checkboxes + quotes + menus), there is no collaborative/multiplayer editing need, and the project is quota- and bundle-conscious ("don't overcomplicate"). A framework would add ~100KB+, a document-schema migration for existing notes, and a second source of truth for Markdown conversion.

**Alternatives considered**:
- *TipTap (ProseMirror)* — most mature; rejected: heavy for scope, markdown round-trip via extension still lossy at edges, migration risk for stored notes.
- *Lexical* — excellent React integration; rejected: its element/data model would replace the Markdown-as-source-of-truth design.
- *Slate* — flexible but complex API and higher maintenance burden for one surface.
- *textarea + overlay highlight* — simplest; rejected: cannot render interactive checkboxes/headings in place (core requirement).

**Consequences**: We must explicitly engineer the two hard problems frameworks solve for free: caret preservation across external re-renders (R2) and lossless HTML↔Markdown round-trips (R3). Mitigations below are mandatory tasks.

---

## R2: Caret/scroll preservation when auto-save completes mid-typing

**Decision**: Three-rule sync discipline inside the editor host:
1. Replace editor DOM only when the **record identity** changes (app switch/load) — never as a reaction to our own saves echoing back through props.
2. On any incoming external value, first serialize current editor DOM to Markdown; if it equals the incoming value, do nothing (no innerHTML touch).
3. When a real replacement is required (record switch, template insert, draft restore), snapshot caret/scroll beforehand and restore after setting innerHTML where feasible.

**Rationale**: Root cause of the reported bug (verified in code): `ApplicationDetailPanel` resyncs state on every `app?.notes` change; saved values are trimmed and round-trip drift makes them differ from in-editor text, so the effect overwrites `innerHTML` while the user types. Rules 1–2 eliminate that class entirely rather than patching timing.

**Alternatives considered**: Debounce suppression windows / "ignore echoes" flags — fragile timing heuristics; rejected in favor of structural identity checks.

---

## R3: Lossless (idempotent) HTML ↔ Markdown serialization

**Decision**: Make `markdownToHtml(htmlToMarkdown(dom))` a fixed point:
- Canonical newline policy: paragraphs separated by exactly `\n\n`; blank lines never accumulate; trailing whitespace trimmed once on serialize.
- Block mapping fixed: `# → h2`, `## → h3`, `### → h4` (existing convention preserved); `- [ ]`/`- [x]` task items; `> ` quotes; fenced ``` blocks untouched.
- Serialization normalizes before comparison so rule R2.2 compares canonical forms.

**Rationale**: Guarantees SC-002 (zero drift) deterministically and gives the save-compare path stable values, preventing spurious "unsaved" flips.

**Alternatives considered**: Diff-based patching of DOM subtrees — complexity not justified at ≤10K chars (SC-009 budget allows full re-render only on record switch).

---

## R4: Action registry powering slash menu, bubble, and shortcuts

**Decision**: One typed registry module (`editorActions.tsx`) defines each FormattingAction: id, label, icon, keywords for filtering, optional shortcut, scope (block vs inline vs selection), and an apply function operating on the editor DOM. Slash menu, selection bubble, and keyboard layer all render/consume from it — adding a future action (e.g., callout types) automatically appears everywhere (FR-008).

**Rationale**: Spec mandates registry-driven extensibility without per-call-site changes; single source avoids drift between surfaces.

**Alternatives considered**: Per-surface hardcoded lists — violates FR-008 directly.

---

## R5: Slash menu interaction model

**Decision**: Trigger "/" at line start (paragraph, list item, or quote block per FR-006 extension). Query = characters after "/"; Backspace-to-empty closes leaving literal text; Space immediately after "/" commits literal "/". Navigation: ↑/↓ cycle, Enter applies, Esc dismisses. ARIA combobox/listbox with `aria-activedescendant`; menu positioned from caret rect via `Range.getBoundingClientRect()`, flipped above/below viewport-aware.

**Alternatives considered**: Fuzzy multi-word search — overkill; prefix/substring filter suffices.

---

## R6: Interactive checkboxes representation

**Decision**: Task items render as list items whose marker is a real `<input type="checkbox">` (pointer) plus keyboard Space/Enter toggle (FR-021); toggling mutates only that item's DOM state and re-serializes (no full innerHTML reset → caret stays). Enter-at-end spawns next `- [ ]` item (FR-010 ext). Checkboxes disabled/inert inside fenced code blocks (edge case).

**Alternatives considered**: Content-managed fake checkbox spans — loses native focus/a11y behavior; rejected.

---

## R7: Recovery-draft store design

**Decision**: Module `noteDrafts.ts`: key `tracklet_note_draft_<appId>`, payload `{ markdown, savedAt }`. Write synchronously on each edit (try/catch, silent degradation). Clear on successful durable save or successful flush-on-close. Restore on record open iff `savedAt > app.updatedAt` AND content differs from stored notes → show inline dismissible chip (FR-016–FR-019, SC-008). Exact-match drafts clear silently.

**Rationale**: Closes the 0–3 s crash window at zero cloud cost; timestamp guard prevents stale-draft resurrection across devices (last-cloud-write-wins preserved per spec assumptions).

**Alternatives considered**: IndexedDB — unnecessary scale for ≤10K-char text; localStorage synchronous write fits "on every keystroke".

---

## R8: Selection bubble positioning & scope

**Decision**: Bubble appears on non-collapsed mouse selections entirely within the editor, anchored above selection rect (flip below near top). Items = registry actions valid for current context (inline actions enabled; inapplicable block actions hidden/disabled per edge case). Dismiss on scroll/collapse/blur-outside. Desktop pointer-only this iteration (spec assumption).

**Alternatives considered**: Always-visible mini-toolbar — contradicts FR-001 (no permanent toolbar).

---

## R9: Testing strategy

**Decision**: Unit (Vitest + happy-dom): serializer idempotency property cases (round-trip ×N stable), checkbox/quote parsing both directions, draft lifecycle incl. stale-guard, template validity, action registry completeness vs FR-007 minimum set. Manual quickstart pass for caret stability, slash flows, crash recovery (happy-dom cannot emulate real caret semantics faithfully — documented in quickstart.md).

**Rationale**: Matches repo's existing `tests/unit/*` pattern; keeps CI hermetic.

---

## R10: Accessibility approach

**Decision**: Editor container keeps `role="textbox"` + multiline; slash menu implements combobox/listbox pattern (FR-020); checkboxes are native inputs labelled by their item text (FR-021); save status wrapped in `aria-live="polite"` region (FR-022). Focus management: menu/bubble never trap focus; Esc returns focus to editor.

**Alternatives considered**: Custom roving tabindex grid — unnecessary for a flat filtered list.
