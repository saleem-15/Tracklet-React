import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import React from 'react';
import { TesterReportModal } from '../../src/components/feedback/TesterReportModal';
import { FeedbackRepository } from '../../src/lib/feedbackRepository';
import { ToastProvider } from '../../src/context/ToastContext';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../src/lib/posthog', () => ({
  default: {
    capture: vi.fn(),
  },
}));

let host: HTMLDivElement | null = null;
let root: Root | null = null;

describe('TesterReportModal UI & GitHub detachment', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root!.unmount());
    root = null;
    host?.remove();
    host = null;
  });

  function renderModal(props: { isOpen: boolean; onClose?: () => void }) {
    act(() => {
      root!.render(
        <ToastProvider>
          <TesterReportModal
            isOpen={props.isOpen}
            onClose={props.onClose || vi.fn()}
            activeTab="pipeline"
          />
        </ToastProvider>
      );
    });
  }

  function setInputValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
    const proto = element instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    desc?.set?.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  it('renders success card with Reference ID and NO GitHub buttons or links upon successful submit', async () => {
    vi.spyOn(FeedbackRepository, 'saveReport').mockResolvedValue({
      id: 'TRK-BUG-999888',
      type: 'bug',
      title: 'Valid issue summary',
      description: 'Detailed description of the issue that occurred',
      severity: 'medium',
      status: 'new',
      diagnostics: {
        appVersion: '1.2.0',
        activeTab: 'pipeline',
        url: 'http://localhost:5173/?tab=pipeline',
        browser: 'Chrome',
        os: 'Windows',
        viewport: '1920x1080',
        devicePixelRatio: 1,
        authMode: 'unauthenticated',
        timestamp: '2026-10-20T12:00:00.000Z',
        recentErrors: [],
      },
      attachments: [],
      createdAt: '2026-10-20T12:00:00.000Z',
      updatedAt: '2026-10-20T12:00:00.000Z',
    });

    vi.spyOn(FeedbackRepository, 'dispatchToApi').mockResolvedValue({
      success: true,
      issueNumber: 50,
      issueUrl: 'https://github.com/saleem-15/Tracklet-React/issues/50',
    });

    renderModal({ isOpen: true });

    // Fill in required fields
    const titleInput = host!.querySelector('input[placeholder*="Kanban card"]') as HTMLInputElement;
    const descTextarea = host!.querySelector('textarea') as HTMLTextAreaElement;
    expect(titleInput).not.toBeNull();
    expect(descTextarea).not.toBeNull();

    act(() => {
      setInputValue(titleInput, 'Valid issue summary');
      setInputValue(descTextarea, 'Detailed description of the issue that occurred');
    });

    const form = host!.querySelector('form') as HTMLFormElement;
    expect(form).not.toBeNull();

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    // Verify success receipt is displayed
    expect(host!.textContent).toContain('Thank You for Your Feedback!');
    expect(host!.textContent).toContain('TRK-BUG-999888');
    expect(host!.textContent).toContain('Return to Testing');

    // CRITICAL: Ensure NO GitHub buttons, GitHub links, or sync error text exist anywhere in the modal DOM
    expect(host!.textContent).not.toContain('GitHub Issue #');
    expect(host!.textContent).not.toContain('View Issue');
    expect(host!.textContent).not.toContain('on GitHub');
    expect(host!.textContent).not.toContain('Open Pre-filled GitHub Issue');
    expect(host!.textContent).not.toContain('Automated GitHub sync not configured');
    expect(host!.querySelector('a[href*="github.com"]')).toBeNull();
  });

  it('preserves form state and displays error message when API fails (does not show success card)', async () => {
    vi.spyOn(FeedbackRepository, 'saveReport').mockResolvedValue({
      id: 'TRK-BUG-777666',
      type: 'bug',
      title: 'Valid issue summary',
      description: 'Detailed description of the issue that occurred',
      severity: 'medium',
      status: 'new',
      diagnostics: {
        appVersion: '1.2.0',
        activeTab: 'pipeline',
        url: 'http://localhost:5173/?tab=pipeline',
        browser: 'Chrome',
        os: 'Windows',
        viewport: '1920x1080',
        devicePixelRatio: 1,
        authMode: 'unauthenticated',
        timestamp: '2026-10-20T12:00:00.000Z',
        recentErrors: [],
      },
      attachments: [],
      createdAt: '2026-10-20T12:00:00.000Z',
      updatedAt: '2026-10-20T12:00:00.000Z',
    });

    vi.spyOn(FeedbackRepository, 'dispatchToApi').mockResolvedValue({
      success: false,
      error: 'Missing required fields: title, description, or diagnostics.',
    });

    renderModal({ isOpen: true });

    const titleInput = host!.querySelector('input[placeholder*="Kanban card"]') as HTMLInputElement;
    const descTextarea = host!.querySelector('textarea') as HTMLTextAreaElement;

    act(() => {
      setInputValue(titleInput, 'Valid issue summary');
      setInputValue(descTextarea, 'Detailed description of the issue that occurred');
    });

    const form = host!.querySelector('form') as HTMLFormElement;

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    // Success card must NOT be displayed
    expect(host!.textContent).not.toContain('Thank You for Your Feedback!');
    // Error message must be visible
    expect(host!.textContent).toContain('Submission failed: Missing required fields: title, description, or diagnostics.');
    // Form and input text must be preserved
    expect(titleInput.value).toBe('Valid issue summary');
    expect(descTextarea.value).toBe('Detailed description of the issue that occurred');
    // NO GitHub button or fallback link
    expect(host!.querySelector('a[href*="github.com"]')).toBeNull();
  });

  it('displays clean error feedback without any GitHub link when reporter service is unconfigured', async () => {
    vi.spyOn(FeedbackRepository, 'saveReport').mockResolvedValue({
      id: 'TRK-BUG-111222',
      type: 'bug',
      title: 'Valid issue summary',
      description: 'Detailed description of the issue that occurred',
      severity: 'medium',
      status: 'new',
      diagnostics: {
        appVersion: '1.2.0',
        activeTab: 'pipeline',
        url: 'http://localhost:5173/?tab=pipeline',
        browser: 'Chrome',
        os: 'Windows',
        viewport: '1920x1080',
        devicePixelRatio: 1,
        authMode: 'unauthenticated',
        timestamp: '2026-10-20T12:00:00.000Z',
        recentErrors: [],
      },
      attachments: [],
      createdAt: '2026-10-20T12:00:00.000Z',
      updatedAt: '2026-10-20T12:00:00.000Z',
    });

    vi.spyOn(FeedbackRepository, 'dispatchToApi').mockResolvedValue({
      success: false,
      error: 'Automated issue reporter service is temporarily unconfigured.',
    });

    renderModal({ isOpen: true });

    const titleInput = host!.querySelector('input[placeholder*="Kanban card"]') as HTMLInputElement;
    const descTextarea = host!.querySelector('textarea') as HTMLTextAreaElement;

    act(() => {
      setInputValue(titleInput, 'Valid issue summary');
      setInputValue(descTextarea, 'Detailed description of the issue that occurred');
    });

    const form = host!.querySelector('form') as HTMLFormElement;

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(host!.textContent).not.toContain('Thank You for Your Feedback!');
    expect(host!.textContent).toContain('Automated issue reporter service is temporarily unconfigured.');
    expect(host!.textContent).not.toContain('GitHub');
    expect(host!.querySelector('a[href*="github.com"]')).toBeNull();
    expect(host!.querySelector('button[title*="GitHub"]')).toBeNull();
  });
});
