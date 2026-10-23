/**
 * Tracklet Extension Background Service Worker (Manifest V3)
 * Manages context menus, badge indicators, external auth sync, and direct Firestore saving.
 */

// Configure Side Panel behavior on startup and installation
function configureSidePanelBehavior() {
  if (typeof chrome !== 'undefined' && chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .catch((err) => console.warn('[Tracklet SW] Failed to set side panel behavior:', err));
  }
}

configureSidePanelBehavior();

function cleanupLegacyGuestStorage() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.remove(['tracklet_guest_apps_v1', 'tracklet_guest_contacts_v1'], () => {
      if (chrome.runtime && chrome.runtime.lastError) {
        // Ignore error
      }
    });
  }
}
// Initialize Context Menu and Side Panel on Install
chrome.runtime.onInstalled.addListener(() => {
  cleanupLegacyGuestStorage();
  configureSidePanelBehavior();
  if (typeof chrome !== 'undefined' && chrome.contextMenus && chrome.contextMenus.create) {
    chrome.contextMenus.create({
      id: 'tracklet-save-page',
      title: 'Save Job to Tracklet',
      contexts: ['page', 'selection', 'link']
    });
  }
});

if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onStartup) {
  chrome.runtime.onStartup.addListener(() => {
    cleanupLegacyGuestStorage();
    configureSidePanelBehavior();
  });
}

// Handle Context Menu Clicks
if (typeof chrome !== 'undefined' && chrome.contextMenus && chrome.contextMenus.onClicked) {
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
          companyDomain: response.companyDomain || response.domain || '',
          location: response.location || undefined,
          workLocation: response.workLocation || undefined,
          employmentType: response.employmentType || undefined,
          status: response.suggestedStage || 'Saved',
        };

        if (response.contact && response.contact.name) {
          baseData.newContact = {
            name: response.contact.name,
            role: response.contact.role || 'Recruiter',
            organization: baseData.company,
            linkedIn: response.contact.linkedIn || '',
            category: response.contact.category || 'Recruiter'
          };
        }
      }

      await saveAndSyncApplication(baseData);
    });
  }
});
}

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

// --- Token Refresh Helpers ---

async function refreshFirebaseToken(refreshToken, apiKey) {
  const res = await fetch(
    'https://securetoken.googleapis.com/v1/token?key=' + encodeURIComponent(apiKey),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(refreshToken)
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error('Token refresh failed (' + res.status + '): ' + errText);
  }
  const data = await res.json();
  return {
    idToken: data.id_token,
    refreshToken: data.refresh_token
  };
}

async function fetchWithTokenRefresh(url, options, userSession, apiKey) {
  let response = await fetch(url, options);

  if (
    response.status === 401 &&
    userSession &&
    userSession.refreshToken &&
    apiKey &&
    apiKey !== 'demo-api-key'
  ) {
    try {
      const refreshed = await refreshFirebaseToken(userSession.refreshToken, apiKey);
      userSession.idToken = refreshed.idToken;
      if (refreshed.refreshToken) {
        userSession.refreshToken = refreshed.refreshToken;
      }
      chrome.storage.local.set({ tracklet_user_session: userSession });

      const retryHeaders = Object.assign({}, options.headers, {
        'Authorization': 'Bearer ' + refreshed.idToken
      });
      response = await fetch(url, Object.assign({}, options, { headers: retryHeaders }));
    } catch (refreshErr) {
      console.warn('[Tracklet] Token refresh failed, returning original 401:', refreshErr);
    }
  }

  return response;
}

