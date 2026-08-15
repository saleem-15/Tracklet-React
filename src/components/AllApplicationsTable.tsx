import React, { useState, useEffect, useRef } from 'react';
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
  Download
} from 'lucide-react';
import { Application, SortField, SortState, ApplicationStatus } from '../types';
import { StatusBadge } from './StatusBadge';
import { CompanyLogo } from './CompanyLogo';
import { EmptyState } from './EmptyState';
import { calculateDaysInStage, formatAppDate } from '../lib/dateUtils';
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

function getStageUrgencyClass(status: ApplicationStatus, daysInStage: number): string {
  if (status === 'Rejected' || status === 'Archived') {
    return 'text-slate-500';
  }
  if (status === 'Applied') {
    if (daysInStage > 21) return 'text-amber-800 bg-amber-50 font-medium border border-amber-200/80';
    if (daysInStage > 10) return 'text-slate-700 font-medium';
    return 'text-slate-500';
  }
  if (status === 'Screening' || status === 'Interview') {
    if (daysInStage > 14) return 'text-rose-800 bg-rose-50 font-medium border border-rose-200/80';
    if (daysInStage > 7) return 'text-amber-800 bg-amber-50 font-medium border border-amber-200/80';
    return 'text-slate-700 font-medium';
  }
  if (status === 'Offer') {
    if (daysInStage > 3) return 'text-rose-800 bg-rose-50 font-medium border border-rose-200/80';
    return 'text-emerald-800 bg-emerald-50 font-medium border border-emerald-200/80';
  }
  if (daysInStage > 14) return 'text-amber-800 bg-amber-50 font-medium border border-amber-200/80';
  return 'text-slate-500';
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
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  const allSelected =
    applications.length > 0 && selectedIds.size === applications.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(applications.map((a) => a.id)));
    }
  };

  const toggleSelectOne = (e?: React.MouseEvent, id?: string) => {
    if (e) e.stopPropagation();
    const targetId = id || (focusedIndex >= 0 && focusedIndex < applications.length ? applications[focusedIndex].id : undefined);
    if (!targetId) return;

    const next = new Set(selectedIds);
    if (next.has(targetId)) {
      next.delete(targetId);
    } else {
      next.add(targetId);
    }
    setSelectedIds(next);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
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
    onBulkDelete(Array.from(selectedIds));
    clearSelection();
  };

  // Auto-scroll the table with a 1-item buffer (keeps next/prev item visible before scrolling)
  useEffect(() => {
    if (focusedIndex >= 0 && rowRefs.current[focusedIndex]) {
      const container = tableContainerRef.current;
      const targetRow = rowRefs.current[focusedIndex];
      if (!container || !targetRow) return;

      const containerRect = container.getBoundingClientRect();
      const rowRect = targetRow.getBoundingClientRect();
      // Use the row's height as the buffer padding (or fallback to ~38px)
      const buffer = rowRect.height || 38;

      // Table sticky header height offset (~33px)
      const thead = container.querySelector('thead');
      const theadHeight = thead ? thead.getBoundingClientRect().height : 33;

      const visibleTop = containerRect.top + theadHeight;
      const visibleBottom = containerRect.bottom;

      // Check if moving down: ensure row + buffer is above bottom edge
      if (rowRect.bottom + buffer > visibleBottom) {
        const overflowBottom = (rowRect.bottom + buffer) - visibleBottom;
        container.scrollBy({ top: overflowBottom, behavior: 'smooth' });
      }
      // Check if moving up: ensure row - buffer is below top sticky header
      else if (rowRect.top - buffer < visibleTop) {
        const overflowTop = visibleTop - (rowRect.top - buffer);
        container.scrollBy({ top: -overflowTop, behavior: 'smooth' });
      }
    }
  }, [focusedIndex]);

  // Keyboard navigation across table rows (Arrows, Enter, Space/x, PageUp/PageDown, Home/End)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input or modal
      const activeEl = document.activeElement;
      if (
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.tagName === 'SELECT' ||
        (activeEl as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (applications.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev < applications.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        // Jump ~8 rows forward
        setFocusedIndex((prev) => Math.min(applications.length - 1, (prev < 0 ? 0 : prev) + 8));
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        // Jump ~8 rows backward
        setFocusedIndex((prev) => Math.max(0, (prev < 0 ? 0 : prev) - 8));
      } else if (e.key === 'Home') {
        e.preventDefault();
        setFocusedIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setFocusedIndex(applications.length - 1);
      } else if (e.key === 'Enter') {
        if (focusedIndex >= 0 && focusedIndex < applications.length) {
          e.preventDefault();
          onSelectApp(applications[focusedIndex]);
        }
      } else if (e.key === ' ' || e.key === 'x') {
        if (focusedIndex >= 0 && focusedIndex < applications.length) {
          e.preventDefault();
          toggleSelectOne(undefined, applications[focusedIndex].id);
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (selectedIds.size > 0) {
          handleBulkDeleteAction();
        } else if (focusedIndex >= 0 && focusedIndex < applications.length) {
          const appToDelete = applications[focusedIndex];
          onBulkDelete([appToDelete.id]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [applications, focusedIndex, selectedIds, onSelectApp]);

  // Keep focusedIndex within bounds if applications change
  useEffect(() => {
    if (focusedIndex >= applications.length) {
      setFocusedIndex(applications.length - 1);
    }
  }, [applications.length, focusedIndex]);

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
      {/* Floating Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50/90 border-b border-blue-200/80 px-4 py-2 flex items-center justify-between gap-3 text-xs text-blue-950 animate-in fade-in slide-in-from-top-1 duration-150 backdrop-blur-xs shrink-0 h-10">
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
              <span>Export CSV</span>
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
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white hover:bg-rose-50 text-rose-700 border border-slate-200 hover:border-rose-200 transition-all shadow-2xs font-medium cursor-pointer"
              title="Delete selected applications (Del)"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
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
      )}

      {/* Main Table */}
      <div className="flex-1 overflow-auto" ref={tableContainerRef}>
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-50/80 border-b border-slate-200/80 sticky top-0 z-10 text-[11px] font-mono text-slate-500 uppercase tracking-wider backdrop-blur-xs">
            <tr>
              <th className="w-10 px-3 py-2.5 text-center">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  aria-label={allSelected ? "Deselect all applications" : "Select all applications"}
                  className="text-slate-400 hover:text-slate-700 align-middle transition-colors cursor-pointer"
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
                const isKeyboardFocused = focusedIndex === index;
                const daysInStage = calculateDaysInStage(app.stageUpdatedAt);

                return (
                  <tr
                    key={app.id}
                    ref={(el) => {
                      rowRefs.current[index] = el;
                    }}
                    onClick={() => {
                      setFocusedIndex(index);
                      onSelectApp(app);
                    }}
                    tabIndex={0}
                    onFocus={() => setFocusedIndex(index)}
                    className={`h-[38px] group cursor-pointer transition-colors outline-hidden ${
                      isCurrentRowActive
                        ? 'bg-blue-50/90 font-medium ring-1 ring-inset ring-blue-300/80'
                        : isKeyboardFocused
                        ? 'bg-blue-50/50 ring-1 ring-inset ring-blue-200'
                        : isSelected
                        ? 'bg-slate-100/70'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-1 text-center align-middle" onClick={(e) => toggleSelectOne(e, app.id)}>
                      <button
                        type="button"
                        aria-label={`Select application for ${app.company}`}
                        className="text-slate-400 hover:text-slate-700 align-middle transition-colors cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <Square className="w-3.5 h-3.5 group-hover:text-slate-500" />
                        )}
                      </button>
                    </td>

                    {/* Company */}
                    <td className="px-3 py-1 font-bold text-slate-900 truncate max-w-[210px] align-middle">
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
                    <td className="px-3 py-1 text-slate-700 font-medium truncate max-w-[220px] align-middle">
                      {app.role}
                    </td>

                    {/* Platform */}
                    <td className="px-3 py-1 align-middle">
                      <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80">
                        {app.platform}
                      </span>
                    </td>

                    {/* Date Applied */}
                    <td className="px-3 py-1 font-mono text-[11px] text-slate-500 align-middle" title={`Applied on ${app.dateApplied}`}>
                      {formatAppDate(app.dateApplied)}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-1 whitespace-nowrap align-middle">
                      <StatusBadge status={app.status} size="sm" />
                    </td>

                    {/* Days in stage */}
                    <td className="px-3 py-1 font-mono text-[11px] text-right pr-6 align-middle">
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
