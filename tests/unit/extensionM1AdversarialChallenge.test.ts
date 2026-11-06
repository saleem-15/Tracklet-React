import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Adversarial Empirical Challenge Suite — Extension M1 UI/UX Refactor', () => {
  let originalChrome: any;
  let originalFetch: any;
  let createdTabs: any[];

  const popupHtmlPath = path.resolve(__dirname, '../../extension/popup.html');
  const popupCssPath = path.resolve(__dirname, '../../extension/popup.css');
  const popupJsPath = path.resolve(__dirname, '../../extension/popup.js');

  const popupHtml = fs.readFileSync(popupHtmlPath, 'utf-8');
  const popupCss = fs.readFileSync(popupCssPath, 'utf-8');
  const popupJs = fs.readFileSync(popupJsPath, 'utf-8');

  function setupDOM(customStorage: Record<string, any> = {}) {
    createdTabs = [];
    const bodyMatch = popupHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    document.body.innerHTML = (bodyMatch ? bodyMatch[1] : popupHtml).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

    const mockStorage: Record<string, any> = {
      tracklet_apps_index: [],
      tracklet_pending_apps: [],
      tracklet_contacts_index: [],
      tracklet_pending_contacts: [],
      ...customStorage,
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
              id: 999,
              active: true,
              url: 'https://example.com/jobs/senior-engineer',
              title: 'Senior Engineer at Example Corp',
            },
          ])
        ),
        get: vi.fn(() => Promise.resolve({ id: 999, active: true })),
        sendMessage: vi.fn(() => Promise.resolve({ pageType: 'generic' })),
        create: vi.fn((opts: any) => {
          createdTabs.push(opts);
          return Promise.resolve({ id: 1000 + createdTabs.length, ...opts });
        }),
        update: vi.fn((tabId: number, opts: any) => Promise.resolve({ id: tabId, ...opts })),
        onActivated: { addListener: vi.fn() },
        onUpdated: { addListener: vi.fn() },
      },
      runtime: {
        lastError: null,
        sendMessage: vi.fn(),
        onMessage: { addListener: vi.fn() },
        getManifest: () => ({ version: '1.3.10', name: 'Tracklet' }),
      },
      action: {
        setBadgeText: vi.fn(),
        setBadgeBackgroundColor: vi.fn(),
      },
      windows: {
        update: vi.fn(() => Promise.resolve()),
      },
    };

    // Execute popup.js in Happy-DOM context
    const runPopup = new Function(popupJs);
    runPopup();
  }

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

  describe('1. Static Markup & Contract Integrity', () => {
    it('verifies #success-view and dead references are completely purged', () => {
      expect(popupHtml).not.toContain('id="success-view"');
      expect(popupHtml).not.toContain('id="open-tracklet-link"');
      expect(popupCss).not.toContain('.success-view');
      expect(popupJs).not.toContain('successView.addEventListener');
      expect(popupJs).not.toContain('openTrackletLink.addEventListener');
    });

    it('verifies AI Boost buttons have clean utility styling without sparkles emoji', () => {
      expect(popupHtml).not.toContain('✨ AI Boost');
      expect(popupHtml).toContain('id="btn-ai-boost-job"');
      expect(popupHtml).toContain('id="btn-ai-boost-contact"');
    });

    it('verifies outbound links have target="_blank" rel="noopener noreferrer"', () => {
      const linkRegex = /<a\s+[^>]*id="profile-open-settings-link"[^>]*>/i;
      const match = popupHtml.match(linkRegex);
      expect(match).toBeTruthy();
      expect(match![0]).toContain('target="_blank"');
      expect(match![0]).toContain('rel="noopener noreferrer"');
    });

    it('verifies popup.css contains amber styling for unauthenticated dot and emerald for connected dot', () => {
      expect(popupCss).toMatch(/\.user-account-dot\s*\{[^}]*#f59e0b/);
      expect(popupCss).toMatch(/\.user-account-dot\.connected\s*\{[^}]*#10b981/);
    });

    it('verifies progressive disclosure animation easing matches cubic-bezier(0.16, 1, 0.3, 1)', () => {
      expect(popupCss).toContain('cubic-bezier(0.16, 1, 0.3, 1)');
      expect(popupCss).toContain('grid-template-rows');
    });
  });

  describe('2. Authentication State Transitions & Auth Gate', () => {
    it('renders calm unauthenticated state when no session is present in storage', async () => {
      setupDOM({ tracklet_user_session: null });
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 50));

      const dot = document.getElementById('user-account-dot');
      const email = document.getElementById('user-account-email');
      const badge = document.getElementById('user-account-badge');
      const banner = document.getElementById('auth-gate-banner');

      expect(dot).toBeTruthy();
      expect(email).toBeTruthy();
      expect(badge).toBeTruthy();
      expect(banner).toBeTruthy();

      // Dot must NOT be connected (subtle amber default in CSS)
      expect(dot?.classList.contains('connected')).toBe(false);

      // Email text must prompt Sign In
      expect(email?.textContent?.trim()).toBe('Sign In');

      // Badge title must explain unauthenticated state
      expect(badge?.title).toContain('Not signed in');

      // Auth gate banner must be visible
      expect(banner?.style.display).not.toBe('none');
    });

    it('renders connected candidate state when session is present in storage', async () => {
      setupDOM({
        tracklet_user_session: {
          uid: 'cand_12345',
          email: 'alex@tracklet.com',
        },
      });
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 50));

      const dot = document.getElementById('user-account-dot');
      const email = document.getElementById('user-account-email');
      const badge = document.getElementById('user-account-badge');
      const banner = document.getElementById('auth-gate-banner');

      // Dot must have .connected class (emerald green)
      expect(dot?.classList.contains('connected')).toBe(true);

      // Email text must show candidate email
      expect(email?.textContent?.trim()).toBe('alex@tracklet.com');

      // Badge title shows connected account
      expect(badge?.title).toBe('Connected: alex@tracklet.com');

      // Auth gate banner must be hidden
      expect(banner?.style.display).toBe('none');
    });

    it('truncates candidate email if length exceeds 20 characters to prevent header overflow', async () => {
      setupDOM({
        tracklet_user_session: {
          uid: 'cand_999',
          email: 'verylongcandidateaddress777@gmail.com',
        },
      });
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 50));

      const email = document.getElementById('user-account-email');
      expect(email?.textContent?.trim()).toBe('verylongcandidateaddress777');
    });

    it('triggers web sign-in when #auth-gate-signin-btn is clicked', async () => {
      setupDOM({ tracklet_user_session: null });
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 50));

      const signinBtn = document.getElementById('auth-gate-signin-btn');
      expect(signinBtn).toBeTruthy();
      signinBtn?.click();
      await new Promise((r) => setTimeout(r, 30));

      // Should open a new tab targeting /login?source=extension
      expect(createdTabs.length).toBeGreaterThan(0);
      expect(createdTabs[0].url).toContain('/login?source=extension');
    });

    it('triggers web sign-in when unauthenticated #user-account-badge is clicked', async () => {
      setupDOM({ tracklet_user_session: null });
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 50));

      const badge = document.getElementById('user-account-badge');
      expect(badge).toBeTruthy();
      badge?.click();
      await new Promise((r) => setTimeout(r, 30));

      expect(createdTabs.length).toBeGreaterThan(0);
      expect(createdTabs[0].url).toContain('/login?source=extension');
    });

    it('handles session without email by displaying Connected and UID in title', async () => {
      setupDOM({
        tracklet_user_session: {
          uid: 'user_anonymous_789',
        },
      });
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 50));

      const dot = document.getElementById('user-account-dot');
      const email = document.getElementById('user-account-email');
      const badge = document.getElementById('user-account-badge');

      expect(dot?.classList.contains('connected')).toBe(true);
      expect(email?.textContent?.trim()).toBe('Connected');
      expect(badge?.title).toBe('Connected: user_anonymous_789');
    });

    it('empirically tests live BroadcastChannel TRACKLET_AUTH_SYNC message reception', async () => {
      setupDOM({ tracklet_user_session: null });
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 50));

      const dot = document.getElementById('user-account-dot');
      const email = document.getElementById('user-account-email');
      const banner = document.getElementById('auth-gate-banner');

      expect(dot?.classList.contains('connected')).toBe(false);
      expect(email?.textContent?.trim()).toBe('Sign In');
      expect(banner?.style.display).not.toBe('none');

      // Now web app broadcasts auth sync
      const channel = new BroadcastChannel('tracklet_extension_channel');
      channel.postMessage({
        type: 'TRACKLET_AUTH_SYNC',
        payload: {
          user: { uid: 'synced_user_456', email: 'live@tracklet.app' },
        },
      });
      await new Promise((r) => setTimeout(r, 100));

      // Notice: In popup.js line 1251, authBc.onmessage sets storage but does NOT call updateUserBadge(currentUserSession)
      // So the live UI does not immediately reflect the sync without an explicit updateUserBadge call or reload
      const liveDotConnected = dot?.classList.contains('connected');
      channel.close();

      // With live auth sync wired, the header dot is immediately connected
      expect(liveDotConnected).toBe(true);
      expect(email?.textContent?.trim()).toBe('live@tracklet.app');
      expect(banner?.style.display).toBe('none');
    });
  });

  describe('3. Progressive Disclosure & Layout Contract', () => {
    it('survives rapid consecutive clicks on disclosure toggle maintaining state consistency', async () => {
      setupDOM();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 50));

      const disclosureContainer = document.getElementById('job-additional-details');
      const toggleBtn = document.getElementById('disclosure-toggle-btn');
      const toggleText = document.getElementById('disclosure-toggle-text');

      // Rapidly toggle 7 times (odd number -> ends expanded)
      for (let i = 0; i < 7; i++) {
        toggleBtn?.click();
      }

      expect(disclosureContainer?.classList.contains('expanded')).toBe(true);
      expect(toggleBtn?.getAttribute('aria-expanded')).toBe('true');
      expect(toggleText?.textContent?.trim()).toBe('- Hide Details & Notes');

      // Click once more (even number -> ends collapsed)
      toggleBtn?.click();
      expect(disclosureContainer?.classList.contains('expanded')).toBe(false);
      expect(toggleBtn?.getAttribute('aria-expanded')).toBe('false');
      expect(toggleText?.textContent?.trim()).toBe('+ Add Details & Notes');
    });
    it('initializes in collapsed state with Job Essentials exposed upfront', async () => {
      setupDOM();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 50));

      const disclosureContainer = document.getElementById('job-additional-details');
      const toggleBtn = document.getElementById('disclosure-toggle-btn');
      const toggleText = document.getElementById('disclosure-toggle-text');

      expect(disclosureContainer).toBeTruthy();
      expect(toggleBtn).toBeTruthy();
      expect(toggleText).toBeTruthy();

      // Starts collapsed
      expect(disclosureContainer?.classList.contains('expanded')).toBe(false);
      expect(toggleBtn?.getAttribute('aria-expanded')).toBe('false');
      expect(toggleText?.textContent?.trim()).toBe('+ Add Details & Notes');

      // Job Essentials must be outside the collapsible disclosure container
      const companyInput = document.getElementById('company');
      const companyAvatar = document.getElementById('company-avatar');
      const aiBoostJobBtn = document.getElementById('btn-ai-boost-job');
      const roleInput = document.getElementById('role');
      const stageSelector = document.getElementById('stage-selector-container');
      const locationInput = document.getElementById('location');
      const dateAppliedInput = document.getElementById('dateApplied');
      const jobLinkInput = document.getElementById('jobLink');

      expect(companyInput).toBeTruthy();
      expect(companyAvatar).toBeTruthy();
      expect(aiBoostJobBtn).toBeTruthy();
      expect(roleInput).toBeTruthy();
      expect(stageSelector).toBeTruthy();
      expect(locationInput).toBeTruthy();
      expect(dateAppliedInput).toBeTruthy();
      expect(jobLinkInput).toBeTruthy();

      expect(disclosureContainer?.contains(companyInput!)).toBe(false);
      expect(disclosureContainer?.contains(companyAvatar!)).toBe(false);
      expect(disclosureContainer?.contains(roleInput!)).toBe(false);
      expect(disclosureContainer?.contains(stageSelector!)).toBe(false);
      expect(disclosureContainer?.contains(locationInput!)).toBe(false);

      // Secondary details must be inside the collapsible disclosure container
      const platformSelect = document.getElementById('platform-select-container');
      const notesContainer = document.getElementById('notes-rich-container');
      const notesEditor = document.getElementById('notes-editor');

      expect(platformSelect).toBeTruthy();
      expect(notesContainer).toBeTruthy();
      expect(notesEditor).toBeTruthy();

      expect(disclosureContainer?.contains(platformSelect!)).toBe(true);
      expect(disclosureContainer?.contains(notesContainer!)).toBe(true);
    });

    it('toggles expansion state and aria-expanded on click', async () => {
      setupDOM();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 50));

      const disclosureContainer = document.getElementById('job-additional-details');
      const toggleBtn = document.getElementById('disclosure-toggle-btn');
      const toggleText = document.getElementById('disclosure-toggle-text');

      // Click to expand
      toggleBtn?.click();
      expect(disclosureContainer?.classList.contains('expanded')).toBe(true);
      expect(toggleBtn?.getAttribute('aria-expanded')).toBe('true');
      expect(toggleText?.textContent?.trim()).toBe('- Hide Details & Notes');

      // Click to collapse
      toggleBtn?.click();
      expect(disclosureContainer?.classList.contains('expanded')).toBe(false);
      expect(toggleBtn?.getAttribute('aria-expanded')).toBe('false');
      expect(toggleText?.textContent?.trim()).toBe('+ Add Details & Notes');
    });
  });

  describe('4. Notes Section Invariance (F6 Contract)', () => {
    it('preserves Object.defineProperty on #notes with getter and setter', async () => {
      setupDOM();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 50));

      const notesInput = document.getElementById('notes') as HTMLInputElement;
      const notesEditor = document.getElementById('notes-editor') as HTMLElement;
      const notesRaw = document.getElementById('notes-raw') as HTMLTextAreaElement;

      expect(notesInput).toBeTruthy();
      expect(notesEditor).toBeTruthy();
      expect(notesRaw).toBeTruthy();

      // Setting notesInput.value updates raw and editor
      notesInput.value = '## Technical Round Notes\n- Discussed React architecture';
      expect(notesRaw.value).toContain('Discussed React architecture');

      // Reading notesInput.value returns the serialized markdown
      expect(notesInput.value).toContain('Discussed React architecture');
    });

    it('switches between rich and raw markdown mode cleanly', async () => {
      setupDOM();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 50));

      const toggleMdBtn = document.getElementById('btn-toggle-md');
      const notesEditor = document.getElementById('notes-editor');
      const notesRaw = document.getElementById('notes-raw');

      expect(toggleMdBtn).toBeTruthy();

      // Click toggle MD button
      toggleMdBtn?.click();
      expect(notesRaw?.style.display).not.toBe('none');
      expect(notesEditor?.style.display).toBe('none');

      // Click again to toggle back
      toggleMdBtn?.click();
      expect(notesRaw?.style.display).toBe('none');
      expect(notesEditor?.style.display).not.toBe('none');
    });
  });

  describe('5. Empty States & Resilient Interaction Handlers', () => {
    it('wires job empty state manual entry and re-scan buttons', async () => {
      setupDOM();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 50));

      const jobEmptyState = document.getElementById('job-empty-state');
      const manualBtn = document.getElementById('btn-manual-job-entry');

      expect(jobEmptyState).toBeTruthy();
      expect(manualBtn).toBeTruthy();

      // Simulate empty state active
      jobEmptyState!.style.display = 'block';

      manualBtn?.click();
      expect(jobEmptyState?.style.display).toBe('none');
    });

    it('triggers #companion-toast and resets form when saving a job with valid session', async () => {
      setupDOM({
        tracklet_user_session: {
          uid: 'user_cand_999',
          email: 'saved@tracklet.app',
          idToken: 'mock-token',
        },
      });
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 100));

      const companyInput = document.getElementById('company') as HTMLInputElement;
      const roleInput = document.getElementById('role') as HTMLInputElement;
      const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
      const companionToast = document.getElementById('companion-toast') as HTMLElement;
      const toastTitle = document.getElementById('toast-title') as HTMLElement;

      companyInput.value = 'Stripe';
      companyInput.dispatchEvent(new Event('input'));
      roleInput.value = 'Staff Infrastructure Engineer';
      roleInput.dispatchEvent(new Event('input'));

      expect(saveBtn.disabled).toBe(false);

      saveBtn.click();
      // Allow async pushToFirestoreDirectly and storage callbacks to complete
      await new Promise((r) => setTimeout(r, 250));

      expect(companionToast.style.display).toBe('flex');
      expect(toastTitle.textContent).toMatch(/Saved|Application/);
      expect(companyInput.value).toBe('');
      expect(roleInput.value).toBe('');
    });

    it('handles Escape key by closing all dropdowns without throwing', async () => {
      setupDOM();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 50));

      const stageContainer = document.getElementById('stage-selector-container');
      const platformContainer = document.getElementById('platform-select-container');

      stageContainer?.classList.add('open');
      platformContainer?.classList.add('open');

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(stageContainer?.classList.contains('open')).toBe(false);
      expect(platformContainer?.classList.contains('open')).toBe(false);
    });
  });
});
