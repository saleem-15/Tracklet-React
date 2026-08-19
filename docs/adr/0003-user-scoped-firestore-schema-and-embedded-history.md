# ADR 0003: User-Scoped Firestore Hierarchy & Embedded Status History

## Status
Accepted

## Date
2026-08-19

## Context
Previously, Tracklet persisted job applications in a flat root Firestore collection (`applications/{applicationId}`) with `userId` as an attribute field, while recording status transition events in an isolated sub-collection (`applications/{applicationId}/history/{historyId}`).

Several architectural, security, and cost concerns were identified with this design:
1. **Double Write Operations**: Every application creation and status transition incurred 2 billable Firestore writes (1 on the parent document + 1 on the history sub-document).
2. **Rule Cost Overhead**: Security rules for `applications/{applicationId}/history/{historyId}` required executing a `get()` call to verify the parent application's `userId`, introducing an extra billable document read on every history evaluation.
3. **Orphaned Sub-Collections on Deletion**: Firestore does not cascade document deletions to sub-collections. Deleting an application left orphaned history records unless expensive recursive client-side deletion loops were executed.
4. **Latency on Detail View**: Opening the application detail modal required an asynchronous network round-trip (`getDocs`) to fetch history events, creating layout shifts and loading states for a lightweight timeline.

## Decision

1. **User-Scoped Hierarchical Path**:
   - Re-architected Firestore storage paths to `/users/{userId}/applications/{applicationId}`.
   - Simplified security rules to path-based matching (`match /users/{userId}/applications/{applicationId}`), enforcing `request.auth.uid == userId` with zero extra `get()` lookups.

2. **Embedded Status History List**:
   - Transitioned `history` from a sub-collection to an embedded array (`history: StatusHistoryEntry[]`) directly inside the `Application` document, matching existing embedded lists (`tasks`, `contacts`, `emails`).
   - Refactored `historyService.ts` into pure functional helpers (`createStatusHistoryEntry`, `appendStatusHistory`) for managing history states in memory without direct database couplings.

3. **Repository Sanitization & Resilience**:
   - Initialized Firestore with `ignoreUndefinedProperties: true` in `firebase.ts`.
   - Added recursive `sanitizeForFirestore` stripping in `ApplicationRepository` to prevent client-side SDK rejections on optional/empty form attributes.
   - Updated `StatusHistoryTimeline` to consume `history` directly as a prop for instantaneous, zero-read rendering.

## Consequences

### Positive
- **50% Write Billing Reduction**: Creating and updating applications now executes as 1 atomic write instead of 2.
- **100% Read Savings on Timelines**: History timelines render immediately from the application state without additional Firestore queries or network latency.
- **Atomic Deletions**: Deleting an application deletes 100% of its data in a single operation with zero orphaned documents.
- **Physical Multi-Tenancy**: Data is structurally partitioned by user UID, preventing accidental cross-tenant data leakage.
- **Clean Security Rules**: Eliminated expensive `get()` evaluations in `firestore.rules`.

### Negative / Trade-offs
- Global cross-user querying (e.g. platform-wide administrative analytics) requires Firestore Collection Group queries (`collectionGroup('applications')`) and dedicated composite indexes.
