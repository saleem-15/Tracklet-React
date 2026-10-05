# Research: Extension ↔ Web App Account Connection

## R1. How should the extension get the session? (FR-001)

- **Decision**: Two-way handshake via the content script. On load, `content.js` posts `TRACKLET_EXT_REQUEST_AUTH` to the page; the web app replies with `TRACKLET_WEB_AUTH_SYNC`. The web app also keeps pushing proactively on change.
- **Rationale**: Whichever side loads last triggers the exchange, so load order no longer matters. The content script is already injected on Tracklet tabs and already forwards to `background.js`.
- **Alternatives considered**:
  - *BroadcastChannel from popup* (current): impossible, because BroadcastChannel is same-origin only and the popup is `chrome-extension://`. Remove it.
  - *`chrome.runtime.sendMessage(EXTENSION_ID)` via `externally_connectable`*: needs a fixed extension ID. Unpacked installs get a path-derived ID, so each tester has a different one, and `VITE_TRACKLET_EXTENSION_ID` is unset. Keep it as an optional secondary path only.
  - *Popup injects a script into the Tracklet tab with `chrome.scripting`*: works, but it's heavier and duplicates the content script.

## R2. Avoiding the null clobber (FR-002, FR-003)

- **Decision**: The web app never sends while `authLoading === true`. Sign-out sends an explicit `{ user: null, reason: 'signed_out' }`. `background.js` clears the session **only** when `reason === 'signed_out'`, and ignores a bare `null`.
- **Rationale**: "I don't know yet" and "signed out" are different states and need different messages. Treating both as `null` is the bug.
- **Pitfall**: Guard the condition *inside* the `useEffect`. An early return before the hook breaks the Rules of Hooks.

## R3. Keeping the credential fresh (FR-004)

- **Decision**: Subscribe to Firebase `onIdTokenChanged` (it fires when the token refreshes, about hourly while the app is open). Also re-send on `document.visibilitychange → visible`. Drop the 15-minute `setInterval`.
- **Rationale**: Event-driven updates are exact, and the interval was both too slow (missed loads) and redundant. The visibility re-send covers "extension reloaded while tab open".
- **Verify in docs**: `onIdTokenChanged` is exported from `firebase/auth` (modular SDK). Confirm against the installed SDK version.

## R4. Autonomous cloud saving & credential renewal (spec US2, FR-005)

- **Decision**: Tracklet hands the extension the Firebase `refreshToken` alongside the ID token. `background.js` renews the ID token itself via the Secure Token endpoint (`POST https://securetoken.googleapis.com/v1/token?key={apiKey}`, body `grant_type=refresh_token&refresh_token=…`). It renews proactively when the token is within 5 minutes of `expiresAt`, and reactively once on a 401, then retries the write.
- **Rotation**: If the response contains a new `refresh_token`, persist it and drop the old one.
- **Permanent failure**: `400` with `TOKEN_EXPIRED`, `USER_DISABLED`, `USER_NOT_FOUND`, or `INVALID_REFRESH_TOKEN` → set `needsReconnect`, keep the item in the device queue. Network errors are **not** permanent → status `offline`, retry later. *Verify the exact error strings in the Firebase Auth REST docs.*
- **Permission**: Add `https://securetoken.googleapis.com/*` to `host_permissions`. This is a new permission, so tester re-approval may be needed on reload.

### Threat model (why this is acceptable, and what it costs)

| Risk | Real? | Mitigation |
|---|---|---|
| Token readable by other scripts on the Tracklet page during handoff | Low delta | Any script on that origin can already read Firebase's own IndexedDB copy. We add no new exposure on that origin. Must stop `postMessage(..., '*')` → use own origin (FR-013). |
| Malicious site plants a fake account in the extension | Yes today | Strict origin allowlist + `event.source === window` + narrow `externally_connectable` (R6). |
| Extension keeps writing after the user signs out on the web | **Yes, new** | Firebase `signOut()` is client-side only. It does **not** revoke the refresh token server-side. Hence spec US4: explicit signed-out message, "definitive signed-out on next visit" rule, and an extension-side Disconnect. |
| Token at rest on disk (`chrome.storage.local` is plaintext in the profile) | Same as web | Equivalent to Firebase's own browser persistence. Don't use `storage.sync`, which would copy it to every signed-in Chrome. |
| Lost/shared device | Same as web | Password change revokes all refresh tokens. Document this in Settings → Security later. |

