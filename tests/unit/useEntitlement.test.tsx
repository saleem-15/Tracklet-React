import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import React, { act } from 'react';
import { useEntitlement, UseEntitlementReturn } from '../../src/hooks/useEntitlement';
import { Application } from '../../src/types';
import type { User } from 'firebase/auth';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;
let root: Root | null = null;
let hookResult: UseEntitlementReturn;

function Harness({ user, applications }: { user: User | null; applications: Application[] }) {
  hookResult = useEntitlement({ user, applications });
  return null;
}

function mount(user: User | null, applications: Application[]) {
  if (root) {
    act(() => root!.unmount());
    root = null;
  }
  if (host) host.remove();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root!.render(<Harness user={user} applications={applications} />);
  });
}

describe('useEntitlement hook under experimental preview', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    if (root) {
      act(() => root!.unmount());
      root = null;
    }
    if (host) host.remove();
  });

  it('provides unlimited capacity and never opens paywall when subscriptions are disabled', () => {
    const apps: Application[] = Array.from({ length: 25 }, (_, i) => ({
      id: `app-${i}`,
      userId: 'user-experimental-1',
      company: `Company ${i}`,
      role: 'Engineer',
      status: 'Applied',
      platform: 'LinkedIn',
      dateApplied: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stageUpdatedAt: new Date().toISOString(),
    }));

    const mockUser = {
      uid: 'user-experimental-1',
      email: 'tester@example.com',
      displayName: 'Experimental Tester',
    } as unknown as User;

    mount(mockUser, apps);

    // Active applications counted accurately
    expect(hookResult.activeCount).toBe(25);
    // Unlimited quota during experimental preview
    expect(hookResult.maxActiveQuota).toBe(Infinity);
    expect(hookResult.canAddActiveApp).toBe(true);
    expect(hookResult.canScrape).toBe(true);
    expect(hookResult.isGrandfathered).toBe(false);

    // Attempting to open paywall is a no-op
    act(() => {
      hookResult.openPaywall('pipeline_cap');
    });
    expect(hookResult.isPaywallOpen).toBe(false);
  });
});
