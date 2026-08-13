import React, { useState } from 'react';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  ExternalLink, 
  Archive, 
  XCircle, 
  Trash2, 
  CheckSquare, 
  Square,
  FileText,
  Download,
  Mail,
  Users
} from 'lucide-react';
import { Application, SortField, SortState, ApplicationStatus } from '../types';
import { StatusBadge } from './StatusBadge';
import { StageSelectorDropdown } from './StageSelectorDropdown';
import { CompanyLogo } from './CompanyLogo';
import { EmptyState } from './EmptyState';
import { calculateDaysInStage } from '../lib/sampleData';
import { exportApplicationsToCSV } from '../lib/exportCsv';

interface AllApplicationsTableProps {
  applications: Application[];
  totalAppCount?: number;
  onOpenAddModal?: () => void;
  onResetFilters?: () => void;
  selectedAppId: string | null;
  onSelectApp: (app: Application) => void;
  sort: SortState;
  onSortChange: (field: SortField) => void;
  onBulkUpdateStatus: (ids: string[], newStatus: ApplicationStatus) => void;
  onBulkDelete: (ids: string[]) => void;
}

function formatAppDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    }
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  } catch {
    // fallback
  }
  return dateStr;
}

function getStageUrgencyClass(status: ApplicationStatus, daysInStage: number): string {
  if (status === 'Rejected' || status === 'Archived') {
    return 'text-slate-400';
  }
  if (status === 'Applied') {
    if (daysInStage > 21) return 'text-amber-700 bg-amber-50 font-semibold border border-amber-200/60';
    if (daysInStage > 10) return 'text-slate-700 font-medium';
    return 'text-slate-400';
  }
  if (status === 'Screening' || status === 'Interview') {
    if (daysInStage > 14) return 'text-rose-700 bg-rose-50 font-semibold border border-rose-200/60';
    if (daysInStage > 7) return 'text-amber-700 bg-amber-50 font-semibold border border-amber-200/60';
    return 'text-slate-700 font-medium';
  }
  if (status === 'Offer') {
    if (daysInStage > 3) return 'text-rose-700 bg-rose-50 font-semibold border border-rose-200/60';
    return 'text-emerald-700 bg-emerald-50 font-semibold border border-emerald-200/60';
  }
  if (daysInStage > 14) return 'text-amber-700 bg-amber-50 font-semibold border border-amber-200/60';
  return 'text-slate-400';
}

