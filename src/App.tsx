import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Application, 
  Contact,
  ActiveTab, 
  FilterState, 
  SortState, 
  ApplicationStatus, 
  SortField,
  ExpiryNotificationSettings,
  StatusHistoryEntry
} from './types';
import { ApplicationRepository } from './lib/applicationRepository';
import { ContactRepository } from './lib/contactRepository';
import { migrateLegacyEmbeddedContacts } from './lib/contactMigration';
import { appendStatusHistory } from './lib/historyService';
import { exportApplicationsToCSV } from './lib/exportCsv';
import { calculateDaysInStage } from './lib/sampleData';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { AllApplicationsTable } from './components/AllApplicationsTable';
import { ActivePipelineBoard } from './components/ActivePipelineBoard';
import { ApplicationDetailPanel } from './components/ApplicationDetailPanel';
import { ContactDetailPanel } from './components/ContactDetailPanel';
import { AddApplicationModal } from './components/AddApplicationModal';
import { ContactsView } from './components/ContactsView';
import { StatsView } from './components/StatsView';
import { SettingsView } from './components/SettingsView';
import { AuthScreen } from './components/AuthScreen';
import { AuthModal } from './components/AuthModal';
import { EmailVerificationGate } from './components/EmailVerificationGate';
import { GuestMigrationModal } from './components/GuestMigrationModal';
import { loadExpirySettings, saveExpirySettings } from './lib/expiryUtils';
import { setupExtensionSync, syncAuthSessionToExtension, syncApplicationsToExtension, normalizeJobUrl } from './lib/extensionSync';
import { LOCAL_STORAGE_KEYS } from './lib/constants';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastContainer, ToastMessage } from './components/Toast';

import {
  getTabFromPath,
  getPathForTab,
  readUrlState,
  syncFiltersToUrl,
  syncAppSelectionToUrl,
  syncAddModalToUrl,
  isAuthPath,
  DEFAULT_FILTER,
} from './lib/routeUtils';

