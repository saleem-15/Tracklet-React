import { AlertTriangle, X } from 'lucide-react';
import { AllApplicationsTable } from '../AllApplicationsTable';
import { ActivePipelineBoard } from '../ActivePipelineBoard';
import { ContactsView } from '../ContactsView';
import { StatsView } from '../StatsView';
import { SettingsView } from '../SettingsView';
import { useNavigation } from '../../context/NavigationContext';
import { useApplicationsContext } from '../../context/ApplicationsContext';
import { useContactsContext } from '../../context/ContactsContext';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { useToastContext } from '../../context/ToastContext';

export interface WorkspaceContentProps {
  isLoading?: boolean;
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
 * In Phase 3, all domain state (applications, contacts, settings, navigation, toast)
 * is consumed directly from scoped feature context providers, eliminating 29 props.
 */
export function WorkspaceContent({ isLoading = false }: WorkspaceContentProps) {
  const { user } = useAuth();
  const { addToast } = useToastContext();
  const {
    activeTab,
    selectedAppId,
    setSelectedAppId,
    openAddModal,
    resetFilters,
    openMobileSidebar,
  } = useNavigation();

  const {
    applications,
    filteredApplications,
    duplicateCount,
    isDuplicateBannerDismissed,
    dismissDuplicateBanner,
    handleMergeAllDuplicates,
    sort,
    handleSortChange,
    handleBulkUpdateStatus,
    handleBulkDelete,
    handleUpdatePipelineStatus,
    handleExportCSV,
    handleBatchImportApplications,
    handleSeedDemoData,
    handleAccountDeleted,
  } = useApplicationsContext();

  const {
    contacts,
    handleAddContact,
    handleUpdateContact,
    handleDeleteContact,
    handleSwitchToContact,
  } = useContactsContext();

  const {
    expirySettings,
    updateExpirySettings,
    expiryThresholdHours,
  } = useSettings();

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
              onClick={handleMergeAllDuplicates}
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800 transition-colors shadow-2xs focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-600 cursor-pointer"
            >
              Merge All
            </button>
            <button
              type="button"
              onClick={dismissDuplicateBanner}
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
          onOpenAddModal={openAddModal}
          onResetFilters={resetFilters}
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
          applications={filteredApplications}
          totalAppCount={applications.length}
          onOpenAddModal={openAddModal}
          onResetFilters={resetFilters}
          onSeedDemoData={handleSeedDemoData}
          selectedAppId={selectedAppId}
          onSelectApp={(app) => setSelectedAppId(app.id)}
          onUpdateStatus={handleUpdatePipelineStatus}
        />
      )}

      {activeTab === 'contacts' && (
        <ContactsView
          contacts={contacts}
          applications={applications}
          onAddContact={handleAddContact}
          onUpdateContact={handleUpdateContact}
          onDeleteContact={handleDeleteContact}
          onSelectContact={handleSwitchToContact}
          onOpenMobileSidebar={openMobileSidebar}
          onShowToast={addToast}
          expiryThresholdHours={expiryThresholdHours}
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
            onUpdateSettings={updateExpirySettings}
            applications={applications}
            contacts={contacts}
            onSelectApplication={(id) => setSelectedAppId(id)}
            onExportCSV={handleExportCSV}
            onImportCSV={handleBatchImportApplications}
            onImportJSON={handleBatchImportApplications}
            onSeedDemoData={handleSeedDemoData}
            onShowToast={addToast}
            onAccountDeleted={handleAccountDeleted}
            userId={user?.uid}
          />
        </div>
      )}
    </main>
  );
}