// Push to Firestore REST API (supports POST for create and PATCH for update)
async function pushToFirestoreDirectly(payload, userSession, config, docIdToUpdate = null) {
  const projectId = config?.projectId || 'demo-tracklet';
  const apiKey = config?.apiKey;
  const userId = userSession.uid;
  const idToken = userSession.idToken;

  let url = docIdToUpdate
    ? `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}/applications/${docIdToUpdate}`
    : `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}/applications`;

  const queryParams = [];
  if (apiKey && apiKey !== 'demo-api-key') {
    queryParams.push(`key=${encodeURIComponent(apiKey)}`);
  }
  if (docIdToUpdate) {
    const updateFields = [
      'company', 'role', 'platform', 'status', 'dateApplied',
      'stageUpdatedAt', 'updatedAt', 'jobLink', 'notes',
      'companyDomain', 'history', 'location', 'workLocation', 'employmentType'
    ];
    updateFields.forEach(f => queryParams.push(`updateMask.fieldPaths=${f}`));
    queryParams.push('currentDocument.exists=true');
  }
  if (queryParams.length > 0) {
    url += `?${queryParams.join('&')}`;
  }

  const historyList = (payload.history && payload.history.length > 0)
    ? payload.history
    : [
        {
          id: `hist-${Date.now()}`,
          toStatus: payload.status,
          timestamp: payload.stageUpdatedAt || new Date().toISOString()
        }
      ];

  const historyEntries = historyList.map(h => {
    const hFields = {
      id: { stringValue: h.id || `hist-${Date.now()}` },
      toStatus: { stringValue: h.toStatus || h.stage || payload.status },
      timestamp: { stringValue: h.timestamp || payload.stageUpdatedAt || new Date().toISOString() }
    };
    if (h.fromStatus) hFields.fromStatus = { stringValue: h.fromStatus };
    if (h.note) hFields.note = { stringValue: h.note };
    return { mapValue: { fields: hFields } };
  });

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
        values: historyEntries
      }
    }
  };

  if (payload.jobLink) fields.jobLink = { stringValue: payload.jobLink };
  if (payload.notes) fields.notes = { stringValue: payload.notes };
  if (payload.companyDomain) fields.companyDomain = { stringValue: payload.companyDomain };
  if (payload.location) fields.location = { stringValue: payload.location };
  if (payload.workLocation) fields.workLocation = { stringValue: payload.workLocation };
  if (payload.employmentType) fields.employmentType = { stringValue: payload.employmentType };

  const headers = { 'Content-Type': 'application/json' };
  if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

  const method = docIdToUpdate ? 'PATCH' : 'POST';
  const response = await fetchWithTokenRefresh(
    url,
    {
      method,
      headers,
      body: JSON.stringify({ fields })
    },
    userSession,
    config?.apiKey
  );

  if (!response.ok) {
    if (docIdToUpdate && response.status === 404) {
      console.warn(`[Tracklet] Target document ${docIdToUpdate} no longer exists in Firestore. Creating new application.`);
      const recreated = await pushToFirestoreDirectly(payload, userSession, config, null);
      return { ...recreated, replacedId: docIdToUpdate };
    }
    throw new Error(`Firestore REST error: ${response.statusText}`);
  }

  const resData = await response.json();
  const docId = docIdToUpdate || (resData.name ? resData.name.split('/').pop() : `cloud-${Date.now()}`);
  return { ...payload, id: docId, userId };
}

