---
name: add-component
description: Guidelines for building React components in Tracklet to maintain UI quality and clean code standards.
---

# Skill: Adding a React Component to Tracklet

When creating a new UI component in Tracklet:

## 1. File & Naming Rules
- Create file in `src/components/<ComponentName>.tsx`.
- Use PascalCase for component filenames and export names.
- Always define an explicit `interface <ComponentName>Props`.

## 2. Rules of Hooks Guardrail
- All `useState`, `useEffect`, `useMemo`, `useCallback`, `useRef` calls **MUST** be placed at the top of the component function body.
- **NEVER** write an early return guard (`if (!data) return null;`) above any hook call. Place early return guards AFTER all hooks.

## 3. Mandatory Canonical Shared Primitives
- **Notes & Markdown**: ALWAYS use `RichTextEditor` (`src/components/editor/RichTextEditor.tsx`) for notes, meeting summaries, interview prep, or discussion surfaces. Never use raw `<textarea>` for notes.
- **Select Dropdowns**: ALWAYS use `CustomSelectDropdown` (`src/components/CustomSelectDropdown.tsx`). Never use raw HTML `<select>` elements.
- **Modals, Drawers & Dialogs**: ALWAYS attach a keyboard listener for `e.key === 'Escape'` so overlay dialogs dismiss cleanly.
- **Status Badges**: ALWAYS use `StatusBadge` or lookup colors via `STAGE_CONFIG_MAP` from `src/lib/constants.ts`.

## 4. Styling Standards
- Use Tailwind CSS v4 classes matching the slate-and-blue theme described in `DESIGN.md`.
- Use `Outfit` for display/headers, `Plus Jakarta Sans` for body, and `JetBrains Mono` for tabular/meta values.
- Apply `shadow-2xs` or `shadow-xs` for cards; do not use heavy shadows unless creating a modal backdrop.

## 5. Checklist
- [ ] Props interface created and exported if needed
- [ ] No hooks after conditional returns
- [ ] Uses `RichTextEditor` if rendering notes or rich text
- [ ] Uses `CustomSelectDropdown` if rendering dropdown options
- [ ] Listens for `Escape` key if creating a modal, drawer, or dialog
- [ ] No direct `localStorage` or `firebase` calls inside presentation components
- [ ] Runs clean with `npx tsc --noEmit` and `npm run build`
