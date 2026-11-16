# Tracklet Documentation Governance & Decision Invariants

This document establishes the mandatory standards for creating, updating, and maintaining documentation in **Tracklet**. All developers and AI agents must strictly follow these rules to maintain high historical clarity without creating documentation bloat.

---

## 1. Executive Philosophy: High Signal, Zero Bloat

Documentation exists to solve two critical failure modes:
1. **Documentation Amnesia**: Removing or altering a pattern (e.g. a banner, an auth flow, or a route) without recording *why*, causing a future AI agent or developer to recreate the exact rejected pattern weeks later.
2. **Documentation Bloat**: Generating separate Markdown files for every minor button color, CSS tweak, or trivial refactor, leading to doc rot, stale archives, and diluted AI context.

**Golden Invariant**: Document **only what matters**, in the **correct tier**, with zero redundancy.

---

## 2. The 4-Tier Documentation Taxonomy

Every piece of context belongs in exactly one tier:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   TRACKLET 4-TIER CONTEXT TAXONOMY                     │
├────────┬───────────────────────────┬───────────────────────────────────┤
│ Tier   │ Format & Location         │ Purpose & Lifecycle               │
├────────┼───────────────────────────┼───────────────────────────────────┤
│ Tier 1 │ Code Comments & Commits   │ Local internals, regex quirks,    │
│        │ (`src/...`)               │ non-obvious workarounds. Ephemeral│
├────────┼───────────────────────────┼───────────────────────────────────┤
│ Tier 2 │ Living Operational Rules  │ Active constraints & guardrails   │
│        │ (`.agents/rules/*.md`)    │ injected autonomously into AI.    │
│        │                           │ Mutable, updated in lockstep.     │
├────────┼───────────────────────────┼───────────────────────────────────┤
│ Tier 3 │ Design Decision Records   │ Macro UX/UI paradigms, visual     │
│        │ (`docs/ddr/NNNN-*.md`)    │ contrast, notification models.    │
│        │                           │ Immutable historical audit trail. │
├────────┼───────────────────────────┼───────────────────────────────────┤
│ Tier 4 │ Architecture Decisions    │ System architecture, persistence, │
│        │ (`docs/adr/NNNN-*.md`)    │ routing, API security, telemetry. │
│        │                           │ Immutable historical audit trail. │
└────────┴───────────────────────────┴───────────────────────────────────┘
```

---

## 3. The 4-Gate Decision Test (Anti-Bloat Filter)

Before creating an ADR (`docs/adr/`) or a DDR (`docs/ddr/`), the proposed decision **MUST pass all 4 gates**. If it fails even one gate, **DO NOT create a document**—capture the reasoning in code comments, a conventional commit message, or append a bullet to an existing living rule in `.agents/rules/`.

| Gate | Test Question | If NO: Action |
| :--- | :--- | :--- |
| **1. Cross-Cutting Scope** | Does this decision alter system-wide architecture, global routing, cross-view persistence, or top-level UX paradigms? | Reject ADR/DDR. Keep as local code comment. |
| **2. Non-Trivial Alternatives** | Were viable, competing design/architectural approaches considered and intentionally rejected for specific trade-offs? | Reject ADR/DDR. Follow standard practices. |
| **3. Regression Risk** | Would a future AI agent or developer, lacking this historical rationale, reasonably make the wrong choice and re-introduce the problem? | Reject ADR/DDR. Standard code speaks for itself. |
| **4. Permanence** | Is this an intentional long-term direction rather than a transient spike or short-lived experiment? | Reject ADR/DDR. Use a feature branch. |

---

## 4. ADR vs. DDR: Clear Domain Boundaries

### When to Author an ADR (`docs/adr/NNNN-title.md`)
ADRs govern **technical, structural, and infrastructure architecture**:
- Routing migrations, route nesting, and URL query contracts (e.g. ADR 0015: Unified `/applications` Hub).
- Database schemas, multi-tenancy scoping, and security rules (e.g. ADR 0003: User-Scoped Firestore).
- Persisted data formats and serialization (e.g. ADR 0014: CSV-Only Portability).
- Telemetry, privacy compliance, and edge reverse-proxies (e.g. ADR 0012, ADR 0013).
- State-management architecture migrations (e.g. ADR 0006: Notes Autosave & Draft Recovery).

### When to Author a DDR (`docs/ddr/NNNN-title.md`)
DDRs govern **design, interaction, visual hierarchy, and product UX paradigms**:
- Notification hierarchies and severity boundaries (e.g. DDR 0001: Canvas Ambient Calm & In-Context Staleness).
- Surface elevation systems, background contrast tiers, and canvas geometry.
- Component interaction paradigms (e.g. Morphing Expanding Island filters vs. detached dropdown panels).
- Visual information density trade-offs (e.g. Action-Only Badges, banned decorative subtitles).

---

## 5. The Immutability & Lifecycle Protocol

1. **ADRs and DDRs are Append-Only History**:
   - Once marked `Status: Accepted`, the text of an ADR or DDR is **permanently immutable**.
   - **NEVER** edit a past ADR or DDR to reflect a change in requirements. Rewriting history destroys the context of why earlier code was written.
2. **The Supersession Protocol**:
   - When a design or architectural paradigm changes in the future, author a **new** record (e.g. `DDR-0002` or `ADR-0016`).
   - In the old record, update **only** the `Status:` line:
     ```markdown
     ## Status
     Superseded by DDR-0002 (2027-01-15)
     ```
   - In the new record, explicitly link the predecessor:
     ```markdown
     ## Status
     Accepted (Supersedes DDR-0001)
     ```
3. **The Living Rule Sync Invariant (Tier 1 & Tier 2 Bridge)**:
   - AI agents load `.agents/rules/*.md` automatically on every turn, but do **not** proactively ingest all historical ADRs/DDRs.
   - Therefore, whenever an ADR or DDR is accepted, the resulting active constraint **MUST be synchronized into the relevant `.agents/rules/*.md` file** (e.g. `.agents/rules/ui-ux-standards.md` Section 20) with a link back to the record. This ensures instant autonomous enforcement by future AI agents.

---

## 6. Standard Templates

### Architectural Decision Record (ADR)
```markdown
# ADR NNNN: <Short Imperative Title>

## Status
Accepted | Proposed | Superseded by ADR-XXXX | Deprecated

## Context
<Problem statement, historical background, failure points, and forces driving the change>

## Decision
<Clear, unambiguous technical decision with architectural subsections and invariants>

## Consequences
### Positive
<Tangible architectural benefits, bugs eliminated, performance gains>
### Negative / Trade-offs
<Accepted limitations, migration overhead, edge cases>
```

### Design Decision Record (DDR)
```markdown
# DDR NNNN: <Short Imperative Title>

## Status
Accepted | Proposed | Superseded by DDR-XXXX | Deprecated

## Context
<Visual, UX, or interaction problem, previous flawed implementation, cognitive drawbacks>

## Decision
<Design system rules, hierarchy definitions, surface contracts, and component interaction models>

## Consequences
### Positive
<User clarity, visual calm, cognitive load reduction, design system consistency>
### Negative / Trade-offs
<Accepted trade-offs, alternative views required>

## Decision Record Governance
<Immutability statement and supersession instructions>
```
