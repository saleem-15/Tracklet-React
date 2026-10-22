import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import React from 'react';
import { SecurityPrivacyCard } from '../../src/components/SecurityPrivacyCard';

let host: HTMLDivElement | null = null;
let root: Root | null = null;

describe('SecurityPrivacyCard', () => {
  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root!.unmount();
      });
      root = null;
    }
    if (host && host.parentNode) {
      host.parentNode.removeChild(host);
      host = null;
    }
  });

  it('renders enterprise security and data ownership card with key pillars', async () => {
    await act(async () => {
      root!.render(<SecurityPrivacyCard />);
    });

    expect(host!.textContent).toContain('Enterprise Security & Data Ownership');
    expect(host!.textContent).toContain('Zero Recruiter Monetization');
    expect(host!.textContent).toContain('Zero Recruiter Selling');
    expect(host!.textContent).toContain('Encrypted Cloud Sync');
    expect(host!.textContent).toContain('PII-Masked Telemetry');
    expect(host!.textContent).toContain('Review Privacy & Terms');
  });

  it('opens and closes the legal & privacy governance modal via button', async () => {
    await act(async () => {
      root!.render(<SecurityPrivacyCard />);
    });

    expect(document.querySelector('[role="dialog"]')).toBeNull();

    // Click to open modal
    const reviewBtn = Array.from(host!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Review Privacy & Terms')
    );
    expect(reviewBtn).toBeTruthy();

    await act(async () => {
      reviewBtn!.click();
    });

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog!.textContent).toContain('Legal & Privacy Governance');
    expect(dialog!.textContent).toContain('The Non-Monetization Pledge');

    // Close via header close button
    const closeBtn = dialog!.querySelector('button[aria-label="Close dialog"]') as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();

    await act(async () => {
      closeBtn.click();
    });

    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('switches between Privacy Policy and Terms of Service tabs inside modal', async () => {
    await act(async () => {
      root!.render(<SecurityPrivacyCard />);
    });

    const reviewBtn = Array.from(host!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Review Privacy & Terms')
    );

    await act(async () => {
      reviewBtn!.click();
    });

    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.textContent).toContain('The Non-Monetization Pledge');
    expect(dialog.textContent).toContain('1. Information We Collect');

    // Switch to Terms of Service
    const termsTabBtn = Array.from(dialog.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Terms of Service'
    );
    expect(termsTabBtn).toBeTruthy();

    await act(async () => {
      termsTabBtn!.click();
    });

    expect(dialog.textContent).toContain('1. Customer Content Ownership');
    expect(dialog.textContent).toContain('2. Subscription Plans & Entitlements');

    // Switch back to Privacy Policy
    const privacyTabBtn = Array.from(dialog.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Privacy Policy'
    );
    expect(privacyTabBtn).toBeTruthy();

    await act(async () => {
      privacyTabBtn!.click();
    });

    expect(dialog.textContent).toContain('The Non-Monetization Pledge');
  });

  it('dismisses modal on Escape key press per AGENTS.md requirement', async () => {
    await act(async () => {
      root!.render(<SecurityPrivacyCard />);
    });

    const reviewBtn = Array.from(host!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Review Privacy & Terms')
    );

    await act(async () => {
      reviewBtn!.click();
    });

    expect(document.querySelector('[role="dialog"]')).not.toBeNull();

    // Dispatch Escape keydown
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});
