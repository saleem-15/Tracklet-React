import React, { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';
import { 
  Application, 
  ApplicationStatus, 
  SortField, 
  SortState, 
} from '../types';
import { ApplicationRepository } from '../lib/applicationRepository';
import { useApplications } from '../hooks/useApplications';
import { useAuth } from './AuthContext';
import { useNavigation } from './NavigationContext';
import { useToastContext } from './ToastContext';

export interface ApplicationsContextType {
  applications: Application[];
  setApplications: React.Dispatch<React.SetStateAction<Application[]>>;
  applicationsRef: React.MutableRefObject<Application[]>;
  selectedApp: Application | null;
  sort: SortState;
  setSort: React.Dispatch<React.SetStateAction<SortState>>;
  handleSortChange: (field: SortField) => void;
  filteredAndSortedApplications: Application[];
  filteredApplications: Application[];
  duplicateCount: number;
  duplicateGroups: Map<string, Application[]>;
  isDuplicateBannerDismissed: boolean;
  dismissDuplicateBanner: () => void;
  handleAddApplication: (newApp: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>) => Promise<void>;
  handleBatchImportApplications: (newApps: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>[]) => Promise<void>;
  handleUpdateApplication: (id: string, updates: Partial<Application>) => Promise<void>;
  handleDeleteApplication: (id: string) => Promise<void>;
  handleBulkUpdateStatus: (ids: string[], newStatus: ApplicationStatus) => Promise<void>;
  handleBulkDelete: (ids: string[]) => Promise<void>;
  handleMergeAllDuplicates: () => Promise<void>;
  handleExportCSV: () => void;
  handleUpdatePipelineStatus: (id: string, newStatus: string) => void;
  handleAccountDeleted: () => void;
  handleSeedDemoData: () => Promise<void>;
  registerContactSeeder: (fn: (() => Promise<void>) | null) => void;
}

const ApplicationsContext = createContext<ApplicationsContextType | null>(null);

/**
 * ApplicationsProvider
 *
 * Scoped feature provider for the Job Application pipeline domain.
 * Analogous to Flutter's ApplicationsBloc / ApplicationsCubit.
 * Encapsulates pipeline collection state, optimistic CRUD, sorting, filtering,
 * deduplication, and bulk mutations.
 */
export const ApplicationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { filter, selectedAppId, setSelectedAppId } = useNavigation();
  const { addToast } = useToastContext();

  const {
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
  } = useApplications({
    user,
    filter,
    addToast,
    selectedAppId,
    setSelectedAppId,
  });

  const [isDuplicateBannerDismissed, setIsDuplicateBannerDismissed] = useState(false);
  const dismissDuplicateBanner = useCallback(() => setIsDuplicateBannerDismissed(true), []);

  const handleUpdatePipelineStatus = useCallback((id: string, newStatus: string) => {
    handleUpdateApplication(id, {
      status: newStatus as ApplicationStatus,
      stageUpdatedAt: new Date().toISOString(),
    });
  }, [handleUpdateApplication]);

  const handleAccountDeleted = useCallback(() => {
    setApplications([]);
    setSelectedAppId(null);
  }, [setApplications, setSelectedAppId]);

  // Optional registration callback for contact seeding
  const seedContactCallbackRef = useRef<(() => Promise<void>) | null>(null);
  const registerContactSeeder = useCallback((fn: (() => Promise<void>) | null) => {
    seedContactCallbackRef.current = fn;
  }, []);

  const handleSeedDemoData = useCallback(async () => {
    try {
      const freshDocs = await ApplicationRepository.seedDemoData(user?.emailVerified ? user.uid : undefined);
      setApplications(freshDocs);
      setSelectedAppId(null);
      if (seedContactCallbackRef.current) {
        await seedContactCallbackRef.current();
      }
      addToast('info', 'Sample data loaded', 'Demo applications and contacts ready.');
    } catch (err) {
      console.error('Failed to seed demo data:', err);
      addToast('error', 'Error', 'Could not load demo dataset.');
    }
  }, [user, setApplications, setSelectedAppId, addToast]);

  const value = useMemo<ApplicationsContextType>(() => ({
    applications,
    setApplications,
    applicationsRef,
    selectedApp,
    sort,
    setSort,
    handleSortChange,
    filteredAndSortedApplications,
    filteredApplications: filteredAndSortedApplications,
    duplicateCount,
    duplicateGroups,
    isDuplicateBannerDismissed,
    dismissDuplicateBanner,
    handleAddApplication,
    handleBatchImportApplications,
    handleUpdateApplication,
    handleDeleteApplication,
    handleBulkUpdateStatus,
    handleBulkDelete,
    handleMergeAllDuplicates,
    handleExportCSV,
    handleUpdatePipelineStatus,
    handleAccountDeleted,
    handleSeedDemoData,
    registerContactSeeder,
  }), [
    applications,
    setApplications,
    applicationsRef,
    selectedApp,
    sort,
    setSort,
    handleSortChange,
    filteredAndSortedApplications,
    duplicateCount,
    duplicateGroups,
    isDuplicateBannerDismissed,
    dismissDuplicateBanner,
    handleAddApplication,
    handleBatchImportApplications,
    handleUpdateApplication,
    handleDeleteApplication,
    handleBulkUpdateStatus,
    handleBulkDelete,
    handleMergeAllDuplicates,
    handleExportCSV,
    handleUpdatePipelineStatus,
    handleAccountDeleted,
    handleSeedDemoData,
    registerContactSeeder,
  ]);

  return (
    <ApplicationsContext.Provider value={value}>
      {children}
    </ApplicationsContext.Provider>
  );
};

export const useApplicationsContext = (): ApplicationsContextType => {
  const context = useContext(ApplicationsContext);
  if (!context) {
    throw new Error('useApplicationsContext must be used within an ApplicationsProvider');
  }
  return context;
};
