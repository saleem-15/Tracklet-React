# Contract: Session Messages (Web App ↔ Extension)

All window messages use `window.postMessage(msg, window.location.origin)`. The receiver MUST check `event.source === window && event.origin === window.location.origin` and the Tracklet hostname allowlist (see [research.md R6](../research.md)).

## Window messages (page ⇄ content script)

| Type | Direction | Payload | When |
|---|---|---|---|
| `TRACKLET_EXT_REQUEST_AUTH` | content → page | `{}` | Content script loaded on a Tracklet tab; also on popup open via `chrome.tabs.sendMessage` → content |
| `TRACKLET_WEB_AUTH_SYNC` | page → content | `SessionMessage` (includes `refreshToken`) | Reply to request; on `onIdTokenChanged`; on `visibilitychange` visible; on sign-out (`reason: 'signed_out'`) |
| `TRACKLET_APPS_INDEX_SYNC` | page → content | existing | unchanged |

**Rule**: The page MUST NOT send `TRACKLET_WEB_AUTH_SYNC` while auth is loading. If a request arrives during loading, it defers the reply until auth resolves.

## Runtime messages (content/popup → background)

| Action | Payload | Behaviour |
|---|---|---|
| `SYNC_USER_SESSION` | `SessionMessage` | Valid user (with `refreshToken`) → store session, clear `needsReconnect`, set `syncedAt`. `reason: 'signed_out'` → remove session. Bare `null` → ignore |
| `MARK_SESSION_STALE` | `{ uid }` | Set `needsReconnect: true` if `uid` matches stored |
| `REQUEST_AUTH_FROM_TABS` | `{}` | **new**: background sends `TRACKLET_EXT_REQUEST_AUTH` to every Tracklet tab's content script (used by popup on open) |

## Autonomous Extension Token Refresh Flow

When the user clips an application or logs an email:
1. `background.js` or `popup.js` prepares to call Firestore REST API (`firestore.googleapis.com`).
2. If `idToken` has expired or is nearing expiration (within 5 minutes), OR if Firestore returns `401 Unauthorized`:
3. The extension autonomously calls Google's Secure Token endpoint:
   `POST https://securetoken.googleapis.com/v1/token?key={apiKey}`
   Body: `grant_type=refresh_token&refresh_token={refreshToken}`
4. It receives the new `id_token`, updates `chrome.storage.local.tracklet_user_session`, and retries the Firestore operation with the fresh token.
5. The cloud write succeeds with **zero user intervention and without needing the Tracklet web tab open**.

## Tab message (popup/background → content script)

| Action | Behaviour |
|---|---|
| `TRACKLET_EXT_REQUEST_AUTH` | Content script re-posts `TRACKLET_EXT_REQUEST_AUTH` to the page |

## Removed

- Popup `BroadcastChannel('tracklet_extension_channel')` auth request. Cross-origin, so it can never deliver.
- 15-minute `setInterval` re-sync in `useExtensionSync`.

## Popup status UI contract

| State | Label | Tooltip / helper | Action |
|---|---|---|---|
| `connected` | Cloud Sync | Connected as {email} | none |
| `disconnected` | Not connected | Saves stay on this device. Click to connect. | focus/open Tracklet |
| `needs_reconnect` | Reconnect | Session expired. Open Tracklet to resume cloud sync. | focus/open Tracklet |
| `offline` | Offline | Saves will sync when you're back online. | none |

Success view after save: "Saved to Cloud!" only when the Firestore write succeeded. Otherwise "Saved on this device".
