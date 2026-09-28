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
    try {
      const rawGuestApps = localStorage.getItem(LOCAL_STORAGE_KEYS.GUEST_APPS);
      const rawGuestContacts = localStorage.getItem(LOCAL_STORAGE_KEYS.GUEST_CONTACTS);
      let parsedGuestApps: Application[] = [];
      let parsedGuestContacts: Contact[] = [];
      if (rawGuestApps) {
        const parsed = JSON.parse(rawGuestApps);
        if (Array.isArray(parsed)) parsedGuestApps = parsed;
      }
      if (rawGuestContacts) {
        const parsed = JSON.parse(rawGuestContacts);
        if (Array.isArray(parsed)) parsedGuestContacts = parsed;
      }

      if (parsedGuestApps.length > 0 || parsedGuestContacts.length > 0) {
        setMigrationApps(parsedGuestApps);
        setMigrationContacts(parsedGuestContacts);
        setIsMigrationModalOpen(true);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  const handleImportGuestApps = useCallback(async () => {
    if (!user || (migrationApps.length === 0 && migrationContacts.length === 0)) return;
    try {
      let importedContacts: Contact[] = [];
      let contactIdMap = new Map<string, string>();

      // 1. Migrate contacts first so we can remap old guest contact IDs to new Firestore IDs
      if (migrationContacts.length > 0) {
        const result = await ContactRepository.migrateGuestContacts(user.uid, migrationContacts);
        importedContacts = result.migratedContacts;
        contactIdMap = result.idMap;
        localStorage.removeItem(LOCAL_STORAGE_KEYS.GUEST_CONTACTS);
      }

      // 2. Remap application contactIds using new contact Firestore IDs, then batch import
      if (migrationApps.length > 0) {
        const remappedApps = migrationApps.map((app) => {
          const remappedContactIds = (app.contactIds || []).map((cId) => contactIdMap.get(cId) || cId);
          return {
            ...app,
            contactIds: remappedContactIds,
          };
        });

        const imported = await ApplicationRepository.batchImport(remappedApps, user.uid);
        setApplications((prev) => [...imported, ...prev]);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.GUEST_APPS);

        // Map old guest application ID -> new Firestore application ID
        const appIdMap = new Map<string, string>();
        migrationApps.forEach((oldApp, idx) => {
          if (oldApp.id && imported[idx]) {
            appIdMap.set(oldApp.id, imported[idx].id);
          }
        });

        // Remap application IDs on imported contacts
        if (appIdMap.size > 0 && importedContacts.length > 0) {
          importedContacts = importedContacts.map((c) => {
            const remappedAppIds = (c.applicationIds || []).map((aId) => appIdMap.get(aId) || aId);
            return { ...c, applicationIds: remappedAppIds };
          });
          for (const c of importedContacts) {
            ContactRepository.updateContact(c.id, { applicationIds: c.applicationIds }, user.uid).catch((err) => {
              console.warn('Failed to update contact application links after guest migration:', err);
            });
          }
        }
      }

      if (importedContacts.length > 0) {
        setContacts((prev) => [...importedContacts, ...prev]);
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
    localStorage.removeItem(LOCAL_STORAGE_KEYS.GUEST_APPS);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.GUEST_CONTACTS);
    setIsMigrationModalOpen(false);
    setMigrationApps([]);
    setMigrationContacts([]);
    addToast('info', 'Guest Data Discarded', 'Starting with clean cloud account workspace.');
  }, [addToast]);

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
