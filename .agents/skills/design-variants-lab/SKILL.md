---
name: design-variants-lab
description: Multi-agent UX variant prototyping, sandboxed comparison lab, and structured design critique methodology for Tracklet.
---

# Skill: Design Variants Lab & Multi-Agent UI Prototyping

When designing complex, high-impact, or ambiguous user experiences (e.g. timelines, editors, navigation, dense tables, action sheets), do not build a single guessed implementation. Instead, use this systematic **Multi-Agent Variant Exploration & Lab** workflow to build, compare, test, and refine multiple distinct design archetypes concurrently.

---

## 1. When to Use This Skill
- The user expresses dissatisfaction or uncertainty with an existing UI/UX pattern.
- A feature has multiple competing UX philosophies (e.g. minimal vs detailed, horizontal stepper vs vertical stream, inline editing vs modal dialogs).
- The team wants to test realistic edge cases (accidental misclicks, stale states, rapid transitions) in a live sandbox before committing to production.

---

## 2. Core Principles

1. **Context-Isolated Sub-Agents**:
   - Assign each distinct design variant to an independent sub-agent.
   - *Why*: Sub-agents prevent "cognitive anchoring" or hybrid compromises. A sub-agent tasked with a minimalist timeline will pursue radical simplicity, while a sub-agent tasked with an interactive journal will pursue maximum error recovery and audit detail.
2. **Realistic Fake Data Harness**:
   - Never test variants with trivial `["Step 1", "Step 2"]` dummy strings.
   - Always create 4–5 realistic presets representing real-world user journeys (happy path, fast rejection, accidental misclick, 40+ day ghosting, blank initial state).
3. **Zero Compromise on Interaction**:
   - Each variant must be functional in the sandbox (supports clicking, toggling, editing, deleting, or status reverting).
4. **Clean Component Architecture**:
   - Keep each variant and subcomponent strictly under **300 lines**.
   - Extract inline forms and sub-views into modular files.
   - Pure utility functions belong in `src/lib/`.

---

## 3. Step-by-Step Workflow

### Phase 1: Define Archetypes & Edge Cases
1. Identify 3 to 4 distinct design archetypes:
   - **Archetype A (Minimalist Spine)**: Essential milestones, clean typographic hierarchy, low visual clutter.
   - **Archetype B (Lifecycle Journal)**: Detailed cards, contextual actions, rich note surfaces, error-correction focus.
   - **Archetype C (Process Stepper)**: Compact bird's-eye overview, horizontal progress, collapsible audit trail.
   - **Archetype D (Holistic Activity Stream)**: Merged cross-domain activity (status + emails + tasks + notes).
2. Create `src/lib/<feature>Presets.ts`:
   - Define concrete scenario presets with realistic timestamps, notes, and company data.

### Phase 2: Parallel Sub-Agent Implementation
1. Invoke subagents concurrently using `invoke_subagent`:
   - Subagent 1: Build Variant A and shared data/dwell calculation utilities (`src/lib/<feature>Utils.ts`).
   - Subagent 2: Build Variant B, Variant C, and Variant D with pure modular props.
2. Ensure each subagent follows the strict architecture rules:
   - TypeScript strict typing.
   - Tailwind CSS utility classes (no raw hex codes).
   - Tracklet design tokens (`STAGE_CONFIG_MAP`, `StatusBadge`, Lucide icons).
   - Component length < 300 lines.

### Phase 3: Build the Interactive Lab Harness
1. Create `src/components/detail/<Feature>LabModal.tsx` containing:
   - **Lab Header**: Scenario selector dropdown, variant switcher pills, and comparison mode toggle.
   - **Live Sandbox Canvas**: Renders the currently selected variant with the active preset.
   - **Side-by-Side Comparison Grid**: Allows evaluating 2 or 4 variants simultaneously on the same data.
   - **UX Critique Drawer**: Embedded analysis detailing the strengths, weaknesses, cognitive load, and best-fit scenarios for each variant.
2. Expose a temporary or subtle floating trigger (e.g. `🧪 Lab` button in component header) so the user can test all variants directly in the browser on localhost.

### Phase 4: Structured UI/UX Evaluation Framework
Run each variant through this structured evaluation rubric with the user:

| Evaluation Axis | Key Questions to Audit |
| :--- | :--- |
| **Cognitive Load & Glancing** | Can a user understand their current status in under 500ms? Does the UI scream with unnecessary badges, glowing pings, or colored boxes? |
| **Typographic Discipline** | Are numbers formatted with `tabular-nums`? Do single-digit and double-digit values cause jagged right-alignment shifts? Are separators quiet middle dots (`·`) rather than heavy borders? |
| **Error Recovery & Reversibility** | If a user accidentally changes status, how easily can they revert? Does deleting the latest checkpoint roll back the application status automatically? Are destructive actions protected by Undo toasts? |
| **Context Preservation** | Are forms inline or nested in popups? (Never open a modal over another modal without strong justification). |
| **Accessibility (WCAG AA)** | Do spine dots maintain uniform 10px geometry? Are contrast ratios >= 4.5:1? Does motion avoid disruptive continuous animations (`animate-ping`)? |

### Phase 5: Selection, Harmonization & Production Integration
1. Review feedback with the user and cherry-pick the best aspects of each variant.
2. Refactor the selected variant into the canonical production component (`<Feature>.tsx`).
3. Wire live callbacks (`onUpdateApp`, persistence layer, optimistic UI updates, Undo toast receipts).
4. Verify with:
   ```bash
   npx tsc --noEmit
   npm test
   npm run build
   ```

### Phase 6: Future Concept Preservation
- If one of the explored variants (e.g. Unified Activity Journey) is a compelling feature for a future release:
  1. Create a detailed documentation spec in `docs/features/<feature-name>.md`.
  2. Document the user story, data model, and integration blueprint.
  3. Embed the complete, functional component source code in an archived code fence within the document so future engineering sprints can adopt it immediately.
