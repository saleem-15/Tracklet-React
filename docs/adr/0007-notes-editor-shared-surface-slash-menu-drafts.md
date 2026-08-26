# ADR 0007: Shared Seamless Notes Editor, Slash-Command Formatting, and Local Recovery Drafts

## Status
Accepted (supersedes the toolbar aspects of ADR 0006; keeps its auto-save pipeline)

## Context
ADR 0006 delivered an always-editable notes surface with a permanent formatting toolbar and 3-second debounced Firestore auto-save. Production use surfaced three issues:

1. **Caret resets during typing.** The detail panel re-synced editor state on every `app.notes` prop change — including echoes of its own saves (values trimmed on persist). The editor's innerHTML was rewritten mid-typing, jumping the caret/scroll ("view/edit not seamless").
2. **Toolbar friction.** A permanent toolbar contradicted the Linear-style target experience; users expect "/" commands and selection affordances.
3. **Crash window.** Edits made within the 3-second debounce window were lost if the tab crashed or the device died before flush-on-close could run.

## Decision

### 1. Caret-safe sync discipline (`useRichTextEditor`)
- Editor state resyncs **only on record identity change** (`app?.id`), never on save echo-backs.
- Incoming values are compared against the serialized DOM through canonicalization (`compareCanonical`); equal ⇒ no DOM write at all.
- Canonical Markdown law: `htmlToMarkdown(markdownToHtml(m))` is a fixed point; block separation is decided in exactly one place (`serializeContainer`, `\n\n` between blocks). Stored notes converge byte-stable after first save (zero drift on reopen).

### 2. Registry-driven formatting without a toolbar
- A single `FormattingAction` registry (11 actions) is the sole source consumed by the "/" slash menu, the floating selection bubble, and keyboard shortcuts. Future actions appear everywhere automatically.
- Slash menu: triggers at line start inside paragraphs/list items/quotes; arrow/Enter/Esc navigation; Backspace-to-empty and Space commit literal text; ARIA combobox/listbox semantics.
- Selection bubble appears above active selections listing context-valid actions; Link action supports update/removal of existing links.
- Interactive task-list checkboxes (`- [ ]`/`- [x]`) toggle by pointer or keyboard (Space/Enter); Enter at item end spawns the next unchecked item. `> ` renders as accent callouts. All persisted as plain Markdown — CSV/JSON exports unaffected.

### 3. Local recovery drafts (Notion-style Strategy B-lite)
- `tracklet_note_draft_<appId>` localStorage snapshot written synchronously per edit; cleared when durable save or flush-on-close succeeds.
- On open, drafts restore only when strictly newer than durable data (stale guard), surfaced via a dismissible "Restored unsaved draft" chip. Storage failures degrade silently.

### 4. One shared editor
- Generic `RichTextEditor` (Markdown value/change contract, zero application-layer coupling) now powers both the application detail panel and the Add Application modal; the legacy raw-textarea surface and the unused read-only renderer were retired.

## Consequences

### Positive
- Typing is interruption-free across auto-save cycles; notes reopen byte-stable.
- Formatting is fully keyboard-reachable and extensible from one registry.
- The crash window closes at zero cloud cost; multi-device conflicts still resolve last-write-wins.
- New surfaces (e.g., contact notes) can adopt the editor with two props.

### Neutral / Trade-offs
- Undo through programmatic mutations (template insert, checkbox toggle) is best-effort; transactional undo remains out of scope.
- Recovery drafts are intentionally device-local.
- `document.execCommand` remains the editing primitive (deprecated but universally supported); a structured-model migration is deliberately deferred while requirements stay bounded.
