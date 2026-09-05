# Research: Follow-Up Engine & Customizable Email Templates

**Feature**: 005-followup-templates | **Date**: 2026-09-05

## Research Items

### 1. Template Storage Architecture: `TemplateRepository`

**Decision**: Implement a dedicated `TemplateRepository` static service in `src/lib/templateRepository.ts`, following the same established persistence pattern as `ApplicationRepository` and `ContactRepository`.

**Rationale**:
- Guests persist templates in `localStorage` under `tracklet_followup_templates`.
- Authenticated users persist in Firestore under `/users/{userId}/templates`.
- On first run (empty storage), factory defaults are automatically loaded from a curated constants dictionary (`DEFAULT_FOLLOWUP_TEMPLATES`).
- Users can modify or delete default templates; a dedicated `resetDefaultTemplates()` method restores factory defaults without deleting custom templates.

**Alternatives considered**:
- Storing templates inside the monolithic user profile document — Rejected: templates can grow with custom drafts, better kept in a modular collection.
- Hardcoded constants only (non-editable) — Rejected: does not meet user requirement for full customization freedom.

---

### 2. Dynamic Placeholder Interpolation Engine

**Decision**: Create a lightweight, pure utility `interpolateTemplate(templateText, context)` in `src/lib/templateUtils.ts`.

**Context Data**:
```typescript
interface TemplateContext {
  company?: string;
  role?: string;
  contactName?: string;
  dateApplied?: string;
  userEmail?: string;
}
```

**Interpolation Rules**:
- Supported tokens: `{company}`, `{role}`, `{contactName}`, `{dateApplied}`.
- Graceful fallbacks:
  - If `contactName` is missing: defaults to "Hiring Team" (e.g., "Hi Hiring Team,").
  - If `role` is missing: defaults to "the open position".
  - If `company` is missing: defaults to "your team".
- Pure text escaping: replaces tokens safely without eval or dangerouslySetInnerHTML.

**Alternatives considered**:
- Full Mustache / Handlebars templating engine — Rejected: oversized dependency for 4 string substitutions; pure regex is zero-dependency, lightning fast, and has zero security attack surface.

---

### 3. Contact Auto-Resolution & Multi-Recipient Selection

**Decision**:
1. When opening the Follow-up Modal from an Application, auto-derive candidates from `app.contacts` / `allContacts` linked via `app.contactIds`.
2. If multiple contacts exist (e.g. Recruiter + Hiring Manager), provide a segmented chip / dropdown to switch the recipient on the fly.
3. Automatically update `contactEmail` and `{contactName}` in real-time when switching recipients.
4. Add a "Follow-up" button directly to each contact card in `ContactManagerSection` and `ContactDetailPanel`.

---

### 4. Dual-Action Follow-Up: Timeline Milestone + Optional Reminder Task

**Decision**:
When the user clicks "Open in Mail" (`mailto:`) or "Copy Text":
1. **Activity Marker**: Automatically appends a lightweight touchpoint to the Application's status/history timeline:
   `Follow-up sent to Karla Lindqvist (Post-Interview Thank You) • Sep 5`
2. **5-Day Reminder Task**: Provide a visible toggle checkbox inside the modal:
   `☑ Set a task to follow up in 5 business days` (default checked).
   When triggered, creates a task in `app.tasks`:
   `Follow up with Karla Lindqvist if no response` with `dueDate: [today + 5 business days]`.
3. Provide a toast receipt with an "Undo" callback.
