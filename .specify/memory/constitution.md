# Tracklet Project Constitution

## Core Principles

### I. Cloud-First, User-Scoped Persistence (No Local-Only Silos)
All persistent user data—including job applications, status histories, notes, contacts, email logs, autofill profiles, and resumes—MUST be stored in Firebase (Firestore and Firebase Cloud Storage) scoped under `users/{userId}/...` (ADR 0003). 
- Do NOT introduce new features that rely on `localStorage` or `IndexedDB` as the primary database.
- `localStorage` may only be used for ephemeral UI preferences (e.g., theme, sidebar collapse state), temporary draft recovery (ADR 0007), or the strictly capped 3-card Sandbox preview prior to sign-up.

### II. Entitlement & Tier-First Feature Design
Tracklet is a commercial SaaS product with **Free** and **Pro** tiers. Every new feature specification (`spec.md`) and implementation plan (`plan.md`) MUST explicitly define:
1. Whether the feature is available to `free` users, quota-limited, or exclusive to `pro` users.
2. How the UI gracefully handles the locked/paywalled state (triggering the upgrade flow rather than failing silently).
3. How the entitlement or quota is enforced on the backend (`firestore.rules` or `/api` routes).

### III. Authenticated & Rate-Limited Serverless Endpoints
Every serverless API route in `/api/*` (including `api/scrape-job.ts` and `api/report-issue.ts`) MUST:
- Require and verify a valid Firebase Auth ID token (`Authorization: Bearer <token>`).
- Validate request payloads and enforce per-user rate limits and tier quotas before executing external fetches, scraping, or third-party API calls.

### IV. Extension & Web Parity
The Chrome Extension (`extension/`) and the React Web App (`src/`) are two surfaces of the same cloud workspace.
- Extension features must authenticate against the user's Firebase session and read/write to the shared Firestore schema and Cloud Storage.
- Do not build isolated data models in the extension that cannot be viewed or managed in the web dashboard.

### V. High-Craft UI/UX & Performance Standards
- Follow the design system tokens and standards defined in `DESIGN.md` and `.agents/rules/ui-ux-standards.md`.
- Maintain high Lighthouse performance and accessibility standards (ADR 0001).
- Navigation badges must remain action-only (ADR 0010), and status history transitions must remain embedded within the application document to minimize Firestore read costs (ADR 0003).

## Governance
This constitution supersedes any legacy open-source or local-first assumptions in older ADRs or specs. All SpecKit artifacts (`spec.md`, `plan.md`, `tasks.md`) and pull requests must verify compliance with these five principles before implementation.