// Push contact to Firestore directly
async function pushContactToFirestoreDirectly(contact, appId, userSession, config) {
  if (!contact || !contact.name) return null;
  const projectId = config?.projectId || 'demo-tracklet';
  const apiKey = config?.apiKey;
  const userId = userSession.uid;
  const idToken = userSession.idToken;

  let url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}/contacts`;
  if (apiKey && apiKey !== 'demo-api-key') {
    url += `?key=${encodeURIComponent(apiKey)}`;
  }

  const nowISO = new Date().toISOString();
  const fields = {
    name: { stringValue: contact.name },
    role: { stringValue: contact.role || 'Recruiter' },
    category: { stringValue: contact.category || 'Recruiter' },
    createdAt: { stringValue: nowISO },
    updatedAt: { stringValue: nowISO },
    applicationIds: {
      arrayValue: {
        values: appId ? [{ stringValue: appId }] : []
      }
    }
  };
  if (contact.organization) fields.organization = { stringValue: contact.organization };
  if (contact.linkedIn) fields.linkedIn = { stringValue: contact.linkedIn };
  if (contact.email) fields.email = { stringValue: contact.email };

  const headers = { 'Content-Type': 'application/json' };
  if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

  try {
    const res = await fetchWithTokenRefresh(
      url,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ fields })
      },
      userSession,
      config?.apiKey
    );
    if (res.ok) {
      const data = await res.json();
      return data.name ? data.name.split('/').pop() : null;
    }
  } catch (e) {
    console.warn('Direct Firestore contact push failed from background:', e);
  }
  return null;
}

// Save application and broadcast to open tabs
async function saveAndSyncApplication(appData) {
  const { tracklet_user_session, tracklet_firebase_config, tracklet_apps_index } = await chrome.storage.local.get([
    'tracklet_user_session',
    'tracklet_firebase_config',
    'tracklet_apps_index'
  ]);

  if (!tracklet_user_session || !tracklet_user_session.uid) {
    console.warn('[Tracklet] Save blocked: User is not authenticated.');
    return {
      success: false,
      error: 'AUTH_REQUIRED',
      message: 'Authentication required. Sign in on Tracklet Web to save applications.'
    };
  }

  const nowISO = new Date().toISOString();

  // Check for existing app match by URL or company+role
  const allKnown = tracklet_apps_index || [];
  const existing = allKnown.find(a => 
    (a.jobLink && appData.jobLink && a.jobLink.toLowerCase().trim() === appData.jobLink.toLowerCase().trim()) ||
    (a.company && appData.company && a.company.toLowerCase().trim() === appData.company.toLowerCase().trim() && a.role && appData.role && a.role.toLowerCase().trim() === appData.role.toLowerCase().trim())
  );
  const existingAppId = existing ? existing.id : null;

  // Free Tier quota check: max 20 active applications
  const activeStages = ['Saved', 'Applied', 'Screening', 'Interview', 'Offer'];
  const currentActive = (tracklet_apps_index || []).filter(a => activeStages.includes(a.status)).length;
  const isProPlan = tracklet_user_session.planTier === 'pro';
  if (!isProPlan && currentActive >= 20 && !existing) {
    console.warn('[Tracklet] Save blocked: Free tier active quota reached (20/20).');
    return {
      success: false,
      error: 'QUOTA_EXCEEDED',
      message: 'Free tier limit reached (20/20 active applications). Upgrade to Pro or archive an existing application.'
    };
  }

  if (existing) {
    // Stage & History resolution: never overwrite a later stage (US5 / FR-013, FR-014)
    if (existing.status === 'Saved' && appData.status === 'Applied') {
      const newEntry = {
        id: `hist-${Date.now()}`,
        toStatus: 'Applied',
        fromStatus: 'Saved',
        timestamp: nowISO,
        note: 'Stage updated via Tracklet context menu'
      };
      appData.status = 'Applied';
      appData.stageUpdatedAt = nowISO;
      appData.history = [...(existing.history || []), newEntry];
    } else {
      appData.status = existing.status || appData.status;
      appData.stageUpdatedAt = existing.stageUpdatedAt || nowISO;
      appData.history = (existing.history && existing.history.length > 0)
        ? existing.history
        : [{ id: `hist-${Date.now()}`, toStatus: appData.status, timestamp: appData.stageUpdatedAt }];
    }

    if (!appData.location && existing.location) appData.location = existing.location;
    if (!appData.workLocation && existing.workLocation) appData.workLocation = existing.workLocation;
    if (!appData.employmentType && existing.employmentType) appData.employmentType = existing.employmentType;
    if (!appData.companyDomain && existing.companyDomain) appData.companyDomain = existing.companyDomain;

    if (existing.notes && !appData.notes) {
      appData.notes = existing.notes;
    } else if (existing.notes && appData.notes && !existing.notes.includes(appData.notes)) {
      appData.notes = `${existing.notes}\n\n${appData.notes}`;
    }
  } else {
    appData.history = [{ id: `hist-${Date.now()}`, toStatus: appData.status, timestamp: nowISO }];
  }

  let finalizedApp = null;
  let savedToCloud = false;

  if (tracklet_user_session && tracklet_user_session.uid) {
    try {
      finalizedApp = await pushToFirestoreDirectly(appData, tracklet_user_session, tracklet_firebase_config, existingAppId);
      savedToCloud = true;

      if (appData.newContact) {
        await pushContactToFirestoreDirectly(appData.newContact, finalizedApp.id, tracklet_user_session, tracklet_firebase_config);
      }
    } catch (e) {
      console.warn('Direct Firestore save failed from background worker:', e);
    }
  }

  if (!finalizedApp) {
    finalizedApp = {
      ...appData,
      id: existingAppId || `ext-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: tracklet_user_session.uid
    };
  }

  // 1. Deliver to open web tabs via content scripts
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((t) => {
      if (t.id) {
        chrome.tabs.sendMessage(t.id, {
          action: 'TRACKLET_EXT_INCOMING_APP',
          payload: finalizedApp,
          persistedToCloud: savedToCloud
        }).catch(() => {});
      }
    });
  });

  // 2. Persist in chrome.storage.local
  chrome.storage.local.get(['tracklet_pending_apps', 'tracklet_apps_index'], (result) => {
    let pending = result.tracklet_pending_apps || [];
    let appsIndex = result.tracklet_apps_index || [];

    if (finalizedApp.replacedId) {
      appsIndex = [finalizedApp, ...appsIndex.filter(app => app.id !== finalizedApp.replacedId)];
      pending = pending.filter(app => app.id !== finalizedApp.replacedId);
      if (!savedToCloud) {
        pending = [finalizedApp, ...pending];
      }
    } else if (existingAppId) {
      appsIndex = appsIndex.map(app => app.id === existingAppId ? finalizedApp : app);
      pending = pending.map(app => app.id === existingAppId ? finalizedApp : app);
    } else {
      appsIndex = [finalizedApp, ...appsIndex];
      if (!savedToCloud) {
        pending = [finalizedApp, ...pending];
      }
    }

    chrome.storage.local.set({
      tracklet_pending_apps: pending,
      tracklet_apps_index: appsIndex
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

function convertEmailLogToFirestoreMap(email) {
  const fields = {
    id: { stringValue: email.id },
    subject: { stringValue: email.subject || 'Email' },
    sender: { stringValue: email.sender || '' },
    date: { stringValue: email.date || new Date().toISOString().split('T')[0] },
  };
  if (email.recipient) fields.recipient = { stringValue: email.recipient };
  if (email.direction) fields.direction = { stringValue: email.direction };
  if (email.snippet) fields.snippet = { stringValue: email.snippet };
  if (email.body) fields.body = { stringValue: email.body };
  if (email.emailUrl) fields.emailUrl = { stringValue: email.emailUrl };
  return { mapValue: { fields } };
}

// Push EmailLog update directly to Firestore document
async function pushEmailLogToFirestore(appId, emailLog, updatedStatus, userSession, config) {
  const projectId = config?.projectId || 'demo-tracklet';
  const apiKey = config?.apiKey;
  const userId = userSession.uid;
  const idToken = userSession.idToken;

  let getUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}/applications/${appId}`;
  if (apiKey && apiKey !== 'demo-api-key') {
    getUrl += `?key=${encodeURIComponent(apiKey)}`;
  }

  const headers = { 'Content-Type': 'application/json' };
  if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

  // 1. GET current application document
  const getRes = await fetchWithTokenRefresh(
    getUrl,
    { method: 'GET', headers },
    userSession,
    config?.apiKey
  );
  if (!getRes.ok) {
    throw new Error(`Failed to fetch application doc: ${getRes.statusText}`);
  }
  const currentDoc = await getRes.json();
  const existingFields = currentDoc.fields || {};

  // Existing emails array
  const existingEmails = existingFields.emails?.arrayValue?.values || [];
  const newEmailMap = convertEmailLogToFirestoreMap(emailLog);
  const emailExistsInCloud = existingEmails.some(val => val.mapValue?.fields?.id?.stringValue === emailLog.id);
  const updatedEmails = emailExistsInCloud
    ? existingEmails.map(val => val.mapValue?.fields?.id?.stringValue === emailLog.id ? newEmailMap : val)
    : [...existingEmails, newEmailMap];

  const nowISO = new Date().toISOString();
  const patchFields = {
    emails: { arrayValue: { values: updatedEmails } },
    updatedAt: { stringValue: nowISO }
  };
  const updateMask = ['emails', 'updatedAt'];

  if (updatedStatus && updatedStatus !== existingFields.status?.stringValue) {
    patchFields.status = { stringValue: updatedStatus };
    patchFields.stageUpdatedAt = { stringValue: nowISO };
    updateMask.push('status', 'stageUpdatedAt');

    // Append to history
    const existingHistory = existingFields.history?.arrayValue?.values || [];
    const newHistEntry = {
      mapValue: {
        fields: {
          id: { stringValue: `hist-${Date.now()}` },
          stage: { stringValue: updatedStatus },
          timestamp: { stringValue: nowISO }
        }
      }
    };
    patchFields.history = { arrayValue: { values: [...existingHistory, newHistEntry] } };
    updateMask.push('history');
  }

  let patchUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}/applications/${appId}?`;
  if (apiKey && apiKey !== 'demo-api-key') {
    patchUrl += `key=${encodeURIComponent(apiKey)}&`;
  }
  updateMask.forEach(f => {
    patchUrl += `updateMask.fieldPaths=${f}&`;
  });

  const patchRes = await fetchWithTokenRefresh(
    patchUrl,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ fields: patchFields })
    },
    userSession,
    config?.apiKey
  );

  if (!patchRes.ok) {
    throw new Error(`Failed to patch application doc with email log: ${patchRes.statusText}`);
  }

  return await patchRes.json();
}

