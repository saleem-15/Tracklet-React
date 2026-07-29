/**
 * Tracklet Extension Background Service Worker (Manifest V3)
 * Manages context menus, badge indicators, and cross-tab event messaging.
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
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'tracklet-save-page' && tab && tab.id) {
    // Inject or send message to content script
    chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_PAGE_DATA' }, (response) => {
      if (chrome.runtime.lastError || !response) {
        // Fallback: store basic info directly
        const fallbackData = {
          role: tab.title || 'Job Opening',
          company: getDomainName(tab.url),
          platform: 'Company Site',
          jobLink: tab.url,
          notes: info.selectionText || '',
          dateApplied: new Date().toISOString().split('T')[0],
          status: 'Wishlist',
          createdAt: new Date().toISOString()
        };
        savePendingApplication(fallbackData);
      } else {
        if (info.selectionText) {
          response.notes = info.selectionText;
        }
        savePendingApplication(response);
      }
    });
  }
});

// Extract domain fallback
function getDomainName(urlStr) {
  try {
    const url = new URL(urlStr);
    const host = url.hostname.replace(/^www\./, '');
    return host.split('.')[0].toUpperCase();
  } catch (e) {
    return 'Company';
  }
}

// Save application to chrome.storage.local
function savePendingApplication(appData) {
  const newApp = {
    id: `ext-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    userId: 'guest',
    company: appData.company || 'Unknown Company',
    role: appData.role || 'Job Role',
    platform: appData.platform || 'Company Site',
    dateApplied: new Date().toISOString().split('T')[0],
    status: appData.status || 'Applied',
    jobLink: appData.jobLink || '',
    notes: appData.notes || '',
    companyDomain: appData.domain || '',
    stageUpdatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  chrome.storage.local.get(['tracklet_pending_apps', 'tracklet_guest_apps_v1'], (result) => {
    const pending = result.tracklet_pending_apps || [];
    const guestApps = result.tracklet_guest_apps_v1 || [];

    const updatedPending = [newApp, ...pending];
    const updatedGuest = [newApp, ...guestApps];

    chrome.storage.local.set({
      tracklet_pending_apps: updatedPending,
      tracklet_guest_apps_v1: updatedGuest
    }, () => {
      // Flash success badge on extension icon
      chrome.action.setBadgeText({ text: '✓' });
      chrome.action.setBadgeBackgroundColor({ color: '#059669' }); // Emerald green
      setTimeout(() => {
        chrome.action.setBadgeText({ text: '' });
      }, 2500);
    });
  });
}

// Listen for custom messages from popup
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
