/**
 * Tracklet Popup Controller
 * Manages form state, live page extraction, custom stage & editable platform dropdowns,
 * direct Firebase Firestore persistence, and cross-tab broadcasts.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const TRACKLET_APP_URL = 'https://tracklet-eight.vercel.app';

  // DOM Elements
  const companyInput = document.getElementById('company');
  const companyDomainInput = document.getElementById('companyDomain');
  const roleInput = document.getElementById('role');
  const locationInput = document.getElementById('location');
  const dateAppliedInput = document.getElementById('dateApplied');
  const jobLinkInput = document.getElementById('jobLink');
  const notesInput = document.getElementById('notes');
  const notesEditorEl = document.getElementById('notes-editor');
  const notesRawEl = document.getElementById('notes-raw');
  const toggleMdBtn = document.getElementById('btn-toggle-md');
  const toggleMdLabel = document.getElementById('toggle-md-label');
  const clearNotesBtn = document.getElementById('btn-clear-notes');
  const notesToolbar = document.getElementById('notes-toolbar');

  const popupRegistry = typeof JobBoardRegistry !== 'undefined' ? JobBoardRegistry : null;

  let isRawNotesMode = false;
  let internalNotesMarkdown = '';

  function updateNotesEditorView(md) {
    internalNotesMarkdown = md || '';
    if (notesRawEl) notesRawEl.value = internalNotesMarkdown;
    if (notesEditorEl) {
      if (popupRegistry && popupRegistry.markdownToHtml) {
        notesEditorEl.innerHTML = popupRegistry.markdownToHtml(internalNotesMarkdown);
      } else {
        notesEditorEl.textContent = internalNotesMarkdown;
      }
    }
  }

  function getSerializedNotesMarkdown() {
    if (isRawNotesMode && notesRawEl) {
      return notesRawEl.value;
    }
    if (notesEditorEl && popupRegistry && popupRegistry.htmlToMarkdown) {
      return popupRegistry.htmlToMarkdown(notesEditorEl.innerHTML);
    }
    return internalNotesMarkdown;
  }

  if (notesInput) {
    Object.defineProperty(notesInput, 'value', {
      get: function () {
        return getSerializedNotesMarkdown();
      },
      set: function (val) {
        updateNotesEditorView(val);
      },
      configurable: true,
    });
  }

  if (notesEditorEl) {
    notesEditorEl.addEventListener('click', (e) => {
      const anchor = e.target.closest('a');
      if (anchor) {
        const href = anchor.getAttribute('href');
        if (href) {
          try {
            const parsed = new URL(href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') ? href : `https://${href}`);
            if (['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)) {
              e.preventDefault();
              chrome.tabs.create({ url: parsed.href });
            }
          } catch {
            // Ignore invalid URL
          }
        }
      }
    });

    notesEditorEl.addEventListener('input', () => {
      if (popupRegistry && popupRegistry.htmlToMarkdown) {
        internalNotesMarkdown = popupRegistry.htmlToMarkdown(notesEditorEl.innerHTML);
        if (notesRawEl) notesRawEl.value = internalNotesMarkdown;
      }
    });

    notesEditorEl.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = e.clipboardData ? e.clipboardData.getData('text/plain') : '';
      if (text) {
        document.execCommand('insertText', false, text);
      }
    });
  }

  if (notesRawEl) {
    notesRawEl.addEventListener('input', () => {
      internalNotesMarkdown = notesRawEl.value;
      if (notesEditorEl && popupRegistry && popupRegistry.markdownToHtml) {
        notesEditorEl.innerHTML = popupRegistry.markdownToHtml(internalNotesMarkdown);
      }
    });
  }

  if (notesToolbar) {
    notesToolbar.querySelectorAll('.toolbar-btn').forEach((btn) => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const cmd = btn.getAttribute('data-cmd');
        if (notesEditorEl) notesEditorEl.focus();

        if (cmd === 'bold') {
          document.execCommand('bold', false, null);
        } else if (cmd === 'italic') {
          document.execCommand('italic', false, null);
        } else if (cmd === 'h3') {
          document.execCommand('formatBlock', false, '<h3>');
        } else if (cmd === 'bullet') {
          document.execCommand('insertUnorderedList', false, null);
        }

        if (popupRegistry && popupRegistry.htmlToMarkdown && notesEditorEl) {
          internalNotesMarkdown = popupRegistry.htmlToMarkdown(notesEditorEl.innerHTML);
          if (notesRawEl) notesRawEl.value = internalNotesMarkdown;
        }
      });
    });
  }

  if (toggleMdBtn) {
    toggleMdBtn.addEventListener('click', () => {
      isRawNotesMode = !isRawNotesMode;
      if (isRawNotesMode) {
        if (notesEditorEl && popupRegistry && popupRegistry.htmlToMarkdown) {
          internalNotesMarkdown = popupRegistry.htmlToMarkdown(notesEditorEl.innerHTML);
          if (notesRawEl) notesRawEl.value = internalNotesMarkdown;
        }
        if (notesEditorEl) notesEditorEl.style.display = 'none';
        if (notesToolbar) notesToolbar.style.display = 'none';
        if (notesRawEl) {
          notesRawEl.style.display = 'block';
          notesRawEl.focus();
        }
        if (toggleMdLabel) toggleMdLabel.textContent = 'View';
      } else {
        if (notesRawEl) {
          internalNotesMarkdown = notesRawEl.value;
        }
        if (notesEditorEl && popupRegistry && popupRegistry.markdownToHtml) {
          notesEditorEl.innerHTML = popupRegistry.markdownToHtml(internalNotesMarkdown);
        }
        if (notesRawEl) notesRawEl.style.display = 'none';
        if (notesToolbar) notesToolbar.style.display = 'flex';
        if (notesEditorEl) {
          notesEditorEl.style.display = 'block';
          notesEditorEl.focus();
        }
        if (toggleMdLabel) toggleMdLabel.textContent = 'Markdown';
      }
    });
  }

  if (clearNotesBtn) {
    clearNotesBtn.addEventListener('click', () => {
      internalNotesMarkdown = '';
      if (notesEditorEl) notesEditorEl.innerHTML = '';
      if (notesRawEl) notesRawEl.value = '';
    });
  }

  const saveBtn = document.getElementById('save-btn');
  const companyAvatar = document.getElementById('company-avatar');
  const mainContainer = document.getElementById('main-container');
  const mainFormView = document.getElementById('main-form-view');
  const duplicateBanner = document.getElementById('duplicate-banner');
  const duplicateBannerText = document.getElementById('duplicate-banner-text');
  const duplicateOpenLink = document.getElementById('duplicate-open-link');
  const workLocationPills = document.querySelectorAll('#work-location-pills .pill-btn');
  const employmentTypePills = document.querySelectorAll('#employment-type-pills .pill-btn');
  const recruiterContactCard = document.getElementById('recruiter-contact-card');
  const addRecruiterContactCheckbox = document.getElementById('add-recruiter-contact-checkbox');
  const recruiterNameEl = document.getElementById('recruiter-name');
  const recruiterTitleEl = document.getElementById('recruiter-title');
  const recruiterBadgeEl = document.getElementById('recruiter-badge');
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

  // Email Log Companion Elements
  const emailLogView = document.getElementById('email-log-view');
  const matchedAppCard = document.getElementById('matched-app-card');
  const emailMatchedAvatar = document.getElementById('email-matched-avatar');
  const emailMatchedCompany = document.getElementById('email-matched-company');
  const emailMatchedRole = document.getElementById('email-matched-role');
  const emailMatchedStagePill = document.getElementById('email-matched-stage-pill');
  const emailMatchedStageDot = document.getElementById('email-matched-stage-dot');
  const emailMatchedStageText = document.getElementById('email-matched-stage-text');
  const changeAppBtn = document.getElementById('change-app-btn');
  const appSelectorPopover = document.getElementById('app-selector-popover');
  const appSearchInput = document.getElementById('app-search-input');
  const appSelectorList = document.getElementById('app-selector-list');
  const appSelectorNewBtn = document.getElementById('app-selector-new-btn');
  const dirInboundBtn = document.getElementById('dir-inbound-btn');
  const dirOutboundBtn = document.getElementById('dir-outbound-btn');
  const emailSubjectInput = document.getElementById('email-subject');
  const emailCounterpartyInput = document.getElementById('email-counterparty');
  const emailCounterpartyLabel = document.getElementById('email-counterparty-label');
  const counterpartyLabelText = document.getElementById('counterparty-label-text');
  const emailDateInput = document.getElementById('email-date');
  const emailTimeInput = document.getElementById('email-time');
  const emailBodyInput = document.getElementById('email-body');
  const headerModeChip = document.getElementById('header-mode-chip');
  const headerModeText = document.getElementById('header-mode-text');
  const milestoneBox = document.getElementById('milestone-box');
  const addContactOption = document.getElementById('add-contact-option');
  const addContactCheckbox = document.getElementById('add-contact-checkbox');
  const addContactLabel = document.getElementById('add-contact-label');
  const logEmailBtn = document.getElementById('log-email-btn');
  const switchToJobClipperBtn = document.getElementById('switch-to-job-clipper-btn');

  let currentEmailDirection = 'inbound';
  let selectedEmailMatchedApp = null;
  let allKnownAppsList = [];
  let discoveredRecruiterName = '';
  let discoveredRecruiterEmail = '';
  let currentEmailUrl = '';
  let currentEmailTimestamp = null; // Full ISO 8601 string e.g. "2026-09-25T14:35:10"
  let isWebmailMode = false;
  let rawExtractedEmailData = null;

  // Custom Platform Elements
  const platformSelectContainer = document.getElementById('platform-select-container');
  const platformTrigger = document.getElementById('platform-trigger');
  const platformValueText = document.getElementById('platform-value-text');
  const platformDropdown = document.getElementById('platform-dropdown');
  const platformOptions = document.querySelectorAll('#platform-dropdown .custom-select-option');
  const customPlatformInput = document.getElementById('custom-platform-input');

  // Custom Stage Elements
  const stageSelectorContainer = document.getElementById('stage-selector-container');
  const stageReadonlyContainer = document.getElementById('stage-readonly-container');
  const stageReadonlyBadge = document.getElementById('stage-readonly-badge');
  const stageReadonlyDot = document.getElementById('stage-readonly-dot');
  const stageReadonlyText = document.getElementById('stage-readonly-text');
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
  let selectedStage = 'Saved';
  let selectedWorkLocation = null;
  let selectedEmploymentType = null;
  let detectedRecruiterContact = null;
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
      if (userAccountBadge) userAccountBadge.title = 'Guest Mode: Click to open Tracklet workspace';
      userAccountEmail.textContent = 'Local Mode';
    }
  }

  if (userAccountBadge) {
    userAccountBadge.style.cursor = 'pointer';
    userAccountBadge.addEventListener('click', () => {
      focusOrOpenWorkspace();
    });
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

  // Update Alert Banner Controller
  const updateAlertBanner = document.getElementById('update-alert-banner');
  const updateAlertText = document.getElementById('update-alert-text');
  const updateAlertOpenBtn = document.getElementById('update-alert-open-btn');
  const updateAlertDismissBtn = document.getElementById('update-alert-dismiss-btn');

  function checkExtensionUpdate() {
    try {
      const manifest = (typeof chrome !== 'undefined' && chrome.runtime?.getManifest)
        ? chrome.runtime.getManifest()
        : { version: '1.0.0' };
      const currentVersion = manifest.version || '1.0.0';

      chrome.storage.local.get(['tracklet_latest_version', 'tracklet_dismissed_update_version'], (res) => {
        const latestVersion = res?.tracklet_latest_version;
        const dismissedVersion = res?.tracklet_dismissed_update_version;

        if (latestVersion && latestVersion !== currentVersion && latestVersion !== dismissedVersion) {
          const currParts = currentVersion.split('.').map(n => parseInt(n, 10) || 0);
          const latestParts = latestVersion.split('.').map(n => parseInt(n, 10) || 0);
          let isNewer = false;
          for (let i = 0; i < Math.max(currParts.length, latestParts.length); i++) {
            if ((latestParts[i] || 0) > (currParts[i] || 0)) {
              isNewer = true;
              break;
            } else if ((latestParts[i] || 0) < (currParts[i] || 0)) {
              break;
            }
          }

          if (isNewer && updateAlertBanner) {
            updateAlertBanner.style.display = 'flex';
            if (updateAlertText) {
              updateAlertText.textContent = `Update v${latestVersion} available`;
            }
          }
        }
      });
    } catch {
      // ignore
    }
  }

  if (updateAlertOpenBtn) {
    updateAlertOpenBtn.addEventListener('click', async () => {
      try {
        const storageResult = await chrome.storage.local.get(['tracklet_web_origin']);
        const targetUrl = storageResult?.tracklet_web_origin || TRACKLET_APP_URL;
        chrome.tabs.create({ url: targetUrl });
      } catch {
        chrome.tabs.create({ url: TRACKLET_APP_URL });
      }
    });
  }

  if (updateAlertDismissBtn) {
    updateAlertDismissBtn.addEventListener('click', () => {
      if (updateAlertBanner) updateAlertBanner.style.display = 'none';
      try {
        chrome.storage.local.get(['tracklet_latest_version'], (res) => {
          if (res?.tracklet_latest_version) {
            chrome.storage.local.set({ tracklet_dismissed_update_version: res.tracklet_latest_version });
          }
        });
      } catch {
        // ignore
      }
    });
  }

  checkExtensionUpdate();


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

  // Work Location & Employment Type Pills Handlers
  function setWorkLocation(val) {
    selectedWorkLocation = val;
    workLocationPills.forEach(btn => {
      if (btn.getAttribute('data-value') === val) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
  }

  workLocationPills.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const val = btn.getAttribute('data-value');
      setWorkLocation(selectedWorkLocation === val ? null : val);
    });
  });

  function setEmploymentType(val) {
    selectedEmploymentType = val;
    employmentTypePills.forEach(btn => {
      if (btn.getAttribute('data-value') === val) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
  }

  employmentTypePills.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const val = btn.getAttribute('data-value');
      setEmploymentType(selectedEmploymentType === val ? null : val);
    });
  });


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

  // Close dropdowns & popovers on outside click
  document.addEventListener('click', (e) => {
    platformSelectContainer.classList.remove('open');
    stageSelectorContainer.classList.remove('open');
    if (appSelectorPopover && appSelectorPopover.style.display !== 'none') {
      // Do not close if the click came from inside the popover, from changeAppBtn,
      // or from logEmailBtn (that button opens the popover when no app is selected).
      const fromPopover = appSelectorPopover.contains(e.target);
      const fromChangeBtn = e.target === changeAppBtn || changeAppBtn.contains(e.target);
      const fromLogBtn = logEmailBtn && (e.target === logEmailBtn || logEmailBtn.contains(e.target));
      if (!fromPopover && !fromChangeBtn && !fromLogBtn) {
        appSelectorPopover.style.display = 'none';
      }
    }
  });

  // Global Escape key listener (Rule 3.B.3)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      platformSelectContainer.classList.remove('open');
      stageSelectorContainer.classList.remove('open');
      if (appSelectorPopover && appSelectorPopover.style.display !== 'none') {
        appSelectorPopover.style.display = 'none';
      }
    }
  });

  // Avatar Preview Update Handler with high-res Google Favicon & monogram fallback (Clearbit removed)
  function updateCompanyAvatar(companyName, domain, targetEl = companyAvatar) {
    if (!targetEl) return;
    const cleanCompany = (companyName || '').trim();
    if (!cleanCompany) {
      targetEl.textContent = '?';
      return;
    }

    const initial = cleanCompany.charAt(0).toUpperCase();
    targetEl.textContent = initial;

    const registry = typeof JobBoardRegistry !== 'undefined' ? JobBoardRegistry : null;
    const cleanDom = registry && registry.cleanCompanyDomain ? registry.cleanCompanyDomain(domain) : (domain || '').trim().toLowerCase();

    // Never show logo for job boards / ATS
    if (cleanDom && (!registry || !registry.isJobBoardOrAts || !registry.isJobBoardOrAts(cleanDom))) {
      const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(cleanDom)}&sz=128`;
      const img = new Image();
      img.onload = () => {
        targetEl.innerHTML = `<img src="${googleFaviconUrl}" alt="${cleanCompany}" />`;
      };
      img.onerror = () => {
        targetEl.textContent = initial;
      };
      img.src = googleFaviconUrl;
    }
  }

  // --- Webmail Companion Helpers ---
  function isWebmail(url) {
    if (!url) return false;
    try {
      const host = new URL(url).hostname.toLowerCase();
      return host.includes('mail.google.com') ||
        host.includes('outlook.live.com') ||
        host.includes('outlook.office.com') ||
        host.includes('outlook.office365.com');
    } catch {
      return false;
    }
  }

  const ATS_DOMAINS = [
    'greenhouse.io', 'greenhouse-mail.io', 'gh-mail.io',
    'lever.co', 'hire.lever.co',
    'ashbyhq.com', 'ashby-mail.com',
    'smartrecruiters.com',
    'workday.com', 'myworkday.com', 'workdayjobs.com',
    'jobvite.com', 'recruitee.com',
    'rippling.com', 'bamboohr.com',
    'breezy.hr', 'pinpointhq.com',
    'jazzhr.com', 'icims.com'
  ];

  // Helper to normalize company name (strips legal suffixes, punctuation, extra spaces)
  function normalizeCompanyName(name) {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/\b(inc|incorporated|llc|ltd|limited|corp|corporation|technologies|technology|solutions|group|holdings|services|gmbh|co|sa|ag|pty|pte)\b/gi, ' ')
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Helper to sanitize domains (strips protocol, www, paths)
  function cleanDomain(d) {
    if (!d) return '';
    return d.toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '')
      .trim();
  }

  // Helper to extract non-aggregator domain from URL
  function extractDomainFromUrl(url) {
    if (!url) return '';
    if (typeof JobBoardRegistry !== 'undefined') {
      return JobBoardRegistry.cleanCompanyDomain(url) || '';
    }
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      let host = parsed.hostname.toLowerCase().replace(/^www\./, '');
      if (/linkedin|indeed|glassdoor|monster|ziprecruiter|simplyhired/.test(host)) {
        return '';
      }
      if (ATS_DOMAINS.some(ats => host.includes(ats))) {
        return '';
      }
      return host;
    } catch {
      return '';
    }
  }

  // Helper to extract ATS company slug from ATS job posting URLs
  function extractAtsSlugFromUrl(url) {
    if (!url) return '';
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
      const pathname = parsed.pathname.toLowerCase();

      // boards.greenhouse.io/{slug} or job-boards.greenhouse.io/{slug}
      if (host.includes('greenhouse.io')) {
        const match = pathname.match(/^\/(?:embed\/job_board\/|boards\/|job-boards\/)?([a-z0-9-]+)/);
        if (match && !['jobs', 'search', 'embed'].includes(match[1])) return match[1];
      }
      // jobs.lever.co/{slug}
      if (host.includes('lever.co')) {
        const match = pathname.match(/^\/([a-z0-9-]+)/);
        if (match && !['jobs', 'apply'].includes(match[1])) return match[1];
      }
      // jobs.ashbyhq.com/{slug}
      if (host.includes('ashbyhq.com')) {
        const match = pathname.match(/^\/([a-z0-9-]+)/);
        if (match && !['jobs'].includes(match[1])) return match[1];
      }
      // {slug}.workdayjobs.com or {slug}.recruitee.com
      const subMatch = host.match(/^([a-z0-9-]+)\.(?:workdayjobs|greenhouse|lever|recruitee)\./);
      if (subMatch && !['jobs', 'boards', 'www'].includes(subMatch[1])) return subMatch[1];

      return '';
    } catch {
      return '';
    }
  }

  function isGenericRecruitingWord(word) {
    const w = (word || '').toLowerCase().trim();
    return [
      'recruiting', 'recruitment', 'talent', 'careers', 'hiring', 'team',
      'greenhouse', 'lever', 'ashby', 'workday', 'jobvite', 'smartrecruiters',
      'interview', 'interviews', 'hr', 'people', 'human resources'
    ].includes(w) || w.length < 2;
  }

  // Extract company name candidate from ATS headers or display names
  function extractCompanyFromAts(senderName, senderEmail, subject) {
    const name = (senderName || '').trim();
    const subj = (subject || '').trim();
    const text = `${name} ${subj}`;

    // 1. "[Company] via [ATS]" (e.g. "Stripe via Greenhouse", "Figma via Lever")
    const viaMatch = text.match(/([A-Z0-9a-z\s&'-]+?)\s+(?:via|by|through)\s+(?:greenhouse|lever|ashby|smartrecruiters|workday|jobvite|recruitee|rippling|bamboohr|icims|jazzhr)/i);
    if (viaMatch && viaMatch[1].trim()) {
      const candidate = viaMatch[1].trim();
      if (!isGenericRecruitingWord(candidate)) return candidate;
    }

    // 2. Parentheses or brackets in sender name: "Jane Doe (Stripe)" or "Jane Doe [Stripe]"
    const parenMatch = name.match(/[\(\[]([A-Z0-9a-z\s&'-]+)[\)\]]/);
    if (parenMatch && parenMatch[1].trim()) {
      const candidate = parenMatch[1].trim();
      if (!isGenericRecruitingWord(candidate)) return candidate;
    }

    // 3. "Jane Doe at Stripe" or "Jane Doe from Stripe"
    // \b before at/from ensures we don't match inside names like "Fromberg" or "Strathmore"
    const atFromMatch = name.match(/\b(?:at|from)\s+([A-Z0-9a-z\s&'-]+)$/i);
    if (atFromMatch && atFromMatch[1].trim()) {
      const candidate = atFromMatch[1].trim();
      if (!isGenericRecruitingWord(candidate)) return candidate;
    }

    // 4. "[Company] Recruiting" or "[Company] Talent" or "[Company] Careers" or "[Company] Team"
    const teamMatch = name.match(/^([A-Z0-9a-z\s&'-]+?)\s+(?:recruiting|recruitment|talent|careers|hiring|team)\b/i);
    if (teamMatch && teamMatch[1].trim()) {
      const candidate = teamMatch[1].trim();
      if (!isGenericRecruitingWord(candidate)) return candidate;
    }

    // 5. Subject patterns: "Thank you for applying to [Company]" or "Application to [Company]" or "Interview with [Company]"
    const subjActionMatch = subj.match(/(?:applying to|application to|interview with|welcome to|next steps with)\s+([A-Z0-9a-z\s&'-]+?)(?:[:,\.\?!]|\s+for\b|\s+as\b|$)/i);
    if (subjActionMatch && subjActionMatch[1].trim()) {
      const candidate = subjActionMatch[1].trim();
      if (!isGenericRecruitingWord(candidate)) return candidate;
    }

    // 6. Subdomain or prefix in sender email e.g. "company@ashby-mail.com" or "company.greenhouse.io"
    if (senderEmail) {
      const emailDomain = senderEmail.includes('@') ? senderEmail.split('@')[1].toLowerCase() : senderEmail.toLowerCase();
      const emailPrefix = senderEmail.includes('@') ? senderEmail.split('@')[0].toLowerCase() : '';
      const subMatch = emailDomain.match(/^([a-z0-9-]+)\.(?:greenhouse\.io|lever\.co|smartrecruiters\.com|workday\.com|recruitee\.com)/i);
      if (subMatch && subMatch[1] && !['no-reply', 'mail', 'hire', 'jobs', 'notifications'].includes(subMatch[1])) {
        return subMatch[1];
      }
      if ((emailDomain.includes('ashby-mail') || emailDomain.includes('greenhouse-mail') || emailDomain.includes('gh-mail')) && 
          emailPrefix && !['no-reply', 'notifications', 'interviews', 'jobs', 'mailer', 'talent'].includes(emailPrefix)) {
        return emailPrefix;
      }
    }

    return '';
  }

  function matchEmailToApplications(emailData, allKnownApps) {
    if (!allKnownApps || allKnownApps.length === 0) return { bestMatch: null, ranked: [] };

    const senderEmail = (emailData.senderEmail || '').toLowerCase().trim();
    const recipientEmail = (emailData.recipientEmail || '').toLowerCase().trim();
    const domain = cleanDomain(emailData.counterpartyDomain);
    const subject = (emailData.subject || '').toLowerCase().trim();
    const senderName = (emailData.senderName || '').toLowerCase().trim();
    const bodyText = (emailData.body || emailData.snippet || '').toLowerCase().trim();
    const snippetText = (emailData.snippet || '').toLowerCase().trim();

    const isEmailDomainAts = Boolean(emailData.isAts) || ATS_DOMAINS.some(ats => domain.includes(ats));
    const atsCompanyCandidate = normalizeCompanyName(extractCompanyFromAts(senderName, senderEmail, subject));

    const scored = allKnownApps.map(app => {
      let score = 0;
      const rawAppCompany = (app.company || '').trim();
      const normAppCompany = normalizeCompanyName(rawAppCompany);
      const rawCleanedDomain = typeof JobBoardRegistry !== 'undefined'
        ? JobBoardRegistry.cleanCompanyDomain(app.companyDomain)
        : cleanDomain(app.companyDomain);
      const appDomain = rawCleanedDomain || extractDomainFromUrl(app.jobLink);
      const atsJobSlug = extractAtsSlugFromUrl(app.jobLink);
      const contactEmail = (app.contactEmail || '').toLowerCase().trim();
      const contactEmails = (app.contactEmails || []).map(e => e.toLowerCase().trim());
      const normRole = (app.role || '').toLowerCase().trim();

      // Tier 1: Direct Contact Match (100 pts)
      if (senderEmail && (senderEmail === contactEmail || contactEmails.includes(senderEmail))) {
        score += 100;
      } else if (recipientEmail && (recipientEmail === contactEmail || contactEmails.includes(recipientEmail))) {
        score += 90;
      }

      // Tier 2: Company Domain Match (80 pts)
      // Never award generic ATS domain match unless the company itself is the ATS
      if (domain && appDomain && (!isEmailDomainAts || normAppCompany.includes(domain.split('.')[0]))) {
        if (domain === appDomain || domain.endsWith('.' + appDomain) || appDomain.endsWith('.' + domain)) {
          score += 80;
        }
      }
      
      // Clean company domain slug match (e.g. domain is 'stripe.com' and company is 'Stripe')
      if (domain && !isEmailDomainAts && normAppCompany && normAppCompany.length >= 3) {
        const domainSlug = domain.split('.')[0];
        if (domainSlug === normAppCompany) {
          score += 75;
        } else if (domainSlug.startsWith(normAppCompany) || normAppCompany.startsWith(domainSlug)) {
          score += 65;
        }
      }

      // Match ATS slug from app's jobLink (e.g. boards.greenhouse.io/stripe/jobs/123 -> stripe)
      if (atsJobSlug && atsJobSlug.length >= 3) {
        if (domain && !isEmailDomainAts && domain.split('.')[0] === atsJobSlug) {
          score += 75;
        }
        if (atsCompanyCandidate && (atsCompanyCandidate === atsJobSlug || atsJobSlug.includes(atsCompanyCandidate))) {
          score += 70;
        }
      }

      // Tier 3: ATS Disambiguation / Sender Display Name (70 pts)
      if (isEmailDomainAts || /greenhouse|lever|ashby|smartrecruiters|workday/.test(domain)) {
        if (atsCompanyCandidate && normAppCompany && (atsCompanyCandidate === normAppCompany || atsCompanyCandidate.includes(normAppCompany) || normAppCompany.includes(atsCompanyCandidate))) {
          score += 70;
        } else if (senderName && normAppCompany && normAppCompany.length >= 3) {
          const nameRegex = new RegExp(`\\b${normAppCompany.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          if (nameRegex.test(senderName)) {
            score += 65;
          }
        }
      }

      // Tier 4: Subject Mentions (Word-Bounded, 50 pts)
      const isShortStopWord = normAppCompany.length <= 2 || ['box', 'and', 'the', 'for', 'all', 'one', 'new', 'top', 'in', 'on', 'at', 'to', 'up', 'do'].includes(normAppCompany);
      if (normAppCompany && normAppCompany.length >= 2) {
        const escaped = normAppCompany.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (isShortStopWord) {
          // Require contextual phrasing like "at Company" or "Company Team" for short names / stop words
          const contextRegex = new RegExp(`(?:\\bat|\\bwith|\\bfor|\\bjoining|\\bteam)\\s+${escaped}\\b|\\b${escaped}\\s+(?:team|careers|recruiting|technologies|solutions)\\b`, 'i');
          if (contextRegex.test(subject)) {
            score += 50;
          }
        } else {
          const subjRegex = new RegExp(`\\b${escaped}\\b`, 'i');
          if (subjRegex.test(subject)) {
            score += 50;
          }
        }
      }

      // Tier 5: Email Body & Snippet Mentions (Word-Bounded, 45-50 pts)
      if (normAppCompany && normAppCompany.length >= 3 && bodyText) {
        const isCommonWord = ['box', 'and', 'the', 'for', 'all', 'one', 'new', 'top', 'run', 'get'].includes(normAppCompany);
        const escaped = normAppCompany.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (isCommonWord) {
          const contextRegex = new RegExp(`(?:\\bat|\\bwith|\\bfor|\\bjoining|\\bteam)\\s+${escaped}\\b|\\b${escaped}\\s+(?:team|careers|recruiting|technologies|solutions)\\b`, 'i');
          if (contextRegex.test(bodyText)) {
            score += 45;
          }
        } else {
          const bodyRegex = new RegExp(`\\b${escaped}\\b`, 'i');
          if (bodyRegex.test(bodyText)) {
            if (snippetText && bodyRegex.test(snippetText)) {
              score += 50;
            } else {
              score += 45;
            }
          }
        }
      }

      // Tier 6: Role / Title Mention in Subject or Body (+15-25 pts)
      if (normRole && normRole.length >= 4) {
        const escapedRole = normRole.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const roleRegex = new RegExp(`\\b${escapedRole}\\b`, 'i');
        if (roleRegex.test(subject)) {
          score += 25;
        } else if (bodyText && roleRegex.test(bodyText)) {
          score += 15;
        }
      }

      return { app, score };
    });

    const ranked = scored
      .filter(item => item.score >= 40)
      .sort((a, b) => b.score - a.score);

    const bestMatch = (ranked.length > 0 && ranked[0].score >= 45) ? ranked[0].app : null;
    return { bestMatch, ranked: ranked.map(r => r.app) };
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

  companyDomainInput.addEventListener('input', () => {
    companyDomainInput.classList.remove('input-error');
    const rawVal = companyDomainInput.value.trim();
    let cleaned = rawVal;
    if (typeof JobBoardRegistry !== 'undefined' && JobBoardRegistry.cleanCompanyDomain) {
      cleaned = JobBoardRegistry.cleanCompanyDomain(rawVal) || rawVal.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    }
    currentDomain = cleaned;
    updateCompanyAvatar(companyInput.value, currentDomain);
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
      
      const isWebmailTab = isWebmail(tab.url);
      if (isWebmailTab) {
        initWebmailMode(tab);
      } else {
        chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_PAGE_DATA' }, (response) => {
          if (!chrome.runtime.lastError && response) {
            if (response.isWebmail) {
              initWebmailMode(tab);
              return;
            }
            companyInput.value = response.company || '';
            roleInput.value = response.role || '';
            companyDomainInput.value = response.companyDomain || response.domain || '';
            currentDomain = companyDomainInput.value;
            locationInput.value = response.location || '';
            setWorkLocation(response.workLocation || null);
            setEmploymentType(response.employmentType || null);

            // Hiring Contact detection (US4)
            if (response.contact && response.contact.name) {
              detectedRecruiterContact = response.contact;
              recruiterNameEl.textContent = response.contact.name;
              recruiterTitleEl.textContent = response.contact.role || '';
              recruiterBadgeEl.textContent = response.contact.category || 'Recruiter';
              addRecruiterContactCheckbox.checked = true;
              recruiterContactCard.style.display = 'block';
            } else {
              detectedRecruiterContact = null;
              recruiterContactCard.style.display = 'none';
            }

            // Stage selection (US5)
            if (response.suggestedStage) {
              updateStageUI(response.suggestedStage);
            } else {
              updateStageUI('Saved');
            }

            setPlatform(response.platform || 'Company Site');
            notesInput.value = response.notes || '';

            updateCompanyAvatar(response.company, currentDomain);
            checkForDuplicates(tab.url);
          } else {
            const pageTitle = tab.title || '';
            roleInput.value = pageTitle;
            companyInput.value = getDomainFallback(tab.url);
            const dom = getDomain(tab.url);
            const registry = typeof JobBoardRegistry !== 'undefined' ? JobBoardRegistry : null;
            const cleanedDom = (registry && registry.cleanCompanyDomain) ? registry.cleanCompanyDomain(dom) : dom;
            currentDomain = cleanedDom || '';
            companyDomainInput.value = currentDomain;
            updateStageUI('Saved');
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
        mainFormView.style.display = 'block';
        alreadySavedView.style.display = 'none';

        if (duplicateBanner) {
          duplicateBanner.style.display = 'flex';
          duplicateBannerText.textContent = `Already tracked in Tracklet (${match.status || 'Saved'})`;
        }

        // Auto-fill empty fields from existing record
        if (!companyDomainInput.value && match.companyDomain) {
          companyDomainInput.value = match.companyDomain;
          currentDomain = match.companyDomain;
          updateCompanyAvatar(companyInput.value, currentDomain);
        }
        if (!locationInput.value && match.location) {
          locationInput.value = match.location;
        }
        if (!selectedWorkLocation && match.workLocation) {
          setWorkLocation(match.workLocation);
        }
        if (!selectedEmploymentType && match.employmentType) {
          setEmploymentType(match.employmentType);
        }

        // Stage UI logic for existing job (US5 / FR-012, FR-013, FR-014)
        if (match.status === 'Saved') {
          // Allow advancing Saved -> Applied
          stageReadonlyContainer.style.display = 'none';
          stageSelectorContainer.style.display = 'block';
          updateStageUI(selectedStage === 'Applied' ? 'Applied' : 'Saved');
        } else {
          // Progress preserved: read-only badge for later stages
          stageSelectorContainer.style.display = 'none';
          stageReadonlyContainer.style.display = 'flex';
          stageReadonlyText.textContent = match.status;
          const config = STAGE_CONFIG[match.status] || STAGE_CONFIG.Applied;
          stageReadonlyDot.style.backgroundColor = config.dot;
        }

        saveBtn.querySelector('span').textContent = 'Update Application';
      } else {
        matchedApplication = null;
        if (duplicateBanner) duplicateBanner.style.display = 'none';
        stageReadonlyContainer.style.display = 'none';
        stageSelectorContainer.style.display = 'block';
        saveBtn.querySelector('span').textContent = 'Save Application';
      }
    });
  }

  if (duplicateOpenLink) {
    duplicateOpenLink.addEventListener('click', (e) => {
      e.preventDefault();
      focusOrOpenWorkspace(matchedApplication?.id);
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

  // --- Webmail Mode Initialization & UI Controllers ---
  async function initWebmailMode(tab) {
    isWebmailMode = true;
    mainFormView.style.display = 'none';
    alreadySavedView.style.display = 'none';
    emailLogView.style.display = 'flex';

    // 1. Load known applications for matching
    const storage = await chrome.storage.local.get(['tracklet_apps_index', 'tracklet_guest_apps_v1']);
    const indexApps = storage.tracklet_apps_index || [];
    const guestApps = storage.tracklet_guest_apps_v1 || [];
    const appMap = new Map();
    [...indexApps, ...guestApps].forEach(a => {
      if (a && a.id && !appMap.has(a.id)) {
        appMap.set(a.id, a);
      }
    });
    allKnownAppsList = Array.from(appMap.values());

    // 2. Request active email data from content script
    let hasAttemptedInjection = false;

    function updateContactDiscoveryUI() {
      const isKnownContact = selectedEmailMatchedApp?.contactEmails?.includes((discoveredRecruiterEmail || '').toLowerCase());
      if (discoveredRecruiterName && !isKnownContact && discoveredRecruiterName !== 'You' && discoveredRecruiterName.length > 1) {
        if (milestoneBox) milestoneBox.style.display = 'block';
        addContactOption.style.display = 'flex';
        addContactLabel.textContent = `Add "${discoveredRecruiterName}" as recruiter contact`;
        addContactCheckbox.checked = true;
      } else {
        if (milestoneBox) milestoneBox.style.display = 'none';
        addContactOption.style.display = 'none';
        addContactCheckbox.checked = false;
      }
    }

    function applyExtractedEmailData(emailData) {
      rawExtractedEmailData = emailData;

      // Populate basic email inputs
      emailSubjectInput.value = emailData.subject || '';
      emailDateInput.value = emailData.date || today;
      if (emailTimeInput) {
        if (emailData.timestamp && emailData.timestamp.includes('T')) {
          const timePart = emailData.timestamp.split('T')[1].slice(0, 5);
          emailTimeInput.value = timePart;
        } else {
          emailTimeInput.value = '';
        }
      }
      emailBodyInput.value = emailData.body || emailData.snippet || '';
      currentEmailUrl = emailData.emailUrl || tab.url || '';
      currentEmailTimestamp = emailData.timestamp || null;

      if (headerModeChip && headerModeText) {
        headerModeChip.style.display = 'inline-flex';
        headerModeText.textContent = emailData.provider === 'gmail' ? 'Gmail' : 'Outlook';
      }

      // Direction
      setEmailDirection(emailData.direction || 'inbound');

      // Populate counterparty ensuring outbound never leaks user email
      if ((emailData.direction || 'inbound') === 'outbound') {
        const userEmails = [currentUserSession?.email, emailData.senderEmail].filter(Boolean).map(e => e.toLowerCase().trim());
        let safeParty = emailData.counterparty || emailData.recipientEmail || emailData.recipientName || '';
        if (userEmails.includes(safeParty.toLowerCase().trim())) {
          safeParty = emailData.recipientEmail || emailData.recipientName || '';
        }
        emailCounterpartyInput.value = safeParty;
      } else {
        emailCounterpartyInput.value = emailData.counterparty || '';
      }

      // Match to application
      const { bestMatch } = matchEmailToApplications(emailData, allKnownAppsList);
      if (bestMatch) {
        renderMatchedApp(bestMatch, true);
      } else {
        renderMatchedApp(null, false);
      }

      // Contact Discovery
      discoveredRecruiterName = emailData.counterpartyName || '';
      discoveredRecruiterEmail = emailData.counterpartyEmail || '';
      updateContactDiscoveryUI();
    }

    function requestEmailExtraction() {
      chrome.tabs.sendMessage(tab.id, { 
        action: 'EXTRACT_EMAIL_DATA', 
        userEmail: currentUserSession?.email 
      }, (emailData) => {
        if (chrome.runtime.lastError || !emailData) {
          // If script wasn't injected yet, attempt dynamic programmatic injection once
          if (!hasAttemptedInjection && chrome.scripting && tab.id) {
            hasAttemptedInjection = true;
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content.js']
            }, () => {
              if (chrome.runtime.lastError) {
                fallbackEmailData();
              } else {
                setTimeout(requestEmailExtraction, 150);
              }
            });
            return;
          }
          fallbackEmailData();
          return;
        }

        applyExtractedEmailData(emailData);
      });
    }

    function fallbackEmailData() {
      const fallback = {
        subject: tab.title || '',
        sender: '',
        date: today,
        direction: 'inbound',
        snippet: '',
        body: '',
        emailUrl: tab.url || ''
      };
      applyExtractedEmailData(fallback);
    }

    requestEmailExtraction();
  }

  function setEmailDirection(dir) {
    currentEmailDirection = dir;
    if (dir === 'outbound') {
      dirOutboundBtn.classList.add('active');
      dirInboundBtn.classList.remove('active');
      counterpartyLabelText.textContent = 'To (Recruiter / Contact)';

      // Auto-update counterparty input if it currently matches the user's email or sender
      if (rawExtractedEmailData) {
        const userEmails = [
          currentUserSession?.email,
          rawExtractedEmailData.senderEmail
        ].filter(Boolean).map(e => e.toLowerCase().trim());

        const currentVal = (emailCounterpartyInput.value || '').toLowerCase().trim();
        if (!currentVal || userEmails.includes(currentVal)) {
          emailCounterpartyInput.value = rawExtractedEmailData.recipientEmail || rawExtractedEmailData.recipientName || '';
        }
        discoveredRecruiterName = rawExtractedEmailData.recipientName || rawExtractedEmailData.counterpartyName || '';
        discoveredRecruiterEmail = rawExtractedEmailData.recipientEmail || rawExtractedEmailData.counterpartyEmail || '';
      }
    } else {
      dirInboundBtn.classList.add('active');
      dirOutboundBtn.classList.remove('active');
      counterpartyLabelText.textContent = 'From (Recruiter / Company)';

      if (rawExtractedEmailData) {
        const currentVal = (emailCounterpartyInput.value || '').toLowerCase().trim();
        if (!currentVal || currentVal === (rawExtractedEmailData.recipientEmail || '').toLowerCase().trim()) {
          emailCounterpartyInput.value = rawExtractedEmailData.senderEmail || rawExtractedEmailData.senderName || '';
        }
        discoveredRecruiterName = rawExtractedEmailData.senderName || '';
        discoveredRecruiterEmail = rawExtractedEmailData.senderEmail || '';
      }
    }
    updateContactDiscoveryUI();
  }

  function renderMatchedApp(app) {
    selectedEmailMatchedApp = app;
    const matchedAppCard = document.getElementById('matched-app-card');

    if (app) {
      if (changeAppBtn) {
        changeAppBtn.innerHTML = '<span>Switch Job</span> <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>';
      }
      if (matchedAppCard) {
        matchedAppCard.classList.remove('unmatched-warning');
        matchedAppCard.classList.remove('input-error');
      }
      emailMatchedCompany.textContent = app.company;
      emailMatchedRole.textContent = app.role;
      emailMatchedStagePill.style.display = 'inline-flex';

      const config = STAGE_CONFIG[app.status] || STAGE_CONFIG['Applied'];
      emailMatchedStageText.textContent = config.label;
      emailMatchedStageDot.style.backgroundColor = config.dot;
      emailMatchedStagePill.style.backgroundColor = config.bg;
      emailMatchedStagePill.style.color = config.text;
      emailMatchedStagePill.style.borderColor = config.border;

      updateCompanyAvatar(app.company, app.companyDomain, emailMatchedAvatar);
    } else {
      if (changeAppBtn) {
        changeAppBtn.innerHTML = '<span>Choose Job</span> <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>';
      }
      if (matchedAppCard) {
        matchedAppCard.classList.add('unmatched-warning');
      }
      emailMatchedCompany.textContent = 'Select Target Application';
      emailMatchedRole.textContent = 'Choose which application to log this email to';
      emailMatchedStagePill.style.display = 'none';
      if (emailMatchedAvatar) {
        emailMatchedAvatar.textContent = '?';
        emailMatchedAvatar.style.backgroundColor = '#f1f5f9';
        emailMatchedAvatar.style.color = '#64748b';
        emailMatchedAvatar.style.borderColor = '#cbd5e1';
      }
    }
    updateContactDiscoveryUI();
  }

  let highlightedAppIndex = -1;

  function renderAppSelectorList(filter = '') {
    const cleanFilter = filter.toLowerCase().trim();
    appSelectorList.innerHTML = '';
    highlightedAppIndex = -1;

    const filtered = allKnownAppsList.filter(a => 
      !cleanFilter || 
      a.company.toLowerCase().includes(cleanFilter) || 
      a.role.toLowerCase().includes(cleanFilter) ||
      (a.companyDomain && a.companyDomain.toLowerCase().includes(cleanFilter)) ||
      (a.contactEmail && a.contactEmail.toLowerCase().includes(cleanFilter)) ||
      (a.contactEmails && a.contactEmails.some(e => e.toLowerCase().includes(cleanFilter)))
    );

    if (filtered.length === 0) {
      appSelectorList.innerHTML = '<div style="padding: 10px; text-align: center; color: var(--neutral-muted); font-size: 11px;">No applications found</div>';
      return;
    }

    filtered.forEach((app, idx) => {
      const item = document.createElement('div');
      item.className = 'app-selector-item' + (selectedEmailMatchedApp?.id === app.id ? ' selected' : '');
      item.setAttribute('data-app-id', app.id);
      
      const textContainer = document.createElement('div');
      textContainer.className = 'app-selector-item-text';

      const companySpan = document.createElement('span');
      companySpan.className = 'app-selector-item-company';
      companySpan.textContent = app.company;

      const roleSpan = document.createElement('span');
      roleSpan.className = 'app-selector-item-role';
      roleSpan.textContent = app.role;

      textContainer.appendChild(companySpan);
      textContainer.appendChild(roleSpan);

      const config = STAGE_CONFIG[app.status] || STAGE_CONFIG['Applied'];
      const stageDot = document.createElement('span');
      stageDot.className = 'stage-dot';
      stageDot.style.backgroundColor = config.dot;
      stageDot.style.width = '8px';
      stageDot.style.height = '8px';
      stageDot.style.borderRadius = '50%';

      item.appendChild(textContainer);
      item.appendChild(stageDot);

      item.addEventListener('click', () => {
        renderMatchedApp(app, false);
        appSelectorPopover.style.display = 'none';
      });

      appSelectorList.appendChild(item);
    });
  }

  function updateHighlightedItem(items) {
    items.forEach((item, idx) => {
      if (idx === highlightedAppIndex) {
        item.classList.add('highlighted');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('highlighted');
      }
    });
  }

  // Email Log Event Listeners
  dirInboundBtn.addEventListener('click', () => setEmailDirection('inbound'));
  dirOutboundBtn.addEventListener('click', () => setEmailDirection('outbound'));

  changeAppBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = appSelectorPopover.style.display !== 'none';
    if (!isVisible) {
      renderAppSelectorList();
      appSelectorPopover.style.display = 'flex';
      appSearchInput.value = '';
      appSearchInput.focus();
    } else {
      appSelectorPopover.style.display = 'none';
    }
  });

  if (appSelectorPopover) {
    appSelectorPopover.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  appSearchInput.addEventListener('keydown', (e) => {
    const items = appSelectorList.querySelectorAll('.app-selector-item');
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlightedAppIndex = (highlightedAppIndex + 1) % items.length;
      updateHighlightedItem(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightedAppIndex = (highlightedAppIndex - 1 + items.length) % items.length;
      updateHighlightedItem(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const targetIndex = highlightedAppIndex >= 0 ? highlightedAppIndex : 0;
      if (items[targetIndex]) {
        items[targetIndex].click();
      }
    }
  });

  appSearchInput.addEventListener('input', () => {
    renderAppSelectorList(appSearchInput.value);
  });

  appSelectorNewBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    appSelectorPopover.style.display = 'none';
    emailLogView.style.display = 'none';
    mainFormView.style.display = 'block';
    if (rawExtractedEmailData) {
      const guessedCompany = extractCompanyFromAts(
        rawExtractedEmailData.senderName,
        rawExtractedEmailData.senderEmail,
        rawExtractedEmailData.subject
      ) || rawExtractedEmailData.counterpartyName || '';
      companyInput.value = guessedCompany;
      
      const cleanSubject = (rawExtractedEmailData.subject || '').replace(/^(?:re|fwd?|invitation):\s*/gi, '');
      roleInput.value = cleanSubject;
      
      selectedStage = 'Interview';
      updateStagePill('Interview');

      notesInput.value = rawExtractedEmailData.snippet ? `Logged from email:\n"${rawExtractedEmailData.snippet}"` : '';
      if (rawExtractedEmailData.emailUrl) {
        jobLinkInput.value = rawExtractedEmailData.emailUrl;
      }
    }
    companyInput.focus();
    validateInputs();
  });

  switchToJobClipperBtn.addEventListener('click', () => {
    emailLogView.style.display = 'none';
    mainFormView.style.display = 'block';
    if (rawExtractedEmailData) {
      if (!companyInput.value) {
        companyInput.value = rawExtractedEmailData.counterpartyName || '';
      }
      if (!notesInput.value) {
        notesInput.value = rawExtractedEmailData.snippet || '';
      }
    }
    validateInputs();
  });

  logEmailBtn.addEventListener('click', handleLogEmail);

  let isLoggingEmail = false;

  async function handleLogEmail() {
    if (isLoggingEmail) return;

    if (!selectedEmailMatchedApp) {
      const matchedAppCard = document.getElementById('matched-app-card');
      if (matchedAppCard) {
        matchedAppCard.classList.add('input-error');
        setTimeout(() => matchedAppCard.classList.remove('input-error'), 1500);
      }
      renderAppSelectorList();
      appSelectorPopover.style.display = 'flex';
      appSearchInput.value = '';
      appSearchInput.focus();
      return;
    }

    const subject = emailSubjectInput.value.trim();
    const counterparty = emailCounterpartyInput.value.trim();
    if (!subject) {
      emailSubjectInput.classList.add('input-error');
      emailSubjectInput.focus();
      return;
    }
    if (!counterparty) {
      emailCounterpartyInput.classList.add('input-error');
      emailCounterpartyInput.focus();
      return;
    }

    isLoggingEmail = true;
    logEmailBtn.disabled = true;
    logEmailBtn.querySelector('span').textContent = 'Logging email...';

    const isOutbound = currentEmailDirection === 'outbound';
    const emailLogPayload = {
      id: `email-${Date.now()}`,
      subject,
      sender: isOutbound ? (currentUserSession?.email || rawExtractedEmailData?.senderEmail || 'You') : counterparty,
      recipient: isOutbound ? counterparty : (currentUserSession?.email || rawExtractedEmailData?.recipientEmail || undefined),
      date: emailDateInput.value || today,
      // Derive full timestamp from emailDateInput and emailTimeInput with local UTC offset
      timestamp: (() => {
        const activeDate = emailDateInput.value || today;
        const activeTime = emailTimeInput?.value ? `${emailTimeInput.value}:00` : '00:00:00';

        // Preserve extracted timestamp if its date and time remain unchanged
        if (currentEmailTimestamp && currentEmailTimestamp.startsWith(`${activeDate}T${activeTime.slice(0, 5)}`)) {
          return currentEmailTimestamp;
        }

        const localTarget = new Date(`${activeDate}T${activeTime}`);
        const targetDate = isNaN(localTarget.getTime()) ? new Date() : localTarget;
        const offsetMin = -targetDate.getTimezoneOffset();
        const sign = offsetMin >= 0 ? '+' : '-';
        const absMin = Math.abs(offsetMin);
        const offH = String(Math.floor(absMin / 60)).padStart(2, '0');
        const offM = String(absMin % 60).padStart(2, '0');
        const offset = `${sign}${offH}:${offM}`;
        return `${activeDate}T${activeTime}${offset}`;
      })(),
      direction: currentEmailDirection,
      snippet: emailBodyInput.value.trim().slice(0, 200),
      body: emailBodyInput.value.trim(),
      emailUrl: currentEmailUrl || '',
    };
    const newContact = (addContactCheckbox.checked && discoveredRecruiterName)
      ? {
          name: discoveredRecruiterName,
          email: discoveredRecruiterEmail,
          organization: selectedEmailMatchedApp.company,
          category: 'Recruiter'
        }
      : undefined;

    chrome.runtime.sendMessage({
      action: 'SAVE_EMAIL_LOG',
      payload: {
        appId: selectedEmailMatchedApp.id,
        emailLog: emailLogPayload,
        newContact
      }
    }, (response) => {
      const lastErr = chrome.runtime.lastError;
      if (lastErr || (response && response.success === false)) {
        isLoggingEmail = false;
        logEmailBtn.disabled = false;
        logEmailBtn.querySelector('span').textContent = 'Log Email to Tracklet';
        emailMatchedCompany.classList.add('input-error');
        setTimeout(() => emailMatchedCompany.classList.remove('input-error'), 1500);
        return;
      }

      isLoggingEmail = false;
      // Show success view
      successTitle.textContent = 'Email Logged!';
      successSubtitle.textContent = `"${subject}" logged to ${selectedEmailMatchedApp.company} timeline.`;

      mainContainer.style.display = 'none';
      successView.classList.add('visible');

      scheduleAutoClose(3200);
    });
  }

  // Global Keyboard Shortcuts (Escape to dismiss dropdowns, Enter to submit)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      platformSelectContainer.classList.remove('open');
      stageSelectorContainer.classList.remove('open');
      if (appSelectorPopover) appSelectorPopover.style.display = 'none';
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      if (isWebmailMode && emailLogView.style.display !== 'none') {
        handleLogEmail();
        return;
      }
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
   * Direct write to Firebase Firestore via REST API (supports create and update)
   */
  async function pushToFirestoreDirectly(payload, userSession, config, docIdToUpdate = null) {
    const projectId = config?.projectId || 'demo-tracklet';
    const apiKey = config?.apiKey;
    const userId = userSession.uid;
    const idToken = userSession.idToken;

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
      company: { stringValue: payload.company || '' },
      role: { stringValue: payload.role || '' },
      platform: { stringValue: payload.platform || 'Other' },
      status: { stringValue: payload.status || 'Saved' },
      dateApplied: { stringValue: payload.dateApplied || new Date().toISOString().slice(0, 10) },
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

    if (payload.jobLink !== undefined && payload.jobLink !== null) fields.jobLink = { stringValue: payload.jobLink };
    if (payload.notes !== undefined && payload.notes !== null) fields.notes = { stringValue: payload.notes };
    if (payload.companyDomain !== undefined && payload.companyDomain !== null) fields.companyDomain = { stringValue: payload.companyDomain };
    if (payload.location !== undefined && payload.location !== null) fields.location = { stringValue: payload.location };
    if (payload.workLocation !== undefined && payload.workLocation !== null) fields.workLocation = { stringValue: payload.workLocation };
    if (payload.employmentType !== undefined && payload.employmentType !== null) fields.employmentType = { stringValue: payload.employmentType };

    let url = docIdToUpdate
      ? `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}/applications/${docIdToUpdate}`
      : `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}/applications`;

    const queryParams = [];
    if (apiKey && apiKey !== 'demo-api-key') {
      queryParams.push(`key=${encodeURIComponent(apiKey)}`);
    }
    if (docIdToUpdate) {
      Object.keys(fields).forEach(f => {
        if (f !== 'userId' && f !== 'createdAt') {
          queryParams.push(`updateMask.fieldPaths=${f}`);
        }
      });
    }
    if (queryParams.length > 0) {
      url += `?${queryParams.join('&')}`;
    }

    const headers = { 'Content-Type': 'application/json' };
    if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

    const method = docIdToUpdate ? 'PATCH' : 'POST';
    const response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify({ fields })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Firestore REST HTTP ${response.status}: ${errText}`);
    }

    const resData = await response.json();
    const docId = docIdToUpdate || (resData.name ? resData.name.split('/').pop() : `cloud-${Date.now()}`);
    return {
      ...payload,
      id: docId,
      userId
    };
  }

  /**
   * Persist recruiter contact directly to Firestore /users/{userId}/contacts
   */
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
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ fields })
      });
      if (res.ok) {
        const data = await res.json();
        return data.name ? data.name.split('/').pop() : null;
      }
    } catch (e) {
      console.warn('Direct Firestore contact push failed:', e);
    }
    return null;
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

    // Sanitize domain: never store a job board or ATS domain (US1 / FR-001)
    const rawDom = (companyDomainInput.value || currentDomain || '').trim();
    const registry = typeof JobBoardRegistry !== 'undefined' ? JobBoardRegistry : null;
    let cleanDom = registry && registry.cleanCompanyDomain ? registry.cleanCompanyDomain(rawDom) : rawDom.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    if (registry && registry.isJobBoardOrAts && registry.isJobBoardOrAts(cleanDom)) {
      cleanDom = '';
    }

    const nowISO = new Date().toISOString();

    // Stage & History Resolution (US5 / FR-012, FR-013, FR-014)
    let resolvedStatus = selectedStage;
    let resolvedStageUpdatedAt = nowISO;
    let resolvedHistory = [];

    if (matchedApplication) {
      if (matchedApplication.status === 'Saved' && selectedStage === 'Applied') {
        // Legitimate user promotion Saved -> Applied
        resolvedStatus = 'Applied';
        resolvedStageUpdatedAt = nowISO;
        const newEntry = {
          id: `hist-${Date.now()}`,
          toStatus: 'Applied',
          fromStatus: 'Saved',
          timestamp: nowISO,
          note: 'Stage updated via Tracklet Extension'
        };
        resolvedHistory = [...(matchedApplication.history || []), newEntry];
      } else {
        // Preserve existing status and history without downgrade or overwrite
        resolvedStatus = matchedApplication.status || selectedStage;
        resolvedStageUpdatedAt = matchedApplication.stageUpdatedAt || nowISO;
        resolvedHistory = (matchedApplication.history && matchedApplication.history.length > 0)
          ? matchedApplication.history
          : [{ id: `hist-${Date.now()}`, toStatus: resolvedStatus, timestamp: resolvedStageUpdatedAt }];
      }
    } else {
      resolvedStatus = selectedStage;
      resolvedStageUpdatedAt = nowISO;
      resolvedHistory = [{ id: `hist-${Date.now()}`, toStatus: selectedStage, timestamp: nowISO }];
    }

    const basePayload = {
      ...(matchedApplication || {}),
      company,
      role,
      platform: finalPlatform,
      dateApplied: dateAppliedInput.value || (matchedApplication?.dateApplied) || today,
      status: resolvedStatus,
      jobLink: jobLinkInput.value,
      notes: notesInput.value.trim(),
      companyDomain: cleanDom || undefined,
      location: locationInput.value.trim() || undefined,
      workLocation: selectedWorkLocation || undefined,
      employmentType: selectedEmploymentType || undefined,
      stageUpdatedAt: resolvedStageUpdatedAt,
      history: resolvedHistory,
      updatedAt: nowISO
    };

    if (!matchedApplication) {
      basePayload.createdAt = nowISO;
    }

    // Attach Recruiter Contact if checked (US4)
    if (detectedRecruiterContact && addRecruiterContactCheckbox && addRecruiterContactCheckbox.checked) {
      basePayload.newContact = {
        name: detectedRecruiterContact.name,
        role: detectedRecruiterContact.role || 'Recruiter',
        organization: company,
        linkedIn: detectedRecruiterContact.linkedIn || '',
        category: detectedRecruiterContact.category || 'Recruiter'
      };
    }

    let finalizedApp = null;
    let savedToCloud = false;

    // 1. Direct Cloud Persist if user session is available
    if (currentUserSession && currentUserSession.uid) {
      try {
        finalizedApp = await pushToFirestoreDirectly(basePayload, currentUserSession, currentFirebaseConfig, matchedApplication?.id);
        savedToCloud = true;

        if (basePayload.newContact) {
          await pushContactToFirestoreDirectly(basePayload.newContact, finalizedApp.id, currentUserSession, currentFirebaseConfig);
        }
      } catch (cloudErr) {
        console.warn('Direct Firestore push failed (offline or auth expired), falling back to local storage:', cloudErr);
      }
    }

    // 2. Local fallback if guest or cloud write unavailable
    if (!finalizedApp) {
      finalizedApp = {
        ...basePayload,
        id: matchedApplication?.id || `ext-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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

      if (matchedApplication?.id) {
        guestApps = guestApps.map(a => a.id === matchedApplication.id ? finalizedApp : a);
        appsIndex = appsIndex.map(a => a.id === matchedApplication.id ? finalizedApp : a);
        pending = pending.map(a => a.id === matchedApplication.id ? finalizedApp : a);
      } else {
        guestApps = [finalizedApp, ...guestApps];
        appsIndex = [finalizedApp, ...appsIndex];
        if (!savedToCloud) {
          pending = [finalizedApp, ...pending];
        }
      }

      chrome.storage.local.set({
        tracklet_pending_apps: pending,
        tracklet_guest_apps_v1: guestApps,
        tracklet_apps_index: appsIndex
      }, () => {
        // Flash Extension Icon Badge
        chrome.runtime.sendMessage({ action: 'FLASH_SUCCESS' });

        // Show Success Overlay
        successTitle.textContent = matchedApplication
          ? (savedToCloud ? 'Cloud Updated!' : 'Application Updated!')
          : (savedToCloud ? 'Saved to Cloud!' : 'Application Saved!');
        successSubtitle.textContent = matchedApplication
          ? `Updated "${role}" at ${company}.`
          : `${company} — ${role} logged to Tracklet.`;

        mainContainer.style.display = 'none';
        successView.classList.add('visible');

        // Auto-close popup with 2.8s duration
        scheduleAutoClose(2800);
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
    let resolvedBaseUrl = TRACKLET_APP_URL;

    try {
      // 1. Check if user has an active origin saved in storage
      const storageResult = await chrome.storage.local.get(['tracklet_web_origin']);
      if (storageResult && storageResult.tracklet_web_origin) {
        const storedOrigin = String(storageResult.tracklet_web_origin).trim();
        // Ignore localhost origins so the user is always directed to the real web app
        if (!storedOrigin.includes('localhost') && !storedOrigin.includes('127.0.0.1')) {
          resolvedBaseUrl = storedOrigin;
        }
      }

      // 2. Search for any existing open Tracklet tab (prefer production/remote domains)
      const tabs = await chrome.tabs.query({});
      const trackletTab = tabs.find(t => t.url && (
        t.url.includes('tracklet-eight.vercel.app') ||
        t.url.includes('tracklet.app') ||
        t.url.includes('.web.app') ||
        t.url.includes('.firebaseapp.com') ||
        t.url.includes('.vercel.app')
      ));

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

    const cleanBase = resolvedBaseUrl.replace(/\/+$/, '');
    const targetUrl = appId
      ? `${cleanBase}/?appId=${encodeURIComponent(appId)}`
      : cleanBase;

    chrome.tabs.create({ url: targetUrl });
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
  updateStageUI('Saved');
  setPlatform('Company Site');
});
