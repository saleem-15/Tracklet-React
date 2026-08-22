/**
 * Extension Sync Listener for Tracklet Web App
 * Real-time event listener, auth session broadcaster, and background queue syncer
 * for browser extension clipped applications.
 */

import { Application } from '../types';
import { User } from './firebase';

declare const chrome: any;

export interface ExtensionSyncCallbacks {
  onApplicationReceived: (app: Application, persistedToCloud?: boolean) => void;
  onApplicationUpdated?: (app: Application) => void;
}

const BROADCAST_CHANNEL_NAME = 'tracklet_extension_channel';
const PENDING_STORAGE_KEY = 'tracklet_pending_apps';

let activeUserSession: { uid: string; email?: string | null; idToken?: string } | null = null;

/**
 * Sync active user auth state & Firebase config to extension via BroadcastChannel and runtime messages
 */
export async function syncAuthSessionToExtension(user: User | null): Promise<void> {
  let idToken: string | undefined;
  if (user) {
    try {
      idToken = await user.getIdToken();
    } catch {
      // ignore
    }
    activeUserSession = {
      uid: user.uid,
      email: user.email,
      idToken
    };
  } else {
    activeUserSession = null;
  }

  const payload = {
    user: activeUserSession,
    config: {
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-tracklet',
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key'
    }
  };

  // 1. Content Script Bridge (Primary & universal mechanism across all origins)
  try {
    window.postMessage({
      type: 'TRACKLET_WEB_AUTH_SYNC',
      payload
    }, '*');
  } catch {
    // ignore
  }

  // 2. BroadcastChannel across all same-origin tabs
  try {
    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    channel.postMessage({
      type: 'TRACKLET_AUTH_SYNC',
      payload
    });
    channel.close();
  } catch {
    // ignore
  }

  // 2. Direct extension message if extension ID is configured
  const EXTENSION_ID = import.meta.env.VITE_TRACKLET_EXTENSION_ID;
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage && EXTENSION_ID) {
    try {
      chrome.runtime.sendMessage(EXTENSION_ID, {
        type: 'SYNC_TRACKLET_AUTH',
        payload
      });
    } catch {
      // extension not installed or inactive
    }
  }
}

/**
 * Initializes listeners for extension events (BroadcastChannel & postMessage)
 */
export function setupExtensionSync(callbacks: ExtensionSyncCallbacks): () => void {
  // 1. BroadcastChannel Listener (Cross-tab messaging)
  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    channel.onmessage = (event) => {
      if (!event.data) return;

      if (event.data.type === 'TRACKLET_EXT_ADD_APPLICATION') {
        const app: Application = event.data.payload;
        const persistedToCloud: boolean = Boolean(event.data.persistedToCloud);
        callbacks.onApplicationReceived(app, persistedToCloud);
      } else if (event.data.type === 'REQUEST_TRACKLET_AUTH') {
        // Respond to extension request for auth session
        if (channel) {
          channel.postMessage({
            type: 'TRACKLET_AUTH_SYNC',
            payload: {
              user: activeUserSession,
              config: {
                projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-tracklet',
                apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key'
              }
            }
          });
        }
      }
    };
  } catch (e) {
    console.warn('BroadcastChannel not supported in this browser:', e);
  }

  // 2. Window postMessage Listener (Content Script bridge fallback)
  const windowMessageHandler = (event: MessageEvent) => {
    if (event.data && event.data.type === 'TRACKLET_EXT_ADD_APPLICATION') {
      const app: Application = event.data.payload;
      const persistedToCloud: boolean = Boolean(event.data.persistedToCloud);
      callbacks.onApplicationReceived(app, persistedToCloud);
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

/**
 * Normalizes a job URL by removing tracking parameters, www, and trailing slashes
 */
export function normalizeJobUrl(url: string): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    const pathname = u.pathname.replace(/\/+$/, '');
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'refid', 'trackingid', 'position', 'pagenum', 'trk', 'ref', 'source'];
    Array.from(u.searchParams.keys()).forEach((key) => {
      if (trackingParams.includes(key.toLowerCase())) {
        u.searchParams.delete(key);
      }
    });
    return `${u.hostname.replace(/^www\./, '')}${pathname}${u.search ? u.search : ''}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase().replace(/\/+$/, '');
  }
}

/**
 * Syncs the current list of saved applications to the extension for instant duplicate detection
 */
export function syncApplicationsToExtension(applications: Application[]): void {
  const index = applications.map((a) => ({
    id: a.id,
    jobLink: a.jobLink || '',
    company: a.company,
    role: a.role,
    status: a.status,
    platform: a.platform,
    workLocation: a.workLocation,
    employmentType: a.employmentType,
    location: a.location || '',
    notes: a.notes || '',
  }));

  // 1. Post to window for content script
  try {
    window.postMessage({
      type: 'TRACKLET_APPS_INDEX_SYNC',
      payload: index,
    }, '*');
  } catch {
    // ignore
  }

  // 2. BroadcastChannel
  try {
    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    channel.postMessage({
      type: 'TRACKLET_APPS_INDEX_SYNC',
      payload: index,
    });
    channel.close();
  } catch {
    // ignore
  }

  // 3. Direct chrome.storage if accessible
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({
      tracklet_apps_index: index,
    });
  }
}

