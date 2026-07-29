/**
 * Tracklet Popup Controller
 * Manages form state, live page extraction, custom stage & platform dropdowns, and cross-tab broadcasts.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const companyInput = document.getElementById('company');
  const roleInput = document.getElementById('role');
  const dateAppliedInput = document.getElementById('dateApplied');
  const jobLinkInput = document.getElementById('jobLink');
  const notesInput = document.getElementById('notes');
  const saveBtn = document.getElementById('save-btn');
  const platformPill = document.getElementById('platform-pill');
  const companyAvatar = document.getElementById('company-avatar');
  const duplicateBanner = document.getElementById('duplicate-banner');
  const mainContainer = document.getElementById('main-container');
  const successView = document.getElementById('success-view');
  const successTitle = document.getElementById('success-title');
  const successSubtitle = document.getElementById('success-subtitle');
  const openTrackletLink = document.getElementById('open-tracklet-link');

  // Custom Platform Dropdown Elements
  const platformSelectContainer = document.getElementById('platform-select-container');
  const platformTrigger = document.getElementById('platform-trigger');
  const platformValueText = document.getElementById('platform-value-text');
  const platformDropdown = document.getElementById('platform-dropdown');
  const platformOptions = document.querySelectorAll('#platform-dropdown .custom-select-option');

  // Custom Stage Dropdown Elements
  const stageSelectorContainer = document.getElementById('stage-selector-container');
  const stageTriggerBtn = document.getElementById('stage-trigger-btn');
  const stageLabelText = document.getElementById('stage-label-text');
  const stageDot = document.getElementById('stage-dot');
  const stageOptionItems = document.querySelectorAll('.stage-option-item');

  let selectedPlatform = 'Company Site';
  let selectedStage = 'Applied';
  let currentDomain = '';
  let existingAppId = null;

  // STAGE CONFIG Matching StageSelectorDropdown.tsx
  const STAGE_CONFIG = {
    Wishlist: { bg: 'var(--stage-wishlist-bg)', text: 'var(--stage-wishlist-text)', border: 'var(--stage-wishlist-border)', dot: 'var(--stage-wishlist-dot)' },
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

  // Custom Platform Dropdown Handlers
  platformTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    stageSelectorContainer.classList.remove('open');
    platformSelectContainer.classList.toggle('open');
  });

  platformOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      platformOptions.forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
      
      selectedPlatform = option.getAttribute('data-value');
      platformValueText.textContent = selectedPlatform;
      platformPill.textContent = selectedPlatform;
      platformSelectContainer.classList.remove('open');
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
      const stage = item.getAttribute('data-stage');
      updateStageUI(stage);
      stageSelectorContainer.classList.remove('open');
    });
  });

  function updateStageUI(stage) {
    selectedStage = stage;
    const config = STAGE_CONFIG[stage] || STAGE_CONFIG['Applied'];
    
    stageLabelText.textContent = stage;
    stageDot.style.backgroundColor = config.dot;
    stageTriggerBtn.style.backgroundColor = config.bg;
    stageTriggerBtn.style.color = config.text;
    stageTriggerBtn.style.borderColor = config.border;

    stageOptionItems.forEach(item => {
      if (item.getAttribute('data-stage') === stage) {
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
          
          selectedPlatform = response.platform || 'Company Site';
          platformValueText.textContent = selectedPlatform;
          platformPill.textContent = selectedPlatform;

          platformOptions.forEach(opt => {
            if (opt.getAttribute('data-value') === selectedPlatform) opt.classList.add('selected');
            else opt.classList.remove('selected');
          });

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

  async function handleSave() {
    const company = companyInput.value.trim();
    const role = roleInput.value.trim();
    if (!company || !role) return;

    saveBtn.disabled = true;
    saveBtn.querySelector('span').textContent = 'Saving...';

    const nowISO = new Date().toISOString();
    const applicationPayload = {
      id: existingAppId || `ext-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: 'guest',
      company,
      role,
      platform: selectedPlatform,
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

    // 1. Broadcast event via BroadcastChannel for real-time tab sync
    try {
      const bc = new BroadcastChannel('tracklet_extension_channel');
      bc.postMessage({
        type: 'TRACKLET_EXT_ADD_APPLICATION',
        payload: applicationPayload
      });
      bc.close();
    } catch (e) {
      console.warn('BroadcastChannel unavailable:', e);
    }

    // 2. Persist in chrome.storage.local
    chrome.storage.local.get(['tracklet_pending_apps', 'tracklet_guest_apps_v1'], (result) => {
      let pending = result.tracklet_pending_apps || [];
      let guestApps = result.tracklet_guest_apps_v1 || [];

      if (existingAppId) {
        guestApps = guestApps.map(app => app.id === existingAppId ? applicationPayload : app);
      } else {
        guestApps = [applicationPayload, ...guestApps];
        pending = [applicationPayload, ...pending];
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
          successTitle.textContent = 'Application Saved!';
          successSubtitle.textContent = `${company} — ${role} added to Tracklet.`;
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

  // Initialize Stage UI
  updateStageUI('Applied');
});
