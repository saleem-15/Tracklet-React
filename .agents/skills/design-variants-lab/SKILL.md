---
name: design-variants-lab
description: Multi-agent UX variant prototyping built on Tracklet's permanent dev-only DesignLabBar, plus sandboxed comparison labs and structured design critique methodology.
---

# Skill: Design Variants Lab & Multi-Agent UI Prototyping

When designing complex, high-impact, or ambiguous user experiences (timelines, editors, navigation, dense tables, action sheets), do not build a single guessed implementation. Build, compare, and refine multiple distinct archetypes concurrently, then promote the winner.

Every lab is driven by **one permanent, dev-only floating toolbar**: `src/dev/DesignLabBar.tsx`. There is no ad-hoc switcher UI per feature.

---

## 1. When to Use This Skill

- The user is dissatisfied or uncertain about an existing UI/UX pattern.
- A feature has competing UX philosophies (minimal vs detailed, stepper vs stream, inline editing vs modal).
- The team needs to test realistic edge cases (misclicks, stale states, rapid transitions) before committing.

---

## 2. The Permanent Lab Infrastructure (`src/dev/`)

This directory is **permanent product tooling**, not prototyping residue. It is guarded by `import.meta.env.DEV` (with a `forceRender` escape hatch for tests) and tree-shaken from production bundles.

| File | Responsibility |
| :--- | :--- |
| `src/dev/DesignLabBar.tsx` | Floating, draggable, portaled toolbar (variant switcher, surface toggle, notes, scenarios). |
| `src/dev/DesignLabBarChrome.tsx` | Obsidian/porcelain chrome primitives, drag handle, variant pills. |
| `src/dev/DesignLabBarControls.tsx` | Expanded controls, utility group, scenario trigger wiring. |
| `src/dev/DesignLabPopovers.tsx` | Variant notes card and custom scenario menu (never a native `<select>`). |
| `src/dev/useDesignLabState.ts` | Controlled variant selection + `?variant=` deep-link sync + cycling. |
| `src/dev/useLabDrag.ts` | Pointer/keyboard drag, viewport re-clamping, session storage, polite announcements. |
| `src/dev/designLabUtils.ts` | Pure helpers: clamping, default position, storage, URL, editable-target detection. |
| `src/dev/index.ts` | Barrel export. Import everything from `../dev`. |

### What the bar guarantees

- Mounts in `document.body` at `z-[9990]` — above `Modal` (`z-50`) and `ContactDetailPanel` (`z-[60]`), just under `Tooltip` (`z-[9999]`).
- Optional `topLayer` prop uses the native Popover API so the bar can float above `<dialog>.showModal()`.
- Stops `mousedown` / `pointerdown` / `click` propagation, so it never closes an enclosing modal backdrop.
- Draggable grip: 4px movement threshold, GPU transform while dragging, arrow-key movement (15px), `Home` / double-click reset.
- `Alt+1..9` switches variants, `Alt+[` / `Alt+]` cycles, `Alt+L` collapses, `Escape` closes popovers without closing an underlying modal.
- Dark obsidian and light porcelain surfaces, persisted per lab in `sessionStorage`, with WCAG AA contrast on both.
- Polite `aria-live` announcements for keyboard movement, plus `role="toolbar"` / `role="group"` / separators / `aria-pressed` semantics.

---

## 3. The Two Lab Modes

### Mode 1: In-Place Live Mode (default)

Best for modals, cards, tables, tooltips, bars, drawers, and any surface that already renders in the real app. Mount the bar directly over the live view and branch on the selected variant — five lines of wiring.

- Preserves real spacing, real data, real scroll containers, and real z-index stacking.
- The lab bar floats above the modal it is testing.

### Mode 2: Isolated Sandbox Mode

Best for standalone multi-state flows (onboarding, import, empty states) that need deterministic datasets.

- Render a full-page (or modal) sandbox canvas and pass `scenarios={...}` so testers can jump between realistic presets.
- Optionally add a side-by-side comparison grid inside the sandbox canvas. The bar itself never renders a comparison grid — that is sandbox content, not chrome.

---

## 4. Copy-Ready Usage

```tsx
import {
  DesignLabBar,
  useDesignLabState,
  type DesignLabScenario,
  type DesignLabVariant,
} from '../dev';

type VariantId = 'spine' | 'journal' | 'stepper';
type ScenarioId = 'happy' | 'ghosted';

const VARIANTS: readonly DesignLabVariant<VariantId>[] = [
  {
    id: 'spine',
    label: 'Minimalist Spine',
    shortLabel: 'Spine',
    summary: 'Essential milestones with the lowest visual load.',
    tradeoffs: ['No per-step notes', 'Weak error recovery'],
    recommended: true,
  },
  {
    id: 'journal',
    label: 'Lifecycle Journal',
    shortLabel: 'Journal',
    summary: 'Rich audit trail with notes, emails, and rollback.',
    tradeoffs: ['Visually heavier', 'More scrolling'],
  },
  { id: 'stepper', label: 'Process Stepper', shortLabel: 'Stepper' },
];

const SCENARIOS: readonly DesignLabScenario<ScenarioId>[] = [
  { id: 'happy', label: 'Happy Path', description: 'Applied → offer in 12 days' },
  { id: 'ghosted', label: '40-Day Ghost', description: 'Silent rejection after interview' },
];

export function TimelineLab() {
  const { variant, setVariant } = useDesignLabState<VariantId>({
    labId: 'timeline',
    variants: VARIANTS,
    defaultVariant: 'spine',
  });

  return (
    <>
      {variant === 'spine' && <TimelineSpine />}
      {variant === 'journal' && <TimelineJournal />}
      {variant === 'stepper' && <TimelineStepper />}

      <DesignLabBar
        labId="timeline"
        title="Timeline"
        variants={VARIANTS}
        activeVariant={variant}
        onVariantChange={setVariant}
      />
    </>
  );
}
```

