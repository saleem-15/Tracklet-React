---
name: add-component
description: >
  Builds, structures, and exports new React 19 UI components in Tracklet adhering to architectural standards.
  Autonomous Triggers: Use whenever the user asks to "create a new component", "build a modal/drawer/card",
  "extract this into a reusable component", "add a UI widget", "make a component for X", or when scaffolding
  a new .tsx file in src/components/.
  Enforces: Pre-flight component discovery manifest, strict Rules of Hooks (all hooks at top, early returns
  strictly after), explicit TypeScript Props interface, under-300-lines modularity limit, canonical primitive reuse
  (from docs/COMPONENT_REGISTRY.md), UI_TOKENS design tokens, and Happy-DOM test fixture readiness.
  Boundaries: Use this skill for architecting and implementing new component files. For reviewing or decluttering
  existing UI against AI slop, use anti-slop-craft. For full end-to-end features touching persistence, routes,
  and state, use add-feature.
---

# Skill: Adding a React Component to Tracklet

When creating or modifying a UI component in Tracklet:

## Step 0: Mandatory Pre-Flight Component Discovery Protocol
Before writing any component code, declare your Pre-Flight Manifest (per `.agents/rules/component-registry.md`):
```markdown
### 🛡️ Pre-Flight Component Discovery Manifest
1. UI Intent: [What capability is being built]
2. Resolved Canonical Primitives:
   - [UI Need] -> [Canonical Component Path] (from docs/COMPONENT_REGISTRY.md)
3. Prohibited Elements Checked:
   - <select>: [None used; using CustomSelectDropdown]
   - <textarea>: [None used for notes; using RichTextEditor or tokenized inputBase]
   - Inline buttons: [None used; using IconButton or UI_TOKENS]
4. Design Tokens & Styling:
   - Container / Buttons: [Using UI_TOKENS and Tailwind tokens]
   - Transitions: [transition-colors duration-150; strictly NO transition-all]
```

## 1. File & Naming Rules
- Create file in `src/components/<ComponentName>.tsx` (or subdirectories such as `src/components/detail/`).
- Use PascalCase for component filenames and export names.
- Always define and export an explicit `interface <ComponentName>Props`.

## 2. Rules of Hooks Guardrail
- All `useState`, `useEffect`, `useMemo`, `useCallback`, `useRef` calls **MUST** be placed at the top of the component function body.
- **NEVER** write an early return guard (`if (!data) return null;`) above any hook call. Place early return guards AFTER all hooks.

## 3. The 8 Mandatory Canonical Shared Primitives
Consult `docs/COMPONENT_REGISTRY.md` and `.agents/rules/component-registry.md`:
1. **Notes & Markdown**: `RichTextEditor` (`src/components/editor/RichTextEditor.tsx`). Raw `<textarea>` for notes is strictly forbidden.
2. **Select Dropdowns**: `CustomSelectDropdown` (`src/components/CustomSelectDropdown.tsx`), `StageSelectorDropdown`, `FilterSelectDropdown`. Raw HTML `<select>` is forbidden.
3. **Action Buttons**: `IconButton`, `DeleteIconButton`, `CloseIconButton`, `CopyIconButton`, `EmailIconButton` (`src/components/IconButton.tsx`). Raw buttons with red delete styles are forbidden.
4. **Status & Domain Badges**: `StatusBadge` (`src/components/StatusBadge.tsx`) with `STAGE_CONFIG_MAP`, and `JobTypeBadges` (`src/components/JobTypeBadges.tsx`).
5. **Segmented Navigation**: `SegmentedTabs` (`src/components/SegmentedTabs.tsx`).
6. **Company Logos**: `CompanyLogo` (`src/components/CompanyLogo.tsx`).
7. **Safe Links & Markdown**: `LinkifiedText` (`src/components/LinkifiedText.tsx`).
8. **Feedback & Overlay Dismissal**: `EmptyState` (`src/components/EmptyState.tsx`), `Tooltip` (`src/components/Tooltip.tsx`), and `useEscapeKey` (`src/lib/useEscapeKey.ts`) on all modals, slide-overs, and drawers.

## 4. Styling & Design Tokens
- Consume `UI_TOKENS` from `src/theme/tokens.ts` (`card`, `modal`, `btnPrimary`, `btnSecondary`, `btnOutline`, `btnGhost`, `inputBase`).
- Use `Outfit` for display/headers, `Plus Jakarta Sans` for body, and `JetBrains Mono` for tabular/meta values.
- Apply `shadow-2xs` or `shadow-xs` for cards (`UI_TOKENS.card`).

## 5. Anti-Slop Verification Checklist
Verify your component against the 6 Anti-Slop Standards (`.agents/rules/anti-slop-standards.md`):
- [ ] Pre-Flight Manifest emitted and canonical primitives mapped
- [ ] Container depth ≤ 1 (no card-in-card; no redundant wrapper divs)
- [ ] No decorative icons on self-evident text; no Sparkles/Wand2/Bot icons
- [ ] Max 1 status badge (`StatusBadge`); secondary metadata rendered typographically with dot separators
- [ ] Operational headers have zero filler subtitles; action-led verbs used
- [ ] Transitions use `transition-colors duration-150`; strictly zero `transition-all`; no font-weight jumps
- [ ] Design tokens consumed from `UI_TOKENS`; no arbitrary bracket styles (`bg-[#...]`); readable text has WCAG AA contrast (no `text-slate-400`)
- [ ] Runs clean with `npx tsc --noEmit` and `npm test`
