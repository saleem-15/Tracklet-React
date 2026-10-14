# ADR 0009: Contact-Scoped Email Logging and Cross-Visibility Projection Engine

## Status
Accepted

## Context
Tracklet enables job seekers to manage both job applications and professional contacts (recruiters, referrers, mentors, and career coaches). Prior to this architectural change, email timeline logs (`EmailLog[]`) existed exclusively as an embedded sub-collection within the `Application` aggregate root (`application.emails`).

This created a product and domain modeling breakdown for non-application contacts:
1. **Unstructured Workarounds for Mentors & Coaches**: Users communicate frequently with career coaches, mentors, and peer reviewers who are not linked to any specific job application. Users had to copy-paste email threads into the free-form `notes` field of a contact.
2. **The Cross-Visibility Dilemma**: When an email is exchanged with a contact who *is* linked to an active job application (e.g. an agency recruiter or hiring manager), that communication is relevant in two distinct contexts:
   - On the **Contact Profile** (to review the full relationship history with that person).
   - On the **Application Detail Timeline** (to review the timeline of touchpoints with that company).

Two data-sync strategies were evaluated:
1. **Dual-Write Physical Duplication**: Storing duplicate copies of the `EmailLog` object in both `application.emails` and `contact.emails`.
2. **Projected Read Model (Single Source of Truth / CQRS-Lite)**: Persisting the email once under its primary domain owner, while dynamically projecting a consolidated timeline in the presentation layer using foreign keys and RFC 5322 counterparty matching.

---

## Decision

We adopt the **Projected Read Model** architecture with dedicated contact-level persistence and bidirectional cross-visibility.

### 1. Dual-Tier Persistence Contract (`types.ts`)
- Added optional `emails?: EmailLog[]` to the `Contact` interface for standalone/personal communications.
- Added optional relational metadata to `EmailLog`:
  - `contactId?: string`: Foreign key pointing to the target contact.
  - `applicationId?: string`: Foreign key pointing to the associated job application.

### 2. Single Source of Truth & Zero Dual-Writes
To prevent eventual consistency drift and sync conflicts in Firestore and offline `localStorage`:
- **Company Communications**: When an email is associated with a job application, it is stored **strictly within `application.emails`**, tagged with `contactId: contact.id` and `applicationId: app.id`. It is **not** duplicated into `contact.emails`.
- **Standalone / Personal Communications**: When an email is logged with a mentor/coach (or with `"None (Contact only)"` selected), it is stored directly in `contact.emails`. It is **never** written to any application.

### 3. In-Memory Unified Projection (`ContactDetailPanel.tsx`)
In `ContactDetailPanel`, the UI projects a unified, sorted `aggregatedEmails` timeline derived via `useMemo`:
```typescript
aggregatedEmails = useMemo(() => {
  if (!contact) return [];
  const directEmails = contact.emails || [];
  const appEmails = applications.flatMap(app => 
    (app.emails || []).filter(e => 
      e.contactId === contact.id || 
      (isLinkedApp(app.id) && matchesCounterpartyRFC(e, contact.email))
    )
  );
  return deduplicateAndSort([...directEmails, ...appEmails]);
}, [contact, applications]);
```
- **Guaranteed Isolation**: Personal mentor emails never leak into any job application view because `ApplicationDetailPanel` strictly reads `app.emails`.
- **RFC 5322 Value Object Resolution**: Counterparties are matched using `parseCounterpartyString()` to safely extract display names and email addresses from headers like `"Jane Doe <jane@acme.com>"`.

### 4. Canonical Modular Primitives (`EmailLogForm.tsx` & `ContactEmailLogSection.tsx`)
To comply with Tracklet's 300-line component threshold:
- **`EmailLogForm.tsx`** (< 280 lines): Shared form supporting direction toggle (`inbound` vs `outbound`), quick-fill counterparty chips, and an application selector dropdown built with `CustomSelectDropdown`.
- **`ContactEmailLogSection.tsx`** (< 225 lines): Dedicated contact timeline view with empty states and vertical spine aesthetics matching `EmailLogSection.tsx`.
- **`EmailLogCard.tsx`**: Updated to support an interactive `[Company · Stage]` badge with `onNavigateToApplication` routing.

### 5. Reversible Deletion & Target Routing
When editing or deleting an email from `ContactDetailPanel`:
- If the email belongs to an application, Tracklet dispatches the mutation to `onUpdateApp(targetApp.id, ...)`.
- If the email is standalone, Tracklet dispatches the mutation to `onUpdateContact(contact.id, ...)`.
- Deletions dispatch an informative Snackbar with an `Undo` action that restores the record to the exact originating collection.

### 6. Portable Backup & Restore (`backupJson.ts`)
- Updated `validateAndParseJSONBackup` and `generateJSONBackup` to parse and preserve `emails`, `contactId`, and `applicationId` on both application and contact models without data loss.

---

## Consequences

### Positive
- **Clean Domain Separation**: Personal mentorship and coaching communications have a first-class home without polluting corporate application pipelines.
- **Zero Synchronization Drift**: Because emails are stored in only one physical document/collection, editing or deleting an email can never result in orphaned or out-of-sync ghost records.
- **Seamless User Experience**: Job seekers see all interactions with a person in one place, with 1-click navigation to the relevant company board.
- **Component Health**: Refactoring reduced `EmailLogSection.tsx` from 430 lines to 221 lines and kept all new components well under the 300-line limit.

### Neutral / Trade-offs
- **In-Memory Join Cost**: Deriving `aggregatedEmails` iterates across active applications. Given that typical job search active pipelines contain 20–200 applications, this linear in-memory scan executes in < 2ms and is memoized against `[contact, applications]`.
- **Explicit Target Routing**: Deleting or editing an email from the contact view requires determining which parent entity owns the record before dispatching the update.