Add scenario presets by extending the same bar:

```tsx
const [scenario, setScenario] = useState<ScenarioId>('happy');

<DesignLabBar
  labId="timeline"
  title="Timeline"
  variants={VARIANTS}
  activeVariant={variant}
  onVariantChange={setVariant}
  scenarios={SCENARIOS}
  activeScenario={scenario}
  onScenarioChange={setScenario}
/>;
```

`useDesignLabState` also returns `activeVariant` and `cycleVariant(direction)`. Pass `syncUrl={false}` for ephemeral labs.

---

## 5. Forbidden Patterns

- **Never hand-roll** an ad-hoc `*LabSwitcher.tsx`, floating comparison bar, or per-feature variant pill row. Use `<DesignLabBar>`.
- **Never use** star/sparkles icons (`Sparkles`, `Wand2`, `✨`), pulsing dots (`animate-pulse`, `animate-ping`), neon halos, or `transition-all`.
- **Never render** the bar unportaled inside a modal — backdrop click handlers will close the modal when the user switches variants.
- **Never use** a raw `<select>` for scenarios. The custom `DesignLabScenarioMenu` is the only scenario picker.
- **Never ship** an active lab mount to production paths. See Phase 5.

---

## 6. Core Principles

1. **Context-Isolated Sub-Agents**: assign each archetype to an independent sub-agent to prevent hybrid compromises. A minimalist timeline stays radical; a journal variant maximizes recovery detail.
2. **Realistic Fake Data Harness**: never test with `["Step 1", "Step 2"]`. Create 4–5 presets covering the happy path, fast rejection, accidental misclick, 40+ day ghosting, and the blank initial state.
3. **Zero Compromise on Interaction**: every variant is fully functional (click, toggle, edit, delete, revert).
4. **Clean Component Architecture**: each variant and subcomponent stays strictly under **300 lines**; extract sub-views; pure helpers live in `src/lib/` or `src/dev/`.

---

## 7. Step-by-Step Workflow

### Phase 1: Define Archetypes & Edge Cases

1. Identify 3–4 distinct archetypes:
   - **Minimalist Spine**: essential milestones, typographic hierarchy, low clutter.
   - **Lifecycle Journal**: detailed cards, contextual actions, note surfaces, error recovery.
   - **Process Stepper**: compact overview, horizontal progress, collapsible audit trail.
   - **Holistic Activity Stream**: merged cross-domain activity (status + emails + tasks + notes).
2. Create `src/lib/<feature>Presets.ts` with realistic timestamps, notes, and company data.
3. Register each archetype in a typed `VARIANTS` array with `summary` and `tradeoffs` so the notes popover explains the trade-off without a separate doc.

### Phase 2: Parallel Sub-Agent Implementation

1. Invoke subagents concurrently:
   - Subagent 1: Variant A + shared data/dwell utilities.
   - Subagent 2: Variants B–D with pure modular props.
2. Enforce TypeScript strict typing, Tailwind utilities (no raw hex), design tokens, Lucide icons, and < 300 lines per file.

### Phase 3: Mount the Lab (Pick a Mode)

1. **Mode 1**: mount `<DesignLabBar>` beside the live component and branch on `variant`.
2. **Mode 2**: build the sandbox canvas under `src/components/<area>/` and mount the bar with `scenarios`.
3. Do **not** add a comparison grid to the chrome. Sandbox layout belongs to the sandbox canvas.
4. Verify locally on `localhost` that the bar floats above any open modal and that variant switching never dismisses the modal.

### Phase 4: Structured UI/UX Evaluation Framework

| Evaluation Axis | Key Questions to Audit |
| :--- | :--- |
| **Cognitive Load & Glancing** | Can a user read their status in under 500ms? Any badge soup, pings, or glowing boxes? |
| **Typographic Discipline** | Are numbers `tabular-nums`? Do digit widths shift layout? Are separators quiet `·` rather than heavy borders? |
| **Error Recovery & Reversibility** | Can a mistaken status change be reverted? Do destructive actions offer Undo receipts? |
| **Context Preservation** | Are forms inline instead of nested modals? (Never stack modals without strong justification.) |
| **Accessibility (WCAG AA)** | 4.5:1 contrast on both lab surfaces, 24px minimum targets, no continuous animation. |

### Phase 5: Selection, Harmonization & Production Integration

1. Review feedback with the user and lock the canonical archetype.
2. **Keep Permanent Infrastructure**:
   - Do **not** delete `src/dev/DesignLabBar.tsx` or anything under `src/dev/`.
   - The bar is `import.meta.env.DEV`-guarded and tree-shaken from production builds; it is reusable tooling for the next lab.
3. **Remove Active Lab Mounts & Secondary Variants**:
   - Remove the temporary `<DesignLabBar />` JSX mount and the `useDesignLabState(...)` hook call from `src/components/` and `src/App.tsx`.
   - Delete secondary variant components, branches, preset harnesses, and `*LabSwitcher.tsx` files.
   - The build cannot tree-shake unreferenced variant modules while a mount still imports them.
4. **Canonical Refactoring**: fold the winning archetype into one production-grade component with clean domain props (no `variant`/`lab` props left behind).
5. Wire live callbacks (`onUpdateApp`, repository persistence, optimistic UI, Undo receipts).
6. Verify:
   ```bash
   npx tsc --noEmit
   npm test
   npm run build
   ```

### Phase 6: Future Concept Preservation

If a losing variant is a compelling future feature:

1. Create `docs/features/<feature-name>.md`.
2. Document the user story, data model, and integration blueprint.
3. Archive the complete component source in a fenced code block so a future sprint can adopt it immediately.
