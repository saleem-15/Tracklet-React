# Data Model: Seamless Notes Editor

**Feature**: 003-seamless-notes-editor | **Date**: 2026-08-24

## Entities

### Application Note (existing field, format extended)

| Aspect | Value |
|--------|-------|
| Location | `Application.notes: string` (Firestore doc field) |
| Format | Plain Markdown — headings (`#`/`##`/`###`), bullet/numbered lists, **task lists** `- [ ]`/`- [x]`, **quotes** `> `, links `[label](url)` & raw URLs, bold/italic/inline code, fenced code blocks |
| Constraints | UTF-8 text; practical budget ≤10K chars (SC-009); export-compatible (CSV/JSON untouched) |

**Validation rules**: serializer must accept legacy notes (no checkboxes/quotes) unchanged; new syntax is standard Markdown so no migration.

### FormattingAction (registry entry, in-memory)

| Field | Type | Notes |
|-------|------|-------|
| id | string | stable key (`bold`, `h1`, `h2`, `h3`, `bullet`, `numbered`, `todo`, `quote`, `code`, `link`) |
| label | string | menu/bubble display text |
| icon | component | lucide icon |
| keywords | string[] | filter matches for slash query |
| shortcut | string? | display hint (e.g., `Ctrl+B`) |
| scope | `block \| inline \| selection` | where action applies |
| appliesTo(ctx) | predicate | context gating (e.g., not inside code fence) |
| apply(editor, ctx) | fn | DOM mutation + re-serialize; caret-preserving |

**Invariant**: FR-007 minimum set ⊆ registry; every consumer (menu, bubble, shortcuts) derives exclusively from this registry.

### NoteTemplate (static content)

| Field | Value |
|-------|-------|
| id | `recruiter-screen` \| `tech-prep` \| `offer-breakdown` |
| label / emoji | 📋 Recruiter Screen, 💻 Tech Prep, 💰 Offer Breakdown |
| skeleton | Exact Markdown per spec Appendix A |

**Rule**: shown only when `notes` empty; any manual input dismisses.

### RecoveryDraft (device-local persistence)

| Field | Type | Storage |
|-------|------|---------|
| key | `tracklet_note_draft_<appId>` | localStorage |
| markdown | string | current editor text |
| savedAt | ISO-8601 timestamp | write time |

**Lifecycle**:
```
edit ──► upsert(key, {markdown, savedAt=now})
durable save success OR flush-on-close success ──► remove(key)
open record ──► draft exists?
   ├─ no                        → normal load
   ├─ markdown == stored notes  → silent remove
   ├─ savedAt > updatedAt       → restore + inline chip
   └─ savedAt ≤ updatedAt       → silent remove (stale guard)
storage unavailable             → no-op (silent degradation)
```

## State Transitions

### saveStatus (existing, unchanged semantics)

```
idle ──(edit differs from lastSaved)──► unsaved
unsaved ──(3s debounce fires)──► saving ──(success)──► saved ──(3s)──► idle
saving ──(failure)──► unsaved
edit reverts to lastSaved value ──► idle (timer cancelled)
```
FR-022 adds an aria-live announcement on each transition; states themselves unchanged.

### Editor sync (new, per R2)

```
incoming value v (props):
  if recordId changed      → full replace (caret/scroll snapshot-restore)
  else if serialize(dom)==v → NO-OP
  else                      → external edit path (draft restore/template undo edge)
```

## Relationships

- Application 1—* RecoveryDraft (0 or 1 live draft per app, device-local)
- FormattingAction *—1 EditorRegistry (single instance consumed by SlashMenu, SelectionBubble, keyboard layer)
- NoteTemplate independent static list referenced by empty-state UI
