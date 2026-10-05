# Implementation Plan: Reliable Extension ↔ Web App Account Connection

**Branch**: `fix/extension-auth-sync` (spec dir `006-extension-auth-sync`) | **Date**: 2026-10-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-extension-auth-sync/spec.md`

## Summary

The extension shows "Local Mode" because it only learns about the session from a **one-shot, fire-and-forget broadcast** sent by the web app, and it currently lacks autonomous token refresh when the web dashboard is closed:

1. **Race on load** — `content.js` runs at `document_idle`; if Firebase auth resolves first, the `TRACKLET_WEB_AUTH_SYNC` postMessage is sent before anyone listens. The next retry is 15 minutes later.
2. **Null clobber** — `useExtensionSync` calls `syncAuthSessionToExtension(user)` while `authLoading` is true and `user === null`, and `background.js` writes that `null` into `tracklet_user_session`.
3. **Dead channel** — the popup's `BroadcastChannel` "REQUEST_TRACKLET_AUTH" can never reach the web app (different origins: `chrome-extension://` vs `https://`).
4. **Token expiry when web tab closed** — the stored ID token expires after ~1 hour; without a refresh mechanism, Firestore REST rejects requests when the web dashboard is closed, forcing saves into local offline queues.

Technical approach (see [research.md](./research.md) R1–R10):
- Two-way handshake through the content script; Tracklet never sends while auth is loading; explicit `signed_out`.
- Tracklet hands over `refreshToken`; **`background.js` is the single owner** of credentials, renewal (with rotation) and all Firestore writes. Popup/panel, context menu and email companion only send messages.
- Client-generated IDs + `PATCH` upserts so retries never duplicate; background flushes its own device queue.
- Popup reactive via `chrome.storage.onChanged`; four-state status + Connect/Reconnect/Disconnect; production URL.
- Strict origin checks; `postMessage` to own origin only; narrow `externally_connectable`.

## Technical Context

**Language/Version**: TypeScript 5 (web app, React 19), plain ES2020 JavaScript (MV3 extension, no bundler)

**Primary Dependencies**: Firebase JS SDK (`firebase/auth`: `onIdTokenChanged`), Chrome Extension APIs (`chrome.runtime`, `chrome.storage`, `chrome.tabs`), Google Secure Token API v1, Firestore REST v1

**Storage**: `chrome.storage.local` keys `tracklet_user_session` (with `idToken` and `refreshToken`), `tracklet_firebase_config`, `tracklet_pending_apps`

**Testing**: Vitest + React Testing Library (`tests/unit/useExtensionSync.test.tsx` exists); extension verified manually via [quickstart.md](./quickstart.md)

**Target Platform**: Chromium browsers (Chrome / Edge / Brave), MV3

**Project Type**: Web app + companion browser extension

**Performance Goals**: Popup reaches "Connected" ≤ 3s after open (SC-001); 100% direct cloud saves when web app is closed (SC-002)

**Constraints**: Extension sandboxed in `chrome.storage.local`; popup must not depend on a Tracklet tab being open or focused

**Scale/Scope**: ~6 files touched, no Firestore data model migration

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

> [!NOTE]
> `.specify/memory/constitution.md` is still the unfilled template. Gates below are taken from the project's de-facto constitution, `.agents/AGENTS.md`. Consider running `/speckit-constitution` to formalise it.

| Gate (AGENTS.md) | Status | Notes |
|---|---|---|
| No logic in UI components | ✅ | Handshake lives in `src/lib/extensionSync.ts`; hook only wires it |
| Rules of Hooks (no conditional hooks) | ✅ | `authLoading` guard goes *inside* the effect |
| Persistence via `ApplicationRepository` | ✅ N/A | Extension storage is outside the web repository layer; unchanged |
| Single notification system | ✅ | No new toasts in web app; extension popup has its own UI |
| Outbound links `target="_blank"` / never navigate Tracklet away | ✅ | Connect action uses `chrome.tabs` focus/create |
| No browser dialogs | ✅ | None added |
| Lighthouse / contrast (`text-slate-500` min) | ✅ | Popup status text uses existing popup tokens |
| `tsc --noEmit` + `npm run build` pass | ⏳ | Verified at implementation |
| No unprompted commits | ✅ | Plan only |

**Result**: PASS. Post-design re-check: PASS (no new violations introduced by contracts/data model).

## Project Structure

### Documentation (this feature)

```text
specs/006-extension-auth-sync/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── session-messages.md
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks (not created here)
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── extensionSync.ts        # handshake responder, SIGNED_OUT signal, origin-safe postMessage
│   └── authRepository.ts       # expose onIdTokenChanged
├── hooks/
│   └── useExtensionSync.ts     # gate on authLoading, subscribe to token refresh + visibilitychange
└── App.tsx                     # pass authLoading into useExtensionSync

extension/
├── content.js                  # send REQUEST_TRACKLET_AUTH on load; strict origin + pattern match; stop draining queue (R10)
├── background.js               # SOLE owner: credentials, renewal + rotation, idempotent PATCH upserts, queue flush, Disconnect
├── popup.js                    # UI only: sends SAVE_* messages to background; storage.onChanged; 4-state chip; prod URL
├── popup.html / popup.css      # chip becomes a <button>, Disconnect action, state styles
└── manifest.json               # + securetoken.googleapis.com host permission; narrow externally_connectable

tests/unit/
└── useExtensionSync.test.tsx   # new cases: no send while loading, re-send on visibility, responds to handshake
```

**Structure Decision**: Existing web app + `extension/` layout. No new modules; changes are confined to the sync bridge on both sides.

## Complexity Tracking

No constitution violations to justify.

## Phase Outputs

- Phase 0 → [research.md](./research.md)
- Phase 1 → [data-model.md](./data-model.md), [contracts/session-messages.md](./contracts/session-messages.md), [quickstart.md](./quickstart.md)
