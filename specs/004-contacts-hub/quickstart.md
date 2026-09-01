# Quickstart Validation Guide: Unified Contacts & Mentorship Hub

**Feature**: 004-contacts-hub | **Date**: 2026-09-01

## Prerequisites

- Node.js 18+ installed
- `npm install` completed
- Dev server running: `npm run dev`
- Browser open at `http://localhost:5173`

## Validation Scenarios

### Scenario 1: Contacts Tab & Empty State (FR-001, FR-003)

1. Open the application in a browser
2. Look at the left sidebar — a new **"Contacts"** tab should appear between Pipeline and Analytics
3. Click the Contacts tab
4. **Expected**: An empty-state illustration with "Add your first contact" prompt and a primary action button

### Scenario 2: Create a Contact (FR-003, FR-004, FR-005)

1. From the Contacts tab, click **"+ Add Contact"**
2. Fill in:
   - Name: `John Doe`
   - Category: `Mentor`
   - Organization: `TAP Program`
   - Email: `john@tap.org`
   - Next Follow-up: Tomorrow's date
3. Submit
4. **Expected**: Contact card appears in the directory immediately. Success snackbar shown.

### Scenario 3: Search & Filter (FR-014)

1. With 3+ contacts created, type `TAP` in the search bar
2. **Expected**: Only contacts matching "TAP" in name, role, or organization are shown
3. Click the "Mentor" category filter chip
4. **Expected**: Only contacts with category "Mentor" are displayed

### Scenario 4: Layout Toggle (FR-016)

1. From the Contacts directory (card grid default), click the layout toggle button
2. **Expected**: View switches to a compact table layout
3. Refresh the page
4. **Expected**: Table layout persists (preference saved)

### Scenario 5: Link Contact to Application via Typeahead (FR-006, FR-007, FR-008)

1. Navigate to All Applications → open any application's detail panel
2. In the contacts section, click **"Attach Contact"**
3. Type `Jo` in the search input
4. **Expected**: Dropdown shows "John Doe — Career Mentor · TAP Program"
5. Click to select
6. **Expected**: John Doe appears in the application's contact section. Success snackbar shown.
7. Re-open the typeahead
8. **Expected**: John Doe is no longer in the dropdown (already linked)

### Scenario 6: Inline Create from Typeahead (FR-008)

1. In the application detail panel typeahead, type `Alex Kim`
2. **Expected**: No matches. A "➕ Create new contact 'Alex Kim'" option appears
3. Click it
4. **Expected**: Inline form expands with name pre-filled. Fill category and submit.
5. **Expected**: Alex Kim is saved to the global Contacts directory AND linked to this application

### Scenario 7: View Linked Applications from Contact (FR-010)

1. Navigate to Contacts tab → click on "John Doe"
2. **Expected**: Contact detail drawer opens
3. Under "Linked Applications", the application from Scenario 5 appears as a clickable pill
4. Click the pill
5. **Expected**: Drawer closes, application detail panel opens

### Scenario 8: Unlink Contact (FR-009, FR-012)

1. Open an application detail panel with a linked contact
2. Click the unlink icon next to the contact's name
3. **Expected**: Contact removed from this application. Snackbar with "Undo" appears.
4. Click "Undo"
5. **Expected**: Contact reappears in the application's contact section

### Scenario 9: Delete Contact with Cascade (FR-011, FR-012)

1. Navigate to Contacts tab
2. Delete "Alex Kim" (the contact linked in Scenario 6)
3. **Expected**: Snackbar with "Undo" appears. Contact removed from directory.
4. Navigate to the application that Alex was linked to
5. **Expected**: Alex Kim no longer appears in the application's contacts section

### Scenario 10: Follow-up Badge (FR-001)

1. Create a contact with `nextFollowUpDate` set to tomorrow
2. Look at the sidebar Contacts tab
3. **Expected**: Badge count shows "1" (or increments)
4. Set the follow-up date to a date far in the future (beyond the configured expiry threshold)
5. **Expected**: Badge count decreases

### Scenario 11: Legacy Migration (FR-015)

1. Ensure existing applications have embedded `contacts[]` data (from before the feature)
2. Load the application after the feature ships
3. **Expected**: Contacts from embedded arrays appear in the Contacts directory as standalone entities
4. Open the applications that previously had embedded contacts
5. **Expected**: `contactIds[]` references point to the migrated standalone contacts. Legacy `contacts[]` array is cleared.

### Scenario 12: Guest Mode (FR-013)

1. Use the app without signing in (guest mode)
2. Create a contact
3. **Expected**: Contact persisted in localStorage
4. Sign in with an account
5. **Expected**: Guest contacts are migrated to Firestore alongside guest applications

## Build Verification

```bash
npx tsc --noEmit    # Zero type errors
npm run build       # Clean production build
```
