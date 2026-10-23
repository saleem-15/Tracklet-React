import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import React, { act } from 'react';
import { UpgradePaywallModal } from '../../src/components/paywall/UpgradePaywallModal';
import { SAAS_LIMITS } from '../../src/lib/constants';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: React.ReactElement) {
  if (root) {
    act(() => root!.unmount());
    root = null;
  }
  if (host) host.remove();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root!.render(ui);
  });
}

describe('UpgradePaywallModal', () => {
  afterEach(() => {
    if (root) {
      act(() => root!.unmount());
      root = null;
    }
    if (host) host.remove();
  });

  it('does not render when isOpen is false', () => {
    mount(
      <UpgradePaywallModal
        isOpen={false}
        triggerContext="pipeline_cap"
        currentUsage={20}
        maxQuota={SAAS_LIMITS.FREE_MAX_ACTIVE_APPS}
        onClose={vi.fn()}
        onUpgradeClick={vi.fn()}
      />
    );
    expect(host?.innerHTML).toBe('');
  });

  it('renders pipeline_cap context heading and capacity indicator', () => {
    mount(
      <UpgradePaywallModal
        isOpen={true}
        triggerContext="pipeline_cap"
        currentUsage={20}
        maxQuota={SAAS_LIMITS.FREE_MAX_ACTIVE_APPS}
        onClose={vi.fn()}
        onUpgradeClick={vi.fn()}
      />
    );

    expect(host?.textContent).toContain('Active Pipeline Limit Reached');
    expect(host?.textContent).toContain('20 active pipeline applications');
    expect(host?.textContent).toContain('20 / 20');
  });

  it('renders scrape_limit context heading when triggered by AI scraping quota', () => {
    mount(
      <UpgradePaywallModal
        isOpen={true}
        triggerContext="scrape_limit"
        currentUsage={20}
        maxQuota={SAAS_LIMITS.FREE_MONTHLY_SCRAPES}
        onClose={vi.fn()}
        onUpgradeClick={vi.fn()}
      />
    );

    expect(host?.textContent).toContain('Monthly AI Scrape Limit Reached');
    expect(host?.textContent).toContain('consumed all 20 free AI fallback scrapes');
  });

  it('calls onUpgradeClick when clicking the Join Early Access button', () => {
    const handleUpgrade = vi.fn();
    mount(
      <UpgradePaywallModal
        isOpen={true}
        triggerContext="pipeline_cap"
        currentUsage={20}
        maxQuota={SAAS_LIMITS.FREE_MAX_ACTIVE_APPS}
        onClose={vi.fn()}
        onUpgradeClick={handleUpgrade}
      />
    );

    const upgradeBtn = host?.querySelector('button.bg-blue-600') as HTMLButtonElement;
    expect(upgradeBtn).toBeDefined();
    act(() => {
      upgradeBtn?.click();
    });
    expect(handleUpgrade).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking the close button or cancel button', () => {
    const handleClose = vi.fn();
    mount(
      <UpgradePaywallModal
        isOpen={true}
        triggerContext="pipeline_cap"
        currentUsage={20}
        maxQuota={SAAS_LIMITS.FREE_MAX_ACTIVE_APPS}
        onClose={handleClose}
        onUpgradeClick={vi.fn()}
      />
    );

    const closeBtn = host?.querySelector('button[aria-label="Close dialog"]') as HTMLButtonElement;
    expect(closeBtn).toBeDefined();
    act(() => {
      closeBtn?.click();
    });
    expect(handleClose).toHaveBeenCalledTimes(1);

    const cancelBtn = Array.from(host?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('Maybe later')
    );
    act(() => {
      cancelBtn?.click();
    });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('dismisses cleanly when pressing Escape key', () => {
    const handleClose = vi.fn();
    mount(
      <UpgradePaywallModal
        isOpen={true}
        triggerContext="pipeline_cap"
        currentUsage={20}
        maxQuota={SAAS_LIMITS.FREE_MAX_ACTIVE_APPS}
        onClose={handleClose}
        onUpgradeClick={vi.fn()}
      />
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
