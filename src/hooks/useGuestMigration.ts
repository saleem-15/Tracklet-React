import { useState, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { Application, Contact } from '../types';
import { ApplicationRepository } from '../lib/applicationRepository';
import { ContactRepository } from '../lib/contactRepository';
import { LOCAL_STORAGE_KEYS } from '../lib/constants';

export interface UseGuestMigrationProps {
  user: User | null;
  setApplications: React.Dispatch<React.SetStateAction<Application[]>>;
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  addToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
}

export interface UseGuestMigrationReturn {
  migrationApps: Application[];
  migrationContacts: Contact[];
  isMigrationModalOpen: boolean;
  setIsMigrationModalOpen: (open: boolean) => void;
  checkAndPromptGuestMigration: () => void;
  handleImportGuestApps: () => Promise<void>;
  handleDiscardGuestApps: () => void;
}

/**
 * Generates a deterministic signature string for a guest applications + contacts dataset.
 * Used to detect whether current localStorage data has already been migrated by the user.
 */
export function computeGuestSignature(apps: Application[], contacts: Contact[]): string {
  const appIds = apps.map((a) => a.id).sort().join(',');
  const contactIds = contacts.map((c) => c.id).sort().join(',');
  return `${appIds}|${contactIds}`;
}

/**
 * useGuestMigration
 * 
 * Domain hook encapsulating guest data detection, modal prompt state,
 * and transferring localStorage guest data (applications + contacts) to authenticated cloud account.
 */
export function useGuestMigration({
  user,
  setApplications,
  setContacts,
  addToast,
}: UseGuestMigrationProps): UseGuestMigrationReturn {
  const [migrationApps, setMigrationApps] = useState<Application[]>([]);
  const [migrationContacts, setMigrationContacts] = useState<Contact[]>([]);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);

  const checkAndPromptGuestMigration = useCallback(() => {
    let parsedGuestApps: Application[] = [];
    let parsedGuestContacts: Contact[] = [];

    try {
      const rawGuestApps = localStorage.getItem(LOCAL_STORAGE_KEYS.GUEST_APPS);
      if (rawGuestApps) {
        const parsed = JSON.parse(rawGuestApps);
        if (Array.isArray(parsed)) {
          parsedGuestApps = parsed.reduce<Application[]>((acc, item) => {
            if (
              !item ||
              typeof item !== 'object' ||
              !('id' in item) ||
              typeof item.id !== 'string' ||
              !item.id.trim()
            ) {
              return acc;
            }

            // Normalize contactIds: accept missing/empty, filter valid arrays to string IDs, reject malformed non-arrays
            let normalizedContactIds: string[] | undefined = undefined;
            if ('contactIds' in item && item.contactIds !== undefined && item.contactIds !== null) {
              if (Array.isArray(item.contactIds)) {
                normalizedContactIds = item.contactIds.filter(
                  (cid): cid is string => typeof cid === 'string' && Boolean(cid.trim())
                );
              } else {
                // Reject malformed value so import cannot fail during contact mapping
                return acc;
              }
            }

            acc.push({
              ...item,
              ...(normalizedContactIds !== undefined ? { contactIds: normalizedContactIds } : {}),
            });
            return acc;
          }, []);
        }
      }
    } catch {
      // Ignore guest apps parse error
    }

    try {
      const rawGuestContacts = localStorage.getItem(LOCAL_STORAGE_KEYS.GUEST_CONTACTS);
      if (rawGuestContacts) {
        const parsed = JSON.parse(rawGuestContacts);
        if (Array.isArray(parsed)) {
          parsedGuestContacts = parsed.reduce<Contact[]>((acc, item) => {
            if (
              !item ||
              typeof item !== 'object' ||
              !('id' in item) ||
              typeof item.id !== 'string' ||
              !item.id.trim()
            ) {
              return acc;
            }

            // Normalize applicationIds: accept missing/empty, filter valid arrays to string IDs, reject malformed non-arrays
            let normalizedAppIds: string[] | undefined = undefined;
            if ('applicationIds' in item && item.applicationIds !== undefined && item.applicationIds !== null) {
              if (Array.isArray(item.applicationIds)) {
                normalizedAppIds = item.applicationIds.filter(
                  (aid): aid is string => typeof aid === 'string' && Boolean(aid.trim())
                );
              } else {
                // Reject malformed value
                return acc;
              }
            }

            acc.push({
              ...item,
              ...(normalizedAppIds !== undefined ? { applicationIds: normalizedAppIds } : {}),
            });
            return acc;
          }, []);
        }
      }
    } catch {
      // Ignore guest contacts parse error
    }

    if (parsedGuestApps.length === 0 && parsedGuestContacts.length === 0) {
      return;
    }

    // If this exact dataset was already imported or discarded by this user, skip prompt
    if (user) {
      try {
        const storedSignature = localStorage.getItem(`${LOCAL_STORAGE_KEYS.GUEST_MIGRATED_PREFIX}${user.uid}`);
        const currentSignature = computeGuestSignature(parsedGuestApps, parsedGuestContacts);
        if (storedSignature && storedSignature === currentSignature) {
          return;
        }
      } catch {
        // Ignore storage access error
      }
    }

    setMigrationApps(parsedGuestApps);
    setMigrationContacts(parsedGuestContacts);
    setIsMigrationModalOpen(true);
  }, [user]);

  const handleImportGuestApps = useCallback(async () => {
    if (!user || (migrationApps.length === 0 && migrationContacts.length === 0)) return;
    try {
      let importedContacts: Contact[] = [];
      let contactIdMap = new Map<string, string>();

      // 1. Migrate contacts first to obtain Firestore ID mapping (defer localStorage cleanup until after apps import)
      if (migrationContacts.length > 0) {
        const result = await ContactRepository.migrateGuestContacts(user.uid, migrationContacts);
        importedContacts = result.migratedContacts;
        contactIdMap = result.idMap;
      }

      // 2. Remap application contactIds using new contact Firestore IDs, then batch import
      if (migrationApps.length > 0) {
        const remappedApps = migrationApps.map((app) => {
          const rawContactIds = Array.isArray(app.contactIds) ? app.contactIds : [];
          const remappedContactIds = rawContactIds.map((cId) => contactIdMap.get(cId) || cId);
          return {
            ...app,
            contactIds: remappedContactIds,
          };
        });

        const imported = await ApplicationRepository.batchImport(remappedApps, user.uid);
        setApplications((prev) => [...imported, ...prev]);

        // Map old guest application ID -> new Firestore application ID
        const appIdMap = new Map<string, string>();
        migrationApps.forEach((oldApp, idx) => {
          if (oldApp.id && imported[idx]) {
            appIdMap.set(oldApp.id, imported[idx].id);
          }
        });

        // Remap application IDs on imported contacts and await all link updates
        if (appIdMap.size > 0 && importedContacts.length > 0) {
          importedContacts = importedContacts.map((c) => {
            const rawAppIds = Array.isArray(c.applicationIds) ? c.applicationIds : [];
            const remappedAppIds = rawAppIds.map((aId) => appIdMap.get(aId) || aId);
            return { ...c, applicationIds: remappedAppIds };
          });
          const updatePromises = importedContacts.map((c) =>
            ContactRepository.updateContact(c.id, { applicationIds: c.applicationIds }, user.uid).catch((err) => {
              console.warn('Failed to update contact application links after guest migration:', err);
            })
          );
          await Promise.all(updatePromises);
        }
      }

      if (importedContacts.length > 0) {
        setContacts((prev) => [...importedContacts, ...prev]);
      }

      // Tie completed migration marker to this exact dataset signature so future new guest data is not blocked
      try {
        const signature = computeGuestSignature(migrationApps, migrationContacts);
        localStorage.setItem(`${LOCAL_STORAGE_KEYS.GUEST_MIGRATED_PREFIX}${user.uid}`, signature);
      } catch (markerErr) {
        console.warn('Could not set guest migration completed marker:', markerErr);
      }

      // Both imports succeeded cleanly; now safely purge localStorage guest cache
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEYS.GUEST_APPS);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.GUEST_CONTACTS);
      } catch (storageErr) {
        console.warn('Could not clear guest storage keys after migration:', storageErr);
      }

      setIsMigrationModalOpen(false);
      setMigrationApps([]);
      setMigrationContacts([]);
      addToast('success', 'Migration Complete', 'Imported guest applications and contacts to your cloud account.');
    } catch (err) {
      console.error('Migration failed:', err);
      addToast('error', 'Migration Failed', 'Could not import guest data.');
    }
  }, [user, migrationApps, migrationContacts, setApplications, setContacts, addToast]);

  const handleDiscardGuestApps = useCallback(() => {
    let discardSuccess = true;
    if (user) {
      try {
        const signature = computeGuestSignature(migrationApps, migrationContacts);
        localStorage.setItem(`${LOCAL_STORAGE_KEYS.GUEST_MIGRATED_PREFIX}${user.uid}`, signature);
      } catch (markerErr) {
        console.warn('Could not set guest migration marker on discard:', markerErr);
      }
    }
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.GUEST_APPS);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.GUEST_CONTACTS);
    } catch (err) {
      console.warn('Could not remove guest items from storage:', err);
      discardSuccess = false;
    }
    setIsMigrationModalOpen(false);
    setMigrationApps([]);
    setMigrationContacts([]);
    if (discardSuccess) {
      addToast('info', 'Guest Data Discarded', 'Starting with clean cloud account workspace.');
    } else {
      addToast('warning', 'Discard Incomplete', 'Could not access browser storage, but local state was cleared.');
    }
  }, [user, migrationApps, migrationContacts, addToast]);

  return {
    migrationApps,
    migrationContacts,
    isMigrationModalOpen,
    setIsMigrationModalOpen,
    checkAndPromptGuestMigration,
    handleImportGuestApps,
    handleDiscardGuestApps,
  };
}
