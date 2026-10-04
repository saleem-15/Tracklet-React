# Feature Specification: Reliable Extension ↔ Account Connection

**Feature Branch**: `fix/extension-auth-sync`

**Created**: 2026-10-03 · **Revised**: 2026-10-04

**Status**: Draft (revision 2)

**Input**: User description: "A tester installed the browser extension and it showed 'Local Mode' even though he wanted to sync with the cloud. Find out why and prevent it." Follow-up: "I want the extension to save in the cloud even if they did not open the web app."

**Related specs**: `007-extension-capture-quality` (what gets captured), `008-extension-companion-redesign` (how it looks). This spec covers only *where saves go* and *how the account stays connected*.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Extension connects automatically after sign-in (Priority: P1)

A signed-in Tracklet user installs the extension (or already has it) and has Tracklet open in the same browser profile. Without refreshing or signing in again, the extension recognises the account and shows that saves go to the cloud.

**Why this priority**: This is the exact failure the tester hit. Every clip went into a hidden device-only queue.

**Independent Test**: Sign in to Tracklet, *then* install/reload the extension, open it. Status reads connected within 3 seconds; a clipped job appears in the account.

**Acceptance Scenarios**:

1. **Given** the user is signed in on an already-open Tracklet tab and installs the extension afterwards, **When** they open the extension, **Then** it shows connected within 3 seconds without refreshing the tab.
2. **Given** the extension is open and not connected, **When** the user signs in on Tracklet, **Then** the extension status updates to connected without being reopened.
3. **Given** Tracklet finishes loading before the extension is ready on that tab, **When** the extension becomes ready, **Then** it still receives the current account.
4. **Given** Tracklet is still checking whether the user is signed in, **When** that check is in progress, **Then** the extension's existing connection is NOT cleared.

---

### User Story 2 - Saves reach the cloud even when Tracklet is closed (Priority: P1)

Once connected, the user can close Tracklet for days or weeks. Every job they clip and every email they log is saved directly to their account, with no Tracklet tab open and no sign-in prompt.

**Why this priority**: Users do not keep a dashboard tab open. A clipper that only works while the web app is open looks broken.

**Independent Test**: Connect, close all Tracklet tabs, wait past the short-lived credential lifetime (or simulate it), clip a job. It appears in the account from another device.

**Acceptance Scenarios**:

1. **Given** the user connected earlier and has no Tracklet tab open for 7 days, **When** they clip a job, **Then** it is saved to their account and the confirmation says "Saved to Tracklet".
2. **Given** the extension's short-lived credential has expired, **When** a save is attempted, **Then** the extension renews it silently and the save succeeds without user action.
3. **Given** the renewal is permanently refused (password changed, account disabled, access revoked), **When** a save is attempted, **Then** the item is kept on the device, the confirmation says "Saved on this device", and the status changes to "Reconnect".
4. **Given** items were kept on the device while offline or disconnected, **When** the extension next has a working connection, **Then** it uploads them itself, without waiting for Tracklet to be opened, and each item appears exactly once.

---

### User Story 3 - Status is honest and actionable (Priority: P2)

The extension always shows where the next save will go. When it can't reach the account, it says why and offers a one-click fix.

**Why this priority**: The original "Local Mode" label was a dead end. A label that says "Cloud" while saving locally is worse.

**Independent Test**: Put the extension in each state (connected, not connected, reconnect, offline) and verify the label, explanation, and action.

**Acceptance Scenarios**:

1. **Given** no account is connected, **When** the user opens the extension, **Then** it explains that saves stay on this device and offers "Connect".
2. **Given** the user activates "Connect" or "Reconnect", **When** a Tracklet tab exists, **Then** it is focused; otherwise the production Tracklet address opens in a new tab (never a developer-only address).
3. **Given** the browser is offline, **When** the user opens the extension, **Then** status is "Offline" and saves are confirmed as "Saved on this device. Will upload when you're back online."
4. **Given** a save just fell back to the device, **When** the confirmation appears, **Then** it never claims the item was saved to the cloud.

---

### User Story 4 - Signing out really disconnects (Priority: P2)

Because the extension can now act on the account without Tracklet open, signing out must reliably stop it.

**Why this priority**: Without this, a user who signs out on a shared computer leaves an extension that keeps writing to their account. That's a privacy failure.

**Independent Test**: Sign out on Tracklet; then clip a job. It must not reach the account.

**Acceptance Scenarios**:

1. **Given** the user signs out on Tracklet, **When** the sign-out completes, **Then** the extension disconnects and discards its stored credentials.
2. **Given** the extension missed the sign-out (e.g. the tab closed instantly), **When** the user next opens Tracklet and Tracklet definitively shows no signed-in user, **Then** the extension disconnects.
3. **Given** the user wants to disconnect from the extension itself, **When** they choose "Disconnect" in the extension, **Then** stored credentials are discarded and status becomes "Not connected".
4. **Given** a different account signs in on Tracklet, **When** the extension receives it, **Then** it switches to the new account; items already kept on the device are not silently attributed to the new account without the existing import prompt.