// Save email log and broadcast to open tabs
async function saveAndSyncEmailLog({ appId, emailLog, updatedStatus, newContact }) {
  const { tracklet_user_session, tracklet_firebase_config } = await chrome.storage.local.get([
    'tracklet_user_session',
    'tracklet_firebase_config'
  ]);

  if (!tracklet_user_session || !tracklet_user_session.uid) {
    console.warn('[Tracklet] Email log blocked: User is not authenticated.');
    return {
      success: false,
      error: 'AUTH_REQUIRED',
      message: 'Authentication required. Sign in on Tracklet Web to log emails.'
    };
  }

  let savedToCloud = false;
  if (tracklet_user_session && tracklet_user_session.uid) {
    try {
      await pushEmailLogToFirestore(appId, emailLog, updatedStatus, tracklet_user_session, tracklet_firebase_config);
      savedToCloud = true;
    } catch (e) {
      console.warn('Direct Firestore email save failed from background worker:', e);
    }
  }

  // 1. Deliver to open web tabs via content scripts
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((t) => {
      if (t.id) {
        chrome.tabs.sendMessage(t.id, {
          action: 'TRACKLET_EXT_INCOMING_EMAIL',
          payload: { appId, emailLog, updatedStatus, newContact }
        }).catch(() => {});
      }
    });
  });

  // 2. Persist in chrome.storage.local
  chrome.storage.local.get(['tracklet_apps_index', 'tracklet_pending_emails'], (result) => {
    let appsIndex = result.tracklet_apps_index || [];
    let pendingEmails = result.tracklet_pending_emails || [];

    const updateAppInList = (list) => list.map(app => {
      if (app.id !== appId) return app;
      const existingList = app.emails || [];
      const emailExists = existingList.some(e => e.id === emailLog.id);
      const emails = emailExists
        ? existingList.map(e => e.id === emailLog.id ? emailLog : e)
        : [...existingList, emailLog];
      return {
        ...app,
        emails,
        status: updatedStatus || app.status,
        updatedAt: new Date().toISOString()
      };
    });

    appsIndex = updateAppInList(appsIndex);

    if (!savedToCloud) {
      pendingEmails = [{ appId, emailLog, updatedStatus, newContact }, ...pendingEmails];
    }

    chrome.storage.local.set({
      tracklet_apps_index: appsIndex,
      tracklet_pending_emails: pendingEmails
    }, () => {
      chrome.action.setBadgeText({ text: '✓' });
      chrome.action.setBadgeBackgroundColor({ color: '#059669' });
      setTimeout(() => {
        chrome.action.setBadgeText({ text: '' });
      }, 2500);
    });
  });

  return { success: true, savedToCloud };
}

