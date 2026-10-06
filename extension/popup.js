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
  const recruiterAvatarBox = document.getElementById('recruiter-avatar-box');
  const recruiterAvatarImg = document.getElementById('recruiter-avatar-img');
  const recruiterAvatarInitials = document.getElementById('recruiter-avatar-initials');
  const recruiterExistingBadge = document.getElementById('recruiter-existing-badge');
  const recruiterViewDetailsBtn = document.getElementById('recruiter-view-details-btn');

  // Tailored CV / Resume Elements (US5 / T031, T032)
  const cvUploadGroup = document.getElementById('cv-upload-group');
  const cvDropzone = document.getElementById('cv-dropzone');
  const cvFileInput = document.getElementById('cv-file-input');
  const cvBrowseBtn = document.getElementById('cv-browse-btn');
  const cvEmptyState = document.getElementById('cv-empty-state');
  const cvAttachmentChip = document.getElementById('cv-attachment-chip');
  const cvChipBadge = document.getElementById('cv-chip-badge');
  const cvChipName = document.getElementById('cv-chip-name');
  const cvChipSize = document.getElementById('cv-chip-size');
  const cvDownloadBtn = document.getElementById('cv-download-btn');
  const cvRemoveBtn = document.getElementById('cv-remove-btn');
  const cvErrorAlert = document.getElementById('cv-error-alert');
  const cvErrorText = document.getElementById('cv-error-text');

  let pendingResumeFile = null;
  let activeResumeMetadata = null;

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
  const multiMatchCountBadge = document.getElementById('multi-match-count-badge');
  const milestoneBox = document.getElementById('milestone-box');
  const advanceStageOption = document.getElementById('advance-stage-option');
  const advanceStageCheckbox = document.getElementById('advance-stage-checkbox');
  const advanceStageLabel = document.getElementById('advance-stage-label');
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
  let suggestedAdvanceStage = null;

  // Persistent Companion Tabs & Sticky Action Bar Elements
  const companionTabs = document.querySelectorAll('.companion-tab');
  const contactClipView = document.getElementById('contact-clip-view');
  const autofillView = document.getElementById('autofill-view');
  const stickyActionBar = document.getElementById('sticky-action-bar');
  const stickyEmailActionBar = document.getElementById('sticky-email-action-bar');
  const stickyContactActionBar = document.getElementById('sticky-contact-action-bar');
  const stickyStageDot = document.getElementById('sticky-stage-dot');
  const stickyStageLabel = document.getElementById('sticky-stage-label');

  // Contact Clipper Elements (US2)
  const contactStatusBanner = document.getElementById('contact-status-banner');
  const contactStatusText = document.getElementById('contact-status-text');
  const contactOpenLink = document.getElementById('contact-open-link');
  const contactAvatarBox = document.getElementById('contact-avatar-box');
  const contactAvatarImg = document.getElementById('contact-avatar-img');
  const contactAvatarSvg = document.getElementById('contact-avatar-svg');
  const contactNameInput = document.getElementById('contact-name');
  const contactRoleInput = document.getElementById('contact-role');
  const contactOrgInput = document.getElementById('contact-organization');
  const contactLocationInput = document.getElementById('contact-location');
  const contactLinkedInInput = document.getElementById('contact-linkedin');
  const contactCategoryIndicator = document.getElementById('contact-category-indicator');
  const categoryPills = document.querySelectorAll('#category-pills-grid .category-pill');
  const contactAppSelectContainer = document.getElementById('contact-app-select-container');
  const contactAppTrigger = document.getElementById('contact-app-trigger');
  const contactAppValueText = document.getElementById('contact-app-value-text');
  const contactAppDropdown = document.getElementById('contact-app-dropdown');
  const contactNotesInput = document.getElementById('contact-notes');
  const saveContactBtn = document.getElementById('save-contact-btn');
  const contactOpenWorkspaceBtn = document.getElementById('contact-open-workspace-btn');

  let selectedContactCategory = 'Recruiter';
  let selectedContactAppId = '';
  let matchedExistingContact = null;
  let allKnownContactsList = [];
  let rawExtractedProfileData = null;

  // Autofill Hub Elements & State (US6 / T036, T039)
  const autofillStatusPill = document.getElementById('autofill-status-pill');
  const autofillStatusDot = document.getElementById('autofill-status-dot');
  const autofillStatusText = document.getElementById('autofill-status-text');
  const autofillTriggerBtn = document.getElementById('autofill-trigger-btn');
  const profileQuickEditToggle = document.getElementById('profile-quick-edit-toggle');
  const profileEditToggleLabel = document.getElementById('profile-edit-toggle-label');
  const profileSummaryView = document.getElementById('profile-summary-view');
  const profileEditDrawer = document.getElementById('profile-edit-drawer');
  const profileAvatarInitials = document.getElementById('profile-avatar-initials');
  const profileSummaryName = document.getElementById('profile-summary-name');
  const profileSummaryTitle = document.getElementById('profile-summary-title');
  const profileSummaryEmail = document.getElementById('profile-summary-email');
  const profileSummaryPhone = document.getElementById('profile-summary-phone');
  const profileSummaryLocation = document.getElementById('profile-summary-location');
  const profileSummaryWorkAuth = document.getElementById('profile-summary-work-auth');
  const chipLinkedIn = document.getElementById('chip-linkedin');
  const chipGitHub = document.getElementById('chip-github');
  const chipPortfolio = document.getElementById('chip-portfolio');
  const profileOpenSettingsLink = document.getElementById('profile-open-settings-link');
  const profileEditName = document.getElementById('profile-edit-name');
  const profileEditEmail = document.getElementById('profile-edit-email');
  const profileEditPhone = document.getElementById('profile-edit-phone');
  const profileEditLocation = document.getElementById('profile-edit-location');
  const profileEditWorkAuth = document.getElementById('profile-edit-work-auth');
  const profileEditLinkedIn = document.getElementById('profile-edit-linkedin');
  const profileEditGitHub = document.getElementById('profile-edit-github');
  const profileEditPortfolio = document.getElementById('profile-edit-portfolio');
  const profileCancelBtn = document.getElementById('profile-cancel-btn');
  const profileSaveBtn = document.getElementById('profile-save-btn');
  const autofillChecklistCard = document.getElementById('autofill-checklist-card');
  const checklistCountBadge = document.getElementById('checklist-count-badge');
  const checklistItemsContainer = document.getElementById('checklist-items-container');
  const manualAlertsContainer = document.getElementById('manual-alerts-container');
  const manualAlertsList = document.getElementById('manual-alerts-list');

  let candidateProfile = null;
  let isProfileEditOpen = false;
  let currentAtsDetection = null;

  let currentActiveTab = 'job';
  let activeObservedTabId = null;
  let activeObservedUrl = '';

  // --- Tailored CV Utilities & Dropzone Handlers (US5 / T031, T032) ---
  function getResumeStorage() {
    return typeof TrackletResumeStorage !== 'undefined' ? TrackletResumeStorage : null;
  }

  function formatCvSize(bytes) {
    const storage = getResumeStorage();
    if (storage && storage.formatResumeFileSize) {
      return storage.formatResumeFileSize(bytes);
    }
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace(/\.0$/, '')} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`;
  }

  function displayResumeChip(meta, fileObj = null) {
    if (!meta || !meta.fileName) return;
    if (cvChipName) cvChipName.textContent = meta.fileName;
    if (cvChipSize) cvChipSize.textContent = formatCvSize(meta.fileSize);

    const extMatch = (meta.fileName || '').toLowerCase().match(/\.([a-z0-9]+)$/);
    const ext = extMatch ? extMatch[1].toUpperCase() : 'PDF';
    if (cvChipBadge) cvChipBadge.textContent = ext;

    if (cvEmptyState) cvEmptyState.style.display = 'none';
    if (cvAttachmentChip) cvAttachmentChip.style.display = 'flex';
    if (cvErrorAlert) cvErrorAlert.style.display = 'none';
  }

  function clearResumeChip() {
    pendingResumeFile = null;
    activeResumeMetadata = null;
    if (cvFileInput) cvFileInput.value = '';
    if (cvAttachmentChip) cvAttachmentChip.style.display = 'none';
    if (cvEmptyState) cvEmptyState.style.display = 'flex';
    if (cvErrorAlert) cvErrorAlert.style.display = 'none';
  }

  function handleResumeFileSelection(file) {
    if (!file) return;
    const storage = getResumeStorage();
    const validation = storage && storage.validateResumeFile
      ? storage.validateResumeFile(file)
      : { valid: true, sanitizedName: file.name, formattedSize: formatCvSize(file.size) };

    if (!validation.valid) {
      if (cvErrorAlert && cvErrorText) {
        cvErrorText.textContent = validation.error || 'Invalid file format or size.';
        cvErrorAlert.style.display = 'flex';
      }
      return;
    }

    if (cvErrorAlert) cvErrorAlert.style.display = 'none';
    pendingResumeFile = file;
    activeResumeMetadata = {
      fileName: validation.sanitizedName || file.name,
      fileSize: file.size,
      uploadedAt: new Date().toISOString()
    };
    displayResumeChip(activeResumeMetadata, file);
  }

  // Wire up CV Dropzone and attachment events
  if (cvBrowseBtn) {
    cvBrowseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (cvFileInput) cvFileInput.click();
    });
  }

  if (cvDropzone) {
    cvDropzone.addEventListener('click', (e) => {
      if (!pendingResumeFile && !activeResumeMetadata && e.target.closest('#cv-empty-state, #cv-dropzone')) {
        if (cvFileInput) cvFileInput.click();
      }
    });

    cvDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      cvDropzone.classList.add('drag-over');
    });

    cvDropzone.addEventListener('dragleave', () => {
      cvDropzone.classList.remove('drag-over');
    });

    cvDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      cvDropzone.classList.remove('drag-over');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleResumeFileSelection(e.dataTransfer.files[0]);
      }
    });
  }

  if (cvFileInput) {
    cvFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleResumeFileSelection(e.target.files[0]);
      }
    });
  }

  if (cvRemoveBtn) {
    cvRemoveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clearResumeChip();
    });
  }

  if (cvDownloadBtn) {
    cvDownloadBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (pendingResumeFile) {
        const url = URL.createObjectURL(pendingResumeFile);
        const a = document.createElement('a');
        a.href = url;
        a.download = activeResumeMetadata?.fileName || 'resume.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return;
      }

      if (activeResumeMetadata && activeResumeMetadata.blobId) {
        const storage = getResumeStorage();
        if (storage && storage.getResumeBlob) {
          try {
            const record = await storage.getResumeBlob(activeResumeMetadata.blobId);
            if (record && record.fileData) {
              const url = URL.createObjectURL(record.fileData);
              const a = document.createElement('a');
              a.href = url;
              a.download = activeResumeMetadata.fileName || record.fileName || 'resume.pdf';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              setTimeout(() => URL.revokeObjectURL(url), 1000);
              return;
            }
          } catch (err) {
            console.warn('[Tracklet] Failed to download resume blob from IndexedDB:', err);
          }
        }
      }
    });
  }

  // Tab Draft Memory (Session-scoped memory across companion tab switches)
  const tabDraftMemory = {
    job: null,
    contact: null,
    email: null,
  };

  function saveCurrentTabDraft(tabName) {
    if (tabName === 'job') {
      tabDraftMemory.job = {
        company: companyInput ? companyInput.value : '',
        companyDomain: companyDomainInput ? companyDomainInput.value : '',
        role: roleInput ? roleInput.value : '',
        location: locationInput ? locationInput.value : '',
        dateApplied: dateAppliedInput ? dateAppliedInput.value : '',
        jobLink: jobLinkInput ? jobLinkInput.value : '',
        notes: notesInput ? notesInput.value : '',
        platform: selectedPlatform,
        stage: selectedStage,
        workLocation: selectedWorkLocation,
        employmentType: selectedEmploymentType,
        resumeFile: pendingResumeFile,
        resumeMeta: activeResumeMetadata,
      };
    } else if (tabName === 'email') {
      tabDraftMemory.email = {
        subject: emailSubjectInput ? emailSubjectInput.value : '',
        counterparty: emailCounterpartyInput ? emailCounterpartyInput.value : '',
        date: emailDateInput ? emailDateInput.value : '',
        time: emailTimeInput ? emailTimeInput.value : '',
        body: emailBodyInput ? emailBodyInput.value : '',
        direction: currentEmailDirection,
      };
    } else if (tabName === 'contact') {
      tabDraftMemory.contact = {
        name: contactNameInput ? contactNameInput.value : '',
        role: contactRoleInput ? contactRoleInput.value : '',
        organization: contactOrgInput ? contactOrgInput.value : '',
        location: contactLocationInput ? contactLocationInput.value : '',
        linkedIn: contactLinkedInInput ? contactLinkedInInput.value : '',
        notes: contactNotesInput ? contactNotesInput.value : '',
        category: selectedContactCategory,
        applicationId: selectedContactAppId,
      };
    }
  }

  function restoreTabDraft(tabName) {
    if (tabName === 'job' && tabDraftMemory.job) {
      const d = tabDraftMemory.job;
      if (companyInput && d.company) companyInput.value = d.company;
      if (companyDomainInput && d.companyDomain) companyDomainInput.value = d.companyDomain;
      if (roleInput && d.role) roleInput.value = d.role;
      if (locationInput && d.location) locationInput.value = d.location;
      if (dateAppliedInput && d.dateApplied) dateAppliedInput.value = d.dateApplied;
      if (jobLinkInput && d.jobLink) jobLinkInput.value = d.jobLink;
      if (notesInput && d.notes) notesInput.value = d.notes;
      if (d.platform) setPlatform(d.platform);
      if (d.stage) updateStageUI(d.stage);
      if (d.workLocation) setWorkLocation(d.workLocation);
      if (d.employmentType) setEmploymentType(d.employmentType);
      if (d.resumeMeta) {
        activeResumeMetadata = d.resumeMeta;
        pendingResumeFile = d.resumeFile || null;
        displayResumeChip(activeResumeMetadata, pendingResumeFile);
      } else if (!pendingResumeFile && !activeResumeMetadata) {
        clearResumeChip();
      }
      updateCompanyAvatar(companyInput?.value, companyDomainInput?.value);
      validateInputs();
    } else if (tabName === 'email' && tabDraftMemory.email) {
      const d = tabDraftMemory.email;
      if (emailSubjectInput && d.subject) emailSubjectInput.value = d.subject;
      if (emailCounterpartyInput && d.counterparty) emailCounterpartyInput.value = d.counterparty;
      if (emailDateInput && d.date) emailDateInput.value = d.date;
      if (emailTimeInput && d.time) emailTimeInput.value = d.time;
      if (emailBodyInput && d.body) emailBodyInput.value = d.body;
      if (d.direction) setEmailDirection(d.direction);
    } else if (tabName === 'contact' && tabDraftMemory.contact) {
      const d = tabDraftMemory.contact;
      if (contactNameInput && d.name) contactNameInput.value = d.name;
      if (contactRoleInput && d.role) contactRoleInput.value = d.role;
      if (contactOrgInput && d.organization) contactOrgInput.value = d.organization;
      if (contactLocationInput && d.location) contactLocationInput.value = d.location;
      if (contactLinkedInInput && d.linkedIn) contactLinkedInInput.value = d.linkedIn;
      if (contactNotesInput && d.notes) contactNotesInput.value = d.notes;
      if (d.category) setContactCategory(d.category);
      if (d.applicationId) setContactLinkedApp(d.applicationId);
    }
  }

  // Manual Override Anchoring
  let userManualTabOverride = null;
  let manualOverrideDomain = '';

  function setManualTabOverride(tabName, url) {
    userManualTabOverride = tabName;
    try {
      manualOverrideDomain = new URL(url || activeObservedUrl || window.location.href).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      manualOverrideDomain = '';
    }
  }

  function shouldClearManualOverride(newUrl) {
    if (!userManualTabOverride || !manualOverrideDomain) return true;
    try {
      const newDomain = new URL(newUrl).hostname.replace(/^www\./, '').toLowerCase();
      return newDomain !== manualOverrideDomain;
    } catch {
      return true;
    }
  }

  // URL Classification Heuristics
  function classifyTabUrl(url) {
    if (!url) return 'generic';
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      const path = parsed.pathname.toLowerCase();

      if (host.includes('mail.google.com') || host.includes('outlook.live.com') || host.includes('outlook.office.com') || host.includes('outlook.office365.com')) {
        return 'email';
      }

      if (host.includes('linkedin.com')) {
        if (path.startsWith('/in/') || path.includes('/in/')) {
          return 'contact';
        }
        if (path.startsWith('/jobs/') || path.includes('/jobs/')) {
          return 'job';
        }
      }

      const jobHosts = [
        'lever.co', 'greenhouse.io', 'workday.com', 'myworkdayjobs.com', 'indeed.com',
        'bayt.com', 'otta.com', 'wellfound.com', 'ashbyhq.com', 'smartrecruiters.com',
        'jobvite.com', 'recruitee.com', 'rippling.com', 'glassdoor.com', 'builtin.com', 'monster.com', 'dice.com'
      ];

      if (jobHosts.some(jh => host === jh || host.endsWith('.' + jh))) {
        return 'job';
      }

      if (path.includes('/careers') || path.includes('/jobs') || path.includes('/openings') || path.includes('/job/')) {
        return 'job';
      }

      return 'generic';
    } catch {
      return 'generic';
    }
  }

  function setActiveCompanionTab(tabName, isUserClick = true) {
    if (currentActiveTab === tabName) return;

    saveCurrentTabDraft(currentActiveTab);
    if (isUserClick) {
      setManualTabOverride(tabName, activeObservedUrl);
    }

    currentActiveTab = tabName;
    companionTabs.forEach(tab => {
      const isActive = tab.getAttribute('data-tab') === tabName;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    if (mainFormView) mainFormView.style.display = tabName === 'job' ? 'block' : 'none';
    if (emailLogView) emailLogView.style.display = tabName === 'email' ? 'block' : 'none';
    if (contactClipView) contactClipView.style.display = tabName === 'contact' ? 'block' : 'none';
    if (autofillView) autofillView.style.display = tabName === 'autofill' ? 'block' : 'none';
    if (alreadySavedView) alreadySavedView.style.display = 'none';

    if (stickyActionBar) stickyActionBar.style.display = tabName === 'job' ? 'flex' : 'none';
    if (stickyEmailActionBar) stickyEmailActionBar.style.display = tabName === 'email' ? 'flex' : 'none';
    if (stickyContactActionBar) stickyContactActionBar.style.display = tabName === 'contact' ? 'flex' : 'none';

    restoreTabDraft(tabName);

    if (tabName === 'autofill') {
      checkAtsFormOnActiveTab();
    }
  }

  companionTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');
      setActiveCompanionTab(targetTab, true);
    });
  });

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
      const isSelected = btn.getAttribute('data-value') === val;
      if (isSelected) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
      btn.setAttribute('aria-checked', isSelected ? 'true' : 'false');
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
      const isSelected = btn.getAttribute('data-value') === val;
      if (isSelected) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
      btn.setAttribute('aria-checked', isSelected ? 'true' : 'false');
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

    if (stickyStageDot) stickyStageDot.style.backgroundColor = config.dot;
    if (stickyStageLabel) stickyStageLabel.textContent = config.label || canonicalStage;

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
      targetEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>`;
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
      .sort((a, b) => {
        // 1. Direct score comparison by score bucket (15 pts buckets)
        const bucketA = Math.floor(a.score / 15);
        const bucketB = Math.floor(b.score / 15);
        if (bucketB !== bucketA) {
          return bucketB - bucketA;
        }

        // 2. Active Stage Priority (Offer > Interview > Screening > Applied > Saved > Rejected/Archived)
        const STAGE_PRIORITY = {
          'Offer': 5,
          'Interview': 4,
          'Screening': 3,
          'Applied': 2,
          'Saved': 1,
          'Rejected': 0,
          'Archived': 0,
        };
        const stageA = STAGE_PRIORITY[a.app.status] ?? 1;
        const stageB = STAGE_PRIORITY[b.app.status] ?? 1;
        if (stageB !== stageA) {
          return stageB - stageA;
        }

        // 3. Recency: newest dateApplied or stageUpdatedAt / createdAt wins
        const dateA = a.app.dateApplied || a.app.stageUpdatedAt || a.app.createdAt || '';
        const dateB = b.app.dateApplied || b.app.stageUpdatedAt || b.app.createdAt || '';
        return dateB.localeCompare(dateA);
      });

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

  function applyJobPageData(data, tab) {
    if (data) {
      companyInput.value = data.company || '';
      roleInput.value = data.role || '';
      companyDomainInput.value = data.companyDomain || data.domain || '';
      currentDomain = companyDomainInput.value;
      locationInput.value = data.location || '';
      setWorkLocation(data.workLocation || null);
      setEmploymentType(data.employmentType || null);

      // Hiring Contact detection (US3)
      if (data.contact && data.contact.name) {
        detectedRecruiterContact = { ...data.contact };
        if (recruiterNameEl) recruiterNameEl.textContent = data.contact.name;
        if (recruiterTitleEl) recruiterTitleEl.textContent = data.contact.role || '';
        if (recruiterBadgeEl) recruiterBadgeEl.textContent = data.contact.category || 'Recruiter';

        // Recruiter Avatar
        if (recruiterAvatarImg && recruiterAvatarInitials) {
          if (data.contact.avatarUrl) {
            recruiterAvatarImg.src = data.contact.avatarUrl;
            recruiterAvatarImg.style.display = 'block';
            recruiterAvatarInitials.style.display = 'none';
          } else {
            const initials = data.contact.name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'R';
            recruiterAvatarInitials.textContent = initials;
            recruiterAvatarInitials.style.display = 'inline-block';
            recruiterAvatarImg.style.display = 'none';
          }
        }

        // Check if contact already exists in Contacts Hub
        chrome.storage.local.get(['tracklet_contacts_index', 'tracklet_guest_contacts_v1'], (res) => {
          const allContacts = res?.tracklet_contacts_index || res?.tracklet_guest_contacts_v1 || [];
          const normLinkedIn = (data.contact.linkedIn || '').toLowerCase().trim();
          const normName = data.contact.name.toLowerCase().trim();
          const normOrg = (data.company || '').toLowerCase().trim();

          const existingMatch = allContacts.find(c => {
            if (normLinkedIn && c.linkedIn && c.linkedIn.toLowerCase().trim() === normLinkedIn) return true;
            if (normName && c.name && c.name.toLowerCase().trim() === normName) {
              if (!normOrg || !c.organization || c.organization.toLowerCase().trim() === normOrg) return true;
            }
            return false;
          });

          if (existingMatch) {
            detectedRecruiterContact.existingId = existingMatch.id;
            detectedRecruiterContact.existingContact = existingMatch;
            if (recruiterExistingBadge) recruiterExistingBadge.style.display = 'inline-block';
            if (addRecruiterCheckboxText) addRecruiterCheckboxText.textContent = 'Link existing contact in Contacts Hub to this job';
          } else {
            detectedRecruiterContact.existingId = null;
            detectedRecruiterContact.existingContact = null;
            if (recruiterExistingBadge) recruiterExistingBadge.style.display = 'none';
            if (addRecruiterCheckboxText) addRecruiterCheckboxText.textContent = 'Add to Contacts Hub & link to job';
          }

          if (addRecruiterContactCheckbox) addRecruiterContactCheckbox.checked = true;
          if (recruiterContactCard) recruiterContactCard.style.display = 'block';
        });
      } else {
        detectedRecruiterContact = null;
        if (recruiterContactCard) recruiterContactCard.style.display = 'none';
      }

      // Stage selection
      if (data.suggestedStage) {
        updateStageUI(data.suggestedStage);
      } else {
        updateStageUI('Saved');
      }

      setPlatform(data.platform || 'Company Site');
      notesInput.value = data.notes || '';

      updateCompanyAvatar(data.company, currentDomain);
      checkForDuplicates(tab?.url);
    } else if (tab) {
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
  }

  async function inspectActiveTab(tab) {
    if (!tab || !tab.id) return;
    activeObservedTabId = tab.id;
    activeObservedUrl = tab.url || '';

    if (jobLinkInput) {
      jobLinkInput.value = tab.url || '';
    }

    const isWebmailTab = isWebmail(tab.url);
    if (isWebmailTab) {
      initWebmailMode(tab);
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: 'GET_PAGE_DATA', userEmail: currentUserSession?.email }, (response) => {
      if (chrome.runtime.lastError || !response) {
        // Fallback to EXTRACT_PAGE_DATA
        chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_PAGE_DATA' }, (legacyRes) => {
          if (!chrome.runtime.lastError && legacyRes && legacyRes.isWebmail) {
            initWebmailMode(tab);
            return;
          }
          applyJobPageData(legacyRes, tab);
        });
        return;
      }

      if (response.pageType === 'webmail') {
        initWebmailMode(tab);
        return;
      }

      if (response.pageType === 'linkedin_profile' && response.profileData) {
        applyLinkedInProfileData(response.profileData, tab);
        return;
      }

      applyJobPageData(response.jobData, tab);
    });
  }

  async function handleTabContextSwitch(tab) {
    if (!tab || !tab.url) return;
    activeObservedTabId = tab.id;
    activeObservedUrl = tab.url;

    if (shouldClearManualOverride(tab.url)) {
      userManualTabOverride = null;
      manualOverrideDomain = '';
    }

    const targetCategory = classifyTabUrl(tab.url);

    if (!userManualTabOverride) {
      if (targetCategory === 'email') {
        setActiveCompanionTab('email', false);
      } else if (targetCategory === 'contact') {
        setActiveCompanionTab('contact', false);
      } else if (targetCategory === 'job') {
        setActiveCompanionTab('job', false);
      }
    }

    inspectActiveTab(tab);
  }

  // Request Initial Page Extraction from Active Tab
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      handleTabContextSwitch(tab);
    }
  } catch (err) {
    console.error('Failed to query initial tab:', err);
  }

  // Lifecycle listeners for persistent Side Panel
  if (typeof chrome !== 'undefined' && chrome.tabs) {
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab && tab.url) {
          handleTabContextSwitch(tab);
        }
      } catch {
        // Tab might be restricted or closing
      }
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab && tab.id === activeObservedTabId && tab.url) {
        handleTabContextSwitch(tab);
      }
    });
  }

  // Background message listener for tab switches
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'ACTIVE_TAB_CHANGED' || message.action === 'ACTIVE_TAB_UPDATED') {
      if (message.payload && message.payload.tabId) {
        chrome.tabs.get(message.payload.tabId).then(tab => {
          if (tab && tab.active && tab.id !== activeObservedTabId) {
            handleTabContextSwitch(tab);
          }
        }).catch(() => {});
      }
    }
  });

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

        // Display existing attached tailored resume if present
        if (match.resumeFileName && !pendingResumeFile) {
          activeResumeMetadata = {
            fileName: match.resumeFileName,
            fileSize: match.resumeFileSize,
            blobId: match.resumeBlobId,
            uploadedAt: match.resumeUploadedAt
          };
          displayResumeChip(activeResumeMetadata);
        }

        saveBtn.querySelector('span').textContent = 'Update Application';
      } else {
        matchedApplication = null;
        if (duplicateBanner) duplicateBanner.style.display = 'none';
        stageReadonlyContainer.style.display = 'none';
        stageSelectorContainer.style.display = 'block';
        saveBtn.querySelector('span').textContent = 'Save Application';
        if (!pendingResumeFile) {
          clearResumeChip();
        }
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

  // --- Webmail Helper Controllers ---
  function detectSuggestedStageAdvancement(matchedApp, subject, text) {
    if (!matchedApp || !matchedApp.status) return null;
    const currentStatus = matchedApp.status;
    const combined = `${subject || ''} ${text || ''}`.toLowerCase();

    // Check for offer first
    if (/(?:job\s+offer|offer\s+letter|formal\s+offer|offer\s+details|congratulations.*offer)/i.test(combined)) {
      if (['Saved', 'Applied', 'Screening', 'Interview'].includes(currentStatus)) {
        return 'Offer';
      }
    }

    // Check for interview
    if (/(?:interview|phone\s+screen|technical\s+assessment|coding\s+challenge|meet\s+the\s+team)/i.test(combined)) {
      if (['Saved', 'Applied', 'Screening'].includes(currentStatus)) {
        return 'Interview';
      }
    }

    // Check for screening
    if (/(?:screening|recruiter\s+call|introductory\s+call|phone\s+screen)/i.test(combined)) {
      if (['Saved', 'Applied'].includes(currentStatus)) {
        return 'Screening';
      }
    }

    return null;
  }

  function updateStageAdvancementUI() {
    suggestedAdvanceStage = detectSuggestedStageAdvancement(
      selectedEmailMatchedApp,
      emailSubjectInput ? emailSubjectInput.value : '',
      emailBodyInput ? emailBodyInput.value : ''
    );

    if (suggestedAdvanceStage && advanceStageOption && advanceStageLabel && advanceStageCheckbox) {
      advanceStageLabel.textContent = `Advance stage to ${suggestedAdvanceStage}`;
      advanceStageCheckbox.checked = true;
      advanceStageOption.style.display = 'flex';
      if (milestoneBox) milestoneBox.style.display = 'flex';
    } else if (advanceStageOption) {
      advanceStageOption.style.display = 'none';
    }
  }

  function updateContactDiscoveryUI() {
    chrome.storage.local.get(['tracklet_contacts_index', 'tracklet_guest_contacts_v1'], (res) => {
      const allContacts = res?.tracklet_contacts_index || res?.tracklet_guest_contacts_v1 || [];
      const normEmail = (discoveredRecruiterEmail || '').toLowerCase().trim();
      const normName = (discoveredRecruiterName || '').toLowerCase().trim();
      const isKnownContact = selectedEmailMatchedApp?.contactEmails?.some(e => e.toLowerCase() === normEmail) ||
        allContacts.some(c => (normEmail && c.email?.toLowerCase().trim() === normEmail) || (normName && c.name?.toLowerCase().trim() === normName));

      if (discoveredRecruiterName && !isKnownContact && discoveredRecruiterName !== 'You' && discoveredRecruiterName.length > 1) {
        if (milestoneBox) milestoneBox.style.display = 'flex';
        if (addContactOption) addContactOption.style.display = 'flex';
        if (addContactLabel) addContactLabel.textContent = `Add "${discoveredRecruiterName}" as recruiter contact in Contacts Hub`;
        if (addContactCheckbox) addContactCheckbox.checked = true;
      } else {
        if (addContactOption) addContactOption.style.display = 'none';
        if (addContactCheckbox) addContactCheckbox.checked = false;
      }

      const isStageHidden = !advanceStageOption || advanceStageOption.style.display === 'none';
      const isContactHidden = !addContactOption || addContactOption.style.display === 'none';
      if (isStageHidden && isContactHidden && milestoneBox) {
        milestoneBox.style.display = 'none';
      }
    });
  }

  // --- Webmail Mode Initialization & UI Controllers ---
  async function initWebmailMode(tab) {
    isWebmailMode = true;
    setActiveCompanionTab('email');

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

      // Match to application (with active stage and recency ranking)
      const { bestMatch, ranked } = matchEmailToApplications(emailData, allKnownAppsList);
      if (bestMatch) {
        renderMatchedApp(bestMatch, true);
      } else {
        renderMatchedApp(null, false);
      }

      // Multi-match indicator badge (US4 / T027)
      if (multiMatchCountBadge) {
        if (ranked && ranked.length > 1) {
          multiMatchCountBadge.textContent = `${ranked.length} matches`;
          multiMatchCountBadge.style.display = 'inline-block';
        } else {
          multiMatchCountBadge.style.display = 'none';
        }
      }

      // Contact Discovery & In-flight Stage Advance (US4 / T028, T029)
      discoveredRecruiterName = emailData.counterpartyName || '';
      discoveredRecruiterEmail = emailData.counterpartyEmail || '';
      updateContactDiscoveryUI();
      updateStageAdvancementUI();
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
    updateStageAdvancementUI();
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
    setActiveCompanionTab('job');
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
    const newContact = (addContactCheckbox && addContactCheckbox.checked && discoveredRecruiterName)
      ? {
          name: discoveredRecruiterName,
          email: discoveredRecruiterEmail,
          organization: selectedEmailMatchedApp.company,
          category: 'Recruiter'
        }
      : undefined;

    const updatedStatus = (advanceStageCheckbox && advanceStageCheckbox.checked && suggestedAdvanceStage)
      ? suggestedAdvanceStage
      : undefined;

    chrome.runtime.sendMessage({
      action: 'SAVE_EMAIL_LOG',
      payload: {
        appId: selectedEmailMatchedApp.id,
        emailLog: emailLogPayload,
        updatedStatus,
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

  // --- Contact Clipper UI & Logic (US2: T016, T018, T019) ---
  function inferContactCategory(headline) {
    if (!headline) return 'Other';
    const clean = headline.trim().toLowerCase();

    // 1. Recruiter & Talent Acquisition keywords
    if (/(?:talent|recruiter|recruiting|sourcer|staffing|people\s+ops|technical\s+sourcer)/i.test(clean)) {
      return 'Recruiter';
    }

    // 2. Leadership & Hiring Manager keywords
    if (/(?:vp|vice\s+president|director|head\s+of|engineering\s+manager|cto|founder|co-founder|tech\s+lead\s+manager)/i.test(clean)) {
      return 'Hiring Manager';
    }

    // 3. Mentorship & Advisory keywords
    if (/(?:mentor|advisor|coach|career\s+guide)/i.test(clean)) {
      return 'Mentor';
    }

    // 4. Peer / Alumni keywords
    if (/(?:peer|alumni|fellow|graduate|class\s+of|engineer|developer|designer)/i.test(clean)) {
      return 'Peer / Alumni';
    }

    return 'Other';
  }

  function diffContact(existing, scraped) {
    const changedFields = [];
    const cleanExistingRole = (existing.role || '').trim().toLowerCase();
    const cleanScrapedRole = (scraped.role || '').trim().toLowerCase();
    if (cleanScrapedRole && cleanExistingRole !== cleanScrapedRole) {
      changedFields.push('role');
    }

    const cleanExistingOrg = (existing.organization || '').trim().toLowerCase();
    const cleanScrapedOrg = (scraped.organization || '').trim().toLowerCase();
    if (cleanScrapedOrg && cleanExistingOrg !== cleanScrapedOrg) {
      changedFields.push('organization');
    }

    const cleanExistingLoc = (existing.location || '').trim().toLowerCase();
    const cleanScrapedLoc = (scraped.location || '').trim().toLowerCase();
    if (cleanScrapedLoc && cleanExistingLoc && cleanExistingLoc !== cleanScrapedLoc) {
      changedFields.push('location');
    }

    return {
      hasChanged: changedFields.length > 0,
      changedFields,
    };
  }

  function setContactCategory(cat) {
    selectedContactCategory = cat;
    if (contactCategoryIndicator) {
      contactCategoryIndicator.textContent = cat;
    }
    categoryPills.forEach(pill => {
      pill.classList.toggle('active', pill.getAttribute('data-category') === cat);
    });
  }

  categoryPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const cat = pill.getAttribute('data-category');
      if (cat) setContactCategory(cat);
    });
  });

  async function loadKnownContacts() {
    try {
      const storage = await chrome.storage.local.get([
        'tracklet_contacts_index',
        'tracklet_guest_contacts_v1',
        'tracklet_pending_contacts'
      ]);
      const map = new Map();
      [
        ...(storage.tracklet_contacts_index || []),
        ...(storage.tracklet_guest_contacts_v1 || []),
        ...(storage.tracklet_pending_contacts || [])
      ].forEach(c => {
        if (c && (c.id || c.name)) {
          const key = c.id || `${c.name}:::${c.organization || ''}`;
          if (!map.has(key)) map.set(key, c);
        }
      });
      allKnownContactsList = Array.from(map.values());
    } catch {
      allKnownContactsList = [];
    }
  }

  function populateContactAppDropdown(preferredCompany = '') {
    if (!contactAppDropdown) return;
    contactAppDropdown.innerHTML = '';

    // Option 1: Standalone Contact
    const noneOption = document.createElement('div');
    noneOption.className = 'custom-select-option' + (!selectedContactAppId ? ' selected' : '');
    noneOption.setAttribute('data-value', '');
    noneOption.textContent = 'No Linked Job (Standalone Contact)';
    noneOption.addEventListener('click', () => {
      setContactLinkedApp('', 'No Linked Job (Standalone Contact)');
    });
    contactAppDropdown.appendChild(noneOption);

    const cleanPrefComp = (preferredCompany || '').trim().toLowerCase();
    const sortedApps = [...allKnownAppsList].sort((a, b) => {
      const aMatch = cleanPrefComp && a.company && a.company.toLowerCase().includes(cleanPrefComp);
      const bMatch = cleanPrefComp && b.company && b.company.toLowerCase().includes(cleanPrefComp);
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return 0;
    });

    let autoSelectedApp = null;

    sortedApps.forEach(app => {
      const opt = document.createElement('div');
      const isSelected = selectedContactAppId === app.id;
      const isCompanyMatch = cleanPrefComp && app.company && app.company.toLowerCase().includes(cleanPrefComp);
      opt.className = 'custom-select-option' + (isSelected ? ' selected' : '');
      opt.setAttribute('data-value', app.id);
      opt.textContent = `${app.company} · ${app.role}${isCompanyMatch ? ' ★' : ''}`;
      opt.addEventListener('click', () => {
        setContactLinkedApp(app.id, `${app.company} · ${app.role}`);
      });
      contactAppDropdown.appendChild(opt);

      if (isCompanyMatch && !selectedContactAppId && !autoSelectedApp) {
        autoSelectedApp = app;
      }
    });

    if (autoSelectedApp && !selectedContactAppId) {
      setContactLinkedApp(autoSelectedApp.id, `${autoSelectedApp.company} · ${autoSelectedApp.role}`);
    }
  }

  function setContactLinkedApp(appId, labelText = null) {
    selectedContactAppId = appId || '';
    if (!labelText) {
      if (!appId) {
        labelText = 'No Linked Job (Standalone Contact)';
      } else {
        const found = allKnownAppsList.find(a => a.id === appId);
        labelText = found ? `${found.company} · ${found.role}` : 'Linked Application';
      }
    }
    if (contactAppValueText) {
      contactAppValueText.textContent = labelText;
    }
    if (contactAppDropdown) {
      const options = contactAppDropdown.querySelectorAll('.custom-select-option');
      options.forEach(opt => {
        opt.classList.toggle('selected', opt.getAttribute('data-value') === selectedContactAppId);
      });
    }
    if (contactAppSelectContainer) {
      contactAppSelectContainer.classList.remove('open');
    }
  }

  if (contactAppTrigger && contactAppSelectContainer) {
    contactAppTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      contactAppSelectContainer.classList.toggle('open');
    });
  }

  async function applyLinkedInProfileData(profileData, tab) {
    rawExtractedProfileData = profileData;
    setActiveCompanionTab('contact', false);

    // 1. Populate text fields
    if (contactNameInput) contactNameInput.value = profileData.fullName || profileData.name || '';
    if (contactRoleInput) contactRoleInput.value = profileData.role || profileData.headline || '';
    if (contactOrgInput) contactOrgInput.value = profileData.organization || '';
    if (contactLocationInput) contactLocationInput.value = profileData.location || '';
    if (contactLinkedInInput) contactLinkedInInput.value = profileData.linkedInUrl || (tab ? tab.url : '');

    // 2. Avatar
    if (contactAvatarImg && contactAvatarSvg) {
      if (profileData.avatarUrl) {
        contactAvatarImg.src = profileData.avatarUrl;
        contactAvatarImg.style.display = 'block';
        contactAvatarSvg.style.display = 'none';
      } else {
        contactAvatarImg.style.display = 'none';
        contactAvatarSvg.style.display = 'block';
      }
    }

    // 3. Category smart-defaulting
    const inferredCategory = inferContactCategory(profileData.headline || profileData.role || '');
    setContactCategory(inferredCategory);

    // 4. Load known applications and contacts
    await loadKnownContacts();

    // 5. Populate application dropdown with auto-suggestion
    populateContactAppDropdown(profileData.organization);

    // 6. Deduplication and diffing
    const normUrl = normalizeUrl(profileData.linkedInUrl || (tab ? tab.url : ''));
    const normName = (profileData.fullName || profileData.name || '').trim().toLowerCase();
    const normOrg = (profileData.organization || '').trim().toLowerCase();

    const match = allKnownContactsList.find(c => {
      if (normUrl && c.linkedIn && normalizeUrl(c.linkedIn) === normUrl) return true;
      if (normName && c.name && c.name.trim().toLowerCase() === normName) {
        if (!normOrg || !c.organization || c.organization.trim().toLowerCase() === normOrg) {
          return true;
        }
      }
      return false;
    });

    if (match) {
      matchedExistingContact = match;
      const diff = diffContact(matchedExistingContact, profileData);
      if (contactStatusBanner) {
        contactStatusBanner.style.display = 'flex';
        if (diff.hasChanged) {
          contactStatusBanner.classList.add('warning');
          contactStatusText.textContent = 'Already in Contacts Hub · Changes Detected';
        } else {
          contactStatusBanner.classList.remove('warning');
          contactStatusText.textContent = '✓ Saved in Contacts Hub';
        }
      }
      if (match.category) {
        setContactCategory(match.category);
      }
      if (match.notes && contactNotesInput && !contactNotesInput.value) {
        contactNotesInput.value = match.notes;
      }
      if (match.applicationIds && match.applicationIds.length > 0) {
        setContactLinkedApp(match.applicationIds[0]);
      }
      if (saveContactBtn) {
        saveContactBtn.querySelector('span').textContent = 'Update Contact';
      }
    } else {
      matchedExistingContact = null;
      if (contactStatusBanner) {
        contactStatusBanner.style.display = 'none';
        contactStatusBanner.classList.remove('warning');
      }
      if (saveContactBtn) {
        saveContactBtn.querySelector('span').textContent = 'Save Contact to Tracklet';
      }
    }
  }

  async function pushStandaloneContactToFirestoreDirectly(payload, userSession, config, docIdToUpdate = null) {
    const projectId = config?.projectId || 'demo-tracklet';
    const apiKey = config?.apiKey;
    const userId = userSession.uid;
    const idToken = userSession.idToken;

    const fields = {
      id: { stringValue: payload.id },
      name: { stringValue: payload.name || '' },
      role: { stringValue: payload.role || '' },
      category: { stringValue: payload.category || 'Other' },
      userId: { stringValue: userId },
      createdAt: { stringValue: payload.createdAt || new Date().toISOString() },
      updatedAt: { stringValue: payload.updatedAt || new Date().toISOString() }
    };

    if (payload.organization) fields.organization = { stringValue: payload.organization };
    if (payload.location) fields.location = { stringValue: payload.location };
    if (payload.linkedIn) fields.linkedIn = { stringValue: payload.linkedIn };
    if (payload.email) fields.email = { stringValue: payload.email };
    if (payload.phone) fields.phone = { stringValue: payload.phone };
    if (payload.notes) fields.notes = { stringValue: payload.notes };
    if (payload.nextFollowUpDate) fields.nextFollowUpDate = { stringValue: payload.nextFollowUpDate };

    if (payload.applicationIds && Array.isArray(payload.applicationIds) && payload.applicationIds.length > 0) {
      fields.applicationIds = {
        arrayValue: {
          values: payload.applicationIds.map(appId => ({ stringValue: appId }))
        }
      };
    }

    let url = docIdToUpdate
      ? `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}/contacts/${docIdToUpdate}?`
      : `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}/contacts?documentId=${encodeURIComponent(payload.id)}&`;

    if (apiKey && apiKey !== 'demo-api-key') {
      url += `key=${encodeURIComponent(apiKey)}&`;
    }

    if (docIdToUpdate) {
      const updateFields = Object.keys(fields);
      updateFields.forEach(f => {
        url += `updateMask.fieldPaths=${encodeURIComponent(f)}&`;
      });
    }

    url = url.replace(/[?&]$/, '');

    const headers = { 'Content-Type': 'application/json' };
    if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

    const method = docIdToUpdate ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers,
      body: JSON.stringify({ fields })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Firestore Contact Error [${res.status}]: ${errText}`);
    }

    return await res.json();
  }

  let isSavingContact = false;

  async function handleSaveContact() {
    if (isSavingContact) return;

    const name = contactNameInput ? contactNameInput.value.trim() : '';
    const role = contactRoleInput ? contactRoleInput.value.trim() : '';

    if (!name) {
      if (contactNameInput) {
        contactNameInput.classList.add('input-error');
        contactNameInput.focus();
        setTimeout(() => contactNameInput.classList.remove('input-error'), 1500);
      }
      return;
    }

    if (!role) {
      if (contactRoleInput) {
        contactRoleInput.classList.add('input-error');
        contactRoleInput.focus();
        setTimeout(() => contactRoleInput.classList.remove('input-error'), 1500);
      }
      return;
    }

    isSavingContact = true;
    if (saveContactBtn) {
      saveContactBtn.disabled = true;
      saveContactBtn.querySelector('span').textContent = matchedExistingContact ? 'Updating contact...' : 'Saving contact...';
    }

    const nowISO = new Date().toISOString();
    const contactPayload = {
      id: matchedExistingContact ? matchedExistingContact.id : `c-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: currentUserSession?.uid || 'guest',
      name,
      role,
      organization: contactOrgInput ? contactOrgInput.value.trim() : '',
      location: contactLocationInput ? contactLocationInput.value.trim() : '',
      linkedIn: contactLinkedInInput ? contactLinkedInInput.value.trim() : '',
      category: selectedContactCategory,
      notes: contactNotesInput ? contactNotesInput.value.trim() : '',
      applicationIds: selectedContactAppId ? [selectedContactAppId] : (matchedExistingContact?.applicationIds || []),
      createdAt: matchedExistingContact?.createdAt || nowISO,
      updatedAt: nowISO
    };

    let savedToCloud = false;

    // 1. Direct Firestore save via REST API if logged in
    if (currentUserSession && currentUserSession.uid) {
      try {
        await pushStandaloneContactToFirestoreDirectly(
          contactPayload,
          currentUserSession,
          currentFirebaseConfig,
          matchedExistingContact?.id
        );
        savedToCloud = true;
      } catch (err) {
        console.warn('[Tracklet] Direct Firestore contact save failed:', err);
      }
    }

    // 2. Deliver to open Tracklet tabs via content script & BroadcastChannel
    try {
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
    } catch {
      // ignore
    }

    // 3. Persist in chrome.storage.local
    chrome.storage.local.get([
      'tracklet_guest_contacts_v1',
      'tracklet_contacts_index',
      'tracklet_pending_contacts'
    ], (result) => {
      let guestContacts = result.tracklet_guest_contacts_v1 || [];
      let contactsIndex = result.tracklet_contacts_index || [];
      let pendingContacts = result.tracklet_pending_contacts || [];

      if (matchedExistingContact) {
        guestContacts = guestContacts.map(c => c.id === matchedExistingContact.id ? contactPayload : c);
        contactsIndex = contactsIndex.map(c => c.id === matchedExistingContact.id ? contactPayload : c);
        pendingContacts = pendingContacts.map(c => c.id === matchedExistingContact.id ? contactPayload : c);
      } else {
        guestContacts = [contactPayload, ...guestContacts];
        contactsIndex = [contactPayload, ...contactsIndex];
        if (!savedToCloud) {
          pendingContacts = [contactPayload, ...pendingContacts];
        }
      }

      chrome.storage.local.set({
        tracklet_guest_contacts_v1: guestContacts,
        tracklet_contacts_index: contactsIndex,
        tracklet_pending_contacts: pendingContacts
      }, () => {
        isSavingContact = false;
        if (saveContactBtn) {
          saveContactBtn.disabled = false;
          saveContactBtn.querySelector('span').textContent = 'Save Contact to Tracklet';
        }

        // Show Success View
        if (successTitle) successTitle.textContent = matchedExistingContact ? 'Contact Updated!' : 'Contact Saved!';
        if (successSubtitle) successSubtitle.textContent = `"${contactPayload.name}" saved to Contacts Hub.`;

        if (mainContainer) mainContainer.style.display = 'none';
        if (successView) successView.classList.add('visible');

        scheduleAutoClose(3200);
      });
    });
  }

  if (saveContactBtn) {
    saveContactBtn.addEventListener('click', handleSaveContact);
  }

  if (contactOpenLink) {
    contactOpenLink.addEventListener('click', (e) => {
      e.preventDefault();
      focusOrOpenWorkspace(null, '/contacts');
    });
  }

  if (contactOpenWorkspaceBtn) {
    contactOpenWorkspaceBtn.addEventListener('click', (e) => {
      e.preventDefault();
      focusOrOpenWorkspace(null, '/contacts');
    });
  }

  // Recruiter Micro-Card "View Contact Details" transition (US3 / T024)
  if (recruiterViewDetailsBtn) {
    recruiterViewDetailsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!detectedRecruiterContact) return;
      setManualTabOverride('contact');
      setActiveCompanionTab('contact', false);

      if (contactNameInput) contactNameInput.value = detectedRecruiterContact.name || '';
      if (contactRoleInput) contactRoleInput.value = detectedRecruiterContact.role || '';
      if (contactOrgInput) contactOrgInput.value = companyInput.value.trim() || detectedRecruiterContact.organization || '';
      if (contactLinkedInInput) contactLinkedInInput.value = detectedRecruiterContact.linkedIn || '';
      if (contactAvatarImg && contactAvatarSvg) {
        if (detectedRecruiterContact.avatarUrl) {
          contactAvatarImg.src = detectedRecruiterContact.avatarUrl;
          contactAvatarImg.style.display = 'block';
          contactAvatarSvg.style.display = 'none';
        } else {
          contactAvatarImg.style.display = 'none';
          contactAvatarSvg.style.display = 'block';
        }
      }
      setContactCategory(detectedRecruiterContact.category || 'Recruiter');
      matchedExistingContact = detectedRecruiterContact.existingContact || null;
      if (matchedExistingContact && contactStatusBanner) {
        contactStatusBanner.style.display = 'flex';
        contactStatusBanner.classList.remove('warning');
        contactStatusText.textContent = '✓ Saved in Contacts Hub';
      }
      if (saveContactBtn) {
        saveContactBtn.querySelector('span').textContent = matchedExistingContact ? 'Update Contact' : 'Save Contact to Tracklet';
      }
      checkForContactDuplicates(detectedRecruiterContact.linkedIn, detectedRecruiterContact.name, companyInput.value.trim());
    });
  }

  // Global Keyboard Shortcuts (Escape to dismiss dropdowns, Ctrl+Enter / Cmd+Enter to submit from anywhere)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      platformSelectContainer.classList.remove('open');
      stageSelectorContainer.classList.remove('open');
      if (appSelectorPopover) appSelectorPopover.style.display = 'none';
      if (contactAppSelectContainer) contactAppSelectContainer.classList.remove('open');
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (currentActiveTab === 'autofill' && autofillTriggerBtn && !autofillTriggerBtn.disabled && autofillView && autofillView.style.display !== 'none') {
        triggerAutofill();
        return;
      }
      if (currentActiveTab === 'email' && logEmailBtn && !logEmailBtn.disabled && emailLogView && emailLogView.style.display !== 'none') {
        handleLogEmail();
        return;
      }
      if (currentActiveTab === 'contact' && saveContactBtn && !saveContactBtn.disabled && contactClipView && contactClipView.style.display !== 'none') {
        handleSaveContact();
        return;
      }
      if (alreadySavedView && alreadySavedView.style.display === 'flex') {
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
      return;
    }
    const isInteractiveTarget = e.target && (
      e.target.tagName === 'BUTTON' ||
      e.target.tagName === 'A' ||
      (e.target.getAttribute && e.target.getAttribute('role') === 'tab') ||
      e.target.closest('button') ||
      e.target.closest('a')
    );
    if (e.key === 'Enter' && !e.shiftKey && !isInteractiveTarget && e.target.tagName !== 'TEXTAREA' && e.target.id !== 'notes-editor' && e.target.id !== 'contact-notes') {
      e.preventDefault();
      if (currentActiveTab === 'autofill' && autofillTriggerBtn && !autofillTriggerBtn.disabled && autofillView && autofillView.style.display !== 'none') {
        triggerAutofill();
        return;
      }
      if (isWebmailMode && emailLogView.style.display !== 'none') {
        handleLogEmail();
        return;
      }
      if (currentActiveTab === 'contact' && contactClipView && contactClipView.style.display !== 'none') {
        handleSaveContact();
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

    // Linked Contact IDs & Tailored CV metadata (US3 / US5)
    if (Array.isArray(payload.contactIds) && payload.contactIds.length > 0) {
      fields.contactIds = {
        arrayValue: {
          values: payload.contactIds.map(id => ({ stringValue: id }))
        }
      };
    }
    if (payload.resumeFileName) fields.resumeFileName = { stringValue: payload.resumeFileName };
    if (payload.resumeFileSize !== undefined) fields.resumeFileSize = { integerValue: String(payload.resumeFileSize) };
    if (payload.resumeBlobId) fields.resumeBlobId = { stringValue: payload.resumeBlobId };
    if (payload.resumeUploadedAt) fields.resumeUploadedAt = { stringValue: payload.resumeUploadedAt };

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
   * Persist recruiter contact directly to Firestore /users/{userId}/contacts (supports create and update)
   */
  async function pushContactToFirestoreDirectly(contact, appId, userSession, config) {
    if (!contact || !contact.name) return null;
    const projectId = config?.projectId || 'demo-tracklet';
    const apiKey = config?.apiKey;
    const userId = userSession.uid;
    const idToken = userSession.idToken;

    const docIdToUpdate = (contact.id && !contact.id.startsWith('ext-') && !contact.id.startsWith('contact_')) ? contact.id : null;
    let url = docIdToUpdate
      ? `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}/contacts/${docIdToUpdate}`
      : `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}/contacts`;

    const nowISO = new Date().toISOString();
    const appIds = Array.from(new Set([...(contact.applicationIds || []), appId].filter(Boolean)));
    const fields = {
      name: { stringValue: contact.name },
      role: { stringValue: contact.role || 'Recruiter' },
      category: { stringValue: contact.category || 'Recruiter' },
      updatedAt: { stringValue: nowISO },
      applicationIds: {
        arrayValue: {
          values: appIds.map(id => ({ stringValue: id }))
        }
      }
    };
    if (!docIdToUpdate) {
      fields.createdAt = { stringValue: contact.createdAt || nowISO };
    }
    if (contact.organization) fields.organization = { stringValue: contact.organization };
    if (contact.linkedIn) fields.linkedIn = { stringValue: contact.linkedIn };
    if (contact.email) fields.email = { stringValue: contact.email };

    const queryParams = [];
    if (apiKey && apiKey !== 'demo-api-key') {
      queryParams.push(`key=${encodeURIComponent(apiKey)}`);
    }
    if (docIdToUpdate) {
      queryParams.push('updateMask.fieldPaths=applicationIds');
      queryParams.push('updateMask.fieldPaths=updatedAt');
      if (contact.role) queryParams.push('updateMask.fieldPaths=role');
      if (contact.organization) queryParams.push('updateMask.fieldPaths=organization');
    }
    if (queryParams.length > 0) {
      url += `?${queryParams.join('&')}`;
    }

    const headers = { 'Content-Type': 'application/json' };
    if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

    try {
      const res = await fetch(url, {
        method: docIdToUpdate ? 'PATCH' : 'POST',
        headers,
        body: JSON.stringify({ fields })
      });
      if (res.ok) {
        const data = await res.json();
        return docIdToUpdate || (data.name ? data.name.split('/').pop() : null);
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

    const provisionalAppId = matchedApplication?.id || `ext-${Date.now()}`;

    // Persist Tailored CV to IndexedDB if attached (US5 / T032)
    if (pendingResumeFile && activeResumeMetadata) {
      let savedBlobId = null;
      try {
        const storage = getResumeStorage();
        if (storage && storage.saveResumeBlob) {
          savedBlobId = await storage.saveResumeBlob({
            applicationId: provisionalAppId,
            fileName: activeResumeMetadata.fileName,
            fileSize: pendingResumeFile.size,
            mimeType: pendingResumeFile.type || 'application/pdf',
            fileData: pendingResumeFile,
            uploadedAt: activeResumeMetadata.uploadedAt || nowISO
          });
        }
      } catch (resumeErr) {
        console.warn('[Tracklet] Failed to persist tailored resume to IndexedDB:', resumeErr);
      }

      basePayload.resumeFileName = activeResumeMetadata.fileName;
      basePayload.resumeFileSize = pendingResumeFile.size;
      if (savedBlobId) {
        basePayload.resumeBlobId = savedBlobId;
      }
      basePayload.resumeUploadedAt = activeResumeMetadata.uploadedAt || nowISO;
    } else if (activeResumeMetadata && activeResumeMetadata.fileName) {
      basePayload.resumeFileName = activeResumeMetadata.fileName;
      basePayload.resumeFileSize = activeResumeMetadata.fileSize;
      if (activeResumeMetadata.blobId) basePayload.resumeBlobId = activeResumeMetadata.blobId;
      if (activeResumeMetadata.uploadedAt) basePayload.resumeUploadedAt = activeResumeMetadata.uploadedAt;
    }

    // Bundle Recruiter Contact if checked (US3 / US4 / T023)
    let bundledContactPayload = null;
    let contactSavedToCloud = false;

    if (detectedRecruiterContact && addRecruiterContactCheckbox && addRecruiterContactCheckbox.checked) {
      const recLinkedIn = (detectedRecruiterContact.linkedIn || '').trim();
      const recEmail = (detectedRecruiterContact.email || '').trim();
      const recRole = detectedRecruiterContact.role || 'Recruiter';
      const recCategory = detectedRecruiterContact.category || 'Recruiter';

      if (detectedRecruiterContact.existingId && detectedRecruiterContact.existingContact) {
        const existing = detectedRecruiterContact.existingContact;
        const currentAppIds = existing.applicationIds || [];
        const updatedAppIds = currentAppIds.includes(provisionalAppId) ? currentAppIds : [...currentAppIds, provisionalAppId];

        bundledContactPayload = {
          ...existing,
          applicationIds: updatedAppIds,
          updatedAt: nowISO
        };
        basePayload.contactIds = Array.from(new Set([...(basePayload.contactIds || []), existing.id]));
      } else {
        const newContactId = `contact_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        bundledContactPayload = {
          id: newContactId,
          userId: currentUserSession?.uid || 'guest',
          name: detectedRecruiterContact.name,
          role: recRole,
          organization: company,
          category: recCategory,
          linkedIn: recLinkedIn || undefined,
          email: recEmail || undefined,
          applicationIds: [provisionalAppId],
          createdAt: nowISO,
          updatedAt: nowISO
        };
        basePayload.contactIds = Array.from(new Set([...(basePayload.contactIds || []), newContactId]));
      }
    }

    let finalizedApp = null;
    let savedToCloud = false;

    // 1. Direct Cloud Persist if user session is available
    if (currentUserSession && currentUserSession.uid) {
      try {
        finalizedApp = await pushToFirestoreDirectly(basePayload, currentUserSession, currentFirebaseConfig, matchedApplication?.id);
        savedToCloud = true;

        if (bundledContactPayload) {
          if (finalizedApp && finalizedApp.id) {
            bundledContactPayload.applicationIds = Array.from(new Set([
              finalizedApp.id,
              ...(bundledContactPayload.applicationIds || []).filter(id => !id.startsWith('ext-'))
            ]));
          }
          const pushedContactId = await pushContactToFirestoreDirectly(bundledContactPayload, finalizedApp.id, currentUserSession, currentFirebaseConfig);
          contactSavedToCloud = Boolean(pushedContactId);
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
      if (bundledContactPayload) {
        bundledContactPayload.applicationIds = Array.from(new Set([
          finalizedApp.id,
          ...(bundledContactPayload.applicationIds || []).filter(id => !id.startsWith('ext-'))
        ]));
      }
    }

    // 3. Deliver to open Tracklet tabs via content scripts (Application & Contact)
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((t) => {
        if (t.id) {
          chrome.tabs.sendMessage(t.id, {
            action: 'TRACKLET_EXT_INCOMING_APP',
            payload: finalizedApp,
            persistedToCloud: savedToCloud
          }).catch(() => {});

          if (bundledContactPayload) {
            chrome.tabs.sendMessage(t.id, {
              action: 'TRACKLET_EXT_INCOMING_CONTACT',
              payload: bundledContactPayload,
              persistedToCloud: contactSavedToCloud
            }).catch(() => {});
          }
        }
      });
    });

    // 4. Update extension local storage for Contact if bundled
    if (bundledContactPayload) {
      chrome.storage.local.get(['tracklet_contacts_index', 'tracklet_guest_contacts_v1', 'tracklet_pending_contacts'], (res) => {
        let contactsIndex = res?.tracklet_contacts_index || [];
        let guestContacts = res?.tracklet_guest_contacts_v1 || [];
        let pendingContacts = res?.tracklet_pending_contacts || [];

        const existingIdx = contactsIndex.findIndex(c => c.id === bundledContactPayload.id);
        if (existingIdx >= 0) {
          contactsIndex[existingIdx] = bundledContactPayload;
          guestContacts = guestContacts.map(c => c.id === bundledContactPayload.id ? bundledContactPayload : c);
          pendingContacts = pendingContacts.map(c => c.id === bundledContactPayload.id ? bundledContactPayload : c);
        } else {
          contactsIndex = [bundledContactPayload, ...contactsIndex];
          guestContacts = [bundledContactPayload, ...guestContacts];
          if (!contactSavedToCloud) {
            pendingContacts = [bundledContactPayload, ...pendingContacts];
          }
        }

        chrome.storage.local.set({
          tracklet_contacts_index: contactsIndex,
          tracklet_guest_contacts_v1: guestContacts,
          tracklet_pending_contacts: pendingContacts
        });
      });
    }

    // 5. Update extension local storage & pending queue for Application
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
          : (bundledContactPayload
              ? `${company} — ${role} logged to Tracklet + recruiter contact linked.`
              : `${company} — ${role} logged to Tracklet.`);

        mainContainer.style.display = 'none';
        successView.classList.add('visible');

        // Auto-close popup with 2.8s duration
        scheduleAutoClose(2800);
      });
    });
  }

  function resetPopupFormState() {
    // 1. Reset Application Form State
    if (companyInput) {
      companyInput.value = '';
      companyInput.classList.remove('input-error');
    }
    if (companyDomainInput) companyDomainInput.value = '';
    if (roleInput) {
      roleInput.value = '';
      roleInput.classList.remove('input-error');
    }
    if (locationInput) locationInput.value = '';
    if (dateAppliedInput) {
      dateAppliedInput.value = new Date().toISOString().split('T')[0];
    }
    if (jobLinkInput) jobLinkInput.value = '';
    if (notesInput) notesInput.value = '';
    if (typeof updateCompanyAvatar === 'function') {
      updateCompanyAvatar('', '');
    }
    matchedApplication = null;
    const dupBanner = document.getElementById('duplicate-banner');
    if (dupBanner) dupBanner.style.display = 'none';
    const recCard = document.getElementById('recruiter-contact-card');
    if (recCard) recCard.classList.add('hidden');
    detectedRecruiterContact = null;
    if (typeof clearResumeChip === 'function') {
      clearResumeChip();
    }
    tabDraftMemory.job = null;

    // 2. Reset Contact Form State
    if (contactNameInput) {
      contactNameInput.value = '';
      contactNameInput.classList.remove('input-error');
    }
    if (contactRoleInput) contactRoleInput.value = '';
    if (contactOrgInput) contactOrgInput.value = '';
    if (contactLocationInput) contactLocationInput.value = '';
    if (contactLinkedInInput) contactLinkedInInput.value = '';
    if (contactNotesInput) contactNotesInput.value = '';
    if (typeof setContactCategory === 'function') {
      setContactCategory('Recruiter');
    }
    if (typeof setContactLinkedApp === 'function') {
      setContactLinkedApp('');
    }
    matchedExistingContact = null;
    tabDraftMemory.contact = null;

    // 3. Reset Email Logging State
    if (emailSubjectInput) emailSubjectInput.value = '';
    if (emailCounterpartyInput) emailCounterpartyInput.value = '';
    if (emailBodyInput) emailBodyInput.value = '';
    if (emailDateInput) emailDateInput.value = '';
    if (emailTimeInput) emailTimeInput.value = '';
    selectedEmailMatchedApp = null;
    discoveredRecruiterName = '';
    discoveredRecruiterEmail = '';
    tabDraftMemory.email = null;
  }

  // Auto-close Timer Manager (restores form and hides successView instead of closing persistent panel)
  let closeTimeout = null;
  function scheduleAutoClose(ms = 3200) {
    clearTimeout(closeTimeout);
    closeTimeout = setTimeout(() => {
      if (successView) successView.classList.remove('visible');
      if (mainContainer) mainContainer.style.display = '';
      resetPopupFormState();
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
  async function focusOrOpenWorkspace(appId = null, subpath = '') {
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
        } else if (subpath) {
          const origin = new URL(trackletTab.url).origin;
          await chrome.tabs.update(trackletTab.id, { active: true, url: `${origin}${subpath}` });
        } else {
          await chrome.tabs.update(trackletTab.id, { active: true });
        }
        if (trackletTab.windowId) {
          await chrome.windows.update(trackletTab.windowId, { focused: true });
        }
        return;
      }
    } catch (err) {
      console.warn('Tab focus check failed:', err);
    }

    const cleanBase = resolvedBaseUrl.replace(/\/+$/, '');
    const targetUrl = appId
      ? `${cleanBase}/?appId=${encodeURIComponent(appId)}`
      : (subpath ? `${cleanBase}${subpath}` : cleanBase);

    chrome.tabs.create({ url: targetUrl });
  }

  // Open Tracklet Dashboard Link Handler from Success View
  openTrackletLink.addEventListener('click', (e) => {
    e.preventDefault();
    clearTimeout(closeTimeout);
    focusOrOpenWorkspace();
    if (successView) successView.classList.remove('visible');
    if (mainContainer) mainContainer.style.display = '';
    resetPopupFormState();
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

  // =========================================================================
  // Autofill Hub Controller & ATS Form Detection (US6 / T036 - T040)
  // =========================================================================

  function getProfileStorage() {
    return typeof TrackletProfileStorage !== 'undefined' ? TrackletProfileStorage : null;
  }

  async function loadAndRenderCandidateProfile() {
    const storage = getProfileStorage();
    if (!storage) return;

    try {
      candidateProfile = await storage.loadCandidateProfile();
      if (!candidateProfile) {
        // Fallback default from user account if known
        const userEmail = currentUserSession?.email || '';
        const defaultName = userEmail ? userEmail.split('@')[0].replace(/[._]/g, ' ') : '';
        candidateProfile = {
          fullName: defaultName ? defaultName.charAt(0).toUpperCase() + defaultName.slice(1) : '',
          email: userEmail
        };
      }
      renderCandidateProfile(candidateProfile);
    } catch (e) {
      console.warn('[Tracklet] Failed to load candidate profile:', e);
    }
  }

  function renderCandidateProfile(profile) {
    if (!profile) return;

    const email = profile.email || '';
    const phone = profile.phone || '';
    const location = profile.location || '';
    const workAuth = profile.workAuthorization || '';

    // Initials derivation
    let initials = 'ME';
    if (profile.fullName) {
      const parts = profile.fullName.trim().split(/\s+/);
      if (parts.length >= 2) {
        initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      } else if (parts.length === 1 && parts[0].length > 0) {
        initials = parts[0].slice(0, 2).toUpperCase();
      }
    } else if (email) {
      initials = email.slice(0, 2).toUpperCase();
    }

    if (profileAvatarInitials) profileAvatarInitials.textContent = initials;
    if (profileSummaryName) profileSummaryName.textContent = profile.fullName || 'No name set';
    if (profileSummaryTitle) profileSummaryTitle.textContent = profile.targetTitle || 'Candidate Profile';
    if (profileSummaryEmail) profileSummaryEmail.textContent = email || 'No email set';
    if (profileSummaryPhone) profileSummaryPhone.textContent = phone || 'Not specified';
    if (profileSummaryLocation) profileSummaryLocation.textContent = location || 'Not specified';
    if (profileSummaryWorkAuth) profileSummaryWorkAuth.textContent = workAuth || 'Not specified';

    // Social / portfolio chips
    if (chipLinkedIn) chipLinkedIn.style.display = profile.linkedInUrl ? 'inline-block' : 'none';
    if (chipGitHub) chipGitHub.style.display = profile.githubUrl ? 'inline-block' : 'none';
    if (chipPortfolio) chipPortfolio.style.display = profile.portfolioUrl ? 'inline-block' : 'none';

    // Populate edit drawer inputs
    if (profileEditName) profileEditName.value = profile.fullName || '';
    if (profileEditEmail) profileEditEmail.value = profile.email || '';
    if (profileEditPhone) profileEditPhone.value = profile.phone || '';
    if (profileEditLocation) profileEditLocation.value = profile.location || '';
    if (profileEditWorkAuth) profileEditWorkAuth.value = profile.workAuthorization || '';
    if (profileEditLinkedIn) profileEditLinkedIn.value = profile.linkedInUrl || '';
    if (profileEditGitHub) profileEditGitHub.value = profile.githubUrl || '';
    if (profileEditPortfolio) profileEditPortfolio.value = profile.portfolioUrl || '';
  }

  function setProfileEditMode(isOpen) {
    isProfileEditOpen = isOpen;
    if (profileEditDrawer) profileEditDrawer.style.display = isOpen ? 'block' : 'none';
    if (profileSummaryView) profileSummaryView.style.display = isOpen ? 'none' : 'block';
    if (profileEditToggleLabel) profileEditToggleLabel.textContent = isOpen ? 'Close' : 'Quick Edit';
  }

  async function handleSaveCandidateProfile() {
    const storage = getProfileStorage();
    if (!storage) return;

    const fullName = profileEditName ? profileEditName.value.trim() : '';
    const email = profileEditEmail ? profileEditEmail.value.trim() : '';

    if (!fullName && !email) {
      if (profileEditName) profileEditName.focus();
      return;
    }

    const updates = {
      fullName,
      email,
      phone: profileEditPhone ? profileEditPhone.value.trim() : '',
      location: profileEditLocation ? profileEditLocation.value.trim() : '',
      workAuthorization: profileEditWorkAuth ? profileEditWorkAuth.value.trim() : '',
      linkedInUrl: profileEditLinkedIn ? profileEditLinkedIn.value.trim() : '',
      githubUrl: profileEditGitHub ? profileEditGitHub.value.trim() : '',
      portfolioUrl: profileEditPortfolio ? profileEditPortfolio.value.trim() : ''
    };

    if (profileSaveBtn) {
      profileSaveBtn.disabled = true;
      profileSaveBtn.textContent = 'Saving...';
    }

    try {
      candidateProfile = await storage.saveCandidateProfile(updates);
      renderCandidateProfile(candidateProfile);
      setProfileEditMode(false);
      // Re-scan active tab with updated candidate profile
      checkAtsFormOnActiveTab();
    } catch (err) {
      console.warn('[Tracklet] Failed to save candidate profile:', err);
    } finally {
      if (profileSaveBtn) {
        profileSaveBtn.disabled = false;
        profileSaveBtn.textContent = 'Save Profile';
      }
    }
  }

  function renderChecklist(fieldsMatched = [], populatedFields = [], manualAlerts = []) {
    if (!autofillChecklistCard || !checklistItemsContainer) return;

    if (fieldsMatched.length === 0 && populatedFields.length === 0) {
      autofillChecklistCard.style.display = 'none';
      return;
    }

    autofillChecklistCard.style.display = 'block';
    checklistItemsContainer.innerHTML = '';

    const populatedKeys = new Set((populatedFields || []).map(p => p.candidateKey));
    const populatedMap = new Map((populatedFields || []).map(p => [p.candidateKey, p]));

    if (checklistCountBadge) {
      const count = populatedFields.length > 0 ? `${populatedFields.length}/${fieldsMatched.length} filled` : `${fieldsMatched.length} mapped`;
      checklistCountBadge.textContent = count;
    }

    fieldsMatched.forEach(field => {
      const isPopulated = populatedKeys.has(field.candidateKey);
      const popInfo = populatedMap.get(field.candidateKey);

      const itemEl = document.createElement('div');
      itemEl.className = 'checklist-item';
      itemEl.title = `Click to highlight "${field.label}" on active page`;

      const leftWrap = document.createElement('div');
      leftWrap.className = 'checklist-item-left';

      if (isPopulated) {
        leftWrap.innerHTML = `<svg class="checklist-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
      } else {
        leftWrap.innerHTML = `<svg class="checklist-check-icon" style="color: var(--primary);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>`;
      }

      const titleEl = document.createElement('span');
      titleEl.className = 'checklist-item-title';
      titleEl.textContent = field.label || field.candidateKey;
      leftWrap.appendChild(titleEl);

      const valSnippetEl = document.createElement('span');
      valSnippetEl.className = 'checklist-item-val';
      if (isPopulated && popInfo?.valueSnippet) {
        valSnippetEl.textContent = popInfo.valueSnippet;
      } else {
        valSnippetEl.textContent = 'Mapped';
        valSnippetEl.style.color = 'var(--neutral-muted)';
      }
      leftWrap.appendChild(valSnippetEl);

      const locateHint = document.createElement('span');
      locateHint.className = 'checklist-locate-hint';
      locateHint.textContent = 'Locate';

      itemEl.appendChild(leftWrap);
      itemEl.appendChild(locateHint);

      itemEl.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tabId = tabs[0]?.id;
          if (tabId && field.targetSelector) {
            chrome.tabs.sendMessage(tabId, {
              action: 'SCROLL_TO_FIELD',
              targetSelector: field.targetSelector
            });
          }
        });
      });

      checklistItemsContainer.appendChild(itemEl);
    });

    // Manual Alerts (e.g. File Upload)
    if (manualAlertsContainer && manualAlertsList) {
      if (manualAlerts && manualAlerts.length > 0) {
        manualAlertsContainer.style.display = 'block';
        manualAlertsList.innerHTML = '';
        manualAlerts.forEach(alert => {
          const alertItem = document.createElement('div');
          alertItem.style.display = 'flex';
          alertItem.style.alignItems = 'center';
          alertItem.style.gap = '5px';
          const alertText = typeof alert === 'string' ? alert : (alert.field || 'Upload required');
          alertItem.textContent = `• ${alertText} (upload manually on page)`;
          manualAlertsList.appendChild(alertItem);
        });
      } else {
        manualAlertsContainer.style.display = 'none';
      }
    }
  }

  function checkAtsFormOnActiveTab() {
    if (!autofillStatusPill || !autofillStatusText) return;

    autofillStatusPill.className = 'autofill-status-pill scanning';
    autofillStatusText.textContent = 'Scanning active page for ATS application form...';
    if (autofillTriggerBtn) autofillTriggerBtn.disabled = true;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.id || !activeTab.url || activeTab.url.startsWith('chrome://')) {
        autofillStatusPill.className = 'autofill-status-pill none';
        autofillStatusText.textContent = 'Open an application page to detect form';
        if (autofillChecklistCard) autofillChecklistCard.style.display = 'none';
        return;
      }

      chrome.tabs.sendMessage(activeTab.id, { action: 'DETECT_ATS_FORM' }, (res) => {
        if (chrome.runtime.lastError || !res || !res.result) {
          autofillStatusPill.className = 'autofill-status-pill none';
          autofillStatusText.textContent = 'No application form detected on this page';
          if (autofillChecklistCard) autofillChecklistCard.style.display = 'none';
          currentAtsDetection = null;
          return;
        }

        const detection = res.result;
        currentAtsDetection = detection;

        if (!detection.formElementFound) {
          autofillStatusPill.className = 'autofill-status-pill none';
          autofillStatusText.textContent = 'No application form detected on this page';
          if (autofillChecklistCard) autofillChecklistCard.style.display = 'none';
          if (autofillTriggerBtn) autofillTriggerBtn.disabled = true;
          return;
        }

        const atsNameMap = {
          greenhouse: 'Greenhouse',
          lever: 'Lever',
          workday: 'Workday',
          generic: 'Careers'
        };
        const atsLabel = atsNameMap[detection.ats] || 'Application';
        const matchCount = (detection.fieldsMatched || []).length;

        autofillStatusPill.className = 'autofill-status-pill detected';
        autofillStatusText.textContent = `${atsLabel} Form Detected (${matchCount} fields mapped)`;

        if (autofillTriggerBtn) {
          autofillTriggerBtn.disabled = matchCount === 0;
          const btnText = autofillTriggerBtn.querySelector('#autofill-btn-text');
          if (btnText) btnText.textContent = 'Auto-Fill Application';
        }

        renderChecklist(detection.fieldsMatched || [], [], []);
      });
    });
  }

  function triggerAutofill() {
    if (!autofillTriggerBtn || autofillTriggerBtn.disabled) return;
    if (!currentAtsDetection || !currentAtsDetection.formElementFound) return;

    if (!candidateProfile || (!candidateProfile.fullName && !candidateProfile.email)) {
      setProfileEditMode(true);
      return;
    }

    const btnText = autofillTriggerBtn.querySelector('#autofill-btn-text');
    if (btnText) btnText.textContent = 'Auto-Filling...';
    autofillTriggerBtn.disabled = true;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.id) {
        autofillTriggerBtn.disabled = false;
        if (btnText) btnText.textContent = 'Auto-Fill Application';
        return;
      }

      chrome.tabs.sendMessage(activeTab.id, {
        action: 'EXECUTE_AUTOFILL',
        profile: candidateProfile
      }, (res) => {
        autofillTriggerBtn.disabled = false;
        if (btnText) btnText.textContent = 'Auto-Fill Application';

        if (chrome.runtime.lastError || !res || !res.success) {
          console.warn('[Tracklet] Autofill failed:', chrome.runtime.lastError);
          return;
        }

        if (autofillStatusPill && autofillStatusText) {
          autofillStatusPill.className = 'autofill-status-pill detected';
          autofillStatusText.textContent = `✓ ${res.fieldsPopulatedCount} fields populated safely (Review before submit)`;
        }

        renderChecklist(
          currentAtsDetection.fieldsMatched || [],
          res.populatedFields || [],
          res.manualFieldsRequired || []
        );
      });
    });
  }

  // Autofill Hub Event Listeners
  if (profileQuickEditToggle) {
    profileQuickEditToggle.addEventListener('click', () => {
      setProfileEditMode(!isProfileEditOpen);
    });
  }

  if (profileCancelBtn) {
    profileCancelBtn.addEventListener('click', () => {
      setProfileEditMode(false);
    });
  }

  if (profileSaveBtn) {
    profileSaveBtn.addEventListener('click', handleSaveCandidateProfile);
  }

  if (profileOpenSettingsLink) {
    profileOpenSettingsLink.addEventListener('click', (e) => {
      e.preventDefault();
      focusOrOpenWorkspace(null, '/settings');
    });
  }

  if (autofillTriggerBtn) {
    autofillTriggerBtn.addEventListener('click', triggerAutofill);
  }

  // Load candidate profile on extension startup
  loadAndRenderCandidateProfile();

  // Initialize Stage & Platform UI
  updateStageUI('Saved');
  setPlatform('Company Site');
});
