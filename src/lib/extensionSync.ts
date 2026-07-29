/**
 * Extension Sync Listener for Tracklet Web App
 * Real-time event listener and background queue syncer for browser extension clipped applications.
 */

import { Application } from '../types';

declare const chrome: any;

export interface ExtensionSyncCallbacks {
  onApplicationReceived: (app: Application) => void;
  onApplicationUpdated?: (app: Application) => void;
}

const BROADCAST_CHANNEL_NAME = 'tracklet_extension_channel';
const PENDING_STORAGE_KEY = 'tracklet_pending_apps';

/**
 * Initializes listeners for extension events (BroadcastChannel & postMessage)
 */
export function setupExtensionSync(callbacks: ExtensionSyncCallbacks): () => void {
  // 1. BroadcastChannel Listener (Cross-tab messaging)
  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    channel.onmessage = (event) => {
      if (event.data && event.data.type === 'TRACKLET_EXT_ADD_APPLICATION') {
        const app: Application = event.data.payload;
        callbacks.onApplicationReceived(app);
      }
    };
  } catch (e) {
    console.warn('BroadcastChannel not supported in this browser:', e);
  }

  // 2. Window postMessage Listener (Content Script bridge)
  const windowMessageHandler = (event: MessageEvent) => {
    if (event.data && event.data.type === 'TRACKLET_EXT_ADD_APPLICATION') {
      const app: Application = event.data.payload;
      callbacks.onApplicationReceived(app);
    }
  };
  window.addEventListener('message', windowMessageHandler);

  // 3. Drain any pending items stored in localStorage / chrome.storage
  syncPendingAppsFromStorage(callbacks.onApplicationReceived);

  // Return cleanup function
  return () => {
    if (channel) {
      channel.close();
    }
    window.removeEventListener('message', windowMessageHandler);
  };
}

/**
 * Checks localStorage or extension storage for applications clipped while Tracklet tab was closed.
 */
export function syncPendingAppsFromStorage(onAdd: (app: Application) => void) {
  try {
    // Check localStorage fallback key
    const rawPending = localStorage.getItem(PENDING_STORAGE_KEY);
    if (rawPending) {
      const pendingApps: Application[] = JSON.parse(rawPending);
      if (Array.isArray(pendingApps) && pendingApps.length > 0) {
        pendingApps.forEach(app => onAdd(app));
        localStorage.removeItem(PENDING_STORAGE_KEY);
      }
    }

    // If chrome.storage is accessible directly (e.g. running in extension frame)
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([PENDING_STORAGE_KEY], (result: any) => {
        const pending: Application[] = result[PENDING_STORAGE_KEY] || [];
        if (pending.length > 0) {
          pending.forEach(app => onAdd(app));
          chrome.storage.local.remove([PENDING_STORAGE_KEY]);
        }
      });
    }
  } catch (e) {
    console.warn('Failed to sync pending extension apps:', e);
  }
}
