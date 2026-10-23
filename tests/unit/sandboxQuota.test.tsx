import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { User } from 'firebase/auth';
import { useApplications, UseApplicationsReturn } from '../../src/hooks/useApplications';
import { DEFAULT_FILTER } from '../../src/hooks/useUrlNavigation';
import { SAAS_LIMITS } from '../../src/lib/constants';
import { EntitlementRepository } from '../../src/lib/entitlementRepository';
import { ApplicationRepository } from '../../src/lib/applicationRepository';
import type { UserEntitlementProfile } from '../../src/types';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;
let root: Root | null = null;
let hookResult: UseApplicationsReturn;
let currentUser: User | null = null;
const mockAddToast = vi.fn();
const mockSetSelectedAppId = vi.fn();

function Harness() {
  hookResult = useApplications({
    user: currentUser,
    filter: { ...DEFAULT_FILTER },
    addToast: mockAddToast,
    selectedAppId: null,
    setSelectedAppId: mockSetSelectedAppId,
  });
  return null;
}

function mountHarness(user: User | null = null) {
  currentUser = user;
  if (root) {
    act(() => root!.unmount());
    root = null;
  }
  if (host) host.remove();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root!.render(<Harness />);
  });
}

describe('Sunset of Sandbox Mode & Free Tier Quotas', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.spyOn(ApplicationRepository, 'addApplication').mockImplementation(async (data, uid) => ({
      id: `real-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stageUpdatedAt: new Date().toISOString(),
      ...data,
    } as any));
    mountHarness({ uid: 'user-cloud-123', emailVerified: true } as User);
  });

  afterEach(() => {
    if (root) {
      act(() => root!.unmount());
      root = null;
    }
    if (host) host.remove();
  });

  it('permits adding applications beyond 3 cards without any sandbox ceiling restriction', async () => {
    // Add 4 applications in succession
    for (let i = 1; i <= 4; i++) {
      await act(async () => {
        await hookResult.handleAddApplication({
          company: `Company ${i}`,
          role: `Role ${i}`,
          platform: 'LinkedIn',
          status: 'Applied',
        } as any);
      });
    }

    expect(hookResult.applications.length).toBe(4);
    expect(mockAddToast).toHaveBeenCalledWith('success', 'Application Added', expect.stringContaining('Company 4'));
    // Ensure no sandbox limit toast was dispatched
    expect(mockAddToast).not.toHaveBeenCalledWith('warning', 'Sandbox Limit Reached', expect.anything());
  });

  it('validates Free tier active quota constants and limit evaluation (20 cards)', () => {
    expect(SAAS_LIMITS.FREE_MAX_ACTIVE_APPS).toBe(20);

    const dummyProfile: UserEntitlementProfile = {
      uid: 'user-123',
      email: 'user@example.com',
      displayName: 'User',
      planTier: 'free',
      subscriptionStatus: 'active',
      quotas: {
        scrapesUsedThisMonth: 0,
        autofillsUsedThisMonth: 0,
        quotaResetAt: new Date().toISOString(),
      },
      createdAt: '',
      updatedAt: '',
    };

    // Exactly at capacity (20 active cards)
    const atCapacity = EntitlementRepository.checkLimits(dummyProfile, 20);
    expect(atCapacity.canAddActiveApp).toBe(false);
    expect(atCapacity.activeAppsLimit).toBe(20);

    // Below capacity (19 active cards)
    const belowCapacity = EntitlementRepository.checkLimits(dummyProfile, 19);
    expect(belowCapacity.canAddActiveApp).toBe(true);
  });

  it('blocks CSV batch import for unauthenticated or unverified visitors', async () => {
    mountHarness(null);
    await act(async () => {
      await hookResult.handleBatchImportApplications([
        { company: 'CSV Corp', role: 'Data Analyst', platform: 'LinkedIn', status: 'Applied' } as any,
      ]);
    });

    expect(mockAddToast).toHaveBeenCalledWith(
      'warning',
      'Account Required',
      expect.stringContaining('CSV import is available on cloud accounts')
    );
  });

  it('permits CSV batch import for verified authenticated cloud users', async () => {
    const verifiedUser = {
      uid: 'user-cloud-123',
      emailVerified: true,
      email: 'verified@example.com',
    } as unknown as User;

    mountHarness(verifiedUser);

    vi.spyOn(ApplicationRepository, 'batchImport').mockResolvedValue([
      {
        id: 'app-imported-1',
        company: 'Cloud Corp',
        role: 'Full Stack',
        platform: 'LinkedIn',
        status: 'Applied',
        dateApplied: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stageUpdatedAt: new Date().toISOString(),
      } as any,
    ]);

    await act(async () => {
      await hookResult.handleBatchImportApplications([
        { company: 'Cloud Corp', role: 'Full Stack', platform: 'LinkedIn', status: 'Applied' } as any,
      ]);
    });

    expect(mockAddToast).toHaveBeenCalledWith(
      'success',
      'Batch Import Complete',
      expect.stringContaining('Successfully imported 1 applications')
    );
    expect(hookResult.applications.length).toBe(1);
  });
});
