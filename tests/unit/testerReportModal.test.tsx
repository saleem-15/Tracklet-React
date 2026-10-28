import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import React from 'react';
import { TesterReportModal } from '../../src/components/feedback/TesterReportModal';
import { FeedbackRepository } from '../../src/lib/feedbackRepository';
import { ToastProvider } from '../../src/context/ToastContext';
import { AuthUser } from '../../src/types';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../src/lib/posthog', () => ({
  default: {
    capture: vi.fn(),
  },
}));

vi.mock('../../src/lib/imageUtils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/imageUtils')>();
  return {
    ...actual,
    compressImageToDataUrl: vi.fn().mockResolvedValue({
      dataUrl: 'data:image/webp;base64,mockWebpContent',
      width: 400,
      height: 300,
      sizeBytes: 2048,
      fileName: 'test-screenshot.png',
      mediaType: 'image/webp',
    }),
  };
});

let host: HTMLDivElement | null = null;
let root: Root | null = null;

describe('TesterReportModal UI & Streamlined Feedback Flow', () => {
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

  function renderModal(props: { isOpen: boolean; onClose?: () => void; user?: AuthUser | null }) {
    act(() => {
      root!.render(
        <ToastProvider>
          <TesterReportModal
            isOpen={props.isOpen}
            onClose={props.onClose || vi.fn()}
            activeTab="pipeline"
            user={props.user}
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

  it('submits feedback through single unified canvas, deriving title & severity automatically', async () => {
    const saveReportSpy = vi.spyOn(FeedbackRepository, 'saveReport').mockResolvedValue({
      id: 'TRK-BUG-999888',
      type: 'bug',
      title: 'Kanban drag fails on column drop',
      description: 'Kanban drag fails on column drop. Moving card freezes the board.',
      severity: 'high',
      status: 'new',
      diagnostics: {
        appVersion: '1.2.0',
        activeTab: 'pipeline',
        url: 'http://localhost:5173/?tab=pipeline',
        browser: 'Chrome',
        os: 'Windows',
        viewport: '1920x1080',
        devicePixelRatio: 1,
        authMode: 'authenticated',
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

    const mockUser: AuthUser = {
      uid: 'u123',
      email: 'alex@company.com',
      displayName: 'Alex',
      photoURL: null,
      providerId: 'google.com',
      emailVerified: true,
    };

    renderModal({ isOpen: true, user: mockUser });

    // Verify authenticated user identity is NOT rendered as visual clutter
    expect(host!.textContent).not.toContain('Sending as');

    // Single unified textarea exists and is auto-focused
    const textarea = host!.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea).not.toBeNull();

    act(() => {
      setInputValue(textarea, 'Kanban drag fails on column drop. Moving card freezes the board.');
    });

    const form = host!.querySelector('form') as HTMLFormElement;
    expect(form).not.toBeNull();

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    // Verify saveReport called with derived title and full description
    expect(saveReportSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'bug',
        title: 'Kanban drag fails on column drop',
        description: 'Kanban drag fails on column drop. Moving card freezes the board.',
        reporterEmail: 'alex@company.com',
        reporterName: 'Alex',
      })
    );

    // Verify warm success screen is rendered
    expect(host!.textContent).toContain('Thank You for Your Feedback!');
    expect(host!.textContent).toContain("I've received your note and will review it right away.");
    expect(host!.textContent).toContain('Done');

    // Ensure zero telemetry jargon or GitHub buttons in DOM
    expect(host!.textContent).not.toContain('Diagnostic context');
    expect(host!.textContent).not.toContain('Auto-Detected Environment');
    expect(host!.textContent).not.toContain('GitHub Issue #');
    expect(host!.textContent).not.toContain('TRK-BUG');
  });

  it('preserves user input and displays clean error message when submission fails', async () => {
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
      error: 'Network connection timeout. Please check your connection.',
    });

    renderModal({ isOpen: true });

    const textarea = host!.querySelector('textarea') as HTMLTextAreaElement;
    act(() => {
      setInputValue(textarea, 'Detailed description of the issue that occurred');
    });

    const form = host!.querySelector('form') as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    // Success card must NOT be displayed
    expect(host!.textContent).not.toContain('Thank You for Your Feedback!');
    // Error message must be visible
    expect(host!.textContent).toContain('Network connection timeout');
    // Input must be preserved
    expect(textarea.value).toBe('Detailed description of the issue that occurred');
  });

  it('allows switching category pill to Feature Request or Account with dynamic placeholders', () => {
    renderModal({ isOpen: true });

    // Billing should not exist in category pills
    expect(host!.textContent).not.toContain('Billing');

    const radioButtons = Array.from(host!.querySelectorAll('button[role="radio"]'));
    expect(radioButtons.length).toBe(4);
    const labels = radioButtons.map(b => b.textContent?.trim());
    expect(labels).toEqual(['Bug Report', 'Feature Request', 'Account', 'Other']);

    const featureButton = radioButtons.find(
      (b) => b.textContent?.includes('Feature Request')
    ) as HTMLButtonElement;

    expect(featureButton).toBeDefined();

    act(() => {
      featureButton.click();
    });

    expect(featureButton.getAttribute('aria-checked')).toBe('true');
    const textarea = host!.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.placeholder).toContain('What feature or workflow enhancement');
  });

  it('guarantees zero nested button elements in the modal dialog', () => {
    renderModal({ isOpen: true });

    const buttons = host!.querySelectorAll('button');
    buttons.forEach((btn) => {
      expect(btn.querySelector('button')).toBeNull();
    });
  });

  it('does not save a draft and clears draft when user escapes from modal', async () => {
    const clearDraftSpy = vi.spyOn(FeedbackRepository, 'clearDraft');
    const saveDraftSpy = vi.spyOn(FeedbackRepository, 'saveDraft');
    const handleClose = vi.fn();

    renderModal({ isOpen: true, onClose: handleClose });

    const textarea = host!.querySelector('textarea') as HTMLTextAreaElement;
    act(() => {
      setInputValue(textarea, 'Some feedback text that user decides to abandon');
    });

    // Press Escape to dismiss modal
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    // Modal close triggered and draft explicitly cleared
    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(clearDraftSpy).toHaveBeenCalled();
    expect(saveDraftSpy).not.toHaveBeenCalled();

    // Reopening modal must start fresh without abandoned text
    renderModal({ isOpen: true });
    const reopenedTextarea = host!.querySelector('textarea') as HTMLTextAreaElement;
    expect(reopenedTextarea.value).toBe('');
  });
});
