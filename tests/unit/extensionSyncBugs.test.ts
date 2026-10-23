import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { broadcastDeletedContact, broadcastDeletedApplication } from '../../src/lib/extensionSync';

describe('Extension Synchronization Bug Fixes (#45, #44, #43)', () => {
  let originalChrome: any;
  let originalFetch: any;

  beforeEach(() => {
    originalChrome = (globalThis as any).chrome;
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve('{}'),
        json: () => Promise.resolve({}),
      } as any)
    );
  });

  afterEach(() => {
    (globalThis as any).chrome = originalChrome;
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('Issue #45: Extension Email tab Switch Job picker outside webmail pages', () => {
    it('broadcasts contact deletion and prunes chrome.storage.local', () => {
      const mockStorage: Record<string, any> = {
        tracklet_contacts_index: [{ id: 'c-1', name: 'Alice' }, { id: 'c-2', name: 'Bob' }],
        tracklet_pending_contacts: [{ id: 'c-1', name: 'Alice' }],
      };

      (globalThis as any).chrome = {
        storage: {
          local: {
            get: vi.fn((keys: string[], cb: (res: any) => void) => {
              const res: Record<string, any> = {};
              keys.forEach((k) => {
                res[k] = mockStorage[k];
              });
              cb(res);
            }),
            set: vi.fn((items: Record<string, any>) => {
              Object.assign(mockStorage, items);
            }),
          },
        },
      };

      const postMessageSpy = vi.spyOn(window, 'postMessage');
      broadcastDeletedContact('c-1');

      expect(postMessageSpy).toHaveBeenCalledWith(
        {
          type: 'TRACKLET_EXT_DELETE_CONTACT',
          payload: { id: 'c-1', ids: ['c-1'] },
        },
        window.location.origin
      );

      // Verify direct storage prune
      expect(mockStorage.tracklet_contacts_index.map((c: any) => c.id)).toEqual(['c-2']);
      expect(mockStorage.tracklet_pending_contacts).toEqual([]);
    });

    it('populates applications list on non-webmail pages and renders them in the Switch Job picker', async () => {
      const popupHtml = fs.readFileSync(path.resolve(__dirname, '../../extension/popup.html'), 'utf-8');
      const popupJs = fs.readFileSync(path.resolve(__dirname, '../../extension/popup.js'), 'utf-8');

      const bodyMatch = popupHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      document.body.innerHTML = (bodyMatch ? bodyMatch[1] : popupHtml).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

      const mockStorage: Record<string, any> = {
        tracklet_apps_index: [
          {
            id: 'app-linear-1',
            company: 'Linear',
            role: 'Product Engineer',
            status: 'Interview',
            jobLink: 'https://linear.app/careers/pe',
            companyDomain: 'linear.app',
            contactEmail: 'talent@linear.app',
            contactEmails: ['talent@linear.app'],
          },
          {
            id: 'app-stripe-2',
            company: 'Stripe',
            role: 'Frontend Architect',
            status: 'Applied',
            jobLink: 'https://stripe.com/jobs/fa',
            companyDomain: 'stripe.com',
            contactEmail: 'recruiting@stripe.com',
            contactEmails: ['recruiting@stripe.com'],
          },
        ],
        tracklet_pending_apps: [],
        tracklet_contacts_index: [],
        tracklet_pending_contacts: [],
      };

      (globalThis as any).chrome = {
        storage: {
          local: {
            get: vi.fn((keys: any, cb?: any) => {
              const res: Record<string, any> = {};
              const keyList = Array.isArray(keys) ? keys : Object.keys(keys || {});
              keyList.forEach((k) => {
                res[k] = mockStorage[k];
              });
              if (cb) cb(res);
              return Promise.resolve(res);
            }),
            set: vi.fn((items: Record<string, any>, cb?: any) => {
              Object.assign(mockStorage, items);
              if (cb) cb();
              return Promise.resolve();
            }),
          },
        },
        tabs: {
          query: vi.fn(() =>
            Promise.resolve([
              {
                id: 101,
                active: true,
                url: 'https://github.com/torvalds/linux', // Non-webmail page!
                title: 'torvalds/linux: Linux kernel source tree',
              },
            ])
          ),
          get: vi.fn(() => Promise.resolve({ id: 101, active: true })),
          sendMessage: vi.fn(() => Promise.reject(new Error('No receiver'))),
          onActivated: { addListener: vi.fn() },
          onUpdated: { addListener: vi.fn() },
        },
        runtime: {
          lastError: null,
          sendMessage: vi.fn(),
          onMessage: { addListener: vi.fn() },
          getManifest: () => ({ version: '1.2.7', name: 'Tracklet' }),
        },
        action: {
          setBadgeText: vi.fn(),
          setBadgeBackgroundColor: vi.fn(),
        },
      };

      // Run popup.js script in the DOM
      const executePopup = new Function(popupJs);
      executePopup();

      // Trigger DOMContentLoaded
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 60));

      // Switch to Email tab
      const emailTab = document.querySelector('.companion-tab[data-tab="email"]') as HTMLElement;
      expect(emailTab).toBeTruthy();
      emailTab.click();
      await new Promise((r) => setTimeout(r, 30));

      // Click "Switch Job" button to open popover
      const changeAppBtn = document.getElementById('change-app-btn') as HTMLElement;
      expect(changeAppBtn).toBeTruthy();
      changeAppBtn.click();
      await new Promise((r) => setTimeout(r, 30));

      const appSelectorList = document.getElementById('app-selector-list') as HTMLElement;
      expect(appSelectorList).toBeTruthy();

      // Verify that applications are rendered, NOT "No applications found"
      const appItems = appSelectorList.querySelectorAll('.app-selector-item');
      expect(appItems.length).toBe(2);

      const linearItem = Array.from(appItems).find((el) => el.textContent?.includes('Linear'));
      expect(linearItem).toBeTruthy();
      expect(linearItem?.textContent).toContain('Product Engineer');

      // Test search filter
      const searchInput = document.getElementById('app-search-input') as HTMLInputElement;
      expect(searchInput).toBeTruthy();
      searchInput.value = 'Stripe';
      searchInput.dispatchEvent(new Event('input'));

      const filteredItems = appSelectorList.querySelectorAll('.app-selector-item');
      expect(filteredItems.length).toBe(1);
      expect(filteredItems[0].textContent).toContain('Stripe');
      expect(filteredItems[0].textContent).toContain('Frontend Architect');
    });
  });

  describe('Issue #44: Deleted contact in Contacts Hub reflected in extension', () => {
    it('does not display duplicate/update status for deleted contact when tracklet_contacts_index is empty', async () => {
      const popupHtml = fs.readFileSync(path.resolve(__dirname, '../../extension/popup.html'), 'utf-8');
      const popupJs = fs.readFileSync(path.resolve(__dirname, '../../extension/popup.js'), 'utf-8');

      const bodyMatch = popupHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      document.body.innerHTML = (bodyMatch ? bodyMatch[1] : popupHtml).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

      const mockStorage: Record<string, any> = {
        tracklet_apps_index: [],
        tracklet_pending_apps: [],
        tracklet_contacts_index: [], // User deleted the contact from Contacts Hub!
        tracklet_pending_contacts: [], // Not pending upload
      };

      (globalThis as any).chrome = {
        storage: {
          local: {
            get: vi.fn((keys: any, cb?: any) => {
              const res: Record<string, any> = {};
              const keyList = Array.isArray(keys) ? keys : Object.keys(keys || {});
              keyList.forEach((k) => {
                res[k] = mockStorage[k];
              });
              if (cb) cb(res);
              return Promise.resolve(res);
            }),
            set: vi.fn((items: Record<string, any>, cb?: any) => {
              Object.assign(mockStorage, items);
              if (cb) cb();
              return Promise.resolve();
            }),
          },
        },
        tabs: {
          query: vi.fn(() =>
            Promise.resolve([
              {
                id: 102,
                active: true,
                url: 'https://www.linkedin.com/in/sarah-connor/',
                title: 'Sarah Connor | LinkedIn',
              },
            ])
          ),
          get: vi.fn(() => Promise.resolve({ id: 102, active: true })),
          sendMessage: vi.fn((tabId: number, message: any, optionsOrCallback?: any, responseCallback?: any) => {
            const cb = typeof optionsOrCallback === 'function' ? optionsOrCallback : responseCallback;
            const res = {
              pageType: 'contact_profile',
              profileData: {
                fullName: 'Sarah Connor',
                name: 'Sarah Connor',
                role: 'Lead Technical Recruiter',
                organization: 'Cyberdyne',
                linkedInUrl: 'https://linkedin.com/in/sarah-connor',
              },
            };
            if (cb) cb(res);
            return Promise.resolve(res);
          }),
          onActivated: { addListener: vi.fn() },
          onUpdated: { addListener: vi.fn() },
        },
        runtime: {
          lastError: null,
          sendMessage: vi.fn(),
          onMessage: { addListener: vi.fn() },
          getManifest: () => ({ version: '1.2.7', name: 'Tracklet' }),
        },
        action: {
          setBadgeText: vi.fn(),
          setBadgeBackgroundColor: vi.fn(),
        },
      };

      const executePopup = new Function(popupJs);
      executePopup();

      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 200));

      // Status banner should NOT show "✓ Saved in Contacts Hub"
      const statusBanner = document.getElementById('contact-status-banner');
      const isBannerVisible = statusBanner && statusBanner.style.display !== 'none';
      expect(isBannerVisible).toBeFalsy();

      // Save button should show "Save Contact to Tracklet" (not "Update Contact")
      const saveBtnText = document.getElementById('save-contact-btn')?.querySelector('span')?.textContent;
      expect(saveBtnText).toBe('Save Contact to Tracklet');
    });
  });

  describe('Issue #43: Job deleted in web app does not resurrect', () => {
    it('does not display duplicate/update status when tracklet_apps_index is empty', async () => {
      const popupHtml = fs.readFileSync(path.resolve(__dirname, '../../extension/popup.html'), 'utf-8');
      const popupJs = fs.readFileSync(path.resolve(__dirname, '../../extension/popup.js'), 'utf-8');

      const bodyMatch = popupHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      document.body.innerHTML = (bodyMatch ? bodyMatch[1] : popupHtml).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

      const mockStorage: Record<string, any> = {
        tracklet_apps_index: [], // Job was deleted in web app!
        tracklet_pending_apps: [], // Not pending upload
        tracklet_contacts_index: [],
        tracklet_pending_contacts: [],
      };

      (globalThis as any).chrome = {
        storage: {
          local: {
            get: vi.fn((keys: any, cb?: any) => {
              const res: Record<string, any> = {};
              const keyList = Array.isArray(keys) ? keys : Object.keys(keys || {});
              keyList.forEach((k) => {
                res[k] = mockStorage[k];
              });
              if (cb) cb(res);
              return Promise.resolve(res);
            }),
            set: vi.fn((items: Record<string, any>, cb?: any) => {
              Object.assign(mockStorage, items);
              if (cb) cb();
              return Promise.resolve();
            }),
          },
        },
        tabs: {
          query: vi.fn(() =>
            Promise.resolve([
              {
                id: 103,
                active: true,
                url: 'https://acme.com/jobs/staff',
                title: 'Staff Engineer at Acme Corp',
              },
            ])
          ),
          get: vi.fn(() => Promise.resolve({ id: 103, active: true })),
          sendMessage: vi.fn((tabId: number, message: any, optionsOrCallback?: any, responseCallback?: any) => {
            const cb = typeof optionsOrCallback === 'function' ? optionsOrCallback : responseCallback;
            const res = {
              pageType: 'job_posting',
              jobData: {
                company: 'Acme Corp',
                role: 'Staff Engineer',
                url: 'https://acme.com/jobs/staff',
              },
            };
            if (cb) cb(res);
            return Promise.resolve(res);
          }),
          onActivated: { addListener: vi.fn() },
          onUpdated: { addListener: vi.fn() },
        },
        runtime: {
          lastError: null,
          sendMessage: vi.fn(),
          onMessage: { addListener: vi.fn() },
          getManifest: () => ({ version: '1.2.7', name: 'Tracklet' }),
        },
        action: {
          setBadgeText: vi.fn(),
          setBadgeBackgroundColor: vi.fn(),
        },
      };

      const executePopup = new Function(popupJs);
      executePopup();

      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 60));

      // Duplicate banner must NOT display "Already tracked in Tracklet (Interview)"
      const duplicateBanner = document.getElementById('duplicate-banner');
      const isDuplicateVisible = duplicateBanner && duplicateBanner.style.display !== 'none';
      expect(isDuplicateVisible).toBeFalsy();

      // Save button should display "Save Application" (not "Update Application")
      const saveBtn = document.getElementById('save-btn');
      expect(saveBtn?.querySelector('span')?.textContent).toBe('Save Application');
    });

    it('prunes deleted application from storage when broadcastDeletedApplication is invoked', () => {
      const mockStorage: Record<string, any> = {
        tracklet_apps_index: [{ id: 'app-del-1' }, { id: 'app-stay-2' }],
        tracklet_pending_apps: [{ id: 'app-del-1' }],
      };

      (globalThis as any).chrome = {
        storage: {
          local: {
            get: vi.fn((keys: string[], cb: (res: any) => void) => {
              const res: Record<string, any> = {};
              keys.forEach((k) => {
                res[k] = mockStorage[k];
              });
              cb(res);
            }),
            set: vi.fn((items: Record<string, any>) => {
              Object.assign(mockStorage, items);
            }),
          },
        },
      };

      const postMessageSpy = vi.spyOn(window, 'postMessage');
      broadcastDeletedApplication('app-del-1');

      expect(postMessageSpy).toHaveBeenCalledWith(
        {
          type: 'TRACKLET_EXT_DELETE_APPLICATION',
          payload: { id: 'app-del-1' },
        },
        window.location.origin
      );

      expect(mockStorage.tracklet_apps_index).toEqual([{ id: 'app-stay-2' }]);
      expect(mockStorage.tracklet_pending_apps).toEqual([]);
    });
  });
});
