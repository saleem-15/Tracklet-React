# Tracklet Documentation Index

Welcome to the internal documentation repository for **Tracklet**. This directory maintains the architectural records, feature specifications, UX audits, operational runbooks, and historical archives for the project.

---

## 📁 Directory Structure

```
docs/
├── README.md                      # Documentation directory index (this file)
├── adr/                           # Architecture Decision Records (immutable architectural history)
│   ├── 0001-lighthouse-modernization.md
│   ├── 0002-in-app-password-reset-and-split-auth-views.md
│   ├── 0003-user-scoped-firestore-schema-and-embedded-history.md
│   ├── 0004-conditional-sentry-telemetry.md (Superseded by ADR 0011)
│   ├── 0005-extension-duplicate-handling-detect-inform-route.md
│   ├── 0006-notes-always-editable-autosave-and-fenced-code-blocks.md
│   ├── 0007-notes-editor-shared-surface-slash-menu-drafts.md
│   ├── 0008-normalized-markdown-email-ingestion-and-rendering.md
│   ├── 0009-contact-email-log-and-cross-visibility-projection.md
│   ├── 0010-action-only-navigation-badges-and-inventory-placement.md
│   └── 0011-pivot-to-commercial-saas-and-cloud-storage.md
├── architecture-migration/        # Multi-phase domain and hook refactoring roadmap
│   ├── PHASE_1_DOMAIN_HOOKS.md
│   ├── PHASE_2_PRESENTATION_LAYOUT.md
│   ├── PHASE_3_CONTEXT_PROVIDERS.md
│   └── REFACTORING_ROADMAP.md
├── features/                      # Deep-dive functional and domain specifications
│   └── unified-application-journey.md
├── audits/                        # UX audits, research findings, and backlog roadmaps
│   ├── user-flow-and-ux-audit.md
│   └── ux-improvements-and-roadmap.md
└── archive/                       # Deprecated proposals, design variants, and handoff notes
    └── handoff-status-history-redesign.md
```

---

## 🏛️ Architecture Decision Records (ADRs)

| ADR | Title | Status | Date |
| :--- | :--- | :--- | :--- |
| **[0001](adr/0001-lighthouse-modernization.md)** | Lighthouse Modernization & AA Accessibility | Accepted | 2026-08-17 |
| **[0002](adr/0002-in-app-password-reset-and-split-auth-views.md)** | In-App Password Reset & Split Auth Views | Accepted | 2026-08-17 |
| **[0003](adr/0003-user-scoped-firestore-schema-and-embedded-history.md)** | User-Scoped Firestore Schema & Embedded History | Accepted | 2026-08-22 |
| **[0004](adr/0004-conditional-sentry-telemetry.md)** | Conditional Sentry Telemetry for Self-Hosting | **Superseded by 0011** | 2026-08-20 |
| **[0005](adr/0005-extension-duplicate-handling-detect-inform-route.md)** | Extension Duplicate Handling: Detect, Inform, Route | Accepted | 2026-08-22 |
| **[0006](adr/0006-notes-always-editable-autosave-and-fenced-code-blocks.md)** | Always-Editable Notes, Debounced Autosave & Fenced Code | Accepted | 2026-08-27 |
| **[0007](adr/0007-notes-editor-shared-surface-slash-menu-drafts.md)** | Shared Rich Text Editor, Slash Menus & Draft Recovery | Accepted | 2026-08-27 |
| **[0008](adr/0008-normalized-markdown-email-ingestion-and-rendering.md)** | Normalized Markdown Email Ingestion & Rendering | Accepted | 2026-09-27 |
| **[0009](adr/0009-contact-email-log-and-cross-visibility-projection.md)** | Contact & Email Log Cross-Visibility Projection | Accepted | 2026-10-14 |
| **[0010](adr/0010-action-only-navigation-badges-and-inventory-placement.md)** | Action-Only Navigation Badges & Inventory Count Placement | Accepted | 2026-10-20 |
| **[0011](adr/0011-pivot-to-commercial-saas-and-cloud-storage.md)** | Pivot from Open Source / Local-First to Commercial Cloud SaaS | Accepted | 2026-10-22 |

---

## 📜 Documentation Lifecycle & Standards

1. **Architecture Decisions (`adr/`)**:
   - ADRs are immutable historical records.
   - When a design decision changes, do not rewrite an old ADR; write a new ADR that explicitly supersedes the older one (e.g., ADR 0011 superseding ADR 0004).

2. **Temporary / Migration Runbooks**:
   - If a document describes instructions to remove or clean up code, it remains active in `docs/runbooks/` as long as the underlying migration code exists in `src/`.
   - Once the migration is complete and the code is deleted, the runbook is retired/removed in the same atomic commit.

3. **Feature Specifications (`features/`)**:
   - Living documents defining data models, state flows, and interaction rules for complex multi-view features (e.g., Unified Application Journey).