// Push Contact update or create directly to Firestore document
async function pushContactToFirestore(contact, userSession, config) {
  const projectId = config?.projectId || 'demo-tracklet';
  const apiKey = config?.apiKey;
  const userId = userSession.uid;
  const idToken = userSession.idToken;

  const fields = {
    id: { stringValue: contact.id },
    name: { stringValue: contact.name || '' },
    role: { stringValue: contact.role || '' },
    category: { stringValue: contact.category || 'Other' },
    userId: { stringValue: userId },
    createdAt: { stringValue: contact.createdAt || new Date().toISOString() },
    updatedAt: { stringValue: contact.updatedAt || new Date().toISOString() }
  };

  if (contact.organization) fields.organization = { stringValue: contact.organization };
  if (contact.location) fields.location = { stringValue: contact.location };
  if (contact.linkedIn) fields.linkedIn = { stringValue: contact.linkedIn };
  if (contact.email) fields.email = { stringValue: contact.email };
  if (contact.phone) fields.phone = { stringValue: contact.phone };
  if (contact.notes) fields.notes = { stringValue: contact.notes };
  if (contact.nextFollowUpDate) fields.nextFollowUpDate = { stringValue: contact.nextFollowUpDate };

  if (contact.applicationIds && Array.isArray(contact.applicationIds) && contact.applicationIds.length > 0) {
    fields.applicationIds = {
      arrayValue: {
        values: contact.applicationIds.map(appId => ({ stringValue: appId }))
      }
    };
  }

  let url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}/contacts?documentId=${encodeURIComponent(contact.id)}&`;
  if (apiKey && apiKey !== 'demo-api-key') {
    url += `key=${encodeURIComponent(apiKey)}`;
  }
  url = url.replace(/[?&]$/, '');

  const headers = { 'Content-Type': 'application/json' };
  if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

  const res = await fetchWithTokenRefresh(
    url,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ fields })
    },
    userSession,
    config?.apiKey
  );

  if (!res.ok) {
    if (res.status === 409) {
      // If already exists, attempt PATCH
      let patchUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}/contacts/${encodeURIComponent(contact.id)}?`;
      if (apiKey && apiKey !== 'demo-api-key') {
        patchUrl += `key=${encodeURIComponent(apiKey)}&`;
      }
      Object.keys(fields).forEach(f => {
        patchUrl += `updateMask.fieldPaths=${encodeURIComponent(f)}&`;
      });
      patchUrl = patchUrl.replace(/[?&]$/, '');

      const patchRes = await fetchWithTokenRefresh(
        patchUrl,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ fields })
        },
        userSession,
        config?.apiKey
      );

      if (!patchRes.ok) {
        throw new Error(`Failed to save contact to Firestore: ${patchRes.status} ${patchRes.statusText}`);
      }
      return await patchRes.json();
    }
    throw new Error(`Failed to save contact to Firestore: ${res.status} ${res.statusText}`);
  }

  return await res.json();
}

