# Research: Unified Contacts & Mentorship Hub

**Feature**: 004-contacts-hub | **Date**: 2026-09-01

## Research Items

### 1. ContactRepository Pattern — Mirroring ApplicationRepository

**Decision**: Create a dedicated `ContactRepository` class with static methods, mirroring the `ApplicationRepository` pattern exactly.

**Rationale**: The existing `ApplicationRepository` establishes a clear, proven pattern in Tracklet:
- Static class with `loadContacts()`, `saveContact()`, `deleteContact()` etc.
- Firestore path: `/users/{userId}/contacts` (sub-collection under user document)
- Guest fallback: `localStorage.getItem('tracklet_contacts')` / `setItem()`
- Uses `sanitizeForFirestore()` helper (already exists in `applicationRepository.ts` — extract to shared util or duplicate)
- Uses `commitInChunks()` for batch operations

**Alternatives considered**:
- Extending `ApplicationRepository` with contact methods — Rejected: violates SRP, makes the 400-line class even larger
- A generic `Repository<T>` base class — Rejected: over-engineering for 2 entity types; the static-class pattern is already established and well-understood

### 2. Bidirectional Link Storage Strategy

**Decision**: Store `applicationIds: string[]` on the Contact entity and `contactIds: string[]` on the Application entity. Both sides are updated atomically during link/unlink operations.

**Rationale**:
- Enables efficient queries from both directions without cross-collection joins
- Contact detail panel can show linked apps by reading `applicationIds` directly
- Application detail panel can show linked contacts by reading `contactIds` directly
- Firestore does not support cross-collection joins, so denormalization is the standard pattern

**Alternatives considered**:
- Junction collection (`/users/{userId}/contact_links`) — Rejected: adds complexity, requires extra reads, overkill for the expected scale (max ~200 contacts × ~50 apps)
- Store links only on Contact entity — Rejected: would require scanning all contacts to find which are linked to a given application

### 3. Legacy Embedded Contacts Migration

**Decision**: One-time migration on first data load after feature ships. Implemented as `migrateEmbeddedContacts()` in a dedicated `contactMigration.ts` module.

**Rationale**:
- Migration runs once, gated by a `tracklet_contacts_migrated` localStorage flag (or Firestore user profile field)
- For each application with non-empty `contacts[]`:
  1. Extract embedded contacts
  2. Deduplicate by normalised name (case-insensitive trim)
  3. Create standalone Contact entities (Firestore batch write)
  4. Set `contactIds[]` on the application to reference the new standalone contact IDs
  5. Clear the legacy `contacts[]` array on the application
- Batch operations use the existing `commitInChunks()` pattern

**Alternatives considered**:
- Lazy migration (migrate per-application when opened) — Rejected: leaves data inconsistent, contacts directory would be incomplete
- Background migration script — Rejected: no server-side infrastructure; this is a client-side SPA

### 4. Follow-up Badge Threshold — Reusing ExpiryNotificationSettings

**Decision**: Reuse the existing `ExpiryNotificationSettings.expiryThresholdHours` for the contact follow-up badge calculation. Add a `getContactsFollowUpDueSoon()` function to `expiryUtils.ts` (or a new `contactUtils.ts`) that mirrors `getExpiringSoonTasks()`.

**Rationale**:
- User already has a configurable threshold in Settings for task expiry
- Using the same threshold for contact follow-ups provides consistent, predictable behavior
- No new Settings UI required

### 5. Typeahead Search Implementation

**Decision**: Client-side filtering with a custom `ContactSearchPicker` component using controlled input + filtered dropdown. No third-party autocomplete library.

**Rationale**:
- Contact list is small (≤200), client-side filter is instant
- Tracklet has no existing autocomplete dependency; adding one for a single component is unnecessary
- Filter logic: case-insensitive substring match across `name`, `role`, and `organization` fields
- Results capped at 10 items in the dropdown
- Keyboard navigation: ArrowUp/ArrowDown to select, Enter to confirm, Escape to close

**Alternatives considered**:
- `react-select` or `downshift` library — Rejected: heavy dependency for a single use case; custom component gives full control over styling and behavior
- Server-side search (Firestore query) — Rejected: unnecessary latency for small datasets
