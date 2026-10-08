/**
 * Tracklet Extension Candidate Profile Storage Helper
 * Storage Key: tracklet_candidate_profile_v1
 * Primary: chrome.storage.sync
 * Fallback: chrome.storage.local
 */

(function (global) {
  const STORAGE_KEY = 'tracklet_candidate_profile_v1';

  /**
   * Normalizes URLs by prepending https:// if missing.
   * @param {string} url
   * @returns {string}
   */
  function normalizeUrl(url) {
    if (!url) return '';
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (!/^https?:\/\//i.test(trimmed)) {
      return `https://${trimmed}`;
    }
    return trimmed;
  }

  /**
   * Normalizes a CandidateProfile payload, deriving first/last names if needed.
   * @param {Object} raw
   * @returns {Object}
   */
  function normalizeCandidateProfile(raw) {
    if (!raw) return null;
    const fullName = (raw.fullName || '').trim();
    let firstName = (raw.firstName || '').trim();
    let lastName = (raw.lastName || '').trim();

    if (fullName && (!firstName || !lastName)) {
      const parts = fullName.split(/\s+/);
      if (parts.length > 0) {
        if (!firstName) firstName = parts[0];
        if (!lastName && parts.length > 1) lastName = parts.slice(1).join(' ');
      }
    }

    return {
      id: raw.id || `cand_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      fullName,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      email: (raw.email || '').trim(),
      phone: (raw.phone || '').trim() || undefined,
      location: (raw.location || '').trim() || undefined,
      linkedInUrl: normalizeUrl(raw.linkedInUrl) || undefined,
      githubUrl: normalizeUrl(raw.githubUrl) || undefined,
      portfolioUrl: normalizeUrl(raw.portfolioUrl) || undefined,
      targetTitle: (raw.targetTitle || '').trim() || undefined,
      workAuthorization: (raw.workAuthorization || '').trim() || undefined,
      preferredResumeName: (raw.preferredResumeName || '').trim() || undefined,
      updatedAt: raw.updatedAt || new Date().toISOString()
    };
  }

  /**
   * Loads candidate profile from chrome.storage.sync with fallback to chrome.storage.local.
   * @returns {Promise<Object|null>}
   */
  function loadCandidateProfile() {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          return resolve(raw ? JSON.parse(raw) : null);
        } catch {
          return resolve(null);
        }
      }

      chrome.storage.sync.get([STORAGE_KEY], (syncRes) => {
        const syncProfile = (!chrome.runtime.lastError && syncRes && syncRes[STORAGE_KEY])
          ? normalizeCandidateProfile(syncRes[STORAGE_KEY])
          : null;

        chrome.storage.local.get([STORAGE_KEY], (localRes) => {
          const localProfile = (!chrome.runtime.lastError && localRes && localRes[STORAGE_KEY])
            ? normalizeCandidateProfile(localRes[STORAGE_KEY])
            : null;

          if (syncProfile && localProfile) {
            const syncTime = syncProfile.updatedAt ? new Date(syncProfile.updatedAt).getTime() : 0;
            const localTime = localProfile.updatedAt ? new Date(localProfile.updatedAt).getTime() : 0;
            return resolve(localTime > syncTime ? localProfile : syncProfile);
          }

          resolve(syncProfile || localProfile || null);
        });
      });
    });
  }

  /**
   * Saves candidate profile to chrome.storage.sync with automatic fallback to chrome.storage.local.
   * @param {Object} profileUpdates
   * @returns {Promise<Object>} The normalized profile saved
   */
  async function saveCandidateProfile(profileUpdates) {
    const existing = (await loadCandidateProfile()) || {};
    const normalized = normalizeCandidateProfile({
      ...existing,
      ...profileUpdates,
      updatedAt: new Date().toISOString()
    });

    return new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
          return resolve(normalized);
        } catch (e) {
          return reject(e);
        }
      }

      const payload = { [STORAGE_KEY]: normalized };

      // Attempt save in sync storage
      chrome.storage.sync.set(payload, () => {
        if (chrome.runtime.lastError) {
          console.warn('[Tracklet ProfileStorage] sync quota or error; falling back to storage.local', chrome.runtime.lastError);
          // Fallback to local storage
          chrome.storage.local.set(payload, () => {
            if (chrome.runtime.lastError) {
              return reject(chrome.runtime.lastError);
            }
            // Remove stale sync profile to prevent resurrecting old data
            chrome.storage.sync.remove([STORAGE_KEY], () => {
              if (chrome.runtime.lastError) {
                console.warn('[Tracklet ProfileStorage] Failed to remove stale sync profile', chrome.runtime.lastError);
              }
              resolve(normalized);
            });
          });
        } else {
          // Also mirror to local storage for offline resiliency
          chrome.storage.local.set(payload, () => {});
          resolve(normalized);
        }
      });
    });
  }

  const TrackletProfileStorage = {
    STORAGE_KEY,
    normalizeCandidateProfile,
    loadCandidateProfile,
    saveCandidateProfile
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrackletProfileStorage;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.TrackletProfileStorage = TrackletProfileStorage;
  }
  global.TrackletProfileStorage = TrackletProfileStorage;
})(typeof self !== 'undefined' ? self : this);
