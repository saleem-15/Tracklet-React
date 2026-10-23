import { useState, useCallback, useEffect, useRef } from 'react';
import type { User } from 'firebase/auth';
import { Application, Contact } from '../types';
import { ApplicationRepository } from '../lib/applicationRepository';
import { ContactRepository } from '../lib/contactRepository';
import { posthogLogs } from '../lib/posthogLogs';
import type { AddToastFn } from './useToast';

export interface UseDataLoaderProps {
  user: User | null;
  authLoading: boolean;
  setApplications: React.Dispatch<React.SetStateAction<Application[]>>;
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  addToast: AddToastFn;
}

export interface UseDataLoaderReturn {
  dataLoading: boolean;
  loadData: () => Promise<void>;
}

/**
 * useDataLoader
 *
 * Data hydration hook that loads applications and contacts from Firestore
 * for authenticated cloud users.
 *
 * Automatically re-loads whenever the user's auth state changes
 * (login, logout, email verification).
 */
export function useDataLoader({
  user,
  authLoading,
  setApplications,
  setContacts,
  addToast,
}: UseDataLoaderProps): UseDataLoaderReturn {
  const [dataLoading, setDataLoading] = useState(true);
  const requestIdRef = useRef(0);

  const loadData = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;
    setDataLoading(true);
    try {
      if (user && user.emailVerified) {
        const [appsResult, contactsResult] = await Promise.allSettled([
          ApplicationRepository.loadApplications(user.uid),
          ContactRepository.loadContacts(user.uid),
        ]);

        if (requestIdRef.current !== currentRequestId) return;

        let loadedApps: Application[] = [];
        let loadedContacts: Contact[] = [];

        if (appsResult.status === 'fulfilled') {
          loadedApps = appsResult.value;
        } else {
          console.error('Failed to load applications from Firestore:', appsResult.reason);
          throw appsResult.reason;
        }

        if (contactsResult.status === 'fulfilled') {
          loadedContacts = contactsResult.value;
        } else {
          console.warn('Failed to load contacts from Firestore:', contactsResult.reason);
          loadedContacts = [];
        }

        if (requestIdRef.current !== currentRequestId) return;

        setApplications(loadedApps);
        setContacts(loadedContacts);
        posthogLogs.dataHydrationCompleted('firestore', loadedApps.length, loadedContacts.length, false);
      } else {
        if (requestIdRef.current !== currentRequestId) return;
        setApplications([]);
        setContacts([]);
      }
    } catch (err) {
      if (requestIdRef.current !== currentRequestId) return;
      posthogLogs.dataHydrationFailed('firestore');
      console.error('Error loading applications and contacts:', err);
      addToast('error', 'Load Error', 'Could not load data from repository.');
    } finally {
      if (requestIdRef.current === currentRequestId) {
        setDataLoading(false);
      }
    }
  }, [user, addToast, setApplications, setContacts]);

  // Trigger data load whenever auth state resolves or user changes
  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [authLoading, user?.uid, user?.emailVerified, loadData]);

  return { dataLoading, loadData };
}
