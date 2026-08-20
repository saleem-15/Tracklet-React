/**
 * Tracklet Extension Background Service Worker (Manifest V3)
 * Manages context menus, badge indicators, external auth sync, and direct Firestore saving.
 */

// Initialize Context Menu on Install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'tracklet-save-page',
    title: 'Save Job to Tracklet',
    contexts: ['page', 'selection', 'link']
  });
});

// Handle Context Menu Clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'tracklet-save-page' && tab && tab.id) {
    chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_PAGE_DATA' }, async (response) => {
      const nowISO = new Date().toISOString();
      const today = nowISO.split('T')[0];

      let baseData = {
        role: tab.title || 'Job Opening',
        company: getDomainName(tab.url),
        platform: 'Company Site',
        jobLink: tab.url || '',
        notes: info.selectionText || '',
        dateApplied: today,
        status: 'Saved',
        stageUpdatedAt: nowISO,
        createdAt: nowISO,
        updatedAt: nowISO
      };

      if (!chrome.runtime.lastError && response) {
        baseData = {
          ...baseData,
          company: response.company || baseData.company,
          role: response.role || baseData.role,
          platform: response.platform || baseData.platform,
          jobLink: response.jobLink || baseData.jobLink,
          notes: info.selectionText || response.notes || '',
          companyDomain: response.domain || '',
          logoUrl: response.domain ? `https://logo.clearbit.com/${response.domain}` : undefined
        };
      }

      await saveAndSyncApplication(baseData);
    });
  }
});

// Extract domain fallback
function getDomainName(urlStr) {
  try {
    const url = new URL(urlStr);
    const host = url.hostname.replace(/^www\./, '');
    const name = host.split('.')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch (e) {
    return 'Company';
  }
}

// Push to Firestore REST API
async function pushToFirestoreDirectly(payload, userSession, config) {
  const projectId = config?.projectId || 'demo-tracklet';
  const apiKey = config?.apiKey;
  const userId = userSession.uid;
  const idToken = userSession.idToken;

  let url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}/applications`;
  if (apiKey && apiKey !== 'demo-api-key') {
    url += `?key=${encodeURIComponent(apiKey)}`;
  }

  const fields = {
    company: { stringValue: payload.company },
    role: { stringValue: payload.role },
    platform: { stringValue: payload.platform },
    status: { stringValue: payload.status },
    dateApplied: { stringValue: payload.dateApplied },
    userId: { stringValue: userId },
    stageUpdatedAt: { stringValue: payload.stageUpdatedAt || new Date().toISOString() },
    createdAt: { stringValue: payload.createdAt || new Date().toISOString() },
    updatedAt: { stringValue: payload.updatedAt || new Date().toISOString() },
    history: {
      arrayValue: {
        values: [
          {
            mapValue: {
              fields: {
                id: { stringValue: `hist-${Date.now()}` },
                stage: { stringValue: payload.status },
                timestamp: { stringValue: payload.stageUpdatedAt || new Date().toISOString() }
              }
            }
          }
        ]
      }
    }
  };

  if (payload.jobLink) fields.jobLink = { stringValue: payload.jobLink };
  if (payload.notes) fields.notes = { stringValue: payload.notes };
  if (payload.companyDomain) fields.companyDomain = { stringValue: payload.companyDomain };
  if (payload.logoUrl) fields.logoUrl = { stringValue: payload.logoUrl };

  const headers = { 'Content-Type': 'application/json' };
  if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ fields })
  });

  if (!response.ok) {
    throw new Error(`Firestore REST error: ${response.statusText}`);
  }

  const resData = await response.json();
  const docId = resData.name ? resData.name.split('/').pop() : `cloud-${Date.now()}`;
  return { ...payload, id: docId, userId };
}

// Save application and broadcast to open tabs
async function saveAndSyncApplication(appData) {
  const { tracklet_user_session, tracklet_firebase_config } = await chrome.storage.local.get([
    'tracklet_user_session',
    'tracklet_firebase_config'
  ]);

  let finalizedApp = null;
  let savedToCloud = false;

  if (tracklet_user_session && tracklet_user_session.uid) {
    try {
      finalizedApp = await pushToFirestoreDirectly(appData, tracklet_user_session, tracklet_firebase_config);
      savedToCloud = true;
    } catch (e) {
      console.warn('Direct Firestore save failed from background worker:', e);
    }
  }

  if (!finalizedApp) {
    finalizedApp = {
      ...appData,
      id: `ext-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: tracklet_user_session?.uid || 'guest'
    };
  }

  // 1. Broadcast to open tabs
  try {
    const bc = new BroadcastChannel('tracklet_extension_channel');
    bc.postMessage({
      type: 'TRACKLET_EXT_ADD_APPLICATION',
      payload: finalizedApp,
      persistedToCloud: savedToCloud
    });
    bc.close();
  } catch (e) {
    // ignore
  }

  // 2. Persist in chrome.storage.local
  chrome.storage.local.get(['tracklet_pending_apps', 'tracklet_guest_apps_v1'], (result) => {
    let pending = result.tracklet_pending_apps || [];
    let guestApps = result.tracklet_guest_apps_v1 || [];

    guestApps = [finalizedApp, ...guestApps];
    if (!savedToCloud) {
      pending = [finalizedApp, ...pending];
    }

    chrome.storage.local.set({
      tracklet_pending_apps: pending,
      tracklet_guest_apps_v1: guestApps
    }, () => {
      // Flash badge
      chrome.action.setBadgeText({ text: '✓' });
      chrome.action.setBadgeBackgroundColor({ color: '#059669' });
      setTimeout(() => {
        chrome.action.setBadgeText({ text: '' });
      }, 2500);
    });
  });
}

// Listen for external auth synchronization messages from Tracklet Web App
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'SYNC_TRACKLET_AUTH') {
    chrome.storage.local.set({
      tracklet_user_session: message.payload?.user || null,
      tracklet_firebase_config: message.payload?.config || null
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Listen for internal messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'FLASH_SUCCESS') {
    chrome.action.setBadgeText({ text: '✓' });
    chrome.action.setBadgeBackgroundColor({ color: '#2563eb' });
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '' });
    }, 2500);
    sendResponse({ success: true });
  }
  return true;
});
