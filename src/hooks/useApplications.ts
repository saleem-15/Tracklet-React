import { useState, useCallback, useMemo, useRef } from 'react';
import type { User } from 'firebase/auth';
import { 
  Application, 
  ApplicationStatus, 
  SortField, 
  SortState, 
  FilterState, 
  StatusHistoryEntry 
} from '../types';
import { ApplicationRepository } from '../lib/applicationRepository';
import { appendStatusHistory } from '../lib/historyService';
import { clearNoteDraft } from '../lib/editor/noteDrafts';
import { broadcastDeletedApplication } from '../lib/extensionSync';
import { findDuplicateApplications, mergeAllDuplicateGroups } from '../lib/dedupUtils';
import { calculateDaysInStage } from '../lib/sampleData';
import { exportApplicationsToCSV } from '../lib/exportCsv';

export interface UseApplicationsProps {
  user: User | null;
  filter: FilterState;
  addToast: (
    type: 'success' | 'error' | 'info' | 'warning', 
    title: string, 
    message?: string, 
    action?: { label: string; onClick: () => void }, 
    stage?: ApplicationStatus
  ) => void;
  selectedAppId: string | null;
  setSelectedAppId: (id: string | null) => void;
}

export interface UseApplicationsReturn {
  applications: Application[];
  setApplications: React.Dispatch<React.SetStateAction<Application[]>>;
  applicationsRef: React.MutableRefObject<Application[]>;
  selectedApp: Application | null;
  sort: SortState;
  setSort: React.Dispatch<React.SetStateAction<SortState>>;
  handleSortChange: (field: SortField) => void;
  filteredAndSortedApplications: Application[];
  duplicateGroups: Map<string, Application[]>;
  duplicateCount: number;
  handleAddApplication: (newApp: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>) => Promise<void>;
  handleBatchImportApplications: (newApps: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>[]) => Promise<void>;
  handleUpdateApplication: (id: string, updates: Partial<Application>) => Promise<void>;
  handleDeleteApplication: (id: string) => Promise<void>;
  handleBulkUpdateStatus: (ids: string[], newStatus: ApplicationStatus) => Promise<void>;
  handleBulkDelete: (ids: string[]) => Promise<void>;
  handleMergeAllDuplicates: () => Promise<void>;
  handleExportCSV: () => void;
}

/**
 * useApplications
 * 
 * Domain hook encapsulating Job Applications pipeline & table state and actions.
 * - Manages applications collection state and synchronous applicationsRef
 * - Handles optimistic CRUD operations, stage status updates with history timeline logging
 * - Provides undo snackbars for stage changes, single deletes, and bulk deletes
 * - Deduplication detection and group merging
 * - Sorting, filtering, and CSV export
 */
