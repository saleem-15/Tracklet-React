# Autonomous Governance & Context Engineering in Tracklet

> **System Architecture**: Universal `.agents/` Standards, Deterministic AST Linting, and Semantic Skill Routing  
> **Target Environments**: Antigravity, OpenCode, and Terminal/CI Tooling  
> **Status**: Production Reference Implementation  

---

## 1. Executive Summary & Problem Statement

In generative software development, relying on human "prompt-babysitting"—manually reminding AI agents about project rules, linking design registries, or requiring explicit slash commands—consistently fails at scale. When developers forget to specify constraints, unguided LLMs regress toward the statistical median of internet code: introducing divitis, raw HTML elements (`<select>`, `<textarea>`), low-contrast text, missing security rules, and architectural spaghetti.

Tracklet eliminates prompt-babysitting through an **Autonomous 3-Tier Governance Engine** built entirely on universal, open standards:
1. **Tier 1: Universal Rules & Directory Paging (`.agents/rules/*.md`, `AGENTS.md`)** — Injects domain guidelines, anti-slop standards, and component registries natively via Antigravity and OpenCode hierarchical discovery.
2. **Tier 2: Semantic Skill Routing (`.agents/skills/*/SKILL.md`)** — Autonomously activates specialized agent workflows from natural language intents using the open `agentskills.io` standard without requiring slash commands.
3. **Tier 3: Deterministic AST Gates & Pre-Commit Verification** — Enforces machine-checked verification via ESLint AST rules (`no-restricted-syntax`), TypeScript (`tsc`), Vitest, and Husky pre-commit hooks before code can ever be committed.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   TRACKLET 3-TIER AUTONOMOUS GOVERNANCE                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [Developer Conversational Prompt]                                          │
│       │ ("Clean up the job detail card and make it look professional")     │
│       ▼                                                                     │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ TIER 2: Semantic Skill Routing (agentskills.io Standard)              │  │
│  │ Analyzes natural intent -> Autonomously activates `anti-slop-craft`   │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
│                                     │                                       │
│                                     ▼                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ TIER 1: Native .agents/ Rules & Architectural Standards               │  │
│  │ Injects `.agents/rules/anti-slop-standards.md` & `component-registry` │  │
│  │ Always Active: `.agents/AGENTS.md` (Core Architecture & Standards)    │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
│                                     │                                       │
│                                     ▼                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ GENERATIVE SYNTHESIS & EXECUTION                                      │  │
│  │ • Step 0 Pre-Flight Discovery Manifest                                │  │
│  │ • Canonical Component Reuse (docs/COMPONENT_REGISTRY.md)              │  │
│  │ • 6 Anti-Slop Dimensions (container depth 1, icon restraint, etc.)    │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
│                                     │                                       │
│                                     ▼                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ TIER 3: Deterministic Quality Gates & AST Verification                │  │
│  │ • ESLint AST Rules (Bans native <select>, <textarea>, window.alert)   │  │
│  │ • Husky + lint-staged (Blocks non-compliant git commits)              │  │
│  │ • npx tsc --noEmit (Type integrity)                                   │  │
│  │ • npm test (Vitest 83-suite regression verification)                  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Tier 1: The Universal `.agents/` Standard (Antigravity & OpenCode)

Tracklet strictly uses the vendor-neutral **`.agents/` directory standard**, avoiding proprietary IDE formats (such as `.cursor/`). This guarantees 100% compatibility across **Antigravity**, **OpenCode**, and standard CLI/agent workflows.

### Architectural Rules Matrix

| Rule File | Scope | Authority | Core Guardrails Injected |
| :--- | :--- | :--- | :--- |
| **`.agents/AGENTS.md`** | Workspace Root | Mandatory Invariant | Trunk-based workflow, no unprompted commits, repository pattern, single source of truth for constants (`STAGE_CONFIG_MAP`), `addToast` notification hierarchy, zero native dialogs, WCAG AA contrast, 44px hit targets. |
| **`.agents/rules/anti-slop-standards.md`** | UI & Components | Mandatory Invariant | 6 Anti-Slop Standards: container depth ≤ 1, decorative icon restraint, static badge demotion, robotic copy removal, zero `transition-all`, `UI_TOKENS` consumption, Rules of Hooks. |
| **`.agents/rules/component-registry.md`** | UI & Components | Mandatory Invariant | Step 0 Pre-Flight Component Discovery Manifest, 8 Canonical Component Classes from `docs/COMPONENT_REGISTRY.md` (`RichTextEditor`, `CustomSelectDropdown`, `IconButton`, `StatusBadge`, `SegmentedTabs`, `CompanyLogo`, `LinkifiedText`, `EmptyState`/`useEscapeKey`). |
| **`.agents/rules/ui-ux-standards.md`** | UI & Views | Mandatory Invariant | Universal outbound link safety (`target="_blank" rel="noopener noreferrer"`), optimistic UI with error rollback, calm command center navigation hierarchy. |
| **`docs/COMPONENT_REGISTRY.md`** | Design System | Authoritative Lookup | Complete prop contracts, banned substitutes, and code examples for all 8 canonical primitives. |