// Save contact and broadcast to open tabs
async function saveAndSyncContact(contactPayload) {
  const { tracklet_user_session, tracklet_firebase_config } = await chrome.storage.local.get([
    'tracklet_user_session',
    'tracklet_firebase_config'
  ]);

  if (!tracklet_user_session || !tracklet_user_session.uid) {
    console.warn('[Tracklet] Contact save blocked: User is not authenticated.');
    return {
      success: false,
      error: 'AUTH_REQUIRED',
      message: 'Authentication required. Sign in on Tracklet Web to save contacts.'
    };
  }

  let savedToCloud = false;
  if (tracklet_user_session && tracklet_user_session.uid) {
    try {
      await pushContactToFirestore(contactPayload, tracklet_user_session, tracklet_firebase_config);
      savedToCloud = true;
    } catch (e) {
      console.warn('Direct Firestore contact save failed from background worker:', e);
    }
  }

  // 1. Deliver to open web tabs via content scripts
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((t) => {
      if (t.id) {
        chrome.tabs.sendMessage(t.id, {
          action: 'TRACKLET_EXT_INCOMING_CONTACT',
          payload: contactPayload,
          persistedToCloud: savedToCloud
        }).catch(() => {});
      }
    });
  });

  // 2. Persist in chrome.storage.local
  chrome.storage.local.get(['tracklet_contacts_index', 'tracklet_pending_contacts'], (result) => {
    let contactsIndex = result.tracklet_contacts_index || [];
    let pendingContacts = result.tracklet_pending_contacts || [];

    const existingIdx = contactsIndex.findIndex(c => c.id === contactPayload.id);
    if (existingIdx >= 0) {
      contactsIndex[existingIdx] = contactPayload;
      pendingContacts = pendingContacts.map(c => c.id === contactPayload.id ? contactPayload : c);
    } else {
      contactsIndex = [contactPayload, ...contactsIndex];
      if (!savedToCloud) {
        pendingContacts = [contactPayload, ...pendingContacts];
      }
    }

    chrome.storage.local.set({
      tracklet_contacts_index: contactsIndex,
      tracklet_pending_contacts: pendingContacts
    }, () => {
      chrome.action.setBadgeText({ text: '✓' });
      chrome.action.setBadgeBackgroundColor({ color: '#7e22ce' });
      setTimeout(() => {
        chrome.action.setBadgeText({ text: '' });
      }, 2500);
    });
  });

  return { success: true, savedToCloud };
}

