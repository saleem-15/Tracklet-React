import { 
  db, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc 
} from './firebase';
import { UserEntitlementProfile, UserQuotas } from '../types';
import { SAAS_LIMITS, DEFAULT_USER_QUOTAS } from './constants';

function getNextMonthResetDate(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
}

export class EntitlementRepository {
  /**
   * Loads or initializes the UserEntitlementProfile at /users/{userId}.
   * Automatically resets monthly quotas if quotaResetAt has elapsed.
   */
  static async getOrCreateProfile(
    userId: string,
    email?: string | null,
    displayName?: string | null
  ): Promise<UserEntitlementProfile> {
    if (!userId) {
      throw new Error('User ID is required to fetch entitlement profile.');
    }

    try {
      const userRef = doc(db, 'users', userId);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const raw = snap.data();
        const profile: UserEntitlementProfile = {
          uid: userId,
          email: raw.email ?? email ?? null,
          displayName: raw.displayName ?? displayName ?? null,
          planTier: raw.planTier === 'pro' ? 'pro' : 'free',
          subscriptionStatus: raw.subscriptionStatus ?? 'none',
          currentPeriodEnd: raw.currentPeriodEnd ?? null,
          stripeCustomerId: raw.stripeCustomerId ?? null,
          quotas: {
            scrapesUsedThisMonth: raw.quotas?.scrapesUsedThisMonth ?? 0,
            autofillsUsedThisMonth: raw.quotas?.autofillsUsedThisMonth ?? 0,
            quotaResetAt: raw.quotas?.quotaResetAt ?? getNextMonthResetDate(),
          },
          createdAt: raw.createdAt ?? new Date().toISOString(),
          updatedAt: raw.updatedAt ?? new Date().toISOString(),
        };

        // Monthly quota reset check
        const now = new Date();
        const resetDate = new Date(profile.quotas.quotaResetAt);
        if (now >= resetDate) {
          profile.quotas.scrapesUsedThisMonth = 0;
          profile.quotas.autofillsUsedThisMonth = 0;
          profile.quotas.quotaResetAt = getNextMonthResetDate();
          profile.updatedAt = now.toISOString();

          try {
            await updateDoc(userRef, {
              quotas: profile.quotas,
              updatedAt: profile.updatedAt,
            });
          } catch (updateErr) {
            console.warn('Failed to update reset quotas in Firestore:', updateErr);
          }
        }

        return profile;
      }

      // Initialize default 'free' profile
      const nowISO = new Date().toISOString();
      const defaultProfile: UserEntitlementProfile = {
        uid: userId,
        email: email ?? null,
        displayName: displayName ?? null,
        planTier: 'free',
        subscriptionStatus: 'none',
        currentPeriodEnd: null,
        stripeCustomerId: null,
        quotas: {
          scrapesUsedThisMonth: 0,
          autofillsUsedThisMonth: 0,
          quotaResetAt: getNextMonthResetDate(),
        },
        createdAt: nowISO,
        updatedAt: nowISO,
      };

      await setDoc(userRef, defaultProfile, { merge: true });
      return defaultProfile;
    } catch (err) {
      console.error('Error fetching or initializing entitlement profile:', err);
      // Fallback in-memory profile to prevent hard crash if Firestore is temporarily offline
      return {
        uid: userId,
        email: email ?? null,
        displayName: displayName ?? null,
        planTier: 'free',
        subscriptionStatus: 'none',
        currentPeriodEnd: null,
        stripeCustomerId: null,
        quotas: { ...DEFAULT_USER_QUOTAS },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Fetches an existing UserEntitlementProfile without creating it if absent.
   */
  static async getProfile(userId: string): Promise<UserEntitlementProfile | null> {
    if (!userId) return null;
    try {
      const snap = await getDoc(doc(db, 'users', userId));
      if (!snap.exists()) return null;
      const raw = snap.data();
      return {
        uid: userId,
        email: raw.email ?? null,
        displayName: raw.displayName ?? null,
        planTier: raw.planTier === 'pro' ? 'pro' : 'free',
        subscriptionStatus: raw.subscriptionStatus ?? 'none',
        currentPeriodEnd: raw.currentPeriodEnd ?? null,
        stripeCustomerId: raw.stripeCustomerId ?? null,
        quotas: {
          scrapesUsedThisMonth: raw.quotas?.scrapesUsedThisMonth ?? 0,
          autofillsUsedThisMonth: raw.quotas?.autofillsUsedThisMonth ?? 0,
          quotaResetAt: raw.quotas?.quotaResetAt ?? getNextMonthResetDate(),
        },
        createdAt: raw.createdAt ?? new Date().toISOString(),
        updatedAt: raw.updatedAt ?? new Date().toISOString(),
      };
    } catch (err) {
      console.error('Failed to get profile:', err);
      return null;
    }
  }

  /**
   * Checks if active applications or monthly scrape limits have been reached.
   */
  static checkLimits(
    profile: UserEntitlementProfile | null,
    activeAppsCount: number
  ): {
    canAddActiveApp: boolean;
    canScrape: boolean;
    activeAppsLimit: number;
    monthlyScrapesLimit: number;
  } {
    const isPro = profile?.planTier === 'pro';
    const activeAppsLimit = isPro ? Infinity : SAAS_LIMITS.FREE_MAX_ACTIVE_APPS;
    const monthlyScrapesLimit = isPro ? SAAS_LIMITS.PRO_MONTHLY_SCRAPES : SAAS_LIMITS.FREE_MONTHLY_SCRAPES;

    const currentScrapes = profile?.quotas?.scrapesUsedThisMonth ?? 0;

    return {
      canAddActiveApp: isPro || activeAppsCount < activeAppsLimit,
      canScrape: currentScrapes < monthlyScrapesLimit,
      activeAppsLimit,
      monthlyScrapesLimit,
    };
  }

  /**
   * Increments the user's monthly scrape usage count.
   */
  static async incrementScrapeUsage(userId: string): Promise<number> {
    if (!userId) return 0;
    try {
      const userRef = doc(db, 'users', userId);
      const snap = await getDoc(userRef);
      if (!snap.exists()) return 0;

      const current = snap.data()?.quotas?.scrapesUsedThisMonth ?? 0;
      const updated = current + 1;
      await updateDoc(userRef, {
        'quotas.scrapesUsedThisMonth': updated,
        updatedAt: new Date().toISOString(),
      });
      return updated;
    } catch (err) {
      console.warn('Could not increment scrape usage in Firestore:', err);
      return 0;
    }
  }
}
