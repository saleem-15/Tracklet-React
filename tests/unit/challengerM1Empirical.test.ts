import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Empirical Challenger M1 Suite — Tracklet Extension Refactor', () => {
  let popupHtml: string;
  let popupJs: string;
  let jobBoardRegistryJs: string;
  let JobBoardRegistry: any;
  let mockStorage: Record<string, any>;

  beforeEach(() => {
    popupHtml = fs.readFileSync(path.resolve(__dirname, '../../extension/popup.html'), 'utf-8');
    popupJs = fs.readFileSync(path.resolve(__dirname, '../../extension/popup.js'), 'utf-8');
    jobBoardRegistryJs = fs.readFileSync(path.resolve(__dirname, '../../extension/jobBoardRegistry.js'), 'utf-8');

    // Evaluate JobBoardRegistry
    const registryFn = new Function('module', 'exports', jobBoardRegistryJs + '\nreturn typeof module !== "undefined" && module.exports ? module.exports : self.JobBoardRegistry;');
    const mockModule = { exports: {} };
    JobBoardRegistry = registryFn(mockModule, mockModule.exports) || mockModule.exports;
    (globalThis as any).JobBoardRegistry = JobBoardRegistry;
    (window as any).JobBoardRegistry = JobBoardRegistry;

    // Load popup.html into DOM
    const bodyMatch = popupHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    document.body.innerHTML = (bodyMatch ? bodyMatch[1] : popupHtml).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

    mockStorage = {
      tracklet_user_session: {
        uid: 'user-emp-123',
        email: 'challenger@tracklet.test',
        idToken: 'mock-id-token',
      },
      tracklet_apps_index: [],
      tracklet_pending_apps: [],
      tracklet_contacts_index: [],
      tracklet_pending_contacts: [],
      tracklet_logged_emails: [],
    };

    (globalThis as any).fetch = vi.fn().mockImplementation((url: string) => {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          name: 'projects/demo-tracklet/databases/(default)/documents/users/user-emp-123/apps/app-mock-id',
          fields: {}
        }),
        text: () => Promise.resolve('ok'),
      });
    });

    (globalThis as any).chrome = {
      storage: {
        local: {
          get: vi.fn((keys: any, cb?: any) => {
            const res: Record<string, any> = {};
            const keyList = Array.isArray(keys) ? keys : typeof keys === 'string' ? [keys] : Object.keys(keys || {});
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
              id: 99,
              active: true,
              url: 'https://boards.greenhouse.io/stripe/jobs/12345',
              title: 'Stripe — Software Engineer',
            },
          ])
        ),
        get: vi.fn(() => Promise.resolve({ id: 99, active: true })),
        sendMessage: vi.fn(() => Promise.resolve({ success: true })),
        onActivated: { addListener: vi.fn() },
        onUpdated: { addListener: vi.fn() },
        create: vi.fn(),
      },
      runtime: {
        lastError: null,
        sendMessage: vi.fn((msg, cb) => {
          if (cb) cb({ success: true });
          return Promise.resolve({ success: true });
        }),
        onMessage: { addListener: vi.fn() },
        getManifest: () => ({ version: '1.3.10', name: 'Tracklet' }),
      },
      action: {
        setBadgeText: vi.fn(),
        setBadgeBackgroundColor: vi.fn(),
      },
    };
  });

  describe('1. Notes Editor Invariant & Roundtrip Synchronization', () => {
    it('serializes setter markdown into #notes-editor HTML and #notes-raw textarea', async () => {
      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 60));

      const notesInput = document.getElementById('notes') as HTMLInputElement;
      const notesEditor = document.getElementById('notes-editor') as HTMLElement;
      const notesRaw = document.getElementById('notes-raw') as HTMLTextAreaElement;

      expect(notesInput).not.toBeNull();
      expect(notesEditor).not.toBeNull();
      expect(notesRaw).not.toBeNull();

      // Stress input markdown with heading, bullet points, and bold text
      const markdownInput = '# Heading 1\n- Item 1\n- Item 2\n**Bold Statement**';
      notesInput.value = markdownInput;

      // Invariant 1: notesRaw.value must match input markdown
      expect(notesRaw.value).toBe(markdownInput);

      // Invariant 2: notesEditor HTML must be rendered by JobBoardRegistry
      expect(notesEditor.innerHTML).toContain('Item 1');
      expect(notesEditor.innerHTML).toContain('Item 2');
      expect(notesEditor.innerHTML).toMatch(/<h[1-3]>|<ul>|<li>|<strong>/i);

      // Invariant 3: notesInput.value getter returns serialized markdown
      const roundtripMarkdown = notesInput.value;
      expect(roundtripMarkdown).toContain('Item 1');
      expect(roundtripMarkdown).toContain('Item 2');
    });

    it('serializes rich HTML in #notes-editor back to Markdown via getter', async () => {
      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 60));

      const notesInput = document.getElementById('notes') as HTMLInputElement;
      const notesEditor = document.getElementById('notes-editor') as HTMLElement;

      // Simulate user editing rich content directly in contenteditable
      notesEditor.innerHTML = '<h3>Key Qualifications</h3><ul><li>5+ years React</li><li>Strong TypeScript</li></ul>';

      // Read through notes.value getter
      const serialized = notesInput.value;
      expect(serialized).toContain('Key Qualifications');
      expect(serialized).toContain('5+ years React');
      expect(serialized).toContain('Strong TypeScript');
    });

    it('toggles between rich view and raw markdown mode cleanly', async () => {
      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 60));

      const notesInput = document.getElementById('notes') as HTMLInputElement;
      const notesEditor = document.getElementById('notes-editor') as HTMLElement;
      const notesRaw = document.getElementById('notes-raw') as HTMLTextAreaElement;
      const toggleBtn = document.getElementById('btn-toggle-md') as HTMLButtonElement;
      const toggleLabel = document.getElementById('toggle-md-label') as HTMLElement;
      const toolbar = document.getElementById('notes-toolbar') as HTMLElement;

      notesInput.value = 'Initial note content';

      // Click toggle -> Raw Markdown mode
      toggleBtn.click();
      expect(notesRaw.style.display).toBe('block');
      expect(notesEditor.style.display).toBe('none');
      expect(toolbar.style.display).toBe('none');
      expect(toggleLabel.textContent).toBe('View');

      // Edit raw textarea
      notesRaw.value = 'Updated raw markdown note';
      notesRaw.dispatchEvent(new Event('input'));

      // Click toggle -> Rich View mode
      toggleBtn.click();
      expect(notesRaw.style.display).toBe('none');
      expect(notesEditor.style.display).toBe('block');
      expect(toolbar.style.display).toBe('flex');
      expect(toggleLabel.textContent).toBe('Markdown');
      expect(notesEditor.innerHTML).toContain('Updated raw markdown note');
    });

    it('clears notes via #btn-clear-notes without throwing', async () => {
      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 60));

      const notesInput = document.getElementById('notes') as HTMLInputElement;
      const notesEditor = document.getElementById('notes-editor') as HTMLElement;
      const notesRaw = document.getElementById('notes-raw') as HTMLTextAreaElement;
      const clearBtn = document.getElementById('btn-clear-notes') as HTMLButtonElement;

      notesInput.value = 'Notes to be wiped';
      expect(notesEditor.innerHTML.length).toBeGreaterThan(0);

      clearBtn.click();

      expect(notesEditor.innerHTML).toBe('');
      expect(notesRaw.value).toBe('');
      expect(notesInput.value).toBe('');
    });

    it('executes all toolbar formatting buttons without exceptions', async () => {
      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 60));

      const toolbar = document.getElementById('notes-toolbar') as HTMLElement;
      const buttons = toolbar.querySelectorAll<HTMLButtonElement>('.toolbar-btn');

      expect(buttons.length).toBeGreaterThan(0);

      // In happy-dom, document.execCommand might be a no-op or stub
      if (!document.execCommand) {
        document.execCommand = vi.fn();
      }

      for (const btn of Array.from(buttons)) {
        expect(() => {
          btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        }).not.toThrow();
      }
    });

    it('empirically verifies exact dispatch prompt notes serialization: # Heading\\n- Item 1\\n- Item 2', async () => {
      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 60));

      const notesInput = document.getElementById('notes') as HTMLInputElement;
      const notesEditor = document.getElementById('notes-editor') as HTMLElement;
      const notesRaw = document.getElementById('notes-raw') as HTMLTextAreaElement;

      // Exact prompt payload
      const exactPromptPayload = "# Heading\n- Item 1\n- Item 2";
      notesInput.value = exactPromptPayload;

      // Check serialization into #notes-raw
      expect(notesRaw.value).toBe(exactPromptPayload);

      // Check serialization into #notes-editor
      expect(notesEditor.innerHTML).toContain('Item 1');
      expect(notesEditor.innerHTML).toContain('Item 2');

      // Roundtrip get
      const retrieved = notesInput.value;
      expect(retrieved).toContain('Heading');
      expect(retrieved).toContain('Item 1');
      expect(retrieved).toContain('Item 2');
    });

    it('survives rapid toggling between raw and rich views (10 cycles)', async () => {
      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 60));

      const notesInput = document.getElementById('notes') as HTMLInputElement;
      const toggleBtn = document.getElementById('btn-toggle-md') as HTMLButtonElement;

      notesInput.value = '## Resilient Content\n- Point A\n- Point B';

      for (let i = 0; i < 10; i++) {
        expect(() => toggleBtn.click()).not.toThrow();
      }

      // After an even number of clicks (10), should be back in rich mode
      const notesEditor = document.getElementById('notes-editor') as HTMLElement;
      const notesRaw = document.getElementById('notes-raw') as HTMLTextAreaElement;
      expect(notesEditor.style.display).toBe('block');
      expect(notesRaw.style.display).toBe('none');
      expect(notesInput.value).toContain('Resilient Content');
    });

    it('clears notes correctly even when currently in raw markdown mode', async () => {
      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 60));

      const notesInput = document.getElementById('notes') as HTMLInputElement;
      const notesEditor = document.getElementById('notes-editor') as HTMLElement;
      const notesRaw = document.getElementById('notes-raw') as HTMLTextAreaElement;
      const toggleBtn = document.getElementById('btn-toggle-md') as HTMLButtonElement;
      const clearBtn = document.getElementById('btn-clear-notes') as HTMLButtonElement;

      notesInput.value = 'Some notes to erase while viewing raw';
      toggleBtn.click(); // Enter raw mode
      expect(notesRaw.style.display).toBe('block');

      clearBtn.click();

      expect(notesRaw.value).toBe('');
      expect(notesEditor.innerHTML).toBe('');
      expect(notesInput.value).toBe('');
    });
  });

  describe('2. Form Saving & Companion Toast Routing', () => {
    it('verifies #success-view is absent from DOM and triggers no errors', () => {
      expect(document.getElementById('success-view')).toBeNull();
      expect(document.getElementById('success-title')).toBeNull();
      expect(document.getElementById('success-subtitle')).toBeNull();
      expect(document.getElementById('open-tracklet-link')).toBeNull();
    });

    it('saving a job triggers #companion-toast and resets form state', async () => {
      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 60));

      const companyInput = document.getElementById('company') as HTMLInputElement;
      const roleInput = document.getElementById('role') as HTMLInputElement;
      const locationInput = document.getElementById('location') as HTMLInputElement;
      const notesInput = document.getElementById('notes') as HTMLInputElement;
      const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
      const toast = document.getElementById('companion-toast') as HTMLElement;
      const toastTitle = document.getElementById('toast-title') as HTMLElement;

      companyInput.value = 'Anthropic';
      companyInput.dispatchEvent(new Event('input'));
      roleInput.value = 'Research Engineer';
      roleInput.dispatchEvent(new Event('input'));
      locationInput.value = 'San Francisco, CA';
      notesInput.value = 'Exciting AI research opportunity.';

      expect(saveBtn.disabled).toBe(false);

      // Save job
      saveBtn.click();
      await new Promise((r) => setTimeout(r, 250));

      // Toast must be displayed
      expect(toast.style.display).toBe('flex');
      expect(toast.classList.contains('visible')).toBe(true);
      expect(toastTitle.textContent).toMatch(/Saved|Updated/);

      // Form fields must be reset
      expect(companyInput.value).toBe('');
      expect(roleInput.value).toBe('');
      expect(notesInput.value).toBe('');
    });

    it('saving a contact triggers #companion-toast and resets form', async () => {
      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 60));

      // Switch to Contact tab
      const contactTab = document.querySelector('.companion-tab[data-tab="contact"]') as HTMLElement;
      contactTab.click();

      const nameInput = document.getElementById('contact-name') as HTMLInputElement;
      const roleInput = document.getElementById('contact-role') as HTMLInputElement;
      const orgInput = document.getElementById('contact-organization') as HTMLInputElement;
      const saveContactBtn = document.getElementById('save-contact-btn') as HTMLButtonElement;
      const toast = document.getElementById('companion-toast') as HTMLElement;
      const toastTitle = document.getElementById('toast-title') as HTMLElement;

      nameInput.value = 'Sarah Connor';
      nameInput.dispatchEvent(new Event('input'));
      roleInput.value = 'Technical Recruiter';
      roleInput.dispatchEvent(new Event('input'));
      orgInput.value = 'Cyberdyne Systems';

      expect(saveContactBtn.disabled).toBe(false);

      saveContactBtn.click();
      await new Promise((r) => setTimeout(r, 100));

      expect(toast.style.display).toBe('flex');
      expect(toast.classList.contains('visible')).toBe(true);
      expect(toastTitle.textContent).toMatch(/Contact Saved|Contact Updated/);

      expect(nameInput.value).toBe('');
    });

    it('logging an email triggers #companion-toast', async () => {
      mockStorage.tracklet_apps_index = [
        {
          id: 'app-meta-1',
          company: 'Meta',
          role: 'Staff Engineer',
          status: 'Interview',
          companyDomain: 'meta.com',
          contactEmail: 'recruiter@meta.com',
          contactEmails: ['recruiter@meta.com'],
        },
      ];

      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 80));

      // Switch to Email tab
      const emailTab = document.querySelector('.companion-tab[data-tab="email"]') as HTMLElement;
      emailTab.click();
      await new Promise((r) => setTimeout(r, 60));

      // Open app selector and select app
      const changeAppBtn = document.getElementById('change-app-btn') as HTMLElement;
      if (changeAppBtn) {
        changeAppBtn.click();
        await new Promise((r) => setTimeout(r, 60));
      }
      const appItem = document.querySelector('.app-selector-item[data-app-id="app-meta-1"]') as HTMLElement;
      expect(appItem).not.toBeNull();
      if (appItem) appItem.click();

      const emailSubject = document.getElementById('email-subject') as HTMLInputElement;
      const emailCounterparty = document.getElementById('email-counterparty') as HTMLInputElement;
      const emailBody = document.getElementById('email-body') as HTMLTextAreaElement;
      const logEmailBtn = document.getElementById('log-email-btn') as HTMLButtonElement;
      const toast = document.getElementById('companion-toast') as HTMLElement;
      const toastTitle = document.getElementById('toast-title') as HTMLElement;

      emailSubject.value = 'Interview Invitation: Meta Staff Engineer';
      emailSubject.dispatchEvent(new Event('input'));
      emailCounterparty.value = 'recruiter@meta.com';
      emailBody.value = 'Please choose a slot on our scheduling link.';

      expect(logEmailBtn.disabled).toBe(false);

      logEmailBtn.click();
      await new Promise((r) => setTimeout(r, 250));

      expect(toast.style.display).toBe('flex');
      expect(toast.classList.contains('visible')).toBe(true);
      expect(toastTitle.textContent).toMatch(/Email Logged|Email Log Updated/);
    });
  });

  describe('3. Anti-Slop, Outbound Link Audit & CSS Invariants', () => {
    it('verifies all <a> tags have target="_blank" rel="noopener noreferrer"', () => {
      const anchors = Array.from(document.querySelectorAll('a'));
      expect(anchors.length).toBeGreaterThan(0);

      anchors.forEach((a) => {
        expect(a.getAttribute('target')).toBe('_blank');
        const rel = a.getAttribute('rel') || '';
        expect(rel).toContain('noopener');
        expect(rel).toContain('noreferrer');
      });
    });

    it('verifies popup.css has 0 occurrences of transition: all', () => {
      const popupCss = fs.readFileSync(path.resolve(__dirname, '../../extension/popup.css'), 'utf-8');
      const matches = popupCss.match(/transition:\s*all/gi);
      expect(matches).toBeNull();
    });

    it('verifies Job Clipper uses flattened single canvas without nested form-card containers', () => {
      const jobCanvas = document.querySelector('#main-form-view .flat-form-canvas');
      expect(jobCanvas).not.toBeNull();

      // Ensure no .form-card inside #main-form-view
      const nestedCards = document.querySelectorAll('#main-form-view .form-card');
      expect(nestedCards.length).toBe(0);
    });
  });

  describe('4. Progressive Disclosure & Auth Gate Component Parity', () => {
    it('toggles progressive disclosure container on #disclosure-toggle-btn click', async () => {
      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 60));

      const toggleBtn = document.getElementById('disclosure-toggle-btn') as HTMLButtonElement;
      const toggleText = document.getElementById('disclosure-toggle-text') as HTMLElement;
      const detailsSection = document.getElementById('job-additional-details') as HTMLElement;

      expect(toggleBtn).not.toBeNull();
      expect(detailsSection).not.toBeNull();
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');

      // Click to expand
      toggleBtn.click();
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
      expect(detailsSection.classList.contains('expanded')).toBe(true);
      expect(toggleText.textContent).toContain('Hide Details & Notes');

      // Click to collapse
      toggleBtn.click();
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
      expect(detailsSection.classList.contains('expanded')).toBe(false);
      expect(toggleText.textContent).toContain('Add Details & Notes');
    });

    it('updates AuthGate state when session changes', async () => {
      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 60));

      const badge = document.getElementById('user-account-badge') as HTMLElement;
      const dot = document.getElementById('user-account-dot') as HTMLElement;
      const email = document.getElementById('user-account-email') as HTMLElement;
      const banner = document.getElementById('auth-gate-banner') as HTMLElement;

      expect(badge).not.toBeNull();
      expect(dot).not.toBeNull();
      expect(email).not.toBeNull();

      // With mock session loaded:
      expect(dot.classList.contains('connected')).toBe(true);
      expect(email.textContent).toBe('challenger');
      expect(banner.style.display).toBe('none');
    });

    it('renders unauthenticated state and opens web login when clicking sign-in', async () => {
      // Clear session from storage
      mockStorage.tracklet_user_session = null;

      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 60));

      const dot = document.getElementById('user-account-dot') as HTMLElement;
      const email = document.getElementById('user-account-email') as HTMLElement;
      const banner = document.getElementById('auth-gate-banner') as HTMLElement;
      const signinBtn = document.getElementById('auth-gate-signin-btn') as HTMLButtonElement;

      expect(dot.classList.contains('connected')).toBe(false);
      expect(email.textContent).toBe('Sign In');
      expect(banner.style.display).toBe('flex');

      signinBtn.click();
      await new Promise((r) => setTimeout(r, 60));
      expect((globalThis as any).chrome.tabs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('/login?source=extension')
        })
      );
    });

    it('enforces validation gate: save button remains disabled when company or role is missing', async () => {
      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 60));

      const companyInput = document.getElementById('company') as HTMLInputElement;
      const roleInput = document.getElementById('role') as HTMLInputElement;
      const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;

      // Initially empty
      expect(saveBtn.disabled).toBe(true);

      // Only company filled
      companyInput.value = 'OpenAI';
      companyInput.dispatchEvent(new Event('input'));
      expect(saveBtn.disabled).toBe(true);

      // Company emptied, only role filled
      companyInput.value = '';
      companyInput.dispatchEvent(new Event('input'));
      roleInput.value = 'AI Researcher';
      roleInput.dispatchEvent(new Event('input'));
      expect(saveBtn.disabled).toBe(true);

      // Both filled
      companyInput.value = 'OpenAI';
      companyInput.dispatchEvent(new Event('input'));
      expect(saveBtn.disabled).toBe(false);
    });
  });

  describe('5. Milestone M1 Iteration 2: Empty States & Inline Resilient Error Alerts', () => {
    it('activates #job-empty-state and hides .form-layout when no job data is detected on page load', async () => {
      (globalThis as any).chrome.tabs.query = vi.fn(() =>
        Promise.resolve([
          {
            id: 101,
            active: true,
            url: 'https://news.ycombinator.com',
            title: 'Hacker News',
          },
        ])
      );
      (globalThis as any).chrome.tabs.sendMessage = vi.fn((tabId, msg, cb) => {
        if (msg.action === 'GET_PAGE_DATA') {
          const res = { pageType: 'generic', jobData: null };
          if (cb) cb(res);
          return Promise.resolve(res);
        }
        if (cb) cb(null);
        return Promise.resolve(null);
      });

      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 150));

      const jobEmptyState = document.getElementById('job-empty-state') as HTMLElement;
      const formLayout = document.querySelector('#main-form-view .form-layout') as HTMLElement;
      const stickyActionBar = document.getElementById('sticky-action-bar') as HTMLElement;

      expect(jobEmptyState).not.toBeNull();
      expect(jobEmptyState.style.display).toBe('flex');
      expect(formLayout.style.display).toBe('none');
      expect(stickyActionBar.style.display).toBe('none');
    });

    it('recovers from #job-empty-state when clicking Manual Entry button', async () => {
      (globalThis as any).chrome.tabs.query = vi.fn(() =>
        Promise.resolve([
          {
            id: 101,
            active: true,
            url: 'https://news.ycombinator.com',
            title: 'Hacker News',
          },
        ])
      );
      (globalThis as any).chrome.tabs.sendMessage = vi.fn((tabId, msg, cb) => {
        if (msg.action === 'GET_PAGE_DATA') {
          const res = { pageType: 'generic', jobData: null };
          if (cb) cb(res);
          return Promise.resolve(res);
        }
        if (cb) cb(null);
        return Promise.resolve(null);
      });

      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 150));

      const jobEmptyState = document.getElementById('job-empty-state') as HTMLElement;
      const formLayout = document.querySelector('#main-form-view .form-layout') as HTMLElement;
      const stickyActionBar = document.getElementById('sticky-action-bar') as HTMLElement;
      const manualBtn = document.getElementById('btn-manual-job-entry') as HTMLButtonElement;

      expect(jobEmptyState.style.display).toBe('flex');

      manualBtn.click();

      expect(jobEmptyState.style.display).toBe('none');
      expect(formLayout.style.display).toBe('');
      expect(stickyActionBar.style.display).toBe('flex');
    });

    it('recovers from #job-empty-state when typing into #company input field', async () => {
      (globalThis as any).chrome.tabs.query = vi.fn(() =>
        Promise.resolve([
          {
            id: 101,
            active: true,
            url: 'https://news.ycombinator.com',
            title: 'Hacker News',
          },
        ])
      );
      (globalThis as any).chrome.tabs.sendMessage = vi.fn((tabId, msg, cb) => {
        if (msg.action === 'GET_PAGE_DATA') {
          const res = { pageType: 'generic', jobData: null };
          if (cb) cb(res);
          return Promise.resolve(res);
        }
        if (cb) cb(null);
        return Promise.resolve(null);
      });

      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 150));

      const jobEmptyState = document.getElementById('job-empty-state') as HTMLElement;
      const formLayout = document.querySelector('#main-form-view .form-layout') as HTMLElement;
      const companyInput = document.getElementById('company') as HTMLInputElement;

      expect(jobEmptyState.style.display).toBe('flex');
      expect(formLayout.style.display).toBe('none');

      // User types into company input
      companyInput.value = 'Linear';
      companyInput.dispatchEvent(new Event('input'));

      expect(jobEmptyState.style.display).toBe('none');
      expect(formLayout.style.display).toBe('');
    });

    it('renders Contact empty state on non-contact page, and recovers on button click & typing', async () => {
      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 100));

      const contactTab = document.querySelector('.companion-tab[data-tab="contact"]') as HTMLElement;
      contactTab.click();
      await new Promise((r) => setTimeout(r, 60));

      const contactEmptyState = document.getElementById('contact-empty-state') as HTMLElement;
      const contactFormLayout = document.querySelector('#contact-clip-view .form-layout') as HTMLElement;
      const contactManualBtn = document.getElementById('btn-manual-contact-entry') as HTMLButtonElement;
      const contactNameInput = document.getElementById('contact-name') as HTMLInputElement;

      expect(contactEmptyState).not.toBeNull();
      expect(contactEmptyState.style.display).toBe('flex');
      expect(contactFormLayout.style.display).toBe('none');

      contactManualBtn.click();
      expect(contactEmptyState.style.display).toBe('none');
      expect(contactFormLayout.style.display).toBe('');

      // Test typing recovery
      contactNameInput.value = 'Ada Lovelace';
      contactNameInput.dispatchEvent(new Event('input'));
      expect(contactEmptyState.style.display).toBe('none');
      expect(contactFormLayout.style.display).toBe('');
    });

    it('renders Email empty state on non-webmail tab, and recovers on button click & typing', async () => {
      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 100));

      const emailTab = document.querySelector('.companion-tab[data-tab="email"]') as HTMLElement;
      emailTab.click();
      await new Promise((r) => setTimeout(r, 60));

      const emailEmptyState = document.getElementById('email-empty-state') as HTMLElement;
      const emailFormLayout = document.querySelector('#email-log-view .form-layout') as HTMLElement;
      const emailManualBtn = document.getElementById('btn-manual-email-entry') as HTMLButtonElement;
      const emailSubjectInput = document.getElementById('email-subject') as HTMLInputElement;

      expect(emailEmptyState).not.toBeNull();
      expect(emailEmptyState.style.display).toBe('flex');
      expect(emailFormLayout.style.display).toBe('none');

      emailManualBtn.click();
      expect(emailEmptyState.style.display).toBe('none');
      expect(emailFormLayout.style.display).toBe('');

      emailSubjectInput.value = 'Follow-up regarding interview';
      emailSubjectInput.dispatchEvent(new Event('input'));
      expect(emailEmptyState.style.display).toBe('none');
      expect(emailFormLayout.style.display).toBe('');
    });

    it('triggers #job-inline-error with "Fix" button on missing company or role save attempt', async () => {
      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 150));

      const companyInput = document.getElementById('company') as HTMLInputElement;
      const roleInput = document.getElementById('role') as HTMLInputElement;
      const inlineError = document.getElementById('job-inline-error') as HTMLElement;
      const inlineErrorText = document.getElementById('job-inline-error-text') as HTMLElement;
      const inlineErrorRetry = document.getElementById('job-inline-error-retry') as HTMLButtonElement;

      // Both fields empty initially. Simulate Enter key inside form to attempt save
      companyInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      expect(inlineError.style.display).toBe('flex');
      expect(inlineErrorText.textContent).toContain('Company name is required to save.');
      expect(inlineErrorRetry.textContent).toBe('Fix');

      const companyFocusSpy = vi.spyOn(companyInput, 'focus');
      inlineErrorRetry.click();
      expect(companyFocusSpy).toHaveBeenCalled();

      // Now fill company but leave role empty
      companyInput.value = 'Anthropic';
      companyInput.dispatchEvent(new Event('input'));

      // Enter again -> role validation error
      companyInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(inlineError.style.display).toBe('flex');
      expect(inlineErrorText.textContent).toContain('Job title/role is required to save.');
      expect(inlineErrorRetry.textContent).toBe('Fix');

      const roleFocusSpy = vi.spyOn(roleInput, 'focus');
      inlineErrorRetry.click();
      expect(roleFocusSpy).toHaveBeenCalled();
    });

    it('triggers #job-inline-error with "Retry" button on AI scrape boost failure and retries when clicked', async () => {
      let boostAttemptCount = 0;
      (globalThis as any).chrome.tabs.sendMessage = vi.fn((tabId, msg, cb) => {
        if (msg.action === 'AI_SCRAPE_BOOST') {
          boostAttemptCount++;
          if (cb) cb(null);
          return Promise.resolve(null);
        }
        if (cb) cb({ pageType: 'job_posting', jobData: { company: 'Stripe', role: 'Staff Eng' } });
        return Promise.resolve({});
      });

      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      // Wait for tab switch debounce (60ms) to populate activeObservedTabId
      await new Promise((r) => setTimeout(r, 150));

      const aiBoostBtn = document.getElementById('btn-ai-boost-job') as HTMLButtonElement;
      const inlineError = document.getElementById('job-inline-error') as HTMLElement;
      const inlineErrorText = document.getElementById('job-inline-error-text') as HTMLElement;
      const inlineErrorRetry = document.getElementById('job-inline-error-retry') as HTMLButtonElement;

      expect(aiBoostBtn).not.toBeNull();

      aiBoostBtn.click();
      await new Promise((r) => setTimeout(r, 80));

      expect(boostAttemptCount).toBe(1);
      expect(inlineError.style.display).toBe('flex');
      expect(inlineErrorText.textContent).toContain('AI Boost');
      expect(inlineErrorRetry.textContent).toBe('Retry');

      inlineErrorRetry.click();
      await new Promise((r) => setTimeout(r, 80));

      expect(boostAttemptCount).toBe(2);
    });

    it('dismisses #job-inline-error when typing valid inputs or when valid scrape occurs', async () => {
      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 150));

      const companyInput = document.getElementById('company') as HTMLInputElement;
      const roleInput = document.getElementById('role') as HTMLInputElement;
      const inlineError = document.getElementById('job-inline-error') as HTMLElement;

      companyInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(inlineError.style.display).toBe('flex');

      companyInput.value = 'Figma';
      companyInput.dispatchEvent(new Event('input'));
      expect(inlineError.style.display).toBe('flex');

      roleInput.value = 'Product Designer';
      roleInput.dispatchEvent(new Event('input'));

      expect(inlineError.style.display).toBe('none');
    });
  });
});

