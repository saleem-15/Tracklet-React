import { useState, useEffect, useMemo, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { 
  Application, 
  UserEntitlementProfile, 
  PlanTier, 
  PaywallTriggerContext 
} from '../types';
import { 
  ACTIVE_STATUSES, 
  TERMINAL_STATUSES, 
  SAAS_LIMITS 
} from '../lib/constants';
import { EntitlementRepository } from '../lib/entitlementRepository';
import posthog from '../lib/posthog';

export interface UseEntitlementProps {
  user: User | null;
  applications: Application[];
  addToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
}

export interface UseEntitlementReturn {
  profile: UserEntitlementProfile | null;
  planTier: PlanTier;
  activeCount: number;
  terminalCount: number;
  maxActiveQuota: number;
  isGrandfathered: boolean;
  canAddActiveApp: boolean;
  canScrape: boolean;
  isPaywallOpen: boolean;
  paywallContext: PaywallTriggerContext;
  openPaywall: (context: PaywallTriggerContext) => void;
  closePaywall: () => void;
  handleUpgradeClick: () => void;
}

export function useEntitlement({
  user,
  applications,
  addToast,
}: UseEntitlementProps): UseEntitlementReturn {
  const [profile, setProfile] = useState<UserEntitlementProfile | null>(null);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [paywallContext, setPaywallContext] = useState<PaywallTriggerContext>('pipeline_cap');

  // Load entitlement profile on user authentication
  useEffect(() => {
    let isCancelled = false;
    if (user?.uid) {
      EntitlementRepository.getOrCreateProfile(user.uid, user.email, user.displayName)
        .then((loadedProfile) => {
          if (!isCancelled) setProfile(loadedProfile);
        })
        .catch((err) => {
          console.warn('Failed to load user entitlement profile:', err);
        });
    } else {
      setProfile(null);
    }
    return () => {
      isCancelled = true;
    };
  }, [user?.uid, user?.email, user?.displayName]);

  // Compute active & terminal counts
  const { activeCount, terminalCount } = useMemo(() => {
    let active = 0;
    let terminal = 0;
    for (const app of applications) {
      if (ACTIVE_STATUSES.includes(app.status)) {
        active++;
      } else if (TERMINAL_STATUSES.includes(app.status)) {
        terminal++;
      }
    }
    return { activeCount: active, terminalCount: terminal };
  }, [applications]);

  const planTier: PlanTier = profile?.planTier ?? 'free';
  const isPro = planTier === 'pro';
  const maxActiveQuota = isPro ? Infinity : SAAS_LIMITS.FREE_MAX_ACTIVE_APPS;

  // Grandfathered mode: Free tier user who imported >20 active cards from legacy guest session
  const isGrandfathered = !isPro && activeCount > SAAS_LIMITS.FREE_MAX_ACTIVE_APPS;

  // Gate adding new active applications
  const canAddActiveApp = isPro || activeCount < SAAS_LIMITS.FREE_MAX_ACTIVE_APPS;

  // Scrape quota
  const currentScrapes = profile?.quotas?.scrapesUsedThisMonth ?? 0;
  const maxScrapes = isPro ? SAAS_LIMITS.PRO_MONTHLY_SCRAPES : SAAS_LIMITS.FREE_MONTHLY_SCRAPES;
  const canScrape = currentScrapes < maxScrapes;

  const openPaywall = useCallback((context: PaywallTriggerContext) => {
    setPaywallContext(context);
    setIsPaywallOpen(true);
    posthog.capture('paywall_modal_viewed', {
      trigger_context: context,
      active_count: activeCount,
      plan_tier: planTier,
    });
  }, [activeCount, planTier]);

  const closePaywall = useCallback(() => {
    setIsPaywallOpen(false);
  }, []);

  const handleUpgradeClick = useCallback(() => {
    posthog.capture('paywall_upgrade_clicked', {
      trigger_context: paywallContext,
      active_count: activeCount,
      plan_tier: planTier,
    });
    if (addToast) {
      addToast(
        'success',
        'Early Access Waitlist Joined',
        'Thank you! Tracklet Pro billing is coming in Feature 014. We will notify you first.'
      );
    }
    setIsPaywallOpen(false);
  }, [paywallContext, activeCount, planTier, addToast]);

  return {
    profile,
    planTier,
    activeCount,
    terminalCount,
    maxActiveQuota,
    isGrandfathered,
    canAddActiveApp,
    canScrape,
    isPaywallOpen,
    paywallContext,
    openPaywall,
    closePaywall,
    handleUpgradeClick,
  };
}