---

### User Story 5 - Only official Tracklet addresses can connect the extension (Priority: P3)

**Why this priority**: A tester on a preview link hit the same issue. Conversely, any site able to impersonate Tracklet could plant a fake account.

**Acceptance Scenarios**:

1. **Given** the user is signed in on any official Tracklet deployment (production or preview), **When** the extension is used, **Then** it connects.
2. **Given** an unrelated website sends a message imitating Tracklet, **When** the extension receives it, **Then** it is ignored.

### Edge Cases

- Guest mode on Tracklet (no account) → extension stays "Not connected". That's correct behavior.
- Multiple Tracklet tabs open → the most recent valid account information wins; status never flip-flops.
- Extension reloaded/updated while Tracklet is open → reconnects on next open or tab focus.
- Two saves happen at the same moment while the credential is being renewed → exactly one renewal; both saves succeed.
- Upload of device-kept items is interrupted halfway → retry never creates duplicates.
- Credential renewal returns a replacement long-lived credential → the replacement is kept; the old one is no longer used.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The extension MUST obtain the current account from an open Tracklet tab regardless of which loaded first.
- **FR-002**: Tracklet MUST NOT send a "signed out" signal while its sign-in status is still being determined.
- **FR-003**: Tracklet MUST send an explicit "signed out" signal on sign-out. On receiving it, or on observing a definitive signed-out state when Tracklet is opened, the extension MUST discard all stored credentials.
- **FR-004**: Tracklet MUST resend the account whenever its credential refreshes and whenever the Tracklet tab becomes visible.
- **FR-005**: Once connected, the extension MUST be able to save to the account indefinitely without Tracklet open, renewing its short-lived credential on its own until access is revoked or the user disconnects.
- **FR-006**: Exactly one part of the extension MUST own credentials and cloud writes. All other parts (popup/panel, context menu, email companion) MUST go through it.
- **FR-007**: Every save MUST be idempotent: retrying the same item (after a timeout, a renewal, or an interrupted upload) MUST NOT create a duplicate.
- **FR-008**: The extension MUST upload its own device-kept items once a working connection exists. Upload of these items MUST have a single owner so Tracklet and the extension never both upload them.
- **FR-009**: The extension MUST show exactly one of: Connected, Not connected, Reconnect, Offline, each with a one-line explanation and, where applicable, an action.
- **FR-010**: The extension status MUST update live when the connection changes.
- **FR-011**: Confirmation copy MUST reflect the actual outcome ("Saved to Tracklet" vs "Saved on this device").
- **FR-012**: The extension MUST offer a "Disconnect" action while connected.
- **FR-013**: The extension MUST accept account messages only from official Tracklet addresses and only from the page itself. Tracklet MUST address its messages to its own origin, never broadcast to any origin.
- **FR-014**: All "open Tracklet" actions MUST point to the production address.

### Key Entities

- **Extension Connection**: Which account the extension acts for, its short-lived and long-lived credentials, when the short-lived one expires, and whether reconnection is required.
- **Account Message**: Tracklet → extension; carries either the account or an explicit sign-out. "Still loading" is never sent.
- **Device Queue**: Items kept on the device while offline or disconnected; each has a stable identity so uploads are idempotent.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 10/10 runs of "sign in first, install extension second, no refresh" show connected within 3 seconds.
- **SC-002**: With no Tracklet tab open for 7+ days, 100% of clips (while online) land in the account.
- **SC-003**: 0 cases where the extension says "saved to Tracklet" but the item is only on the device.
- **SC-004**: After sign-out on Tracklet, 0 subsequent clips reach that account.
- **SC-005**: Interrupting an upload of 10 queued items at a random point and retrying yields exactly 10 items in the account.
- **SC-006**: A first-time user can connect in ≤ 2 clicks from the extension.

## Assumptions

- The extension has no standalone sign-in screen; Tracklet remains where users sign in.
- Granting the extension a long-lived credential is accepted. Rationale and threat model live in `research.md` (R4). It's limited to official Tracklet origins, held in extension-private storage, and revoked by sign-out, Disconnect, or password change.
- Production is `tracklet-eight.vercel.app`; previews follow `tracklet-*.vercel.app`.
- Distribution stays "load unpacked" for testers; Chrome Web Store publishing is out of scope.
- Signing out of Tracklet on *one* device does not disconnect extensions on *other* devices; only a password change or account-wide revocation does. This matches how the web app itself behaves today.
