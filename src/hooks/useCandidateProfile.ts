import { useState, useEffect, useCallback } from 'react';
import { CandidateProfile } from '../types';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useToastContext } from '../context/ToastContext';

export const DEFAULT_CANDIDATE_PROFILE: CandidateProfile = {
  fullName: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  location: '',
  workAuth: {
    isLegallyAuthorized: true,
    requiresSponsorship: false,
    currentStatus: 'Citizen / Permanent Resident',
  },
  noticePeriod: '2_weeks',
  relocationPreference: 'remote_only',
  experience: {
    currentTitle: '',
    currentCompany: '',
    yearsOfExperience: undefined,
  },
  targetTitles: [],
  salaryTarget: {
    minimumBase: undefined,
    targetOTE: undefined,
    currency: 'USD',
  },
  targetLocations: [],
  workAuthorization: '',
  linkedInUrl: '',
  githubUrl: '',
  portfolioUrl: '',
  bioSnippet: '',
  coverLetterSnippet: '',
  defaultResumeId: undefined,
};

function getLocalProfileKey(userId?: string): string {
  if (userId) return `tracklet_u_${userId}_candidate_profile_v1`;
  return 'tracklet_candidate_profile_v1';
}

function loadLocalCandidateProfile(userId?: string): CandidateProfile {
  try {
    const raw = localStorage.getItem(getLocalProfileKey(userId));
    if (raw) {
      return { ...DEFAULT_CANDIDATE_PROFILE, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.warn('Could not parse local candidate profile:', err);
  }
  return DEFAULT_CANDIDATE_PROFILE;
}

function saveLocalCandidateProfile(profile: CandidateProfile, userId?: string): void {
  try {
    localStorage.setItem(getLocalProfileKey(userId), JSON.stringify(profile));
  } catch (err) {
    console.warn('Could not write local candidate profile:', err);
  }
}

export interface UseCandidateProfileReturn {
  profile: CandidateProfile;
  isSaving: boolean;
  isLoading: boolean;
  saveProfile: (updates: Partial<CandidateProfile>) => Promise<boolean>;
}

/**
 * useCandidateProfile
 *
 * Domain hook encapsulating candidate job hunt targets and ATS autofill profile.
 * - Bridges the Web Dashboard with the Chrome Extension (Constitution Principle IV)
 * - Persists to Cloud Firestore (`users/{userId}/profile/candidate`)
 * - Provides optimistic UI updates and local cache backup
 */
export function useCandidateProfile(): UseCandidateProfileReturn {
  const { user } = useAuth();
  const { addToast } = useToastContext();
  const userId = user?.uid;

  const [profile, setProfile] = useState<CandidateProfile>(() => loadLocalCandidateProfile(userId));
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Sync profile from Cloud Firestore on login
  useEffect(() => {
    if (!userId) {
      setProfile(loadLocalCandidateProfile());
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const docRef = doc(db, 'users', userId, 'profile', 'candidate');
    getDoc(docRef)
      .then((docSnap) => {
        if (!isMounted) return;
        if (docSnap.exists()) {
          const cloudData = docSnap.data() as CandidateProfile;
          const merged: CandidateProfile = {
            ...DEFAULT_CANDIDATE_PROFILE,
            ...cloudData,
          };
          setProfile(merged);
          saveLocalCandidateProfile(merged, userId);
        }
      })
      .catch((err) => {
        console.warn('Could not load candidate profile from Firestore:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const saveProfile = useCallback(
    async (updates: Partial<CandidateProfile>): Promise<boolean> => {
      const merged: CandidateProfile = {
        ...profile,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // 1. Optimistic React State & Local Storage update
      setProfile(merged);
      saveLocalCandidateProfile(merged, userId);

      if (!userId) {
        addToast('info', 'Profile Saved Locally', 'Sign in to sync your profile with the Chrome Extension.');
        return true;
      }

      setIsSaving(true);
      try {
        const docRef = doc(db, 'users', userId, 'profile', 'candidate');
        await setDoc(docRef, merged, { merge: true });
        addToast('success', 'Profile Saved', 'Candidate target and autofill preferences synced to cloud.');
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Could not save profile to cloud.';
        addToast('error', 'Save Failed', msg);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [profile, userId, addToast]
  );

  return {
    profile,
    isSaving,
    isLoading,
    saveProfile,
  };
}