- **Alternative rejected**: Extension signs in independently (`chrome.identity` / its own Firebase Auth instance). It needs a stable extension ID + OAuth client config. Unpacked installs have per-tester IDs. Revisit when publishing to the Chrome Web Store.
- **Pitfall**: Don't put the refresh token in `chrome.storage.session` to "be safe". It's cleared on browser restart, which silently brings back the original bug.

## R5. Live popup status (FR-005, FR-006)

- **Decision**: Use `chrome.storage.onChanged` in `popup.js` to re-render the chip. Four states: `connected`, `disconnected`, `needs_reconnect`, `offline` (`navigator.onLine === false`).
- **Rationale**: The popup is short-lived, so storage events are the simplest reactive source and need no messaging.

## R6. Trusted origins (FR-009, US4)

- **Decision**: `content.js` accepts a message only if `event.source === window` **and** `event.origin === window.location.origin` **and** the hostname matches the allowlist: `localhost`, `127.0.0.1`, `tracklet-eight.vercel.app`, `/^tracklet(-[a-z0-9-]+)?\.vercel\.app$/`, existing `web.app`/`firebaseapp.com` patterns. The web app replies with `postMessage(..., window.location.origin)` instead of `'*'`.
- **Narrow `externally_connectable`**: change `https://*.vercel.app/*` (any Vercel site!) to tracklet-specific hosts.
- **Pitfall**: A wildcard `*.vercel.app` lets *any* Vercel-hosted site message the extension. That's a real spoofing vector.

## R7. Connect action & URLs (FR-007, FR-010)

- **Decision**: A single `TRACKLET_APP_URL = 'https://tracklet-eight.vercel.app'` constant in `popup.js`. `focusOrOpenWorkspace()` uses it as the fallback instead of `http://localhost:3000`. The status chip becomes a `<button>` that calls it when not connected.

## R8. Single owner for credentials and writes (FR-006)

- **Finding**: Today `popup.js` and `background.js` each contain their own `pushToFirestoreDirectly`. They differ: background supports update via PATCH + `updateMask`, popup only creates. With token renewal added, two independent renewers would race on refresh-token rotation, and the loser's rotated token is invalidated.
- **Decision**: `background.js` (service worker) is the only module that reads credentials, renews them, and calls Firestore. The popup/panel, context menu, and email companion send `SAVE_APPLICATION` / `SAVE_EMAIL_LOG` messages and render the result. Concurrent saves await one shared in-flight renewal promise.
- **MV3 pitfall**: The service worker can be terminated between events. Keep no state in globals; re-read from `chrome.storage.local` per message. An in-flight promise only needs to survive one burst of messages.

## R9. Idempotent saves (FR-007)

- **Finding**: Creates use `POST …/applications`, which assigns a server ID, so a retry after a timeout creates a duplicate.
- **Decision**: Generate the document ID on the client when the item is first created (it is already done for local items: `ext-…`). Write with `PATCH …/applications/{id}` (upsert) instead of POST. The same ID is used in the device queue, so re-uploads overwrite rather than duplicate. *Verify in docs: Firestore REST `patch` without `currentDocument.exists` precondition creates the doc if missing.*

## R10. Device-queue ownership (FR-008)

- **Finding**: `tracklet_pending_apps` is drained by `content.js` into Tracklet (`drainPendingItemsToTracklet`) and also read by `extensionSync.syncPendingAppsFromStorage`. Once the extension can upload by itself, a third uploader appears.
- **Decision**: The extension background owns uploading. It flushes on: successful connect, `online` event, and before each new save. The web-app drain path becomes "display only" for items the extension reports as uploaded, and still covers the guest → account import prompt. Idempotent IDs (R9) make any overlap harmless rather than duplicating.
- **Verify**: Whether MV3 `chrome.alarms` is needed for a periodic flush. Likely not, since every save triggers a flush first.
