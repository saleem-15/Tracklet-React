# Quickstart: Contact Email Log Verification

This document outlines quick manual testing flows to verify the Contact Email Log feature.

## Prerequisites
- Run local development server: `npm run dev`
- Open application at `http://localhost:5173`

---

## Scenario A: Standalone Mentor Email Logging
1. Go to **Contacts** tab (`/contacts`).
2. Pick or create a mentor contact with no linked jobs (e.g. "Dr. Marcus Chen", Category: Mentor).
3. Open the contact slide-over drawer.
4. Scroll to the **Emails** section.
5. Click **"Log Email"**.
6. Enter:
   - Direction: `Received`
   - Subject: `Resume Review Feedback & Strategy`
   - From: `marcus.chen@alumni.edu`
   - Date: Today
   - Body: `Great progress on your system design portfolio. Focus on distributed cache metrics.`
7. Click **"Save Email"**.
8. **Verification**:
   - The email appears in the contact's email timeline.
   - The notes section is unchanged and clean.
   - Refresh the browser (guest or auth) to confirm persistence.

---

## Scenario B: Company-Linked Email Cross-Visibility
1. Create/select a contact "Sarah Jenkins (Senior Recruiter)".
2. Link Sarah to an application "Stripe - Staff Frontend Engineer".
3. Inside Sarah's contact profile:
   - Click **"Log Email"**.
   - Direction: `Sent`
   - Subject: `Availability for System Design Round`
   - Associate with Application: Select `Stripe`
   - Body: `Hi Sarah, I am available this Thursday 2pm EST.`
   - Click **"Save Email"**.
4. **Verification in Contact Profile**:
   - The email appears in Sarah's timeline with a badge `Stripe · Screening`.
5. Open the **Stripe** job application detail panel:
   - Check the **Emails** section.
   - **Verification in Application Profile**:
     - The email appears in Stripe's email log with counterparty `Sarah Jenkins`.
6. Open an unassociated mentor contact:
   - Confirm Sarah's Stripe email does NOT appear there.
