# ADR 0006: Notes Always-Editable Surface, 3-Second Debounced Auto-Save, and Fenced Code Blocks

## Status
Accepted

## Context
In job search workflows, candidates frequently capture freeform notes during interview prep, recruiter phone screens, technical architecture reviews, and offer negotiations. These notes include salary figures, recruiter emails, URLs (take-home repositories, Zoom links, design specs), and technical code snippets.

The previous notes implementation suffered from three usability and architectural friction points:
1. **Modal Mode-Switching Friction**: Users had to explicitly click "Edit" to type in a fixed-height textarea and click "Done" or "Save" to view formatted markdown. This created layout jumping and interrupted thought flow.
2. **Database Quota vs. Save Anxiety**: Unthrottled or aggressive auto-save intervals (e.g. 400ms) would overwhelm Firebase Firestore free-tier write quotas during continuous typing. Conversely, requiring manual saves led to user anxiety and data loss when closing panels.
3. **Missing Code Snippets**: Technical interview preparation notes often require pasting multi-line algorithms, SQL queries, or configuration blocks without markdown parser corruption.

## Decision

We implemented a unified, always-editable notes surface backed by a quota-protective auto-save pipeline:

### 1. Always-Editable Living Surface (Zero Mode-Switching)
- Eliminated the `isEditing` state and the "Edit" / "Done" mode toggle in `ApplicationNotesSection.tsx`.
- The notes area is a direct, always-focused `<textarea>` paired with an auto-grow height mechanism (`useMarkdownEditor.ts`), expanding dynamically with content without introducing nested container scrollbars.
- Kept the top formatting toolbar permanently accessible for one-click markdown actions (Bold, Italic, Headings, Bullet Lists, Numbered Lists, Links, Code Blocks).

### 2. 3-Second Debounced Auto-Save (Firebase Free-Tier Protection)
- In `ApplicationDetailPanel.tsx`, all keystrokes update local state instantly while scheduling a **3000ms (3-second)** idle debounce timer.
- Batches rapid typing sessions into a single atomic Firestore write via `ApplicationRepository`.
- Header displays a subtle, non-intrusive status indicator (`● Saving…` $\rightarrow$ `✓ Saved` $\rightarrow$ `idle`) without requiring modal alerts or intrusive toast banners.

### 3. Flush-on-Close Guarantee (Zero Data Loss)
- When a user closes the detail panel (via click outside, Escape key, or close button), `handleRequestClose` immediately cancels pending debounce timers and flushes any unsaved notes directly to Firestore before dismissing the modal.
- This provides the frictionless feel of local state with absolute persistence guarantees.

### 4. Fenced Code Blocks & Markdown Renderer Expansion
- Upgraded `MarkdownNoteView.tsx` with a block parser supporting multi-line fenced code blocks bounded by ```` ``` ````.
- Rendered with a dark, high-contrast theme (`bg-slate-900 text-slate-100 font-mono text-[11px]`) and horizontal scrolling for long code lines.
- Added toolbar button and keyboard shortcut (`Ctrl+Shift+K` / `Cmd+Shift+K`) for code block insertion.
- Maintained `NoteLinksBar.tsx` beneath the notes surface to display 1-click chip buttons for all detected URLs.

## Consequences

### Positive
- **Seamless Typing UX**: Notes are immediately editable on click with 0ms transition delay and zero layout jumping.
- **Quota Efficiency**: Limits Firestore document write counts during heavy note-taking sessions while eliminating save anxiety.
- **Zero Data Loss**: Flush-on-close logic ensures changes typed seconds before closing the panel are never dropped.
- **Rich Developer Notes**: Direct support for formatting system design notes, algorithm snippets, and direct link navigation.

### Neutral / Maintenance
- Read-only markdown views (`MarkdownNoteView`) continue to render formatted notes across cards in the Kanban pipeline board and contact sheets, while the detail modal maintains the interactive editing surface.
