import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import React, { act } from 'react';
import { PlanUsageSection } from '../../src/components/account/PlanUsageSection';

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

describe('PlanUsageSection', () => {
  afterEach(() => {
    if (root) {
      act(() => root!.unmount());
      root = null;
    }
    if (host) host.remove();
  });

  it('renders experimental access preview state when subscriptions are disabled', () => {
    mount(
      <PlanUsageSection
        isPro={false}
        activeCount={14}
        maxActiveQuota={Infinity}
        isGrandfathered={false}
        scrapesUsed={3}
        maxScrapes={Infinity}
        onUpgradeClick={vi.fn()}
        subscriptionsEnabled={false}
      />
    );

    expect(host?.textContent).toContain('Account Access:');
    expect(host?.textContent).toContain('Experimental Preview');
    expect(host?.textContent).toContain('All Features Unlocked');
    expect(host?.textContent).toContain('Subscriptions, pricing, and tier quotas are disabled');
    expect(host?.textContent).toContain('14 / ∞');
    expect(host?.textContent).toContain('3 / ∞');
    expect(host?.textContent).not.toContain('Upgrade to Pro');
    expect(host?.textContent).not.toContain('Free Plan');
    expect(host?.textContent).not.toContain('Pro Plan');
  });

  it('renders standard subscription plans and upgrade CTA when subscriptions are enabled', () => {
    const handleUpgrade = vi.fn();
    mount(
      <PlanUsageSection
        isPro={false}
        activeCount={10}
        maxActiveQuota={20}
        isGrandfathered={false}
        scrapesUsed={5}
        maxScrapes={20}
        onUpgradeClick={handleUpgrade}
        subscriptionsEnabled={true}
      />
    );

    expect(host?.textContent).toContain('Subscription Tier:');
    expect(host?.textContent).toContain('Free Plan');
    expect(host?.textContent).toContain('Upgrade to Pro →');
    expect(host?.textContent).toContain('10 / 20');
    expect(host?.textContent).toContain('5 / 20');

    const upgradeBtn = Array.from(host?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('Upgrade to Pro')
    );
    expect(upgradeBtn).toBeDefined();
    act(() => {
      upgradeBtn?.click();
    });
    expect(handleUpgrade).toHaveBeenCalledTimes(1);
  });
});
