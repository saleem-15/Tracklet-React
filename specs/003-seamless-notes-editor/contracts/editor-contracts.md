# Editor Contracts: Seamless Notes Editor

**Feature**: 003-seamless-notes-editor | **Date**: 2026-08-24
Interface contracts for the shared editor subsystem. These are UI/module contracts (no network APIs change; Firestore payload for `notes` remains a plain Markdown string).

---

## 1. `RichTextEditor` — reusable component contract

```ts
export interface RichTextEditorProps {
  value: string;                        // Markdown source of truth
  onChange: (markdown: string) => void; // fired on any content mutation
  placeholder?: string;
  ariaLabel?: string;                   // default "Rich text editor"
  minRows?: number;                     // visual hint only
  templates?: NoteTemplate[] | null;    // empty-state pills (opt-in)
  onDraftRestore?: (draft: { markdown: string }) => void; // host shows chip
}
```

**Guarantees**
- G1: Never rewrites internal DOM when `serialize(dom) === value` (caret-safe).
- G2: Full DOM replace **only** when record identity changes (host passes `key={recordId}` or component detects via `value` identity contract documented in host integration).
- G3: Emits canonical Markdown per serializer normalization (single blank line between blocks, trimmed ends).
- G4: All formatting reachable with keyboard only.

**Host obligations**: own debounced persistence + flush-on-close + draft lifecycle (`ApplicationDetailPanel`, add modal); pass `key={app.id}` when binding to a record.

---

## 2. Serialization utilities (`richTextMarkdownUtils.ts`)

```ts
markdownToHtml(md: string): string;      // existing signature, extended syntax
htmlToMarkdown(input: string | HTMLElement): string;

// NEW exports
toggleTaskItem(editorEl: HTMLElement, itemEl: HTMLElement): void;
spawnNextTaskItem(itemEl: HTMLElement): HTMLElement; // Enter-at-end (FR-010)
isInsideCodeFence(node: Node): boolean;  // edge-case gating
```

**Round-trip law (SC-002)**: for any Markdown `m` produced by this library:
`htmlToMarkdown(markdownToHtml(m)) === m` (canonical form). Legacy hand-written notes are normalized once on first save, then stable.

**Supported block map (fixed)**:

| Markdown | DOM |
|----------|-----|
| `# X` / `## X` / `### X` | `h2`/`h3`/`h4` |
| `- X` / `* X` | `ul > li` |
| `1. X` | `ol > li` |
| `- [ ] X` / `- [x] X` | `li.task > input[checkbox]` (+text) |
| `> X` | `blockquote` |
| ``` fenced | `pre > code` |
| paragraph | `p` |

Inline: `**bold**`, `*italic*`, `` `code` ``, links. Escape-first tokenization preserved (URL safety unchanged).

---

## 3. Action registry (`editorActions.tsx`)

```ts
export interface EditorActionContext { editor: HTMLDivElement; }
export interface FormattingAction {
  id: EditorActionId;                  // 'bold'|'italic'|'h1'|'h2'|'h3'|'bullet'
                                       // |'numbered'|'todo'|'quote'|'code'|'link'
  label: string;
  icon: React.FC<{ className?: string }>;
  keywords: string[];
  shortcut?: string;
  scope: 'block' | 'inline' | 'selection';
  appliesTo: (ctx: EditorActionContext) => boolean;
  apply: (ctx: EditorActionContext) => void;
}
export const EDITOR_ACTIONS: readonly FormattingAction[];
export const getActionById = (id: EditorActionId) => FormattingAction | undefined;
```

**Contract**: FR-007 minimum set must exist exactly once each; consumers MUST NOT hardcode action lists (FR-008). Adding an entry suffices to surface it in menu + bubble.

---

## 4. Slash menu (`SlashMenu.tsx`) — behavioral contract

| Input | Required behavior |
|-------|-------------------|
| `/` at start of empty paragraph/list-item/quote-line | open at caret rect |
| query chars after `/` | filter by label+keywords substring (case-insensitive) |
| ↑ / ↓ | move highlight (wraps), announce via aria-activedescendant |
| Enter | apply highlighted action; close |
| Esc | close; focus returns to editor; literal text state preserved |
| Backspace → empty query | close leaving literal `/` |
| Space immediately after `/` | commit literal `/` + space, close |
| second `/` while open | reposition/restart (never stack) |

Accessibility: container `role="combobox" aria-expanded`, list `role="listbox"`, items `role="option"` (FR-020).

---

## 5. Selection bubble (`SelectionBubble.tsx`) — behavioral contract

- Shows for non-collapsed selections fully inside the editor; hidden on collapse/scroll/blur-outside.
- Anchored above selection rect (flip below if clipped).
- Renders registry actions where `appliesTo(ctx)` is true; inapplicable ones omitted.
- Applying keeps selection active where the action permits (bold/italic/link); block actions collapse to new block end.
- Link action on already-linked text pre-fills URL and offers Update/Remove (FR-023).

---

## 6. Draft store (`noteDrafts.ts`)

```ts
export interface NoteDraft { markdown: string; savedAt: string; } // ISO-8601
saveNoteDraft(appId: string, markdown: string): void;   // silent on failure
clearNoteDraft(appId: string): void;
readNoteDraft(appId: string): NoteDraft | null;
resolveDraftOnOpen(appId: string, storedNotes: string, updatedAtIso: string):
  { restore: NoteDraft } | { discard: 'stale' | 'identical' | 'none' };
```

**Storage key**: `tracklet_note_draft_<appId>` · **Quota/private-mode**: all ops no-op safely. Restore decision table lives in data-model.md (stale guard FR-019).

---

## 7. Host integration contracts

### ApplicationDetailPanel (detail surface)
- Resync effect dependency narrows to record id (`app?.id`) — NOT `app?.notes` (bug fix R2).
- Save-compare uses canonical serialization output; status chip markup unchanged visually; wrapped in `aria-live="polite"` (FR-022).
- Draft chip rendered above notes card when `resolveDraftOnOpen` returns `restore`; dismiss clears draft only.

### AddApplicationModal (add surface)
- Same `RichTextEditor` instance type; no autosave pipeline (modal save path unchanged); templates enabled; feature parity per SC-007.