function TrackletAppContent() {
  const { user, loading: authLoading, openAuthModal, signOut } = useAuth();

  const [applications, setApplications] = useState<Application[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeTab, setActiveTabState] = useState<ActiveTab>(() => getTabFromPath(window.location.pathname));
  const [dataLoading, setDataLoading] = useState(true);

  // Guest Mode State (when unauthenticated visitor explicitly chooses to explore as guest from sign-up)
  const [isGuestMode, setIsGuestMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('tracklet_guest_mode') === 'true';
    } catch {
      return false;
    }
  });

  // Guest Migration Modal State
  const [migrationApps, setMigrationApps] = useState<Application[]>([]);
  const [migrationContacts, setMigrationContacts] = useState<Contact[]>([]);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);

  // ── Initialise all query-param–driven state from the URL on first render ──
  const _initialUrlState = readUrlState();
  const [selectedAppId, setSelectedAppIdState] = useState<string | null>(
    () => _initialUrlState.selectedAppId
  );
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpenState] = useState<boolean>(
    () => _initialUrlState.isAddModalOpen
  );
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // ── URL-aware tab setter ──
  const setActiveTab = (tab: ActiveTab) => {
    setActiveTabState(tab);
    const targetPath = getPathForTab(tab);
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  };

  // ── URL-aware filter setter ──
  const filterRef = React.useRef<FilterState>(_initialUrlState.filter);
  const selectedAppIdRef = React.useRef<string | null>(_initialUrlState.selectedAppId);
  const isAddModalOpenRef = React.useRef<boolean>(_initialUrlState.isAddModalOpen);

  const setFilter: React.Dispatch<React.SetStateAction<FilterState>> = (action) => {
    setFilterState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      filterRef.current = next;
      syncFiltersToUrl(next, selectedAppIdRef.current, isAddModalOpenRef.current);
      return next;
    });
  };

  const setSelectedAppId = (appId: string | null) => {
    selectedAppIdRef.current = appId;
    setSelectedAppIdState(appId);
    syncAppSelectionToUrl(appId, filterRef.current, isAddModalOpenRef.current);
  };

  const setIsAddModalOpen = (open: boolean) => {
    isAddModalOpenRef.current = open;
    setIsAddModalOpenState(open);
    syncAddModalToUrl(open, filterRef.current, selectedAppIdRef.current);
  };

  // ── Restore URL state on Back / Forward ──
  useEffect(() => {
    const handlePopState = () => {
      const { filter: uFilter, selectedAppId: uSelectedAppId, isAddModalOpen: uIsAddModalOpen } = readUrlState();
      setActiveTabState(getTabFromPath(window.location.pathname));
      filterRef.current = uFilter;
      selectedAppIdRef.current = uSelectedAppId;
      isAddModalOpenRef.current = uIsAddModalOpen;
      setFilterState(uFilter);
      setSelectedAppIdState(uSelectedAppId);
      setIsAddModalOpenState(uIsAddModalOpen);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((
    type: 'success' | 'error' | 'info' | 'warning',
    title: string,
    description?: string,
    action?: { label: string; onClick: () => void },
    stage?: ApplicationStatus
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev.slice(-4), { id, type, title, description, action, stage }]);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Expiry notification settings
  const [expirySettings, setExpirySettings] = useState<ExpiryNotificationSettings>(() => loadExpirySettings());

  const handleUpdateExpirySettings = (newSettings: ExpiryNotificationSettings) => {
    setExpirySettings(newSettings);
    saveExpirySettings(newSettings);
  };

  // Filter and Sort State
  const [filter, setFilterState] = useState<FilterState>(() => _initialUrlState.filter);
  const [sort, setSort] = useState<SortState>({
    field: 'dateApplied',
    order: 'desc',
  });

  // Load applications and contacts whenever user changes or email is verified
  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      if (user && user.emailVerified) {
        const [appsResult, contactsResult] = await Promise.allSettled([
          ApplicationRepository.loadApplications(user.uid),
          ContactRepository.loadContacts(user.uid),
        ]);

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

        setApplications(loadedApps);
        setContacts(loadedContacts);

        // Check for guest data migration
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

        setApplications(guestApps);
        setContacts(guestContacts);
      }
    } catch (err) {
      console.error('Error loading applications and contacts:', err);
      addToast('error', 'Load Error', 'Could not load data from repository.');
    } finally {
      setDataLoading(false);
    }
  }, [user, addToast]);

  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [authLoading, user?.uid, user?.emailVerified, loadData]);

  // Sync Auth Session to Browser Extension on login/logout & token refresh
  useEffect(() => {
    syncAuthSessionToExtension(user);
    // Periodically refresh auth token every 15 minutes to keep extension session fresh
    const interval = setInterval(() => {
      if (user) {
        syncAuthSessionToExtension(user);
      }
    }, 1000 * 60 * 15);
    return () => clearInterval(interval);
  }, [user]);

  // Sync applications index to Chrome Extension for instant duplicate detection
  useEffect(() => {
    if (applications.length >= 0) {
      syncApplicationsToExtension(applications);
    }
  }, [applications]);

  // Browser Extension Sync Listener
  useEffect(() => {
    const cleanup = setupExtensionSync({
      onApplicationReceived: async (clippedApp, persistedToCloud) => {
        // Multi-account guard: if tab is logged in and clipped item is explicitly for another user, skip
        if (user && clippedApp.userId && clippedApp.userId !== 'guest' && clippedApp.userId !== user.uid) {
          return;
        }

        const normUrl = clippedApp.jobLink ? normalizeJobUrl(clippedApp.jobLink) : '';

        setApplications((prev) => {
          const existingIdx = prev.findIndex((a) => 
            a.id === clippedApp.id || 
            (normUrl && a.jobLink && normalizeJobUrl(a.jobLink) === normUrl) ||
            (a.company.trim().toLowerCase() === clippedApp.company.trim().toLowerCase() && a.role.trim().toLowerCase() === clippedApp.role.trim().toLowerCase())
          );

          let next: Application[];
          let finalApp = clippedApp;
          const isUpdate = existingIdx >= 0;

          if (isUpdate) {
            const existingApp = prev[existingIdx];
            finalApp = {
              ...existingApp,
              ...clippedApp,
              id: existingApp.id, // Preserve existing application ID
              history: clippedApp.history || existingApp.history,
              updatedAt: new Date().toISOString(),
            };
            next = [...prev];
            next[existingIdx] = finalApp;

            // If clipped while offline/guest and now authenticated with verified email, persist update to Firestore
            if (user?.emailVerified && !persistedToCloud) {
              ApplicationRepository.updateApplication(existingApp.id, finalApp, user.uid).catch((err) => {
                console.error('Failed to update application in Firestore:', err);
              });
            }

            addToast(
              'success',
              'Updated via Tracklet Extension',
              `Updated "${finalApp.role}" at ${finalApp.company}`
            );
          } else {
            next = [finalApp, ...prev];

            // If clipped while offline/guest and now authenticated with verified email, add to Firestore
            if (user?.emailVerified && !persistedToCloud) {
              ApplicationRepository.addApplication(finalApp, user.uid).then((created) => {
                setApplications((curr) => curr.map((a) => a.id === finalApp.id ? created : a));
              }).catch((err) => {
                console.error('Failed to add unpersisted application to Firestore:', err);
              });
            }

            addToast(
              'success',
              'Clipped via Tracklet Extension',
              `Saved "${finalApp.role}" at ${finalApp.company}`
            );
          }

          // In guest mode, immediately persist to localStorage so data is NEVER lost on tab close/refresh
          if (!user?.emailVerified) {
            ApplicationRepository.saveGuestApplications(next);
          }
          return next;
        });
      },
    });

    return () => cleanup();
  }, [user, addToast]);

  // Synchronize URL on auth transitions
  useEffect(() => {
    if (authLoading) return;
    const path = window.location.pathname;

    if (!user && !isGuestMode) {
      if (!isAuthPath(path)) {
        window.history.replaceState(null, '', '/login');
      }
    } else if (user) {
      if (!user.emailVerified) {
        if (path !== '/verify-email') {
          window.history.replaceState(null, '', '/verify-email');
        }
      } else {
        if (isAuthPath(path) || path === '/verify-email') {
          window.history.replaceState(null, '', getPathForTab(activeTab));
        }
      }
    }
  }, [user, user?.emailVerified, authLoading, isGuestMode, activeTab]);

  // Guest Migration Handlers
  const handleImportGuestApps = async () => {
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
  };

  const handleDiscardGuestApps = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.GUEST_APPS);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.GUEST_CONTACTS);
    setIsMigrationModalOpen(false);
    setMigrationApps([]);
    setMigrationContacts([]);
    addToast('info', 'Guest Data Discarded', 'Starting with clean cloud account workspace.');
  };

  // Sign In / Sign Out
  const handleSignIn = () => {
    openAuthModal('signin');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      try {
        localStorage.removeItem('tracklet_guest_mode');
      } catch {
        // Ignore
      }
      setIsGuestMode(false);
      setSelectedAppId(null);
      setSelectedContactId(null);
      window.history.pushState(null, '', '/login');
      addToast('info', 'Signed Out', 'Returned to authentication screen.');
    } catch (err) {
      console.error('Sign-out failed:', err);
    }
  };

  // Reset / Load Demo Data
  const handleSeedDemoData = async () => {
    try {
      const [freshDocs, freshContacts] = await Promise.all([
        ApplicationRepository.seedDemoData(user?.emailVerified ? user.uid : undefined),
        ContactRepository.seedDemoContacts(user?.emailVerified ? user.uid : undefined),
      ]);
      setApplications(freshDocs);
      setContacts(freshContacts);
      setSelectedAppId(null);
      setSelectedContactId(null);
      addToast('info', 'Sample data loaded', 'Demo applications and contacts ready.');
    } catch (err) {
      console.error('Failed to seed demo data:', err);
      addToast('error', 'Error', 'Could not load demo dataset.');
    }
  };

  // Add Contact
  const handleAddContact = async (
    newContact: Omit<Contact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<Contact> => {
    try {
      const created = await ContactRepository.addContact(
        newContact,
        user?.emailVerified ? user.uid : undefined
      );

      setContacts((prev) => {
        const next = [created, ...prev.filter((c) => c.id !== created.id)];
        if (!user?.emailVerified) ContactRepository.saveGuestContacts(next);
        return next;
      });

      // If contact was linked to application(s) during creation, update those applications
      if (created.applicationIds && created.applicationIds.length > 0) {
        setApplications((prev) => {
          const next = prev.map((app) =>
            created.applicationIds!.includes(app.id)
              ? {
                  ...app,
                  contactIds: Array.from(new Set([...(app.contactIds || []), created.id])),
                }
              : app
          );
          if (!user?.emailVerified) ApplicationRepository.saveGuestApplications(next);
          return next;
        });

        // Sync to Firestore if authenticated
        if (user?.emailVerified) {
          for (const appId of created.applicationIds) {
            const targetApp = applications.find((a) => a.id === appId);
            ContactRepository.linkContactToApplication(created.id, appId, user.uid, created, targetApp).catch((e) => {
              console.warn(`Could not sync link between contact ${created.id} and app ${appId}:`, e);
            });
          }
        }
      }

      addToast('success', 'Contact Added', created.name);
      return created;
    } catch (err) {
      console.error('Failed to add contact (using local fallback):', err);
      const fallbackContact: Contact = {
        id: `local-c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: user?.uid || 'guest',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...newContact,
        applicationIds: newContact.applicationIds || [],
      };
      setContacts((prev) => {
        const next = [fallbackContact, ...prev];
        ContactRepository.saveGuestContacts(next);
        return next;
      });
      addToast('success', 'Contact Added', fallbackContact.name);
      return fallbackContact;
    }
  };

  // Update Contact
  const handleUpdateContact = async (id: string, updates: Partial<Contact>) => {
    const currentContact = contacts.find((c) => c.id === id);
    const now = new Date().toISOString();

    const oldAppIds = currentContact?.applicationIds || [];
    const newAppIds = updates.applicationIds;
    const hasAppIdsChanged = newAppIds !== undefined && JSON.stringify(oldAppIds) !== JSON.stringify(newAppIds);

    const updatedContact: Contact = {
      ...(currentContact || { id, name: 'Contact' }),
      ...updates,
      userId: user?.uid || currentContact?.userId || 'guest',
      updatedAt: now,
    };

    setContacts((prev) => {
      const next = prev.map((c) => (c.id === id ? updatedContact : c));
      if (!user?.emailVerified) ContactRepository.saveGuestContacts(next);
      return next;
    });

    if (hasAppIdsChanged && newAppIds) {
      const addedAppIds = newAppIds.filter((appId) => !oldAppIds.includes(appId));
      const removedAppIds = oldAppIds.filter((appId) => !newAppIds.includes(appId));

      setApplications((prev) => {
        const next = prev.map((app) => {
          if (addedAppIds.includes(app.id)) {
            return {
              ...app,
              contactIds: Array.from(new Set([...(app.contactIds || []), id])),
            };
          }
          if (removedAppIds.includes(app.id)) {
            return {
              ...app,
              contactIds: (app.contactIds || []).filter((cId) => cId !== id),
            };
          }
          return app;
        });
        if (!user?.emailVerified) ApplicationRepository.saveGuestApplications(next);
        return next;
      });

      if (user?.emailVerified) {
        for (const appId of addedAppIds) {
          const targetApp = applications.find((a) => a.id === appId);
          ContactRepository.linkContactToApplication(id, appId, user.uid, updatedContact, targetApp).catch((e) => {
            console.warn(`Could not sync link between contact ${id} and app ${appId}:`, e);
          });
        }
        for (const appId of removedAppIds) {
          const targetApp = applications.find((a) => a.id === appId);
          ContactRepository.unlinkContactFromApplication(id, appId, user.uid, updatedContact, targetApp).catch((e) => {
            console.warn(`Could not sync unlink between contact ${id} and app ${appId}:`, e);
          });
        }
      }
    }

    try {
      if (user?.emailVerified) {
        await ContactRepository.updateContact(id, updates, user.uid, updatedContact);
      }
    } catch (err) {
      console.error('Failed to update contact:', err);
      if (currentContact) {
        setContacts((prev) => {
          const reverted = prev.map((c) => (c.id === id ? currentContact : c));
          if (!user?.emailVerified) ContactRepository.saveGuestContacts(reverted);
          return reverted;
        });
      }
      addToast('error', 'Update Failed', 'Could not save contact changes.');
    }
  };

  // Delete Contact (with cascade remove from applications and Undo snackbar)
  const handleDeleteContact = async (id: string) => {
    const targetContact = contacts.find((c) => c.id === id);
    if (!targetContact) return;

    const linkedAppIds = targetContact.applicationIds || [];

    setContacts((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (!user?.emailVerified) ContactRepository.saveGuestContacts(next);
      return next;
    });

    if (linkedAppIds.length > 0) {
      setApplications((prev) => {
        const next = prev.map((app) =>
          linkedAppIds.includes(app.id)
            ? { ...app, contactIds: (app.contactIds || []).filter((cId) => cId !== id) }
            : app
        );
        if (!user?.emailVerified) ApplicationRepository.saveGuestApplications(next);
        return next;
      });
    }

    if (selectedContactId === id) setSelectedContactId(null);

    try {
      await ContactRepository.deleteContact(
        id,
        user?.emailVerified ? user.uid : undefined,
        linkedAppIds
      );

      addToast('info', `Deleted ${targetContact.name}`, undefined, {
        label: 'Undo',
        onClick: async () => {
          setContacts((prev) => {
            const next = [targetContact, ...prev];
            if (!user?.emailVerified) ContactRepository.saveGuestContacts(next);
            return next;
          });

          if (linkedAppIds.length > 0) {
            setApplications((prev) => {
              const next = prev.map((app) =>
                linkedAppIds.includes(app.id)
                  ? { ...app, contactIds: Array.from(new Set([...(app.contactIds || []), id])) }
                  : app
              );
              if (!user?.emailVerified) ApplicationRepository.saveGuestApplications(next);
              return next;
            });
          }

          if (user?.emailVerified) {
            await ContactRepository.upsertContact(targetContact, user.uid);
            for (const appId of linkedAppIds) {
              const fullApp = applications.find((a) => a.id === appId);
              await ContactRepository.linkContactToApplication(id, appId, user.uid, targetContact, fullApp);
            }
          }
          addToast('success', `Restored ${targetContact.name}`);
        },
      });
    } catch (err) {
      console.error('Failed to delete contact:', err);
      setContacts((prev) => {
        const reverted = [targetContact, ...prev];
        if (!user?.emailVerified) ContactRepository.saveGuestContacts(reverted);
        return reverted;
      });
      addToast('error', 'Delete Failed', 'Could not delete contact.');
    }
  };

  // Batch Delete Contacts
  const handleBatchDeleteContacts = async (ids: string[]) => {
    const deleted = contacts.filter((c) => ids.includes(c.id));
    setContacts((prev) => {
      const next = prev.filter((c) => !ids.includes(c.id));
      if (!user?.emailVerified) ContactRepository.saveGuestContacts(next);
      return next;
    });

    try {
      await ContactRepository.batchDelete(ids, user?.emailVerified ? user.uid : undefined);
      addToast('info', `Deleted ${ids.length} contacts`);
    } catch (err) {
      console.error('Bulk delete contacts failed:', err);
      setContacts((prev) => {
        const reverted = [...deleted, ...prev];
        if (!user?.emailVerified) ContactRepository.saveGuestContacts(reverted);
        return reverted;
      });
      addToast('error', 'Delete Failed', 'Could not batch delete contacts.');
    }
  };

  // Link Contact to Application
  const handleLinkContact = async (contactId: string, appId: string) => {
    const prevContacts = contacts;
    const prevApps = applications;
    const targetContact = contacts.find((c) => c.id === contactId);
    const targetApp = applications.find((a) => a.id === appId);

    setContacts((prev) => {
      const next = prev.map((c) =>
        c.id === contactId
          ? { ...c, applicationIds: Array.from(new Set([...(c.applicationIds || []), appId])) }
          : c
      );
      if (!user?.emailVerified) ContactRepository.saveGuestContacts(next);
      return next;
    });

    setApplications((prev) => {
      const next = prev.map((a) =>
        a.id === appId
          ? { ...a, contactIds: Array.from(new Set([...(a.contactIds || []), contactId])) }
          : a
      );
      if (!user?.emailVerified) ApplicationRepository.saveGuestApplications(next);
      return next;
    });

    try {
      if (user?.emailVerified) {
        await ContactRepository.linkContactToApplication(
          contactId,
          appId,
          user.uid,
          targetContact,
          targetApp
        );
      }
      const cName = targetContact?.name || 'Contact';
      addToast('success', 'Contact Linked', cName);
    } catch (err) {
      console.error('Failed to link contact:', err);
      setContacts(prevContacts);
      setApplications(prevApps);
      if (!user?.emailVerified) {
        ContactRepository.saveGuestContacts(prevContacts);
        ApplicationRepository.saveGuestApplications(prevApps);
      }
      addToast('error', 'Link Failed', 'Could not link contact.');
    }
  };

  // Unlink Contact from Application
  const handleUnlinkContact = async (contactId: string, appId: string) => {
    const prevContacts = contacts;
    const prevApps = applications;
    const targetContact = contacts.find((c) => c.id === contactId);
    const targetApp = applications.find((a) => a.id === appId);

    setContacts((prev) => {
      const next = prev.map((c) =>
        c.id === contactId
          ? { ...c, applicationIds: (c.applicationIds || []).filter((id) => id !== appId) }
          : c
      );
      if (!user?.emailVerified) ContactRepository.saveGuestContacts(next);
      return next;
    });

    setApplications((prev) => {
      const next = prev.map((a) =>
        a.id === appId
          ? { ...a, contactIds: (a.contactIds || []).filter((id) => id !== contactId) }
          : a
      );
      if (!user?.emailVerified) ApplicationRepository.saveGuestApplications(next);
      return next;
    });

    try {
      if (user?.emailVerified) {
        await ContactRepository.unlinkContactFromApplication(
          contactId,
          appId,
          user.uid,
          targetContact,
          targetApp
        );
      }

      addToast('info', `Unlinked ${targetContact?.name || 'Contact'}`, undefined, {
        label: 'Undo',
        onClick: () => {
          handleLinkContact(contactId, appId);
        },
      });
    } catch (err) {
      console.error('Failed to unlink contact:', err);
      setContacts(prevContacts);
      setApplications(prevApps);
      if (!user?.emailVerified) {
        ContactRepository.saveGuestContacts(prevContacts);
        ApplicationRepository.saveGuestApplications(prevApps);
      }
      addToast('error', 'Unlink Failed', 'Could not unlink contact.');
    }
  };

  // Add Application
  const handleAddApplication = async (
    newApp: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>
  ) => {
    try {
      const created = await ApplicationRepository.addApplication(
        newApp,
        user?.emailVerified ? user.uid : undefined
      );
      setApplications((prev) => {
        const next = [created, ...prev];
        if (!user?.emailVerified) ApplicationRepository.saveGuestApplications(next);
        return next;
      });
      addToast('success', 'Application Added', `Logged ${newApp.company} (${newApp.role})`);
    } catch (err) {
      console.error('Failed to add application:', err);
      addToast('error', 'Error', 'Failed to save application.');
    }
  };

  // Batch Import Applications (CSV)
  const handleBatchImportApplications = async (
    newApps: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>[]
  ) => {
    try {
      const imported = await ApplicationRepository.batchImport(
        newApps,
        user?.emailVerified ? user.uid : undefined
      );
      setApplications((prev) => {
        const next = [...imported, ...prev];
        if (!user?.emailVerified) ApplicationRepository.saveGuestApplications(next);
        return next;
      });
      addToast('success', 'Batch Import Complete', `Successfully imported ${newApps.length} applications.`);
    } catch (err) {
      console.error('Batch import failed:', err);
      addToast('error', 'Import Failed', 'Could not import applications.');
      throw err;
    }
  };

  // Update Application
  const handleUpdateApplication = async (id: string, updates: Partial<Application>) => {
    const currentApp = applications.find((a) => a.id === id);
    const isStatusChanged = updates.status && currentApp && updates.status !== currentApp.status;
    const now = new Date().toISOString();

    const mergedUpdates = { ...updates };
    if (isStatusChanged && updates.status && currentApp) {
      mergedUpdates.history = appendStatusHistory(currentApp.history, updates.status, currentApp.status, now);
      mergedUpdates.stageUpdatedAt = now;
    }

    setApplications((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, ...mergedUpdates, updatedAt: now } : a));
      if (!user?.emailVerified) ApplicationRepository.saveGuestApplications(next);
      return next;
    });

    try {
      if (user?.emailVerified) {
        const fullApp = currentApp ? { ...currentApp, ...mergedUpdates, updatedAt: now } : undefined;
        await ApplicationRepository.updateApplication(
          id,
          mergedUpdates,
          user.uid,
          fullApp
        );
      }

      if (isStatusChanged && updates.status && currentApp) {
        const prevStatus = currentApp.status;
        const targetStatus = updates.status;
        const companyName = currentApp.company;
        addToast(
          'success',
          `Moved ${companyName} to`,
          undefined,
          {
            label: 'Undo',
            onClick: () => {
              handleUpdateApplication(id, { status: prevStatus });
            },
          },
          targetStatus
        );
      }
    } catch (err) {
      console.error('Failed to update application:', err);
      if (currentApp) {
        setApplications((prev) => {
          const reverted = prev.map((a) => (a.id === id ? currentApp : a));
          if (!user?.emailVerified) ApplicationRepository.saveGuestApplications(reverted);
          return reverted;
        });
      }
      addToast('error', 'Update Failed', 'Could not save changes to cloud.');
    }
  };

  // Delete Application
  const handleDeleteApplication = async (id: string) => {
    const targetApp = applications.find((a) => a.id === id);
    setApplications((prev) => {
      const next = prev.filter((a) => a.id !== id);
      if (!user?.emailVerified) ApplicationRepository.saveGuestApplications(next);
      return next;
    });
    if (selectedAppId === id) setSelectedAppId(null);

    try {
      await ApplicationRepository.deleteApplication(id, user?.emailVerified ? user.uid : undefined);
      if (targetApp) {
        addToast(
          'info',
          `Deleted ${targetApp.company}`,
          undefined,
          {
            label: 'Undo',
            onClick: async () => {
              setApplications((prev) => {
                const next = [targetApp, ...prev];
                if (!user?.emailVerified) ApplicationRepository.saveGuestApplications(next);
                return next;
              });
              if (user?.emailVerified) {
                await ApplicationRepository.addApplication(targetApp, user.uid);
              }
              addToast('success', `Restored ${targetApp.company}`);
            },
          }
        );
      }
    } catch (err) {
      console.error('Failed to delete application:', err);
      if (targetApp) {
        setApplications((prev) => {
          const next = [targetApp, ...prev];
          if (!user?.emailVerified) ApplicationRepository.saveGuestApplications(next);
          return next;
        });
      }
      addToast('error', 'Delete Failed', 'Could not delete application record.');
    }
  };

  // Bulk Status Update
  const handleBulkUpdateStatus = async (ids: string[], newStatus: ApplicationStatus) => {
    const now = new Date().toISOString();
    const previousSnapshot = applications.filter((a) => ids.includes(a.id));
    const previousStatusMap = new Map<string, { status: ApplicationStatus; stageUpdatedAt?: string; history?: StatusHistoryEntry[] }>(
      previousSnapshot.map((a) => [a.id, { status: a.status, stageUpdatedAt: a.stageUpdatedAt, history: a.history }])
    );

    setApplications((prev) => {
      const next = prev.map((a) => {
        if (!ids.includes(a.id)) return a;
        const updatedHist = appendStatusHistory(a.history, newStatus, a.status, now);
        return { ...a, status: newStatus, history: updatedHist, stageUpdatedAt: now, updatedAt: now };
      });
      if (!user?.emailVerified) ApplicationRepository.saveGuestApplications(next);
      return next;
    });

    try {
      if (user?.emailVerified) {
        await ApplicationRepository.batchUpdateStatus(
          ids,
          newStatus,
          user.uid,
          applications
        );
      }

      addToast(
        'success',
        `Moved ${ids.length} application${ids.length === 1 ? '' : 's'} to`,
        undefined,
        {
          label: 'Undo',
          onClick: async () => {
            setApplications((prev) => {
              const reverted = prev.map((a) => {
                const old = previousStatusMap.get(a.id);
                return old ? { ...a, status: old.status, stageUpdatedAt: old.stageUpdatedAt, history: old.history } : a;
              });
              if (!user?.emailVerified) ApplicationRepository.saveGuestApplications(reverted);
              return reverted;
            });
            if (user?.emailVerified) {
              for (const [appId, oldData] of previousStatusMap.entries()) {
                await ApplicationRepository.updateApplication(appId, {
                  status: oldData.status,
                  stageUpdatedAt: oldData.stageUpdatedAt,
                  history: oldData.history
                }, user.uid);
              }
            }
            addToast('info', 'Restored previous statuses');
          },
        },
        newStatus
      );
    } catch (err) {
      console.error('Bulk update failed:', err);
      setApplications((prev) => {
        const reverted = prev.map((a) => {
          const old = previousStatusMap.get(a.id);
          return old ? { ...a, status: old.status, stageUpdatedAt: old.stageUpdatedAt, history: old.history } : a;
        });
        if (!user?.emailVerified) ApplicationRepository.saveGuestApplications(reverted);
        return reverted;
      });
      addToast('error', 'Bulk Update Failed', 'Could not apply bulk status changes.');
    }
  };

  // Bulk Delete
  const handleBulkDelete = async (ids: string[]) => {
    const deletedApps = applications.filter((a) => ids.includes(a.id));
    const count = ids.length;

    setApplications((prev) => {
      const next = prev.filter((a) => !ids.includes(a.id));
      if (!user?.emailVerified) ApplicationRepository.saveGuestApplications(next);
      return next;
    });
    if (selectedAppId && ids.includes(selectedAppId)) setSelectedAppId(null);

    try {
      await ApplicationRepository.batchDelete(ids, user?.emailVerified ? user.uid : undefined);

      addToast(
        'info',
        'Applications Removed',
        `Deleted ${count} application${count === 1 ? '' : 's'}.`,
        {
          label: 'Undo',
          onClick: async () => {
            setApplications((prev) => {
              const next = [...deletedApps, ...prev];
              if (!user?.emailVerified) ApplicationRepository.saveGuestApplications(next);
              return next;
            });
            if (user?.emailVerified) {
              await ApplicationRepository.batchImport(deletedApps, user.uid);
            }
            addToast('success', 'Restored', `Recovered ${count} application${count === 1 ? '' : 's'}.`);
          },
        }
      );
    } catch (err) {
      console.error('Bulk delete failed:', err);
      setApplications((prev) => {
        const next = [...deletedApps, ...prev];
        if (!user?.emailVerified) ApplicationRepository.saveGuestApplications(next);
        return next;
      });
      addToast('error', 'Delete Failed', 'Could not delete applications.');
    }
  };

  // Sorting
  const handleSortChange = (field: SortField) => {
    setSort((prev) => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Filtered and Sorted Applications
  const filteredAndSortedApplications = useMemo(() => {
    return applications
      .filter((app) => {
        if (filter.search.trim()) {
          const q = filter.search.toLowerCase();
          const matchCompany = app.company.toLowerCase().includes(q);
          const matchRole = app.role.toLowerCase().includes(q);
          const matchNotes = app.notes ? app.notes.toLowerCase().includes(q) : false;
          const matchLocation = app.location ? app.location.toLowerCase().includes(q) : false;
          if (!matchCompany && !matchRole && !matchNotes && !matchLocation) return false;
        }

        if (filter.platform !== 'All' && app.platform !== filter.platform) {
          return false;
        }

        if (filter.workLocation !== 'All' && app.workLocation !== filter.workLocation) {
          return false;
        }

        if (filter.employmentType !== 'All' && app.employmentType !== filter.employmentType) {
          return false;
        }

        if (filter.status === 'Active') {
          if (app.status === 'Rejected' || app.status === 'Archived') return false;
        } else if (filter.status !== 'All' && app.status !== filter.status) {
          return false;
        }

        if (filter.dateRange !== 'all') {
          const appDate = new Date(app.dateApplied);
          const now = new Date();
          const daysAgo = (now.getTime() - appDate.getTime()) / (1000 * 60 * 60 * 24);

          if (filter.dateRange === '7days' && daysAgo > 7) return false;
          if (filter.dateRange === '30days' && daysAgo > 30) return false;
          if (filter.dateRange === '60days' && daysAgo > 60) return false;

          if (filter.dateRange === 'this_week') {
            const startOfWeek = new Date(now);
            const day = now.getDay();
            const diffToMon = day === 0 ? -6 : 1 - day;
            startOfWeek.setDate(now.getDate() + diffToMon);
            startOfWeek.setHours(0, 0, 0, 0);
            if (appDate < startOfWeek) return false;
          }

          if (filter.dateRange === 'last_week') {
            const startOfThisWeek = new Date(now);
            const day = now.getDay();
            const diffToMon = day === 0 ? -6 : 1 - day;
            startOfThisWeek.setDate(now.getDate() + diffToMon);
            startOfThisWeek.setHours(0, 0, 0, 0);

            const startOfLastWeek = new Date(startOfThisWeek);
            startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

            if (appDate < startOfLastWeek || appDate >= startOfThisWeek) return false;
          }

          if (filter.dateRange === 'this_month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            if (appDate < startOfMonth) return false;
          }

          if (filter.dateRange === 'last_month') {
            const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            if (appDate < startOfLastMonth || appDate >= startOfThisMonth) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sort.field as keyof Application] || '';
        let valB: any = b[sort.field as keyof Application] || '';

        if (sort.field === 'daysInStage') {
          valA = calculateDaysInStage(a.stageUpdatedAt);
          valB = calculateDaysInStage(b.stageUpdatedAt);
        }

        if (typeof valA === 'string') {
          const comp = valA.localeCompare(valB);
          return sort.order === 'asc' ? comp : -comp;
        }

        if (valA < valB) return sort.order === 'asc' ? -1 : 1;
        if (valA > valB) return sort.order === 'asc' ? 1 : -1;
        return 0;
      });
  }, [applications, filter, sort]);

  const handleExportCSV = useCallback(() => {
    const success = exportApplicationsToCSV(filteredAndSortedApplications);
    if (success) {
      addToast('success', 'Export Complete', `Exported ${filteredAndSortedApplications.length} applications to CSV.`);
    } else {
      addToast('warning', 'Export Empty', 'No applications available to export.');
    }
  }, [filteredAndSortedApplications, addToast]);

  const selectedApp = useMemo(() => {
    return applications.find((a) => a.id === selectedAppId) || null;
  }, [applications, selectedAppId]);

  const selectedContact = useMemo(() => {
    return contacts.find((c) => c.id === selectedContactId) || null;
  }, [contacts, selectedContactId]);

  // If authentication state is still loading
  if (authLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 font-sans text-xs text-slate-500 select-none">
        <div className="flex flex-col items-center gap-3 p-8 bg-white border border-slate-200/90 rounded-2xl shadow-xs animate-in fade-in duration-200 motion-reduce:animate-none">
          <img src="/logo.svg" alt="Tracklet Logo" className="w-10 h-10 animate-pulse motion-reduce:animate-none" />
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-heading font-bold text-slate-900 text-sm tracking-tight">Tracklet</span>
            <span className="font-mono text-[11px] text-slate-500">Loading workspace...</span>
          </div>
        </div>
      </div>
    );
  }

  // If user is authenticated with email but unverified, render Strict Email Verification Screen
  if (user && !user.emailVerified) {
    return (
      <div className="min-h-screen w-screen bg-slate-50 font-sans">
        <EmailVerificationGate
          onVerified={loadData}
          onShowToast={addToast}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  // If user is not authenticated and has not chosen guest mode (Authentication Wall)
  if (!user && !isGuestMode) {
    return (
      <div className="min-h-screen w-screen bg-slate-50 font-sans">
        <AuthScreen
          onShowToast={addToast}
          onContinueAsGuest={() => {
            try {
              localStorage.setItem('tracklet_guest_mode', 'true');
            } catch {
              // Ignore
            }
            setIsGuestMode(true);
            const targetPath = getPathForTab(activeTab);
            window.history.pushState(null, '', targetPath);
            addToast('info', 'Guest Session Started', 'Applications will be saved to this browser.');
          }}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-slate-50 text-slate-900 font-sans overflow-hidden antialiased select-none">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        applications={applications}
        contacts={contacts}
        expirySettings={expirySettings}
        user={user}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onSeedDemoData={handleSeedDemoData}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header Bar */}
        {(activeTab === 'all' || activeTab === 'pipeline') && (
          <TopBar
            filter={filter}
            setFilter={setFilter}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            totalFilteredCount={filteredAndSortedApplications.length}
            onExportCSV={handleExportCSV}
            activeTab={activeTab}
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          />
        )}

        {/* Dynamic Screen View */}
        {authLoading || dataLoading ? (
          <div className="flex-1 flex items-center justify-center font-mono text-xs text-slate-500">
            Loading Tracklet workspace...
          </div>
        ) : (
          <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
            {activeTab === 'all' && (
              <AllApplicationsTable
                applications={filteredAndSortedApplications}
                totalAppCount={applications.length}
                onOpenAddModal={() => setIsAddModalOpen(true)}
                onResetFilters={() => setFilter(DEFAULT_FILTER)}
                onSeedDemoData={handleSeedDemoData}
                selectedAppId={selectedAppId}
                onSelectApp={(app) => setSelectedAppId(app.id)}
                sort={sort}
                onSortChange={handleSortChange}
                onBulkUpdateStatus={handleBulkUpdateStatus}
                onBulkDelete={handleBulkDelete}
                onShowToast={addToast}
              />
            )}

            {activeTab === 'pipeline' && (
              <ActivePipelineBoard
                applications={filteredAndSortedApplications}
                totalAppCount={applications.length}
                onOpenAddModal={() => setIsAddModalOpen(true)}
                onResetFilters={() => setFilter(DEFAULT_FILTER)}
                onSeedDemoData={handleSeedDemoData}
                selectedAppId={selectedAppId}
                onSelectApp={(app) => setSelectedAppId(app.id)}
                onUpdateStatus={(id, newStatus) =>
                  handleUpdateApplication(id, {
                    status: newStatus,
                    stageUpdatedAt: new Date().toISOString(),
                  })
                }
              />
            )}

            {activeTab === 'contacts' && (
              <ContactsView
                contacts={contacts}
                applications={applications}
                onAddContact={handleAddContact}
                onUpdateContact={handleUpdateContact}
                onDeleteContact={handleDeleteContact}
                onSelectContact={(contactId) => setSelectedContactId(contactId)}
                onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
                onShowToast={addToast}
                expiryThresholdHours={expirySettings.expiryThresholdHours}
              />
            )}

            {activeTab === 'stats' && (
              <StatsView
                applications={applications}
                onSelectApplication={(id) => setSelectedAppId(id)}
              />
            )}

            {activeTab === 'settings' && (
              <div className="flex-1 overflow-y-auto p-6">
                <SettingsView
                  settings={expirySettings}
                  onUpdateSettings={handleUpdateExpirySettings}
                  applications={applications}
                  contacts={contacts}
                  onSelectApplication={(id) => setSelectedAppId(id)}
                  onExportCSV={handleExportCSV}
                  onImportCSV={handleBatchImportApplications}
                  onImportJSON={handleBatchImportApplications}
                  onSeedDemoData={handleSeedDemoData}
                  onShowToast={addToast}
                  onAccountDeleted={() => {
                    setApplications([]);
                    setSelectedAppId(null);
                  }}
                />
              </div>
            )}
          </main>
        )}
      </div>

      {/* Right Slide-over Detail Panel */}
      <ApplicationDetailPanel
        app={selectedApp}
        allContacts={contacts}
        onClose={() => setSelectedAppId(null)}
        onUpdateApp={handleUpdateApplication}
        onDeleteApp={handleDeleteApplication}
        onLinkContact={handleLinkContact}
        onUnlinkContact={handleUnlinkContact}
        onCreateAndLinkContact={async (contactData, appId) => {
          const created = await handleAddContact(contactData);
          await handleLinkContact(created.id, appId);
        }}
        onUpdateContact={handleUpdateContact}
        onSelectContact={(contactId) => {
          setSelectedAppId(null);
          setSelectedContactId(contactId);
        }}
        onEditContact={(contact) => {
          setSelectedAppId(null);
          setSelectedContactId(contact.id);
        }}
        onShowToast={addToast}
      />

      {/* Right Slide-over Contact Detail Panel */}
      <ContactDetailPanel
        contact={selectedContact}
        applications={applications}
        onClose={() => setSelectedContactId(null)}
        onUpdateContact={handleUpdateContact}
        onDeleteContact={handleDeleteContact}
        onUnlinkFromApp={handleUnlinkContact}
        onSelectApplication={(appId) => {
          setSelectedContactId(null);
          setSelectedAppId(appId);
        }}
      />

      {/* Add Application Modal */}
      <AddApplicationModal
        isOpen={isAddModalOpen}
        allContacts={contacts}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddApplication}
        onCreateContact={handleAddContact}
      />

      {/* Multi-Provider Auth Modal */}
      <AuthModal onShowToast={addToast} />

      {/* Guest-to-Account Data Migration Modal */}
      <GuestMigrationModal
        isOpen={isMigrationModalOpen}
        guestApplications={migrationApps}
        guestContacts={migrationContacts}
        onImport={handleImportGuestApps}
        onDiscard={handleDiscardGuestApps}
        onClose={() => setIsMigrationModalOpen(false)}
      />

      {/* Global Toast Feedback Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TrackletAppContent />
    </AuthProvider>
  );
}
