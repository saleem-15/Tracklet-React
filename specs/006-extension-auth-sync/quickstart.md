# Quickstart: Validate Extension Account Connection

## Prerequisites

- `npm run dev` running (or the production/preview deployment)
- Extension loaded unpacked from `extension/` at `chrome://extensions`
- A test Tracklet account

## Automated

```powershell
npx vitest run tests/unit/useExtensionSync.test.tsx
npx tsc --noEmit
npm run build
```

Expected new unit cases to pass:
- no `TRACKLET_WEB_AUTH_SYNC` posted while `authLoading` is true
- reply posted when a `TRACKLET_EXT_REQUEST_AUTH` window message arrives
- re-post on `visibilitychange` to visible
- `reason: 'signed_out'` posted on sign-out

## Manual scenarios

| # | Steps | Expected | Spec |
|---|---|---|---|
| 1 | Sign in on Tracklet tab → *then* reload extension at `chrome://extensions` → open popup (no tab refresh) | Chip = **Cloud Sync** within 3s | US1-1, SC-001 |
| 2 | Open popup with no session → sign in on web app in another window | Chip flips to **Cloud Sync** without reopening popup | US1-2, FR-005 |
| 3 | Reload Tracklet tab 20× while signed in, open popup each few reloads | Never **Not connected** | US1-4, SC-004 |
| 4 | Clear extension storage → open popup → click chip | Existing Tracklet tab focused, or production URL opens | US2, FR-007, FR-010 |
| 5 | In DevTools for extension, set `idToken` to expired/garbage (keep valid `refreshToken`) → close Tracklet tab → save a job | Extension auto-refreshes token via Google Secure Token API and saves directly to cloud. Success says **Saved to Cloud!** | US3-1, SC-002, FR-008 |
| 6 | In DevTools for extension, set both `idToken` and `refreshToken` to garbage → save a job | Refresh fails: falls back locally, success says **Saved on this device**, chip = **Reconnect** | US3-3, FR-008 |
| 7 | Sign out on web app → open popup | Chip = **Not connected** | FR-003 |
| 8 | On an unrelated site console: `postMessage({type:'TRACKLET_WEB_AUTH_SYNC',payload:{user:{uid:'x',idToken:'y'}}}, '*')` | Stored session unchanged | US4-2, FR-009 |
| 9 | Sign in on a `tracklet-*.vercel.app` preview URL | Connects | US4-1 |
| 10 | DevTools → Network offline → open popup | Chip = **Offline** | FR-006 |

Inspect storage: on `chrome://extensions`, open the service worker console and run `chrome.storage.local.get('tracklet_user_session', console.log)`.
