import { useState, useCallback, useEffect, useRef } from 'react';
import type { User } from 'firebase/auth';
import { Application, Contact } from '../types';
import { ApplicationRepository } from '../lib/applicationRepository';
import { ContactRepository } from '../lib/contactRepository';
import { migrateLegacyEmbeddedContacts } from '../lib/contactMigration';
import type { AddToastFn } from './useToast';

export interface UseDataLoaderProps {
  user: User | null;
  authLoading: boolean;
  setApplications: React.Dispatch<React.SetStateAction<Application[]>>;
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  addToast: AddToastFn;
  checkAndPromptGuestMigration: () => void;
}

export interface UseDataLoaderReturn {
  dataLoading: boolean;
  loadData: () => Promise<void>;
}

/**
 * useDataLoader
 *
 * Data hydration hook that orchestrates loading applications and contacts
 * from the correct persistence source (Firestore for authenticated users,
 * localStorage for guests), runs legacy embedded contact auto-migration,
 * and triggers guest-to-cloud migration detection.
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
  checkAndPromptGuestMigration,
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
          console.warn('Failed to load contacts from Firestore (using local fallback):', contactsResult.reason);
          loadedContacts = ContactRepository.loadGuestContacts();
        }

        // Automatic legacy embedded contact migration
        const { migratedContacts, updatedApplications, hasChanges } = migrateLegacyEmbeddedContacts(
          loadedApps,
          loadedContacts
        );

        if (hasChanges) {
          loadedApps = updatedApplications;
          loadedContacts = migratedContacts;
          // Asynchronously persist any newly migrated standalone contacts preserving IDs
          for (const newC of migratedContacts) {
            ContactRepository.upsertContact(newC, user.uid).catch((err) => {
              console.warn('Could not save migrated contact to Firestore:', err);
            });
          }
        }

        if (requestIdRef.current !== currentRequestId) return;

        setApplications(loadedApps);
        setContacts(loadedContacts);

        // Check for guest data migration
        checkAndPromptGuestMigration();
      } else if (!user) {
        let guestApps = ApplicationRepository.loadGuestApplications();
        let guestContacts = ContactRepository.loadGuestContacts();

        // Run automatic legacy embedded contact migration on guest data
        const { migratedContacts, updatedApplications, migratedCount } = migrateLegacyEmbeddedContacts(
          guestApps,
          guestContacts
        );

        if (migratedCount > 0) {
          guestApps = updatedApplications;
          guestContacts = migratedContacts;
          ApplicationRepository.saveGuestApplications(guestApps);
          ContactRepository.saveGuestContacts(guestContacts);
        }

        if (requestIdRef.current !== currentRequestId) return;

        setApplications(guestApps);
        setContacts(guestContacts);
      }
    } catch (err) {
      if (requestIdRef.current !== currentRequestId) return;
      console.error('Error loading applications and contacts:', err);
      addToast('error', 'Load Error', 'Could not load data from repository.');
    } finally {
      if (requestIdRef.current === currentRequestId) {
        setDataLoading(false);
      }
    }
  }, [user, addToast, checkAndPromptGuestMigration, setApplications, setContacts]);

  // Trigger data load whenever auth state resolves or user changes
  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [authLoading, user?.uid, user?.emailVerified, loadData]);

  return { dataLoading, loadData };
}
