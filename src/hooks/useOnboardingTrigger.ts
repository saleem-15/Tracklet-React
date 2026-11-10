import { useEffect, useRef } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { UserEntitlementProfile } from '../types';
import { LOCAL_STORAGE_KEYS } from '../lib/constants';

interface UseOnboardingTriggerProps {
  isLoading: boolean;
  user: FirebaseUser | null;
  profile: UserEntitlementProfile | null;
  totalAppCount: number;
  openOnboardingModal: (initialStep?: number) => void;
}

/**
 * useOnboardingTrigger
 *
 * Evaluates whether to automatically present the Onboarding Guide to a verified new user:
 * - Only after authentication and data loading have completed (`!isLoading`).
 * - Only if the user's email is verified (`user.emailVerified`).
 * - Only if they have 0 total applications.
 * - Only if they have not previously completed or dismissed onboarding in Firestore or localStorage.
 * - StrictMode and multi-tab safe.
 */
export function useOnboardingTrigger({
  isLoading,
  user,
  profile,
  totalAppCount,
  openOnboardingModal,
}: UseOnboardingTriggerProps) {
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    // 1. Loading and user validation guards
    if (isLoading || !user || !user.emailVerified) return;

    // 2. Already triggered in this session or application exists
    if (hasTriggeredRef.current || totalAppCount > 0) return;

    // 3. User document must be loaded
    if (!profile) return;

    // 4. Check Firestore persisted status
    if (profile.onboarding?.completed || profile.onboarding?.dismissed) return;

    // 5. Check local storage and session suppression caches
    try {
      const completedKey = `${LOCAL_STORAGE_KEYS.ONBOARDING_COMPLETED_PREFIX}${user.uid}`;
      const isCompletedLocally = localStorage.getItem(completedKey) === 'true';
      if (isCompletedLocally) return;

      const suppressedKey = `${LOCAL_STORAGE_KEYS.ONBOARDING_SUPPRESSED_SESSION_PREFIX}${user.uid}`;
      const isSuppressedSession = sessionStorage.getItem(suppressedKey) === 'true';
      if (isSuppressedSession) return;

      // Mark session triggered and open modal
      hasTriggeredRef.current = true;
      sessionStorage.setItem(suppressedKey, 'true');
      openOnboardingModal(1);
    } catch {
      // In private browsing mode where storage is restricted, proceed safely
      hasTriggeredRef.current = true;
      openOnboardingModal(1);
    }
  }, [isLoading, user, user?.emailVerified, profile, totalAppCount, openOnboardingModal]);
}
