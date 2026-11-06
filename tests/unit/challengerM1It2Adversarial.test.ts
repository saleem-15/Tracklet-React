import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Challenger 2 Empirical Adversarial Suite — M1 Iteration 2', () => {
  let popupHtml: string;
  let popupJs: string;
  let jobBoardRegistryJs: string;
  let JobBoardRegistry: any;
  let mockStorage: Record<string, any>;
  let storageListeners: Array<(changes: Record<string, any>, areaName: string) => void>;

  beforeEach(() => {
    popupHtml = fs.readFileSync(path.resolve(__dirname, '../../extension/popup.html'), 'utf-8');
    popupJs = fs.readFileSync(path.resolve(__dirname, '../../extension/popup.js'), 'utf-8');
    jobBoardRegistryJs = fs.readFileSync(path.resolve(__dirname, '../../extension/jobBoardRegistry.js'), 'utf-8');

    // Evaluate JobBoardRegistry
    const registryFn = new Function(
      'module',
      'exports',
      jobBoardRegistryJs + '\nreturn typeof module !== "undefined" && module.exports ? module.exports : self.JobBoardRegistry;'
    );
    const mockModule = { exports: {} };
    JobBoardRegistry = registryFn(mockModule, mockModule.exports) || mockModule.exports;
    (globalThis as any).JobBoardRegistry = JobBoardRegistry;
    (window as any).JobBoardRegistry = JobBoardRegistry;

    // Load popup.html into DOM
    const bodyMatch = popupHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    document.body.innerHTML = (bodyMatch ? bodyMatch[1] : popupHtml).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

    mockStorage = {};
    storageListeners = [];

    (globalThis as any).fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('ok'),
      })
    );

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
            const changes: Record<string, any> = {};
            Object.entries(items).forEach(([k, v]) => {
              changes[k] = { oldValue: mockStorage[k], newValue: v };
              mockStorage[k] = v;
            });
            storageListeners.forEach((l) => l(changes, 'local'));
            if (cb) cb();
            return Promise.resolve();
          }),
          remove: vi.fn((keys: any, cb?: any) => {
            const keyList = Array.isArray(keys) ? keys : [keys];
            const changes: Record<string, any> = {};
            keyList.forEach((k) => {
              changes[k] = { oldValue: mockStorage[k], newValue: undefined };
              delete mockStorage[k];
            });
            storageListeners.forEach((l) => l(changes, 'local'));
            if (cb) cb();
            return Promise.resolve();
          }),
        },
        onChanged: {
          addListener: vi.fn((listener) => storageListeners.push(listener)),
          removeListener: vi.fn(),
        },
      },
      tabs: {
        query: vi.fn(() =>
          Promise.resolve([
            {
              id: 101,
              active: true,
              url: 'https://jobs.lever.co/stripe/engineer-role',
              title: 'Stripe — Lead Systems Engineer',
            },
          ])
        ),
        get: vi.fn(() => Promise.resolve({ id: 101, active: true })),
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // CHALLENGE 1: Live Cross-Tab Auth Sync Challenge
  // ==========================================================================
  describe('Challenge 1: Live Cross-Tab Auth Sync Empirical Harness', () => {
    it('synchronizes incoming TRACKLET_AUTH_SYNC user session immediately into DOM', async () => {
      // Start unauthenticated
      mockStorage.tracklet_user_session = null;

      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 60));

      const dot = document.getElementById('user-account-dot');
      const email = document.getElementById('user-account-email');
      const banner = document.getElementById('auth-gate-banner');

      expect(dot).not.toBeNull();
      expect(email).not.toBeNull();
      expect(banner).not.toBeNull();

      // Unauthenticated initial state
      expect(dot?.classList.contains('connected')).toBe(false);
      expect(email?.textContent?.trim()).toBe('Sign In');
      expect(banner?.style.display).not.toBe('none');

      // Send live auth sync with standard email (<= 20 chars) via BroadcastChannel
      const channel = new BroadcastChannel('tracklet_extension_channel');
      channel.postMessage({
        type: 'TRACKLET_AUTH_SYNC',
        payload: {
          user: { uid: 'user_challenger_999', email: 'dev@tracklet.app' },
          config: { apiKey: 'mock-key' },
        },
      });

      // Allow BroadcastChannel message dispatch
      await new Promise((r) => setTimeout(r, 80));

      // Assert DOM immediately reflects authenticated state
      expect(dot?.classList.contains('connected')).toBe(true);
      expect(email?.textContent?.trim()).toBe('dev@tracklet.app');
      expect(banner?.style.display).toBe('none');

      // Assert storage was updated
      expect(mockStorage.tracklet_user_session).toEqual({
        uid: 'user_challenger_999',
        email: 'dev@tracklet.app',
      });

      channel.close();
    });

    it('synchronizes incoming TRACKLET_AUTH_SYNC logout (null session) back to unauthenticated DOM state', async () => {
      // Start authenticated with compact email
      mockStorage.tracklet_user_session = {
        uid: 'active_session_1',
        email: 'test@tracklet.app',
      };

      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 60));

      const dot = document.getElementById('user-account-dot');
      const email = document.getElementById('user-account-email');
      const banner = document.getElementById('auth-gate-banner');

      expect(dot?.classList.contains('connected')).toBe(true);
      expect(email?.textContent?.trim()).toBe('test@tracklet.app');
      expect(banner?.style.display).toBe('none');

      // Broadcast logout event (null user session)
      const channel = new BroadcastChannel('tracklet_extension_channel');
      channel.postMessage({
        type: 'TRACKLET_AUTH_SYNC',
        payload: {
          user: null,
          config: null,
        },
      });

      await new Promise((r) => setTimeout(r, 80));

      // Assert DOM immediately drops to amber unauthenticated state
      expect(dot?.classList.contains('connected')).toBe(false);
      expect(email?.textContent?.trim()).toBe('Sign In');
      expect(banner?.style.display).toBe('flex');

      // Storage keys should have been purged
      expect(mockStorage.tracklet_user_session).toBeUndefined();

      channel.close();
    });

    it('endures multi-cycle login / logout rapid sync without desynchronization', async () => {
      mockStorage.tracklet_user_session = null;
      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 60));

      const dot = document.getElementById('user-account-dot');
      const email = document.getElementById('user-account-email');
      const banner = document.getElementById('auth-gate-banner');

      const channel = new BroadcastChannel('tracklet_extension_channel');

      // Cycle 1: Login user A (short email <= 20)
      channel.postMessage({
        type: 'TRACKLET_AUTH_SYNC',
        payload: { user: { uid: 'user_a', email: 'alice@tracklet.io' } },
      });
      await new Promise((r) => setTimeout(r, 50));
      expect(dot?.classList.contains('connected')).toBe(true);
      expect(email?.textContent?.trim()).toBe('alice@tracklet.io');
      expect(banner?.style.display).toBe('none');

      // Cycle 2: Logout
      channel.postMessage({
        type: 'TRACKLET_AUTH_SYNC',
        payload: { user: null },
      });
      await new Promise((r) => setTimeout(r, 50));
      expect(dot?.classList.contains('connected')).toBe(false);
      expect(email?.textContent?.trim()).toBe('Sign In');
      expect(banner?.style.display).toBe('flex');

      // Cycle 3: Login user B with long email (> 20 chars should format username)
      channel.postMessage({
        type: 'TRACKLET_AUTH_SYNC',
        payload: { user: { uid: 'user_b', email: 'extraordinarycandidate@tracklet.test' } },
      });
      await new Promise((r) => setTimeout(r, 50));
      expect(dot?.classList.contains('connected')).toBe(true);
      expect(email?.textContent?.trim()).toBe('extraordinarycandidate');
      expect(banner?.style.display).toBe('none');

      // Cycle 4: Logout again
      channel.postMessage({
        type: 'TRACKLET_AUTH_SYNC',
        payload: { user: null },
      });
      await new Promise((r) => setTimeout(r, 50));
      expect(dot?.classList.contains('connected')).toBe(false);
      expect(email?.textContent?.trim()).toBe('Sign In');
      expect(banner?.style.display).toBe('flex');

      channel.close();
    });

    it('synchronizes session changes dispatched via chrome.storage.onChanged listener', async () => {
      mockStorage.tracklet_user_session = null;
      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 60));

      const dot = document.getElementById('user-account-dot');
      const email = document.getElementById('user-account-email');
      const banner = document.getElementById('auth-gate-banner');

      // Trigger storage change listener directly
      await (globalThis as any).chrome.storage.local.set({
        tracklet_user_session: { uid: 'storage_sync_uid', email: 'sync@tracklet.io' },
      });
      await new Promise((r) => setTimeout(r, 50));

      expect(dot?.classList.contains('connected')).toBe(true);
      expect(email?.textContent?.trim()).toBe('sync@tracklet.io');
      expect(banner?.style.display).toBe('none');
    });
  });

  // ==========================================================================
  // CHALLENGE 2: StatusBadge & Dropdown Integration Challenge
  // ==========================================================================
  describe('Challenge 2: StatusBadge & Dropdown Integration Empirical Harness', () => {
    it('verifies StatusBadge.applyTo properly styles all canonical stages on elements', async () => {
      // Evaluate popup.js to initialize DOM bindings and helper objects
      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 60));

      const stageTriggerBtn = document.getElementById('stage-trigger-btn') as HTMLElement;
      const stageDot = document.getElementById('stage-dot') as HTMLElement;
      const stageLabelText = document.getElementById('stage-label-text') as HTMLElement;
      const stageReadonlyBadge = document.getElementById('stage-readonly-badge') as HTMLElement;
      const stageReadonlyDot = document.getElementById('stage-readonly-dot') as HTMLElement;
      const stageReadonlyText = document.getElementById('stage-readonly-text') as HTMLElement;

      expect(stageTriggerBtn).not.toBeNull();
      expect(stageReadonlyBadge).not.toBeNull();

      // Test all 8 canonical stage configurations plus fallback
      const allStages = [
        { stage: 'Saved', label: 'Saved', dot: 'var(--stage-saved-dot)', bg: 'var(--stage-saved-bg)' },
        { stage: 'Wishlist', label: 'Saved', dot: 'var(--stage-saved-dot)', bg: 'var(--stage-saved-bg)' },
        { stage: 'Applied', label: 'Applied', dot: 'var(--stage-applied-dot)', bg: 'var(--stage-applied-bg)' },
        { stage: 'Screening', label: 'Screening', dot: 'var(--stage-screening-dot)', bg: 'var(--stage-screening-bg)' },
        { stage: 'Interview', label: 'Interview', dot: 'var(--stage-interview-dot)', bg: 'var(--stage-interview-bg)' },
        { stage: 'Offer', label: 'Offer', dot: 'var(--stage-offer-dot)', bg: 'var(--stage-offer-bg)' },
        { stage: 'Rejected', label: 'Rejected', dot: 'var(--stage-rejected-dot)', bg: 'var(--stage-rejected-bg)' },
        { stage: 'Archived', label: 'Archived', dot: 'var(--stage-archived-dot)', bg: 'var(--stage-archived-bg)' },
        { stage: 'UnknownStageXYZ', label: 'Saved', dot: 'var(--stage-saved-dot)', bg: 'var(--stage-saved-bg)' },
      ];

      // Access StatusBadge via test harness execution
      // We can create a test element and verify StatusBadge via updateStageUI and direct element styling
      for (const item of allStages) {
        // Create an arbitrary badge container
        const customBadge = document.createElement('div');
        customBadge.innerHTML = `<span class="stage-dot"></span><span class="stage-label">Old</span>`;
        document.body.appendChild(customBadge);

        // Call helper logic through updateStageUI for selectable stages or through StatusBadge
        const dot = customBadge.querySelector('.stage-dot') as HTMLElement;
        const label = customBadge.querySelector('.stage-label') as HTMLElement;

        // In popup.js, StatusBadge and STAGE_CONFIG_MAP are defined inside the controller
        const statusBadgeMatch = popupJs.match(/(const STAGE_CONFIG_MAP =[\s\S]*?const StatusBadge = \{[\s\S]*?\n {2}\};)/);
        expect(statusBadgeMatch).not.toBeNull();
        const helperFn = new Function(
          statusBadgeMatch![1] + '\nreturn StatusBadge;'
        )();

        expect(helperFn).toBeDefined();
        const config = helperFn.applyTo(customBadge, item.stage);

        expect(config.label).toBe(item.label);
        expect(customBadge.style.backgroundColor).toBe(item.bg);
        expect(dot.style.backgroundColor).toBe(item.dot);
        expect(label.textContent).toBe(item.label);

        // Also test createDot
        const generatedDot = helperFn.createDot(item.stage, 10);
        expect(generatedDot.className).toBe('stage-dot');
        expect(generatedDot.style.width).toBe('10px');
        expect(generatedDot.style.height).toBe('10px');
        expect(generatedDot.style.borderRadius).toBe('50%');
        expect(generatedDot.style.backgroundColor).toBe(item.dot);

        document.body.removeChild(customBadge);
      }
    });

    it('verifies dropdown options in stage selector switch UI stage and apply styling', async () => {
      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 60));

      const stageTriggerBtn = document.getElementById('stage-trigger-btn') as HTMLElement;
      const stageDot = document.getElementById('stage-dot') as HTMLElement;
      const stageLabelText = document.getElementById('stage-label-text') as HTMLElement;
      const stageSelectorContainer = document.getElementById('stage-selector-container') as HTMLElement;

      const appliedOption = stageSelectorContainer.querySelector(
        '.stage-option-item[data-stage="Applied"]'
      ) as HTMLElement;
      expect(appliedOption).not.toBeNull();

      appliedOption.click();

      expect(stageLabelText.textContent).toBe('Applied');
      expect(stageDot.style.backgroundColor).toBe('var(--stage-applied-dot)');
      expect(stageTriggerBtn.style.backgroundColor).toBe('var(--stage-applied-bg)');
      expect(appliedOption.classList.contains('selected')).toBe(true);

      const savedOption = stageSelectorContainer.querySelector(
        '.stage-option-item[data-stage="Saved"]'
      ) as HTMLElement;
      savedOption.click();

      expect(stageLabelText.textContent).toBe('Saved');
      expect(stageDot.style.backgroundColor).toBe('var(--stage-saved-dot)');
      expect(stageTriggerBtn.style.backgroundColor).toBe('var(--stage-saved-bg)');
      expect(savedOption.classList.contains('selected')).toBe(true);
    });

    it('verifies Dropdown.toggle and single-open manager close previous open dropdowns', async () => {
      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 60));

      const platformContainer = document.getElementById('platform-select-container') as HTMLElement;
      const platformTrigger = document.getElementById('platform-trigger') as HTMLElement;
      const workplaceContainer = document.getElementById('workplace-select-container') as HTMLElement;
      const workplaceTrigger = document.getElementById('workplace-trigger') as HTMLElement;
      const employmentTypeContainer = document.getElementById('employment-type-select-container') as HTMLElement;
      const employmentTypeTrigger = document.getElementById('employment-type-trigger') as HTMLElement;

      expect(platformContainer).not.toBeNull();
      expect(workplaceContainer).not.toBeNull();
      expect(employmentTypeContainer).not.toBeNull();

      // Open Platform dropdown
      platformTrigger.click();
      expect(platformContainer.classList.contains('open')).toBe(true);
      expect(workplaceContainer.classList.contains('open')).toBe(false);
      expect(employmentTypeContainer.classList.contains('open')).toBe(false);

      // Open Workplace dropdown -> Platform must automatically close
      workplaceTrigger.click();
      expect(platformContainer.classList.contains('open')).toBe(false);
      expect(workplaceContainer.classList.contains('open')).toBe(true);
      expect(employmentTypeContainer.classList.contains('open')).toBe(false);

      // Open Employment Type dropdown -> Workplace must automatically close
      employmentTypeTrigger.click();
      expect(platformContainer.classList.contains('open')).toBe(false);
      expect(workplaceContainer.classList.contains('open')).toBe(false);
      expect(employmentTypeContainer.classList.contains('open')).toBe(true);

      // Toggle Employment Type trigger again -> closes
      employmentTypeTrigger.click();
      expect(employmentTypeContainer.classList.contains('open')).toBe(false);
    });

    it('verifies outside click dismisses any open dropdown', async () => {
      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 60));

      const platformContainer = document.getElementById('platform-select-container') as HTMLElement;
      const platformTrigger = document.getElementById('platform-trigger') as HTMLElement;

      // Open dropdown
      platformTrigger.click();
      expect(platformContainer.classList.contains('open')).toBe(true);

      // Click outside (e.g. document body or header)
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      // Dropdown should be closed
      expect(platformContainer.classList.contains('open')).toBe(false);
    });

    it('verifies Escape key dismisses any open dropdown', async () => {
      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 60));

      const stageContainer = document.getElementById('stage-selector-container') as HTMLElement;
      const stageTrigger = document.getElementById('stage-trigger-btn') as HTMLElement;

      // Open stage dropdown
      stageTrigger.click();
      expect(stageContainer.classList.contains('open')).toBe(true);

      // Press Escape key
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      // Dropdown should be closed
      expect(stageContainer.classList.contains('open')).toBe(false);
    });

    it('verifies selecting an option in Dropdown updates value and closes container', async () => {
      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 60));

      const workplaceContainer = document.getElementById('workplace-select-container') as HTMLElement;
      const workplaceTrigger = document.getElementById('workplace-trigger') as HTMLElement;
      const workplaceValueText = document.getElementById('workplace-value-text') as HTMLElement;

      workplaceTrigger.click();
      expect(workplaceContainer.classList.contains('open')).toBe(true);

      const remoteOpt = workplaceContainer.querySelector('.custom-select-option[data-value="Remote"]') as HTMLElement;
      expect(remoteOpt).not.toBeNull();

      remoteOpt.click();

      // Container closed
      expect(workplaceContainer.classList.contains('open')).toBe(false);
      // Value text updated
      expect(workplaceValueText.textContent).toBe('Remote');
      // Option has selected class
      expect(remoteOpt.classList.contains('selected')).toBe(true);
    });
  });

  // ==========================================================================
  // CHALLENGE 3: Notes Editor Preservation Challenge
  // ==========================================================================
  describe('Challenge 3: Notes Editor Preservation Empirical Harness', () => {
    it('verifies roundtrip bidirectional synchronization between #notes value getter/setter and #notes-editor / #notes-raw', async () => {
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

      // Test Setter with structured markdown
      const testMarkdown = '# Engineering Alignment\n- Scalable architecture\n- Strict invariant preservation\n**Approved for merge**';
      notesInput.value = testMarkdown;

      // #notes-raw must receive raw markdown verbatim
      expect(notesRaw.value).toBe(testMarkdown);

      // #notes-editor must render parsed HTML elements
      expect(notesEditor.innerHTML).toContain('Scalable architecture');
      expect(notesEditor.innerHTML).toContain('Strict invariant preservation');
      expect(notesEditor.innerHTML).toMatch(/<h[1-3]>|<ul>|<li>|<strong>/i);

      // #notes.value getter must roundtrip the markdown back
      const roundtrip = notesInput.value;
      expect(roundtrip).toContain('Engineering Alignment');
      expect(roundtrip).toContain('Scalable architecture');
      expect(roundtrip).toContain('Strict invariant preservation');
    });

    it('verifies toolbar formatting buttons execute cleanly without exceptions', async () => {
      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 60));

      const toolbar = document.getElementById('notes-toolbar') as HTMLElement;
      const notesEditor = document.getElementById('notes-editor') as HTMLElement;

      expect(toolbar).not.toBeNull();
      expect(notesEditor).not.toBeNull();

      if (!document.execCommand) {
        document.execCommand = vi.fn();
      }

      const buttons = toolbar.querySelectorAll<HTMLButtonElement>('.toolbar-btn');
      expect(buttons.length).toBeGreaterThan(0);

      buttons.forEach((btn) => {
        expect(() => {
          btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        }).not.toThrow();
      });
    });

    it('verifies raw markdown toggle button switches views and synchronizes content both ways', async () => {
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

      // 1. Initial rich mode
      notesInput.value = 'Initial Markdown Notes';
      expect(notesEditor.style.display).not.toBe('none');
      expect(notesRaw.style.display).toBe('none');

      // 2. Toggle to raw mode
      toggleBtn.click();
      expect(notesRaw.style.display).toBe('block');
      expect(notesEditor.style.display).toBe('none');
      expect(toolbar.style.display).toBe('none');
      expect(toggleLabel.textContent).toBe('View');

      // 3. Edit in raw mode
      notesRaw.value = '## Modified in Raw Mode\n- Added point 1';
      notesRaw.dispatchEvent(new Event('input', { bubbles: true }));

      // 4. Toggle back to rich view mode
      toggleBtn.click();
      expect(notesRaw.style.display).toBe('none');
      expect(notesEditor.style.display).toBe('block');
      expect(toolbar.style.display).toBe('flex');
      expect(toggleLabel.textContent).toBe('Markdown');

      // Assert rich editor contains updated content
      expect(notesEditor.innerHTML).toContain('Modified in Raw Mode');
      expect(notesEditor.innerHTML).toContain('Added point 1');

      // Assert getter reflects current content
      expect(notesInput.value).toContain('Modified in Raw Mode');
    });

    it('verifies #btn-clear-notes resets all three representations to empty string', async () => {
      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 60));

      const notesInput = document.getElementById('notes') as HTMLInputElement;
      const notesEditor = document.getElementById('notes-editor') as HTMLElement;
      const notesRaw = document.getElementById('notes-raw') as HTMLTextAreaElement;
      const clearBtn = document.getElementById('btn-clear-notes') as HTMLButtonElement;

      notesInput.value = 'Some content that must be completely wiped';
      expect(notesEditor.innerHTML.length).toBeGreaterThan(0);
      expect(notesRaw.value.length).toBeGreaterThan(0);

      clearBtn.click();

      expect(notesEditor.innerHTML).toBe('');
      expect(notesRaw.value).toBe('');
      expect(notesInput.value).toBe('');
    });

    it('endures complex markdown, unicode, URLs, and large payloads', async () => {
      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 60));

      const notesInput = document.getElementById('notes') as HTMLInputElement;
      const notesEditor = document.getElementById('notes-editor') as HTMLElement;
      const notesRaw = document.getElementById('notes-raw') as HTMLTextAreaElement;

      // Complex payload with links, bold, code block, unicode
      const complexNotes = [
        '# High-Priority Opportunity 🚀',
        '- Referral from: [Alex](https://linkedin.com/in/alex)',
        '- Salary: $200,000 - $240,000 + equity',
        '- Tech stack: `React 19`, `TypeScript`, `Node.js`',
        '- **Action Item**: Prep system design portfolio',
      ].join('\n');

      notesInput.value = complexNotes;

      expect(notesRaw.value).toBe(complexNotes);
      expect(notesEditor.innerHTML).toContain('High-Priority Opportunity');
      expect(notesEditor.innerHTML).toContain('Alex');
      expect(notesEditor.innerHTML).toContain('$200,000');

      const retrieved = notesInput.value;
      expect(retrieved).toContain('High-Priority Opportunity');
      expect(retrieved).toContain('Alex');
      expect(retrieved).toContain('Salary');
    });

    it('survives rapid 20-cycle toggle between raw and rich views', async () => {
      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 60));

      const notesInput = document.getElementById('notes') as HTMLInputElement;
      const notesEditor = document.getElementById('notes-editor') as HTMLElement;
      const notesRaw = document.getElementById('notes-raw') as HTMLTextAreaElement;
      const toggleBtn = document.getElementById('btn-toggle-md') as HTMLButtonElement;

      notesInput.value = '## Stress Cycling Notes\n- Entry A\n- Entry B';

      for (let i = 0; i < 20; i++) {
        expect(() => toggleBtn.click()).not.toThrow();
      }

      // Even number of clicks (20) returns to rich view mode
      expect(notesEditor.style.display).toBe('block');
      expect(notesRaw.style.display).toBe('none');
      expect(notesInput.value).toContain('Stress Cycling Notes');
    });
  });

  describe('Adversarial Boundary & Malformed Input Testing', () => {
    it('handles malformed or extraneous BroadcastChannel payloads gracefully without crashing', async () => {
      mockStorage.tracklet_user_session = { uid: 'good_user', email: 'good@test.com' };
      const executePopup = new Function(popupJs);
      executePopup();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 60));

      const dot = document.getElementById('user-account-dot');
      const email = document.getElementById('user-account-email');
      const banner = document.getElementById('auth-gate-banner');

      expect(dot?.classList.contains('connected')).toBe(true);

      const channel = new BroadcastChannel('tracklet_extension_channel');

      // Send arbitrary unexpected message types — should be completely ignored
      expect(() => {
        channel.postMessage({ type: 'SOME_UNKNOWN_SYSTEM_EVENT' });
        channel.postMessage(null);
        channel.postMessage('plain text message');
      }).not.toThrow();

      await new Promise((r) => setTimeout(r, 60));

      // Current auth state should not have changed
      expect(dot?.classList.contains('connected')).toBe(true);

      // Now send TRACKLET_AUTH_SYNC with missing/empty payload (treated as logout)
      channel.postMessage({ type: 'TRACKLET_AUTH_SYNC' });
      await new Promise((r) => setTimeout(r, 60));

      expect(dot?.classList.contains('connected')).toBe(false);
      expect(email?.textContent?.trim()).toBe('Sign In');
      expect(banner?.style.display).toBe('flex');

      channel.close();
    });

    it('verifies Dropdown.init direct API methods: setValue, open, close, and placeholder reset', () => {
      const dropdownMatch = popupJs.match(/(const Dropdown = \{[\s\S]*?\n {2}\};)/);
      expect(dropdownMatch).not.toBeNull();
      const DropdownHelper = new Function(dropdownMatch![1] + '\nreturn Dropdown;')();

      // Create test container in DOM
      const testContainer = document.createElement('div');
      testContainer.className = 'custom-select-container';
      testContainer.innerHTML = `
        <button type="button" class="custom-select-trigger">
          <span class="custom-select-value">Default</span>
        </button>
        <div class="custom-select-dropdown">
          <div class="custom-select-option" data-value="OptA">Option A</div>
          <div class="custom-select-option" data-value="OptB">Option B</div>
        </div>
      `;
      document.body.appendChild(testContainer);

      const trigger = testContainer.querySelector('.custom-select-trigger') as HTMLElement;
      const valueEl = testContainer.querySelector('.custom-select-value') as HTMLElement;
      let recordedChange = '';

      const instance = DropdownHelper.init({
        container: testContainer,
        trigger,
        valueEl,
        placeholder: 'Select an option...',
        onChange: (v: string) => { recordedChange = v; }
      });

      expect(instance).not.toBeNull();

      // Test open() and close()
      instance.open();
      expect(testContainer.classList.contains('open')).toBe(true);
      instance.close();
      expect(testContainer.classList.contains('open')).toBe(false);

      // Test setValue to valid option
      instance.setValue('OptB');
      expect(valueEl.textContent).toBe('Option B');
      expect(testContainer.querySelector('.custom-select-option[data-value="OptB"]')?.classList.contains('selected')).toBe(true);

      // Test setValue to null/empty -> resets to placeholder
      instance.setValue('');
      expect(valueEl.textContent).toBe('Select an option...');
      expect(testContainer.querySelectorAll('.selected').length).toBe(0);

      document.body.removeChild(testContainer);
    });
  });
});