export function useApplications({
  user,
  filter,
  addToast,
  selectedAppId,
  setSelectedAppId,
}: UseApplicationsProps): UseApplicationsReturn {
  const [applications, setApplications] = useState<Application[]>([]);
  const applicationsRef = useRef<Application[]>(applications);
  applicationsRef.current = applications;

  // Sort State
  const [sort, setSort] = useState<SortState>({
    field: 'dateApplied',
    order: 'desc',
  });

  const handleSortChange = useCallback((field: SortField) => {
    setSort((prev) => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

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

  const selectedApp = useMemo(() => {
    return applications.find((a) => a.id === selectedAppId) || null;
  }, [applications, selectedAppId]);

  // Deduplication analysis across applications
  const duplicateGroups = useMemo(() => findDuplicateApplications(applications), [applications]);
  const duplicateCount = useMemo(() => {
    let count = 0;
    for (const group of duplicateGroups.values()) {
      count += (group.length - 1);
    }
    return count;
  }, [duplicateGroups]);

  // Add Application
  const handleAddApplication = useCallback(async (
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
  }, [user, addToast]);

  // Batch Import Applications (CSV)
  const handleBatchImportApplications = useCallback(async (
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
  }, [user, addToast]);

  // Update Application
  const handleUpdateApplication = useCallback(async (id: string, updates: Partial<Application>) => {
    const currentApp = applicationsRef.current.find((a) => a.id === id);
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
  }, [user, addToast]);

  // Delete Application
  const handleDeleteApplication = useCallback(async (id: string) => {
    const targetApp = applicationsRef.current.find((a) => a.id === id);

    // Clear any local note draft for this application
    clearNoteDraft(id);

    // Notify extension to purge from its pending/sync storage
    broadcastDeletedApplication(id);

    // Purge from guest storage cache regardless of auth mode to prevent resurrection
    ApplicationRepository.purgeGuestApplications(id);

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
              let restored = targetApp;
              if (user?.emailVerified) {
                try {
                  restored = await ApplicationRepository.restoreApplication(targetApp, user.uid);
                } catch (restoreErr) {
                  console.error('Failed to restore deleted application to Firestore:', restoreErr);
                  addToast('error', 'Restore Failed', 'Could not restore the application to your account.');
                  return;
                }
              }
              setApplications((prev) => {
                const next = [restored, ...prev];
                if (!user?.emailVerified) ApplicationRepository.saveGuestApplications(next);
                return next;
              });
              addToast('success', `Restored ${restored.company}`);
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
  }, [user, addToast, selectedAppId, setSelectedAppId]);

  // Bulk Status Update
  const handleBulkUpdateStatus = useCallback(async (ids: string[], newStatus: ApplicationStatus) => {
    const now = new Date().toISOString();
    const currentApps = applicationsRef.current;
    const previousSnapshot = currentApps.filter((a) => ids.includes(a.id));
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
          currentApps
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
  }, [user, addToast]);

  // Bulk Delete
  const handleBulkDelete = useCallback(async (ids: string[]) => {
    const currentApps = applicationsRef.current;
    const deletedApps = currentApps.filter((a) => ids.includes(a.id));
    const count = ids.length;

    // Clear note drafts and notify extension for each deleted application
    ids.forEach((id) => {
      clearNoteDraft(id);
      broadcastDeletedApplication(id);
    });

    // Purge from guest storage cache regardless of auth mode to prevent resurrection
    ApplicationRepository.purgeGuestApplications(ids);

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
            let restoredApps = deletedApps;
            if (user?.emailVerified) {
              try {
                restoredApps = await ApplicationRepository.batchRestoreApplications(deletedApps, user.uid);
              } catch (restoreErr: unknown) {
                console.error('Failed to restore deleted applications to Firestore:', restoreErr);
                const partiallyRestored: Application[] =
                  restoreErr && typeof restoreErr === 'object' && 'restoredApplications' in restoreErr
                    ? (restoreErr as { restoredApplications: Application[] }).restoredApplications
                    : [];

                if (partiallyRestored.length > 0) {
                  setApplications((prev) => [...partiallyRestored, ...prev]);
                  const failedCount = deletedApps.length - partiallyRestored.length;
                  addToast(
                    'warning',
                    'Partial Restore',
                    `Restored ${partiallyRestored.length} applications; ${failedCount} could not be restored.`
                  );
                } else {
                  addToast('error', 'Restore Failed', 'Could not restore applications to your account.');
                }
                return;
              }
            }
            setApplications((prev) => {
              const next = [...restoredApps, ...prev];
              if (!user?.emailVerified) ApplicationRepository.saveGuestApplications(next);
              return next;
            });
            addToast('success', 'Restored', `Recovered ${restoredApps.length} application${restoredApps.length === 1 ? '' : 's'}.`);
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
  }, [user, addToast, selectedAppId, setSelectedAppId]);

  // Merge All Duplicates
  const handleMergeAllDuplicates = useCallback(async () => {
    const currentApps = applicationsRef.current;
    const groups = findDuplicateApplications(currentApps);
    const { mergedApplications, purgedAppIds, updatedApplications } = mergeAllDuplicateGroups(currentApps);

    if (purgedAppIds.length === 0) return;

    // Clean up local drafts and notify extension for each purged duplicate
    purgedAppIds.forEach((id) => {
      clearNoteDraft(id);
      broadcastDeletedApplication(id);
    });

    // If currently selected application was one of the purged duplicates, select surviving record
    if (selectedAppId && purgedAppIds.includes(selectedAppId)) {
      let survivorId: string | null = null;
      for (const group of groups.values()) {
        if (group.some((a) => a.id === selectedAppId)) {
          const survivor = group.find((a) => !purgedAppIds.includes(a.id));
          if (survivor) survivorId = survivor.id;
          break;
        }
      }
      setSelectedAppId(survivorId);
    }

    // Update state and ref synchronously
    applicationsRef.current = mergedApplications;
    setApplications(mergedApplications);

    // Purge from guest storage cache regardless of auth mode
    ApplicationRepository.purgeGuestApplications(purgedAppIds);

    // In guest mode, save merged result so guest storage includes updated survivor fields
    if (!user?.emailVerified) {
      ApplicationRepository.saveGuestApplications(mergedApplications);
    }

    // Persist to Firestore if user is authenticated
    if (user?.emailVerified) {
      try {
        for (const survivor of updatedApplications) {
          await ApplicationRepository.updateApplication(survivor.id, survivor, user.uid);
        }
        await ApplicationRepository.batchDelete(purgedAppIds, user.uid);
      } catch (err) {
        console.error('Failed to sync merged duplicates to Firestore:', err);
        addToast('error', 'Sync Failed', 'Merged locally, but failed to sync changes to cloud.');
        return;
      }
    }

    addToast(
      'success',
      'Duplicates Merged',
      `Consolidated ${purgedAppIds.length} duplicate application${purgedAppIds.length === 1 ? '' : 's'}. Notes and pipeline stages preserved.`
    );
  }, [selectedAppId, setSelectedAppId, user, addToast]);

  // CSV Export
  const handleExportCSV = useCallback(() => {
    const success = exportApplicationsToCSV(filteredAndSortedApplications);
    if (success) {
      addToast('success', 'Export Complete', `Exported ${filteredAndSortedApplications.length} applications to CSV.`);
    } else {
      addToast('warning', 'Export Empty', 'No applications available to export.');
    }
  }, [filteredAndSortedApplications, addToast]);

  return {
    applications,
    setApplications,
    applicationsRef,
    selectedApp,
    sort,
    setSort,
    handleSortChange,
    filteredAndSortedApplications,
    duplicateGroups,
    duplicateCount,
    handleAddApplication,
    handleBatchImportApplications,
    handleUpdateApplication,
    handleDeleteApplication,
    handleBulkUpdateStatus,
    handleBulkDelete,
    handleMergeAllDuplicates,
    handleExportCSV,
  };
}
