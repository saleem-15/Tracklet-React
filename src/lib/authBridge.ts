import { User } from 'firebase/auth';
import { PlanTier } from '../types';
import { LATEST_EXTENSION_VERSION } from './constants';

declare const chrome: any;

export interface ExtensionAuthPayload {
  user: {
    uid: string;
    email: string | null;
    idToken?: string;
    refreshToken?: string;
    planTier: PlanTier;
    expiresAt: number;
    syncedAt: number;
  } | null;
  config: {
    projectId: string;
    apiKey: string;
  };
  latestVersion: string;
}

const BROADCAST_CHANNEL_NAME = 'tracklet_extension_channel';

/**
 * Dispatches the authenticated user session and plan tier to the Chrome Extension
 * via window.postMessage, BroadcastChannel, and chrome.runtime.sendMessage if available.
 */
export async function broadcastAuthToExtension(
  user: User | null,
  planTier: PlanTier = 'free'
): Promise<void> {
  let userSession: ExtensionAuthPayload['user'] = null;

  if (user) {
    let idToken: string | undefined;
    try {
      idToken = await user.getIdToken();
    } catch {
      // Ignore token retrieval failure
    }

    userSession = {
      uid: user.uid,
      email: user.email,
      idToken,
      refreshToken: user.refreshToken,
      planTier,
      expiresAt: Date.now() + 3600 * 1000,
      syncedAt: Date.now(),
    };
  }

  const payload: ExtensionAuthPayload = {
    user: userSession,
    config: {
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-tracklet',
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
    },
    latestVersion: LATEST_EXTENSION_VERSION,
  };

  // 1. Content Script Bridge (Dispatched to active tab)
  try {
    window.postMessage(
      {
        type: 'TRACKLET_WEB_AUTH_SYNC',
        payload,
      },
      '*'
    );
  } catch (err) {
    console.warn('Failed to postMessage to content script:', err);
  }

  // 2. BroadcastChannel across same-origin tabs
  try {
    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    channel.postMessage({
      type: 'TRACKLET_AUTH_SYNC',
      payload,
    });
    channel.close();
  } catch (err) {
    // Ignore BroadcastChannel errors in unsupported environments
  }

  // 3. Direct extension runtime message if extension ID is configured
  const EXTENSION_ID = import.meta.env.VITE_TRACKLET_EXTENSION_ID;
  if (typeof chrome !== 'undefined' && chrome?.runtime?.sendMessage && EXTENSION_ID) {
    try {
      chrome.runtime.sendMessage(EXTENSION_ID, {
        type: 'SYNC_TRACKLET_AUTH',
        payload,
      });
    } catch {
      // Extension not installed or inactive
    }
  }
}
