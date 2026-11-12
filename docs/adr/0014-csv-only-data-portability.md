# ADR 0014: CSV-Only Data Portability

## Status
Accepted

## Date
2026-11-11

## Context
Tracklet is a cloud-synced SaaS ([ADR 0003](0003-user-scoped-firestore-schema-and-embedded-history.md)), yet its settings surface framed data export as "Backup & Restore" — a local-first concept inherited from the pre-pivot era ([ADR 0011](0011-pivot-to-commercial-saas-and-cloud-storage.md)). The card offered five actions across two formats (JSON and CSV), and the CSV export was lossy: status history, tasks, and email logs existed only in the JSON backup, so a user leaving Tracklet could not take their full record. The in-app and legal copy simultaneously promised "CSV or JSON" export and a "100% Data Portability Guarantee".

For context: consumer job trackers are CSV-first (Teal offers CSV download only; Huntr offers a full-data download), so a CSV-only export matches both the market and the user base.

## Decision

1. **CSV is the only export format.** JSON export/restore is removed, and all user-facing copy and legal documents (privacy policy, ToS) now promise CSV only. This is a public-promise change, not a UI cleanup.
2. **Exports are complete.** 100% of structured user data — including status history, tasks, and email logs — must be present in the CSV. Nested data flattens into single cells. Deliberately omitting data as a retention tactic was considered and rejected: it contradicts the product's trust messaging, creates GDPR data-portability exposure, and costs nothing to avoid (export contents are invisible UI complexity).
3. **Known boundary:** resume binary files (Cloud Storage) cannot be embedded in CSV; the export carries their metadata only. Binary inclusion is deferred with the server-side archive (Decision 5).
4. **No new bundling dependencies for export packaging.** The multi-file export downloads CSVs sequentially within the click gesture rather than adding a zip library.
5. **Server-side (Cloudflare Worker) export is deferred.** The browser already holds 100% of structured data in context, so a Worker export adds nothing today. It becomes worthwhile only for including resume binaries or very large datasets — and when built, it must reuse the same CSV builders rather than duplicating logic.

## Why this is hard to reverse
- The privacy policy and ToS are now written promises of CSV export with specific contents; regressing either is a compliance and trust event.
- Deleting the JSON restore path also removes the only tool that could read previously issued JSON backups; that capability cannot be cheaply re-added once users are told it doesn't exist.

## Consequences
- The settings surface is "Import CSV" and "Export Data" — one action per direction, no format choice.
- Any future export feature (backend archive, new data families) must extend the CSV builders or amend this ADR.
- If download UX friction from sequential files ever justifies packaging, the resolution is a dependency-free zip builder or an amendment to this ADR — not a third-party library by default.

## References
- [ADR 0003: User-Scoped Firestore Schema](0003-user-scoped-firestore-schema-and-embedded-history.md)
- [ADR 0011: Pivot to Commercial SaaS](0011-pivot-to-commercial-saas-and-cloud-storage.md)
- `docs/PRIVACY_POLICY.md` — Right of Access & Portability