export const AllApplicationsTable: React.FC<AllApplicationsTableProps> = ({
  applications,
  totalAppCount = 0,
  onOpenAddModal,
  onResetFilters,
  selectedAppId,
  onSelectApp,
  sort,
  onSortChange,
  onBulkUpdateStatus,
  onBulkDelete,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allSelected =
    applications.length > 0 && selectedIds.size === applications.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(applications.map((a) => a.id)));
    }
  };

  const toggleSelectOne = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleExportAllCSV = () => {
    exportApplicationsToCSV(applications, 'tracklet_filtered_applications');
  };

  const handleExportSelectedCSV = () => {
    const selectedApps = applications.filter((a) => selectedIds.has(a.id));
    exportApplicationsToCSV(selectedApps, 'tracklet_selected_applications');
  };

  const handleBulkArchive = () => {
    onBulkUpdateStatus(Array.from(selectedIds), 'Archived');
    clearSelection();
  };

  const handleBulkReject = () => {
    onBulkUpdateStatus(Array.from(selectedIds), 'Rejected');
    clearSelection();
  };

  const handleBulkDeleteAction = () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.size} applications?`)) {
      onBulkDelete(Array.from(selectedIds));
      clearSelection();
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sort.field !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sort.order === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-blue-600" />
    ) : (
      <ArrowDown className="w-3 h-3 text-blue-600" />
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white text-slate-900 select-none">
      {/* Floating Bulk Actions & Table Toolbar Bar */}
      {selectedIds.size > 0 ? (
        <div className="bg-blue-50/90 border-b border-blue-200/80 px-4 py-2 flex items-center justify-between gap-3 text-xs text-blue-950 animate-in fade-in slide-in-from-top-1 duration-150 backdrop-blur-xs shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-blue-600 bg-white px-2 py-0.5 rounded-md border border-blue-200 font-semibold shadow-2xs">
              {selectedIds.size} selected
            </span>
            <span className="text-slate-600 font-medium">Bulk actions:</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportSelectedCSV}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all shadow-2xs font-medium cursor-pointer"
              title="Export selected applications to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Selected CSV</span>
            </button>

            <button
              onClick={handleBulkArchive}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all shadow-2xs font-medium cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5 text-slate-500" />
              <span>Archive</span>
            </button>

            <button
              onClick={handleBulkReject}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 transition-all shadow-2xs font-medium cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>Mark Rejected</span>
            </button>

            <button
              onClick={handleBulkDeleteAction}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white hover:bg-rose-100/60 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 transition-all shadow-2xs font-medium cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>

            <button
              onClick={clearSelection}
              className="text-slate-500 hover:text-slate-900 ml-2 font-mono text-[11px] font-medium cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50/60 border-b border-slate-200/80 px-4 py-1.5 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
            <span>Showing <strong className="text-slate-800 font-semibold">{applications.length}</strong> {applications.length === 1 ? 'application' : 'applications'}</span>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-50/80 border-b border-slate-200/80 sticky top-0 z-10 text-[11px] font-mono text-slate-500 uppercase tracking-wider backdrop-blur-xs">
            <tr>
              <th className="w-10 px-3 py-2.5 text-center">
                <button
                  onClick={toggleSelectAll}
                  className="text-slate-400 hover:text-slate-700 align-middle transition-colors"
                >
                  {allSelected ? (
                    <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                  ) : (
                    <Square className="w-3.5 h-3.5" />
                  )}
                </button>
              </th>

              <th
                onClick={() => onSortChange('company')}
                className="px-3 py-2.5 font-semibold cursor-pointer hover:text-slate-900 group transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Company</span>
                  {renderSortIcon('company')}
                </div>
              </th>

              <th
                onClick={() => onSortChange('role')}
                className="px-3 py-2.5 font-semibold cursor-pointer hover:text-slate-900 group transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Role</span>
                  {renderSortIcon('role')}
                </div>
              </th>

              <th
                onClick={() => onSortChange('platform')}
                className="px-3 py-2.5 font-semibold cursor-pointer hover:text-slate-900 group transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Platform</span>
                  {renderSortIcon('platform')}
                </div>
              </th>

              <th
                onClick={() => onSortChange('dateApplied')}
                className="px-3 py-2.5 font-semibold cursor-pointer hover:text-slate-900 group transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Applied</span>
                  {renderSortIcon('dateApplied')}
                </div>
              </th>

              <th
                onClick={() => onSortChange('status')}
                className="px-3 py-2.5 font-semibold cursor-pointer hover:text-slate-900 group transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Status</span>
                  {renderSortIcon('status')}
                </div>
              </th>

              <th
                onClick={() => onSortChange('daysInStage')}
                className="px-3 py-2.5 font-semibold cursor-pointer hover:text-slate-900 group text-right pr-6 transition-colors"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>In Stage</span>
                  {renderSortIcon('daysInStage')}
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {applications.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 px-4">
                  <EmptyState
                    isFiltered={totalAppCount > 0}
                    onAddApplication={onOpenAddModal}
                    onResetFilters={onResetFilters}
                  />
                </td>
              </tr>
            ) : (
              applications.map((app, index) => {
                const isSelected = selectedIds.has(app.id);
                const isCurrentRowActive = selectedAppId === app.id;
                const daysInStage = calculateDaysInStage(app.stageUpdatedAt);

                return (
                  <tr
                    key={app.id}
                    onClick={() => onSelectApp(app)}
                    style={{
                      animationDelay: `${Math.min(index * 30, 250)}ms`,
                    }}
                    className={`group cursor-pointer transition-all duration-150 animate-card-entrance ${
                      isCurrentRowActive
                        ? 'bg-blue-50/80 font-medium'
                        : isSelected
                        ? 'bg-slate-100/70'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-1 text-center" onClick={(e) => toggleSelectOne(e, app.id)}>
                      <button className="text-slate-400 hover:text-slate-700 align-middle transition-colors">
                        {isSelected ? (
                          <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <Square className="w-3.5 h-3.5 group-hover:text-slate-500" />
                        )}
                      </button>
                    </td>

                    {/* Company */}
                    <td className="px-3 py-1 font-bold text-slate-900 truncate max-w-[210px]">
                      <div className="flex items-center gap-2">
                        <CompanyLogo
                          company={app.company}
                          jobLink={app.jobLink}
                          logoUrl={app.logoUrl}
                          companyDomain={app.companyDomain}
                          size="xs"
                        />
                        <span className="truncate">{app.company}</span>
                        {app.jobLink && (
                          <a
                            href={app.jobLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-slate-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                            title="Open job posting link"
                          >
                            <ExternalLink className="w-3 h-3 text-slate-400 hover:text-blue-600" />
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-3 py-1 text-slate-700 font-medium truncate max-w-[220px]">
                      {app.role}
                    </td>

                    {/* Platform */}
                    <td className="px-3 py-1">
                      <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80">
                        {app.platform}
                      </span>
                    </td>

                    {/* Date Applied */}
                    <td className="px-3 py-1 font-mono text-[11px] text-slate-500" title={`Applied on ${app.dateApplied}`}>
                      {formatAppDate(app.dateApplied)}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-1" onClick={(e) => e.stopPropagation()}>
                      <StageSelectorDropdown
                        currentStatus={app.status}
                        onSelectStatus={(newStatus) => onBulkUpdateStatus([app.id], newStatus)}
                        size="sm"
                      />
                    </td>

                    {/* Days in stage */}
                    <td className="px-3 py-1 font-mono text-[11px] text-right pr-6">
                      <span
                        className={`px-2 py-0.5 rounded-md ${getStageUrgencyClass(app.status, daysInStage)}`}
                        title={`${daysInStage} days in ${app.status} stage`}
                      >
                        {daysInStage}d
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
