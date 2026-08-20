/**
 * Tracklet Popup Controller
 * Manages form state, live page extraction, custom stage & editable platform dropdowns,
 * direct Firebase Firestore persistence, and cross-tab broadcasts.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const companyInput = document.getElementById('company');
  const roleInput = document.getElementById('role');
  const dateAppliedInput = document.getElementById('dateApplied');
  const jobLinkInput = document.getElementById('jobLink');
  const notesInput = document.getElementById('notes');
  const saveBtn = document.getElementById('save-btn');
  const headerPlatformBadge = document.getElementById('header-platform-badge');
  const companyAvatar = document.getElementById('company-avatar');
  const duplicateBanner = document.getElementById('duplicate-banner');
  const autofillSignal = document.getElementById('autofill-signal');
  const mainContainer = document.getElementById('main-container');
  const successView = document.getElementById('success-view');
  const successTitle = document.getElementById('success-title');
  const successSubtitle = document.getElementById('success-subtitle');
  const openTrackletLink = document.getElementById('open-tracklet-link');

  // Custom Platform Elements
  const platformSelectContainer = document.getElementById('platform-select-container');
  const platformTrigger = document.getElementById('platform-trigger');
  const platformValueText = document.getElementById('platform-value-text');
  const platformDropdown = document.getElementById('platform-dropdown');
  const platformOptions = document.querySelectorAll('#platform-dropdown .custom-select-option');
  const customPlatformInput = document.getElementById('custom-platform-input');

  // Custom Stage Elements
  const stageSelectorContainer = document.getElementById('stage-selector-container');
  const stageTriggerBtn = document.getElementById('stage-trigger-btn');
  const stageLabelText = document.getElementById('stage-label-text');
  const stageDot = document.getElementById('stage-dot');
  const stageOptionItems = document.querySelectorAll('.stage-option-item');

  let selectedPlatform = 'Company Site';
  let selectedStage = 'Applied';
  let currentDomain = '';
  let existingAppId = null;
  let currentUserSession = null;
  let currentFirebaseConfig = null;

  // STAGE CONFIG Matching StageSelectorDropdown.tsx & constants.ts
  const STAGE_CONFIG = {
    Saved: { bg: 'var(--stage-saved-bg)', text: 'var(--stage-saved-text)', border: 'var(--stage-saved-border)', dot: 'var(--stage-saved-dot)' },
    Wishlist: { bg: 'var(--stage-saved-bg)', text: 'var(--stage-saved-text)', border: 'var(--stage-saved-border)', dot: 'var(--stage-saved-dot)' }, // Alias
    Applied: { bg: 'var(--stage-applied-bg)', text: 'var(--stage-applied-text)', border: 'var(--stage-applied-border)', dot: 'var(--stage-applied-dot)' },
    Screening: { bg: 'var(--stage-screening-bg)', text: 'var(--stage-screening-text)', border: 'var(--stage-screening-border)', dot: 'var(--stage-screening-dot)' },
    Interview: { bg: 'var(--stage-interview-bg)', text: 'var(--stage-interview-text)', border: 'var(--stage-interview-border)', dot: 'var(--stage-interview-dot)' },
    Offer: { bg: 'var(--stage-offer-bg)', text: 'var(--stage-offer-text)', border: 'var(--stage-offer-border)', dot: 'var(--stage-offer-dot)' },
    Rejected: { bg: 'var(--stage-rejected-bg)', text: 'var(--stage-rejected-text)', border: 'var(--stage-rejected-border)', dot: 'var(--stage-rejected-dot)' },
    Archived: { bg: 'var(--stage-archived-bg)', text: 'var(--stage-archived-text)', border: 'var(--stage-archived-border)', dot: 'var(--stage-archived-dot)' },
  };

  // Initialize today's date in YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];
  dateAppliedInput.value = today;

  // Load cached Auth Session & Firebase Config
  try {
    const storageResult = await chrome.storage.local.get(['tracklet_user_session', 'tracklet_firebase_config']);
    currentUserSession = storageResult.tracklet_user_session || null;
    currentFirebaseConfig = storageResult.tracklet_firebase_config || null;
  } catch (err) {
    console.warn('Failed to load session from storage:', err);
  }

  // Request latest auth session via BroadcastChannel if web app is active
  try {
    const authBc = new BroadcastChannel('tracklet_extension_channel');
    authBc.onmessage = (event) => {
      if (event.data && event.data.type === 'TRACKLET_AUTH_SYNC') {
        currentUserSession = event.data.payload?.user || null;
        currentFirebaseConfig = event.data.payload?.config || null;
        if (currentUserSession) {
          chrome.storage.local.set({
            tracklet_user_session: currentUserSession,
            tracklet_firebase_config: currentFirebaseConfig
          });
        }
      }
    };
    authBc.postMessage({ type: 'REQUEST_TRACKLET_AUTH' });
  } catch (e) {
    // ignore
  }

  // Custom Platform Dropdown Handlers
  platformTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    stageSelectorContainer.classList.remove('open');
    platformSelectContainer.classList.toggle('open');
  });

  platformOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      const val = option.getAttribute('data-value');
      setPlatform(val);
      platformSelectContainer.classList.remove('open');
    });
  });

  customPlatformInput.addEventListener('input', () => {
    const val = customPlatformInput.value.trim() || 'Other';
    selectedPlatform = val;
    headerPlatformBadge.textContent = val;
    platformValueText.textContent = val;
  });

  function setPlatform(platformName) {
    selectedPlatform = platformName;
    headerPlatformBadge.textContent = platformName;
    platformValueText.textContent = platformName;

    platformOptions.forEach(o => {
      if (o.getAttribute('data-value') === platformName) {
        o.classList.add('selected');
      } else {
        o.classList.remove('selected');
      }
    });

    if (platformName === 'Other' || !Array.from(platformOptions).some(o => o.getAttribute('data-value') === platformName)) {
      customPlatformInput.style.display = 'block';
      if (platformName !== 'Other') {
        customPlatformInput.value = platformName;
      }
    } else {
      customPlatformInput.style.display = 'none';
      customPlatformInput.value = '';
    }
  }

  // Custom Stage Dropdown Handlers
  stageTriggerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    platformSelectContainer.classList.remove('open');
    stageSelectorContainer.classList.toggle('open');
  });

  stageOptionItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      let stage = item.getAttribute('data-stage');
      if (stage === 'Wishlist') stage = 'Saved';
      updateStageUI(stage);
      stageSelectorContainer.classList.remove('open');
    });
  });

  function updateStageUI(stage) {
    const canonicalStage = stage === 'Wishlist' ? 'Saved' : stage;
    selectedStage = canonicalStage;
    const config = STAGE_CONFIG[canonicalStage] || STAGE_CONFIG['Applied'];
    
    stageLabelText.textContent = canonicalStage;
    stageDot.style.backgroundColor = config.dot;
    stageTriggerBtn.style.backgroundColor = config.bg;
    stageTriggerBtn.style.color = config.text;
    stageTriggerBtn.style.borderColor = config.border;

    stageOptionItems.forEach(item => {
      const itemStage = item.getAttribute('data-stage');
      if (itemStage === canonicalStage || (itemStage === 'Wishlist' && canonicalStage === 'Saved')) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });
  }

  // Close dropdowns on outside click
  document.addEventListener('click', () => {
    platformSelectContainer.classList.remove('open');
    stageSelectorContainer.classList.remove('open');
  });

  // Avatar Preview Update Handler
  function updateCompanyAvatar(companyName, domain) {
    const cleanCompany = (companyName || '').trim();
    if (!cleanCompany) {
      companyAvatar.innerHTML = '?';
      return;
    }

    const initial = cleanCompany.charAt(0).toUpperCase();
    companyAvatar.innerHTML = initial;

    if (domain) {
      const imgUrl = `https://logo.clearbit.com/${domain}`;
      const img = new Image();
      img.onload = () => {
        companyAvatar.innerHTML = `<img src="${imgUrl}" alt="${cleanCompany}" />`;
      };
      img.src = imgUrl;
    }
  }

  companyInput.addEventListener('input', () => {
    updateCompanyAvatar(companyInput.value, currentDomain);
    validateInputs();
  });

  roleInput.addEventListener('input', validateInputs);

  function validateInputs() {
    const isValid = companyInput.value.trim().length > 0 && roleInput.value.trim().length > 0;
    saveBtn.disabled = !isValid;
  }

  // Request Page Extraction from Active Tab
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      jobLinkInput.value = tab.url || '';
      
      chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_PAGE_DATA' }, (response) => {
        if (!chrome.runtime.lastError && response) {
          companyInput.value = response.company || '';
          roleInput.value = response.role || '';
          
          setPlatform(response.platform || 'Company Site');

          notesInput.value = response.notes || '';
          currentDomain = response.domain || '';

          if (response.company || response.role) {
            autofillSignal.style.display = 'flex';
          }

          updateCompanyAvatar(response.company, response.domain);
          checkForDuplicates(tab.url);
        } else {
          const pageTitle = tab.title || '';
          roleInput.value = pageTitle;
          companyInput.value = getDomainFallback(tab.url);
          currentDomain = getDomain(tab.url);
          updateCompanyAvatar(companyInput.value, currentDomain);
          checkForDuplicates(tab.url);
        }

        // Auto focus first empty required field
        if (!companyInput.value.trim()) {
          companyInput.focus();
        } else if (!roleInput.value.trim()) {
          roleInput.focus();
        }

        validateInputs();
      });
    }
  } catch (err) {
    console.error('Failed to query tab:', err);
  }

  // Check if job is already saved in Tracklet
  function checkForDuplicates(url) {
    if (!url) return;
    chrome.storage.local.get(['tracklet_guest_apps_v1'], (result) => {
      const apps = result.tracklet_guest_apps_v1 || [];
      const match = apps.find(app => app.jobLink && app.jobLink === url);
      if (match) {
        existingAppId = match.id;
        duplicateBanner.classList.add('visible');
        saveBtn.querySelector('span').textContent = 'Update Application';
        if (match.status) {
          updateStageUI(match.status);
        }
        if (match.platform) {
          setPlatform(match.platform);
        }
      }
    });
  }

  // Save Application Click Handler
  saveBtn.addEventListener('click', handleSave);

  // Allow Enter key to trigger save
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      if (!saveBtn.disabled) {
        handleSave();
      }
    }
  });

  /**
   * Direct write to Firebase Firestore via REST API
   */
  async function pushToFirestoreDirectly(payload, userSession, config) {
    const projectId = config?.projectId || 'demo-tracklet';
    const apiKey = config?.apiKey;
    const userId = userSession.uid;
    const idToken = userSession.idToken;

    let url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}/applications`;
    if (apiKey && apiKey !== 'demo-api-key') {
      url += `?key=${encodeURIComponent(apiKey)}`;
    }

    const historyEntries = [
      {
        mapValue: {
          fields: {
            id: { stringValue: `hist-${Date.now()}` },
            stage: { stringValue: payload.status },
            timestamp: { stringValue: payload.stageUpdatedAt || new Date().toISOString() }
          }
        }
      }
    ];

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

    if (payload.jobLink) {
      fields.jobLink = { stringValue: payload.jobLink };
    }
    if (payload.notes) {
      fields.notes = { stringValue: payload.notes };
    }
    if (payload.companyDomain) {
      fields.companyDomain = { stringValue: payload.companyDomain };
    }
    if (payload.logoUrl) {
      fields.logoUrl = { stringValue: payload.logoUrl };
    }

    const headers = { 'Content-Type': 'application/json' };
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ fields })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Firestore REST HTTP ${response.status}: ${errText}`);
    }

    const resData = await response.json();
    const docId = resData.name ? resData.name.split('/').pop() : `cloud-${Date.now()}`;
    return {
      ...payload,
      id: docId,
      userId
    };
  }

  async function handleSave() {
    const company = companyInput.value.trim();
    const role = roleInput.value.trim();
    if (!company || !role) return;

    saveBtn.disabled = true;
    saveBtn.querySelector('span').textContent = 'Saving...';

    const finalPlatform = (selectedPlatform === 'Other' && customPlatformInput.value.trim()) 
      ? customPlatformInput.value.trim() 
      : selectedPlatform;

    const nowISO = new Date().toISOString();
    const basePayload = {
      company,
      role,
      platform: finalPlatform,
      dateApplied: dateAppliedInput.value || today,
      status: selectedStage,
      jobLink: jobLinkInput.value,
      notes: notesInput.value.trim(),
      companyDomain: currentDomain,
      logoUrl: currentDomain ? `https://logo.clearbit.com/${currentDomain}` : undefined,
      stageUpdatedAt: nowISO,
      createdAt: nowISO,
      updatedAt: nowISO
    };

    let finalizedApp = null;
    let savedToCloud = false;

    // 1. Direct Cloud Persist if user session is available
    if (currentUserSession && currentUserSession.uid) {
      try {
        finalizedApp = await pushToFirestoreDirectly(basePayload, currentUserSession, currentFirebaseConfig);
        savedToCloud = true;
      } catch (cloudErr) {
        console.warn('Direct Firestore push failed (offline or auth expired), falling back to local storage:', cloudErr);
      }
    }

    // 2. Local fallback if guest or cloud write unavailable
    if (!finalizedApp) {
      finalizedApp = {
        ...basePayload,
        id: existingAppId || `ext-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId: currentUserSession?.uid || 'guest'
      };
    }

    // 3. Broadcast to all open Tracklet tabs for instant UI update
    try {
      const bc = new BroadcastChannel('tracklet_extension_channel');
      bc.postMessage({
        type: 'TRACKLET_EXT_ADD_APPLICATION',
        payload: finalizedApp,
        persistedToCloud: savedToCloud
      });
      bc.close();
    } catch (e) {
      console.warn('BroadcastChannel unavailable:', e);
    }

    // 4. Update extension local storage & pending queue
    chrome.storage.local.get(['tracklet_pending_apps', 'tracklet_guest_apps_v1'], (result) => {
      let pending = result.tracklet_pending_apps || [];
      let guestApps = result.tracklet_guest_apps_v1 || [];

      if (existingAppId) {
        guestApps = guestApps.map(app => app.id === existingAppId ? finalizedApp : app);
      } else {
        guestApps = [finalizedApp, ...guestApps];
        if (!savedToCloud) {
          pending = [finalizedApp, ...pending];
        }
      }

      chrome.storage.local.set({
        tracklet_pending_apps: pending,
        tracklet_guest_apps_v1: guestApps
      }, () => {
        // Flash Extension Icon Badge
        chrome.runtime.sendMessage({ action: 'FLASH_SUCCESS' });

        // Show Success Overlay
        if (existingAppId) {
          successTitle.textContent = 'Application Updated!';
          successSubtitle.textContent = `${company} — ${role} updated in Tracklet.`;
        } else {
          successTitle.textContent = savedToCloud ? 'Saved to Cloud!' : 'Application Saved!';
          successSubtitle.textContent = `${company} — ${role} logged to Tracklet.`;
        }

        mainContainer.style.display = 'none';
        successView.classList.add('visible');

        // Auto-close popup after 1.8s
        setTimeout(() => {
          window.close();
        }, 1800);
      });
    });
  }

  // Open Tracklet Dashboard Link Handler
  openTrackletLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'http://localhost:3000' });
  });

  function getDomain(urlStr) {
    try {
      return new URL(urlStr).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }

  function getDomainFallback(urlStr) {
    const domain = getDomain(urlStr);
    if (!domain) return 'Company';
    const name = domain.split('.')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  // Initialize Stage & Platform UI
  updateStageUI('Applied');
  setPlatform('Company Site');
});
