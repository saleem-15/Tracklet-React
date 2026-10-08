# Data Model & State Specifications: In-App Extension Distribution & Update Hub

**Feature Branch**: `feat/extension-distribution-hub`  
**Date**: 2026-10-08  
**Spec**: [spec.md](./spec.md)

---

## 1. Extension Detection & Handshake Models

### `ExtensionStatus` (Union Type)
Represents the current connection state of the browser extension as introspected by Tracklet web app.

```typescript
export type ExtensionStatus = 
  | 'checking'          // Initial handshake in flight (<500ms)
  | 'not_installed'     // Handshake timed out; extension content script absent
  | 'connected'         // Extension installed, responding, and version matches or exceeds latest
  | 'update_available'; // Extension installed and responding, but reported version < latestVersion
```

### `ExtensionState` (Interface)
The full reactive state managed by `useExtensionStatus` hook:

```typescript
export interface ExtensionState {
  status: ExtensionStatus;
  installedVersion: string | null;
  latestVersion: string;
  isChecking: boolean;
  lastCheckedAt: number | null;
  recheck: () => Promise<void>;
}
```

### Handshake Window Messages

#### 1. Web App $\rightarrow$ Extension Ping
```typescript
export interface TrackletExtPingMessage {
  type: 'TRACKLET_EXT_PING';
  timestamp: number;
}
```

#### 2. Extension $\rightarrow$ Web App Pong
```typescript
export interface TrackletExtPongPayload {
  installed: boolean;
  version: string;
  name: string;
}

export interface TrackletExtPongMessage {
  type: 'TRACKLET_EXT_PONG';
  payload: TrackletExtPongPayload;
}
```

---

## 2. Constants & Distribution Configuration

Defined in `src/lib/constants.ts`:

```typescript
export const EXTENSION_DISTRIBUTION_CONFIG = {
  LATEST_VERSION: '1.0.0',
  DOWNLOAD_FILENAME: 'tracklet-extension.zip',
  LOCAL_DOWNLOAD_URL: '/tracklet-extension.zip',
  GITHUB_RELEASE_DOWNLOAD_URL: 'https://github.com/saleem-15/Tracklet-React/releases/latest/download/tracklet-extension.zip',
  HANDSHAKE_TIMEOUT_MS: 500,
  CHROME_EXTENSIONS_URL: 'chrome://extensions',
} as const;
```

---

## 3. Version Comparison Logic (Semver Helper)

Pure function in `src/lib/versionUtils.ts`:

```typescript
/**
 * Compares two semantic version strings (e.g., '1.0.1' vs '1.0.0').
 * Returns:
 *   1 if a > b (a is newer)
 *  -1 if a < b (a is older)
 *   0 if a === b
 */
export function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(n => parseInt(n, 10) || 0);
  const pb = b.split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

export function isUpdateAvailable(installedVersion: string | null, latestVersion: string): boolean {
  if (!installedVersion) return false;
  return compareSemver(installedVersion, latestVersion) < 0;
}
```

---

## 4. UI View Models

### `ExtensionModalTab`
```typescript
export type ExtensionModalTab = 'install' | 'update' | 'features';
```

### `ExtensionGuideStep`
```typescript
export interface ExtensionGuideStep {
  stepNumber: number;
  title: string;
  description: string;
  actionText?: string;
  actionType?: 'download' | 'copy_url' | 'open_link';
  actionPayload?: string;
}
```