---

## 3. Tier 2: Semantic Skill Routing (`agentskills.io` Standard)

In standard setups, skills remain dormant unless the user explicitly invokes them with a slash command (`/ship`, `/modify-data-model`). Tracklet solves this by applying **Description Engineering** across all skills in `.agents/skills/*/SKILL.md`.

Each skill's frontmatter `description` defines:
1. **Primary Capability**: Clear statement of the system transformation performed.
2. **Autonomous Intent Triggers**: Colloquial, natural phrases spoken by developers during ordinary conversation.
3. **Boundary Disambiguation**: Explicit guidelines on when to select this skill versus sibling skills.

### Semantic Routing Map

```
Developer Prompt ──────────────────────────┬──> "make this cleaner / remove boxes / tag soup"
                                           │    └─> routes to `anti-slop-craft`
                                           │
                                           ├──> "create a new modal / component for X"
                                           │    └─> routes to `add-component`
                                           │
                                           ├──> "build out the contact logging feature"
                                           │    └─> routes to `add-feature`
                                           │
                                           ├──> "add a referral field to job applications"
                                           │    └─> routes to `modify-data-model`
                                           │
                                           ├──> "redesign this to look bolder / audit UX"
                                           │    └─> routes to `impeccable`
                                           │
                                           ├──> "make it feel native / fluid spring / Apple HIG"
                                           │    └─> routes to `apple-design`
                                           │
                                           └──> "ship this / push and open PR"
                                                └─> routes to `ship`
```

---

## 4. Tier 3: Deterministic AST Gates & Verification (The "Electric Fence")

Natural language instructions are soft and probabilistic. Compilers and linters are **hard, deterministic laws**.

Tracklet uses modern **ESLint Flat Config** (`eslint.config.js`) to mechanically reject violations:

1. **Native `<select>` Banned**:
   - `JSXOpeningElement[name.name='select']` $\rightarrow$ Throws error directing the agent to `<CustomSelectDropdown>`.
2. **Native `<textarea>` Banned for Notes**:
   - `JSXOpeningElement[name.name='textarea']:not([className*='UI_TOKENS'])` $\rightarrow$ Throws error directing the agent to `<RichTextEditor>`.
3. **Browser Dialogs Banned**:
   - `window.alert/confirm/prompt` and bare `alert()` $\rightarrow$ Throws error directing the agent to in-app modals or `addToast`.
4. **Unsafe Outbound Links Banned**:
   - `target="_blank"` without `rel="noopener noreferrer"` $\rightarrow$ Throws compile-time security error.
5. **Direct Storage Imports Banned**:
   - Direct `idb` / `localforage` imports in views $\rightarrow$ Throws error enforcing `ApplicationRepository`.

### Pre-Commit Enforcement (Husky + lint-staged)
- `.husky/pre-commit` runs `npx lint-staged` and `npx tsc --noEmit`.
- Non-compliant code cannot be committed to Git under any circumstance.

---

## 5. Walkthrough: Zero-Babysitting Conversational Workflows

### Scenario A: Conversational UI Refinement
> **User Prompt**: *"The application details slide-over feels cluttered and clumsy. Can you clean it up and make it look professional?"*

1. **Semantic Intent**: Agent matches *"clean it up"*, *"cluttered"*, *"make it look professional"* $\rightarrow$ autonomously runs `anti-slop-craft`.
2. **Rule Discovery**: Antigravity/OpenCode loads `.agents/rules/anti-slop-standards.md` and `.agents/rules/component-registry.md`.
3. **Execution**:
   - Emits Step 0 Pre-Flight Component Discovery Manifest.
   - Flattens nested card wrappers to Depth 1.
   - Uses `RichTextEditor` and `CustomSelectDropdown`.
   - Strips decorative Lucide icons beside plain text labels.
4. **Deterministic Gate**:
   - Agent runs `npm run lint` and `npx tsc --noEmit`. ESLint verifies 0 banned AST elements.

---

## 6. How to Maintain and Extend Governance

### Adding a New Project Rule
1. Place standard Markdown rules in `.agents/rules/<rule-name>.md`.
2. Reference the rule in `.agents/AGENTS.md`. Antigravity and OpenCode discover it automatically.

### Adding or Tuning an Agent Skill
1. Create or edit `.agents/skills/<skill-name>/SKILL.md`.
2. Apply `agentskills.io` Description Engineering in the YAML frontmatter.
3. Provide step-by-step procedures and verification commands in the markdown body.
