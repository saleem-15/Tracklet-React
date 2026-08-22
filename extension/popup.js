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
  const companyAvatar = document.getElementById('company-avatar');
  const mainContainer = document.getElementById('main-container');
  const mainFormView = document.getElementById('main-form-view');
  const alreadySavedView = document.getElementById('already-saved-view');
  const savedCompanyName = document.getElementById('saved-company-name');
  const savedRoleTitle = document.getElementById('saved-role-title');
  const savedStagePill = document.getElementById('saved-stage-pill');
  const savedStageDot = document.getElementById('saved-stage-dot');
  const savedStageText = document.getElementById('saved-stage-text');
  const savedDateText = document.getElementById('saved-date-text');
  const openExistingBtn = document.getElementById('open-existing-btn');
  const saveAsNewBtn = document.getElementById('save-as-new-btn');
  const successView = document.getElementById('success-view');
  const successTitle = document.getElementById('success-title');
  const successSubtitle = document.getElementById('success-subtitle');
  const openTrackletLink = document.getElementById('open-tracklet-link');
  const userAccountBadge = document.getElementById('user-account-badge');
  const userAccountDot = document.getElementById('user-account-dot');
  const userAccountEmail = document.getElementById('user-account-email');

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

  // Stage Theme Tokens matching StageSelectorDropdown.tsx & constants.ts
  const STAGE_CONFIG = {
    Saved: { label: 'Saved', bg: 'var(--stage-saved-bg)', text: 'var(--stage-saved-text)', border: 'var(--stage-saved-border)', dot: 'var(--stage-saved-dot)' },
    Wishlist: { label: 'Saved', bg: 'var(--stage-saved-bg)', text: 'var(--stage-saved-text)', border: 'var(--stage-saved-border)', dot: 'var(--stage-saved-dot)' },
    Applied: { label: 'Applied', bg: 'var(--stage-applied-bg)', text: 'var(--stage-applied-text)', border: 'var(--stage-applied-border)', dot: 'var(--stage-applied-dot)' },
    Screening: { label: 'Screening', bg: 'var(--stage-screening-bg)', text: 'var(--stage-screening-text)', border: 'var(--stage-screening-border)', dot: 'var(--stage-screening-dot)' },
    Interview: { label: 'Interview', bg: 'var(--stage-interview-bg)', text: 'var(--stage-interview-text)', border: 'var(--stage-interview-border)', dot: 'var(--stage-interview-dot)' },
    Offer: { label: 'Offer', bg: 'var(--stage-offer-bg)', text: 'var(--stage-offer-text)', border: 'var(--stage-offer-border)', dot: 'var(--stage-offer-dot)' },
    Rejected: { label: 'Rejected', bg: 'var(--stage-rejected-bg)', text: 'var(--stage-rejected-text)', border: 'var(--stage-rejected-border)', dot: 'var(--stage-rejected-dot)' },
    Archived: { label: 'Archived', bg: 'var(--stage-archived-bg)', text: 'var(--stage-archived-text)', border: 'var(--stage-archived-border)', dot: 'var(--stage-archived-dot)' },
  };

  let selectedPlatform = 'Company Site';
  let selectedStage = 'Applied';
  let currentDomain = '';
  let matchedApplication = null;
  let isExplicitNewEntry = false;
  let currentUserSession = null;
  let currentFirebaseConfig = null;

  function updateUserBadge(session) {
    if (session && session.email) {
      userAccountDot.classList.add('connected');
      if (userAccountBadge) userAccountBadge.title = `Connected to Tracklet: ${session.email}`;
      userAccountEmail.textContent = 'Cloud Sync';
    } else if (session && session.uid) {
      userAccountDot.classList.add('connected');
      if (userAccountBadge) userAccountBadge.title = `Connected Account: ${session.uid}`;
      userAccountEmail.textContent = 'Cloud Sync';
    } else {
      userAccountDot.classList.remove('connected');
      if (userAccountBadge) userAccountBadge.title = 'Guest Mode: Applications saved to local storage';
      userAccountEmail.textContent = 'Local Mode';
    }
  }

  // Initialize today's date in YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];
  dateAppliedInput.value = today;

  // Load cached Auth Session & Firebase Config
  try {
    const storageResult = await chrome.storage.local.get(['tracklet_user_session', 'tracklet_firebase_config']);
    currentUserSession = storageResult.tracklet_user_session || null;
    currentFirebaseConfig = storageResult.tracklet_firebase_config || null;
    updateUserBadge(currentUserSession);
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
    platformValueText.textContent = val;
  });

  function setPlatform(platformName) {
    selectedPlatform = platformName;
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

  // Avatar Preview Update Handler with dual-tier fallback (Clearbit -> Google Favicon -> Initial)
  function updateCompanyAvatar(companyName, domain) {
    const cleanCompany = (companyName || '').trim();
    if (!cleanCompany) {
      companyAvatar.textContent = '?';
      return;
    }

    const initial = cleanCompany.charAt(0).toUpperCase();
    companyAvatar.textContent = initial;

    if (domain) {
      const clearbitUrl = `https://logo.clearbit.com/${domain}`;
      const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

      const img = new Image();
      img.onload = () => {
        companyAvatar.innerHTML = `<img src="${clearbitUrl}" alt="${cleanCompany}" />`;
      };
      img.onerror = () => {
        // Fallback to high-res Google Favicon
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          companyAvatar.innerHTML = `<img src="${googleFaviconUrl}" alt="${cleanCompany}" />`;
        };
        fallbackImg.onerror = () => {
          companyAvatar.textContent = initial;
        };
        fallbackImg.src = googleFaviconUrl;
      };
      img.src = clearbitUrl;
    }
  }

  let dupCheckTimeout = null;
  function triggerDupCheck() {
    clearTimeout(dupCheckTimeout);
    dupCheckTimeout = setTimeout(() => {
      checkForDuplicates(jobLinkInput.value);
    }, 200);
  }

  companyInput.addEventListener('input', () => {
    companyInput.classList.remove('input-error');
    updateCompanyAvatar(companyInput.value, currentDomain);
    validateInputs();
    triggerDupCheck();
  });

  roleInput.addEventListener('input', () => {
    roleInput.classList.remove('input-error');
    validateInputs();
    triggerDupCheck();
  });

  function validateInputs() {
    const hasCompany = companyInput.value.trim().length > 0;
    const hasRole = roleInput.value.trim().length > 0;
    if (hasCompany) companyInput.classList.remove('input-error');
    if (hasRole) roleInput.classList.remove('input-error');
    const isValid = hasCompany && hasRole;
    saveBtn.disabled = !isValid;
    return isValid;
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

  // URL Normalizer Helper for robust matching
  function normalizeUrl(url) {
    if (!url) return '';
    try {
      const u = new URL(url);
      const pathname = u.pathname.replace(/\/+$/, '');
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'refid', 'trackingid', 'position', 'pagenum', 'trk', 'ref', 'source'];
      Array.from(u.searchParams.keys()).forEach(key => {
        if (trackingParams.includes(key.toLowerCase())) {
          u.searchParams.delete(key);
        }
      });
      return `${u.hostname.replace(/^www\./, '')}${pathname}${u.search ? u.search : ''}`.toLowerCase();
    } catch {
      return url.trim().toLowerCase().replace(/\/+$/, '');
    }
  }

  // Check if job is already saved in Tracklet (across synced index, guest storage, and pending queue)
  function checkForDuplicates(url) {
    if (isExplicitNewEntry) return;

    const targetUrl = url || jobLinkInput.value;
    const normUrl = normalizeUrl(targetUrl);
    const targetComp = companyInput.value.trim().toLowerCase();
    const targetRole = roleInput.value.trim().toLowerCase();

    chrome.storage.local.get(['tracklet_apps_index', 'tracklet_guest_apps_v1', 'tracklet_pending_apps'], (result) => {
      if (isExplicitNewEntry) return;

      const allKnown = [
        ...(result.tracklet_apps_index || []),
        ...(result.tracklet_guest_apps_v1 || []),
        ...(result.tracklet_pending_apps || [])
      ];

      const match = allKnown.find(app => {
        if (normUrl && app.jobLink && normalizeUrl(app.jobLink) === normUrl) return true;
        if (targetComp && targetRole && app.company && app.role && app.company.toLowerCase().trim() === targetComp && app.role.toLowerCase().trim() === targetRole) {
          return true;
        }
        return false;
      });

      if (match) {
        matchedApplication = match;
        mainFormView.style.display = 'none';
        alreadySavedView.style.display = 'flex';

        savedCompanyName.textContent = match.company || 'Company';
        savedRoleTitle.textContent = match.role || 'Job Application';

        const stageInfo = STAGE_CONFIG[match.status] || STAGE_CONFIG.Applied;
        savedStagePill.style.color = stageInfo.text;
        savedStagePill.style.backgroundColor = stageInfo.bg;
        savedStagePill.style.borderColor = stageInfo.border;
        savedStageDot.style.backgroundColor = stageInfo.dot;
        savedStageText.textContent = stageInfo.label;

        savedDateText.textContent = match.dateApplied ? `Applied on ${match.dateApplied}` : 'Saved in workspace';
      } else {
        matchedApplication = null;
        alreadySavedView.style.display = 'none';
        mainFormView.style.display = 'block';
      }
    });
  }

  jobLinkInput.addEventListener('input', () => {
    if (!isExplicitNewEntry) {
      checkForDuplicates(jobLinkInput.value);
    }
  });

  // Open existing application directly in Tracklet dashboard
  openExistingBtn.addEventListener('click', (e) => {
    e.preventDefault();
    focusOrOpenWorkspace(matchedApplication?.id);
  });

  // User explicitly wants to save as a distinct application
  saveAsNewBtn.addEventListener('click', (e) => {
    e.preventDefault();
    isExplicitNewEntry = true;
    matchedApplication = null;
    alreadySavedView.style.display = 'none';
    mainFormView.style.display = 'block';
    validateInputs();
    roleInput.focus();
  });

  // Save Application Click Handler
  saveBtn.addEventListener('click', handleSave);

  // Global Keyboard Shortcuts (Escape to dismiss dropdowns, Enter to submit)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      platformSelectContainer.classList.remove('open');
      stageSelectorContainer.classList.remove('open');
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      if (alreadySavedView.style.display === 'flex') {
        focusOrOpenWorkspace(matchedApplication?.id);
        return;
      }
      if (!validateInputs()) {
        if (!companyInput.value.trim()) {
          companyInput.classList.add('input-error');
          companyInput.focus();
        } else if (!roleInput.value.trim()) {
          roleInput.classList.add('input-error');
          roleInput.focus();
        }
        return;
      }
      handleSave();
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
    if (!company) {
      companyInput.classList.add('input-error');
      companyInput.focus();
      return;
    }
    if (!role) {
      roleInput.classList.add('input-error');
      roleInput.focus();
      return;
    }

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
        id: `ext-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId: currentUserSession?.uid || 'guest'
      };
    }

    // 3. Deliver to open Tracklet tabs via content scripts
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

    // 4. Update extension local storage & pending queue
    chrome.storage.local.get(['tracklet_pending_apps', 'tracklet_guest_apps_v1', 'tracklet_apps_index'], (result) => {
      let pending = result.tracklet_pending_apps || [];
      let guestApps = result.tracklet_guest_apps_v1 || [];
      let appsIndex = result.tracklet_apps_index || [];

      guestApps = [finalizedApp, ...guestApps];
      appsIndex = [finalizedApp, ...appsIndex];
      if (!savedToCloud) {
        pending = [finalizedApp, ...pending];
      }

      chrome.storage.local.set({
        tracklet_pending_apps: pending,
        tracklet_guest_apps_v1: guestApps,
        tracklet_apps_index: appsIndex
      }, () => {
        // Flash Extension Icon Badge
        chrome.runtime.sendMessage({ action: 'FLASH_SUCCESS' });

        // Show Success Overlay
        successTitle.textContent = savedToCloud ? 'Saved to Cloud!' : 'Application Saved!';
        successSubtitle.textContent = `${company} — ${role} logged to Tracklet.`;

        mainContainer.style.display = 'none';
        successView.classList.add('visible');

        // Auto-close popup with 3.2s duration (pauses on hover)
        scheduleAutoClose(3200);
      });
    });
  }

  // Auto-close Timer Manager (pauses on hover so user can click workspace link)
  let closeTimeout = null;
  function scheduleAutoClose(ms = 3200) {
    clearTimeout(closeTimeout);
    closeTimeout = setTimeout(() => {
      window.close();
    }, ms);
  }

  successView.addEventListener('mouseenter', () => {
    clearTimeout(closeTimeout);
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) progressFill.style.animationPlayState = 'paused';
  });

  successView.addEventListener('mouseleave', () => {
    scheduleAutoClose(1600);
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) progressFill.style.animationPlayState = 'running';
  });

  // Focuses existing Tracklet tab if open or opens new tab
  async function focusOrOpenWorkspace(appId = null) {
    try {
      const tabs = await chrome.tabs.query({});
      const trackletTab = tabs.find(t => t.url && (
        t.url.includes('localhost:') ||
        t.url.includes('127.0.0.1:') ||
        t.url.includes('tracklet') ||
        t.url.includes('web.app') ||
        t.url.includes('firebaseapp.com') ||
        t.url.includes('vercel.app')
      ));

      const targetUrl = appId ? `http://localhost:5173/?appId=${encodeURIComponent(appId)}` : 'http://localhost:5173';

      if (trackletTab && trackletTab.id) {
        if (appId) {
          const base = trackletTab.url.split('?')[0];
          await chrome.tabs.update(trackletTab.id, { active: true, url: `${base}?appId=${encodeURIComponent(appId)}` });
        } else {
          await chrome.tabs.update(trackletTab.id, { active: true });
        }
        if (trackletTab.windowId) {
          await chrome.windows.update(trackletTab.windowId, { focused: true });
        }
        window.close();
        return;
      }
    } catch (err) {
      console.warn('Tab focus check failed:', err);
    }
    chrome.tabs.create({ url: appId ? `http://localhost:5173/?appId=${encodeURIComponent(appId)}` : 'http://localhost:5173' });
    window.close();
  }

  // Open Tracklet Dashboard Link Handler from Success View
  openTrackletLink.addEventListener('click', (e) => {
    e.preventDefault();
    clearTimeout(closeTimeout);
    focusOrOpenWorkspace();
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