// Listen for runtime messages (internal popup & content script bridge)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'SYNC_USER_SESSION') {
    const user = message.payload?.user || null;
    const config = message.payload?.config || null;
    const origin = message.payload?.origin || null;

    const toStore = {
      tracklet_user_session: user,
      tracklet_firebase_config: config
    };

    if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      toStore.tracklet_web_origin = origin;
    }

    chrome.storage.local.set(toStore, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.action === 'SYNC_APPS_INDEX') {
    const syncedApps = message.payload || [];
    chrome.storage.local.set({
      tracklet_apps_index: syncedApps
    }, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true });
      }
    });
    return true;
  }

  if (message.action === 'SYNC_CONTACTS_INDEX') {
    const syncedContacts = message.payload || [];
    chrome.storage.local.set({
      tracklet_contacts_index: syncedContacts
    }, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true });
      }
    });
    return true;
  }

  if (message.action === 'DELETE_APPLICATION') {
    const deletedId = message.payload?.id;
    if (deletedId) {
      chrome.storage.local.get(['tracklet_pending_apps', 'tracklet_apps_index'], (res) => {
        const pending = (res?.tracklet_pending_apps || []).filter((a) => a?.id !== deletedId);
        const appsIndex = (res?.tracklet_apps_index || []).filter((a) => a?.id !== deletedId);
        chrome.storage.local.set({
          tracklet_pending_apps: pending,
          tracklet_apps_index: appsIndex,
        }, () => {
          sendResponse({ success: true });
        });
      });
      return true;
    }
  }

  if (message.action === 'DELETE_CONTACT') {
    const deletedIds = message.payload?.ids || (message.payload?.id ? [message.payload.id] : []);
    if (deletedIds.length > 0) {
      chrome.storage.local.get(['tracklet_pending_contacts', 'tracklet_contacts_index'], (res) => {
        const pending = (res?.tracklet_pending_contacts || []).filter((c) => !deletedIds.includes(c?.id));
        const contactsIndex = (res?.tracklet_contacts_index || []).filter((c) => !deletedIds.includes(c?.id));
        chrome.storage.local.set({
          tracklet_pending_contacts: pending,
          tracklet_contacts_index: contactsIndex,
        }, () => {
          sendResponse({ success: true });
        });
      });
      return true;
    }
  }

  if (message.action === 'SAVE_CONTACT') {
    saveAndSyncContact(message.payload).then(res => {
      sendResponse(res);
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  if (message.action === 'SAVE_EMAIL_LOG') {
    saveAndSyncEmailLog(message.payload).then(res => {
      sendResponse(res);
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  if (message.action === 'FLASH_SUCCESS') {
    chrome.action.setBadgeText({ text: '✓' });
    chrome.action.setBadgeBackgroundColor({ color: '#2563eb' });
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '' });
    }, 2500);
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'BROADCAST_SAVE') {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'TRACKLET_DATA_SAVED',
            payload: message.payload || message
          }).catch(() => {});
        }
      });
    });
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'PAGE_CONTEXT_CHANGED' || message.action === 'PAGE_AUTO_SCRAPED') {
    const payload = message.payload || {};
    const pageType = payload.pageType || payload.data?.pageType;
    const tabId = (sender && sender.tab) ? sender.tab.id : undefined;
    if (tabId) {
      if (pageType === 'contact_profile' || pageType === 'linkedin_profile') {
        chrome.action.setBadgeText({ text: '👤', tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#7e22ce', tabId });
      } else if (pageType === 'job_posting' || pageType === 'ats_form') {
        chrome.action.setBadgeText({ text: '💼', tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#059669', tabId });
      } else {
        chrome.action.setBadgeText({ text: '', tabId });
      }
    }
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'OPEN_SIDE_PANEL') {
    if (chrome.sidePanel && chrome.sidePanel.open) {
      const tabId = (sender && sender.tab) ? sender.tab.id : undefined;
      if (tabId) {
        chrome.sidePanel.open({ tabId })
          .then(() => sendResponse({ success: true }))
          .catch((err) => sendResponse({ success: false, error: err.message }));
      } else {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0] && tabs[0].id) {
            chrome.sidePanel.open({ tabId: tabs[0].id })
              .then(() => sendResponse({ success: true }))
              .catch((err) => sendResponse({ success: false, error: err.message }));
          } else {
            sendResponse({ success: false, error: 'No active tab found' });
          }
        });
      }
      return true;
    }
    sendResponse({ success: false, error: 'sidePanel API unavailable' });
    return true;
  }

  return true;
});

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

// Tab lifecycle listeners to track active context and notify side panel
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab && tab.url) {
      chrome.runtime.sendMessage({
        action: 'ACTIVE_TAB_CHANGED',
        payload: { tabId: tab.id, url: tab.url, title: tab.title }
      }).catch(() => {});
    }
  } catch {
    // tab might be closed or restricted
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    chrome.action.setBadgeText({ text: '', tabId }).catch(() => {});
  }
  const isComplete = changeInfo.status === 'complete';
  const isSpaUrlChange = Boolean(changeInfo.url) && changeInfo.status !== 'loading' && tab.status !== 'loading';

  if ((isComplete || isSpaUrlChange) && tab && tab.active && tab.url) {
    chrome.runtime.sendMessage({
      action: 'ACTIVE_TAB_UPDATED',
      payload: { tabId: tab.id, url: tab.url, title: tab.title, isUrlChange: isSpaUrlChange }
    }).catch(() => {});
  }
});


