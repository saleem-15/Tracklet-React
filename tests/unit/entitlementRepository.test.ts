import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EntitlementRepository } from '../../src/lib/entitlementRepository';
import { SAAS_LIMITS } from '../../src/lib/constants';
import { UserEntitlementProfile } from '../../src/types';

const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDoc = vi.fn((_db: any, _col: string, id: string) => ({ id }));

vi.mock('../../src/lib/firebase', () => ({
  db: {},
  doc: (db: any, col: string, id: string) => mockDoc(db, col, id),
  getDoc: (ref: any) => mockGetDoc(ref),
  setDoc: (ref: any, data: any, opts?: any) => mockSetDoc(ref, data, opts),
  updateDoc: (ref: any, data: any) => mockUpdateDoc(ref, data),
  isFirebaseConfigured: true,
}));

describe('EntitlementRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a new entitlement profile with default free tier and quotas when document does not exist', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => false,
      data: () => null,
    });

    const profile = await EntitlementRepository.getOrCreateProfile(
      'user_new_123',
      'applicant@tracklet.app',
      'Test Applicant'
    );

    expect(profile.uid).toBe('user_new_123');
    expect(profile.planTier).toBe('free');
    expect(profile.subscriptionStatus).toBe('none');
    expect(profile.quotas.scrapesUsedThisMonth).toBe(0);
    expect(profile.quotas.autofillsUsedThisMonth).toBe(0);
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
  });

  it('loads an existing user profile without re-initializing if current period is valid', async () => {
    const existingDate = new Date();
    existingDate.setDate(existingDate.getDate() + 15);

    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        uid: 'user_pro_456',
        email: 'pro@tracklet.app',
        displayName: 'Pro User',
        planTier: 'pro',
        subscriptionStatus: 'active',
        quotas: {
          scrapesUsedThisMonth: 12,
          autofillsUsedThisMonth: 4,
          quotaResetAt: existingDate.toISOString(),
        },
      }),
    });

    const profile = await EntitlementRepository.getOrCreateProfile('user_pro_456');

    expect(profile.planTier).toBe('pro');
    expect(profile.subscriptionStatus).toBe('active');
    expect(profile.quotas.scrapesUsedThisMonth).toBe(12);
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('auto-resets quota usage when past quotaResetAt date', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);

    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        uid: 'user_expired_789',
        email: 'expired@tracklet.app',
        displayName: 'Expired User',
        planTier: 'free',
        subscriptionStatus: 'none',
        quotas: {
          scrapesUsedThisMonth: 19,
          autofillsUsedThisMonth: 8,
          quotaResetAt: pastDate.toISOString(),
        },
      }),
    });

    const profile = await EntitlementRepository.getOrCreateProfile('user_expired_789');

    expect(profile.quotas.scrapesUsedThisMonth).toBe(0);
    expect(profile.quotas.autofillsUsedThisMonth).toBe(0);
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
  });

  it('correctly calculates limits and permissions via checkLimits', () => {
    const freeProfile: UserEntitlementProfile = {
      uid: 'free_user',
      email: 'free@tracklet.app',
      displayName: 'Free User',
      planTier: 'free',
      subscriptionStatus: 'none',
      currentPeriodEnd: null,
      stripeCustomerId: null,
      quotas: {
        scrapesUsedThisMonth: 20,
        autofillsUsedThisMonth: 0,
        quotaResetAt: new Date().toISOString(),
      },
      createdAt: '',
      updatedAt: '',
    };

    // Free user with 20 active cards and 20 scrapes
    const limitsAtCapacity = EntitlementRepository.checkLimits(freeProfile, 20);
    expect(limitsAtCapacity.canAddActiveApp).toBe(false);
    expect(limitsAtCapacity.canScrape).toBe(false);
    expect(limitsAtCapacity.activeAppsLimit).toBe(SAAS_LIMITS.FREE_MAX_ACTIVE_APPS);

    // Free user with 15 active cards and 10 scrapes
    const freeProfileUnder: UserEntitlementProfile = {
      ...freeProfile,
      quotas: { ...freeProfile.quotas, scrapesUsedThisMonth: 10 },
    };
    const limitsUnderCapacity = EntitlementRepository.checkLimits(freeProfileUnder, 15);
    expect(limitsUnderCapacity.canAddActiveApp).toBe(true);
    expect(limitsUnderCapacity.canScrape).toBe(true);

    // Pro user with 50 active cards and 300 scrapes
    const proProfile: UserEntitlementProfile = {
      ...freeProfile,
      planTier: 'pro',
      quotas: { ...freeProfile.quotas, scrapesUsedThisMonth: 300 },
    };
    const proLimits = EntitlementRepository.checkLimits(proProfile, 50);
    expect(proLimits.canAddActiveApp).toBe(true);
    expect(proLimits.canScrape).toBe(true);
    expect(proLimits.activeAppsLimit).toBe(Infinity);
    expect(proLimits.monthlyScrapesLimit).toBe(SAAS_LIMITS.PRO_MONTHLY_SCRAPES);
  });

  it('increments monthly scrape usage via incrementScrapeUsage', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        quotas: { scrapesUsedThisMonth: 5 },
      }),
    });

    const newCount = await EntitlementRepository.incrementScrapeUsage('user_active_123');
    expect(newCount).toBe(6);
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        'quotas.scrapesUsedThisMonth': 6,
      })
    );
  });
});
