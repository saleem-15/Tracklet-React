import {
  Application,
  Contact,
  ApplicationStatus,
  ActiveTab,
  SortState,
  SortField,
  FilterState,
  ExpiryNotificationSettings,
} from '../../types';
import { AllApplicationsTable } from '../AllApplicationsTable';
import { ActivePipelineBoard } from '../ActivePipelineBoard';
import { ContactsView } from '../ContactsView';
import { StatsView } from '../StatsView';
import { SettingsView } from '../SettingsView';
import { AlertTriangle, X } from 'lucide-react';
import type { AddToastFn } from '../../hooks/useToast';

export interface WorkspaceContentProps {
  activeTab: ActiveTab;
  isLoading: boolean;

  // Duplicate banner
  duplicateCount: number;
  isDuplicateBannerDismissed: boolean;
  onDismissDuplicateBanner: () => void;
  onMergeAllDuplicates: () => Promise<void>;

  // Shared data
  applications: Application[];
  filteredApplications: Application[];
  contacts: Contact[];
  selectedAppId: string | null;
  onSelectApp: (id: string) => void;
  onShowToast: AddToastFn;

  // AllApplicationsTable
  onOpenAddModal: () => void;
  onResetFilters: () => void;
  onSeedDemoData: () => Promise<void>;
  sort: SortState;
  onSortChange: (field: SortField) => void;
  onBulkUpdateStatus: (ids: string[], newStatus: ApplicationStatus) => Promise<void>;
  onBulkDelete: (ids: string[]) => Promise<void>;

  // ActivePipelineBoard
  onUpdatePipelineStatus: (id: string, newStatus: ApplicationStatus) => void;

  // ContactsView
  onAddContact: (newContact: Omit<Contact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<Contact>;
  onUpdateContact: (id: string, updates: Partial<Contact>) => Promise<void>;
  onDeleteContact: (id: string) => Promise<void>;
  onSelectContact: (contactId: string) => void;
  onOpenMobileSidebar: () => void;
  expiryThresholdHours: number;

  // SettingsView
  expirySettings: ExpiryNotificationSettings;
  onUpdateExpirySettings: (settings: ExpiryNotificationSettings) => void;
  onExportCSV: () => void;
  onImportApplications: (newApps: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>[]) => Promise<void>;
  onAccountDeleted: () => void;
  userId?: string;
}

/**
 * WorkspaceContent
 *
 * Tab-routed workspace content area. Renders the active view based on activeTab:
 * - 'all': AllApplicationsTable (sortable, filterable job applications table)
 * - 'pipeline': ActivePipelineBoard (Kanban-style stage columns)
 * - 'contacts': ContactsView (networking hub)
 * - 'stats': StatsView (analytics dashboard)
 * - 'settings': SettingsView (preferences, import/export, account)
 *
 * Also renders the duplicate applications warning banner when duplicates are detected.
 */
export function WorkspaceContent({
  activeTab,
  isLoading,
  duplicateCount,
  isDuplicateBannerDismissed,
  onDismissDuplicateBanner,
  onMergeAllDuplicates,
  applications,
  filteredApplications,
  contacts,
  selectedAppId,
  onSelectApp,
  onShowToast,
  onOpenAddModal,
  onResetFilters,
  onSeedDemoData,
  sort,
  onSortChange,
  onBulkUpdateStatus,
  onBulkDelete,
  onUpdatePipelineStatus,
  onAddContact,
  onUpdateContact,
  onDeleteContact,
  onSelectContact,
  onOpenMobileSidebar,
  expiryThresholdHours,
  expirySettings,
  onUpdateExpirySettings,
  onExportCSV,
  onImportApplications,
  onAccountDeleted,
  userId,
}: WorkspaceContentProps) {
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center font-mono text-xs text-slate-500">
        Loading Tracklet workspace...
      </div>
    );
  }

  return (
    <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
      {/* Duplicate Applications Detected Banner */}
      {(activeTab === 'all' || activeTab === 'pipeline') && duplicateCount > 0 && !isDuplicateBannerDismissed && (
        <div
          role="status"
          aria-live="polite"
          className="shrink-0 mx-4 md:mx-6 mt-3 px-3.5 py-2.5 bg-amber-50/95 border border-amber-200/80 rounded-lg flex items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs animate-in fade-in slide-in-from-top-1 duration-200 motion-reduce:animate-none z-10"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
            <p className="truncate">
              <span className="font-semibold text-amber-950">Duplicate applications detected:</span>{' '}
              <span>{duplicateCount} duplicate instance{duplicateCount === 1 ? '' : 's'} found across your pipeline.</span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onMergeAllDuplicates}
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800 transition-colors shadow-2xs focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-600 cursor-pointer"
            >
              Merge All
            </button>
            <button
              type="button"
              onClick={onDismissDuplicateBanner}
              aria-label="Dismiss duplicate notice"
              className="p-1 text-amber-600 hover:text-amber-800 rounded-md hover:bg-amber-100/60 active:bg-amber-200/60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {activeTab === 'all' && (
        <AllApplicationsTable
          applications={filteredApplications}
          totalAppCount={applications.length}
          onOpenAddModal={onOpenAddModal}
          onResetFilters={onResetFilters}
          onSeedDemoData={onSeedDemoData}
          selectedAppId={selectedAppId}
          onSelectApp={(app) => onSelectApp(app.id)}
          sort={sort}
          onSortChange={onSortChange}
          onBulkUpdateStatus={onBulkUpdateStatus}
          onBulkDelete={onBulkDelete}
          onShowToast={onShowToast}
        />
      )}

      {activeTab === 'pipeline' && (
        <ActivePipelineBoard
          applications={filteredApplications}
          totalAppCount={applications.length}
          onOpenAddModal={onOpenAddModal}
          onResetFilters={onResetFilters}
          onSeedDemoData={onSeedDemoData}
          selectedAppId={selectedAppId}
          onSelectApp={(app) => onSelectApp(app.id)}
          onUpdateStatus={onUpdatePipelineStatus}
        />
      )}

      {activeTab === 'contacts' && (
        <ContactsView
          contacts={contacts}
          applications={applications}
          onAddContact={onAddContact}
          onUpdateContact={onUpdateContact}
          onDeleteContact={onDeleteContact}
          onSelectContact={onSelectContact}
          onOpenMobileSidebar={onOpenMobileSidebar}
          onShowToast={onShowToast}
          expiryThresholdHours={expiryThresholdHours}
        />
      )}

      {activeTab === 'stats' && (
        <StatsView
          applications={applications}
          onSelectApplication={onSelectApp}
        />
      )}

      {activeTab === 'settings' && (
        <div className="flex-1 overflow-y-auto p-6">
          <SettingsView
            settings={expirySettings}
            onUpdateSettings={onUpdateExpirySettings}
            applications={applications}
            contacts={contacts}
            onSelectApplication={onSelectApp}
            onExportCSV={onExportCSV}
            onImportCSV={onImportApplications}
            onImportJSON={onImportApplications}
            onSeedDemoData={onSeedDemoData}
            onShowToast={onShowToast}
            onAccountDeleted={onAccountDeleted}
            userId={userId}
          />
        </div>
      )}
    </main>
  );
}
