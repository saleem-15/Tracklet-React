import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
} from 'lucide-react';
import {
  Application,
  SortField,
  SortState,
  ApplicationStatus,
} from '../types';
import { Checkbox } from './Checkbox';
import { StageSelectorDropdown } from './StageSelectorDropdown';
import { CompanyLogo } from './CompanyLogo';
import { EmptyState } from './EmptyState';
import { OnboardingEmptyState } from './OnboardingEmptyState';
import { BulkActionsBar } from './table/BulkActionsBar';
import { BulkDeleteConfirmModal } from './table/BulkDeleteConfirmModal';
import { TableViewBar } from './table/TableViewBar';
import { TablePaginationBar } from './table/TablePaginationBar';
import { RowActions } from './table/RowActions';
import { calculateDaysInStage, formatAppDate } from '../lib/dateUtils';
import { exportApplicationsToCSV } from '../lib/exportCsv';
import { formatSalaryCompact } from '../lib/salaryUtils';
import {
  getLastActivityTimestamp,
  formatRelativeActivity,
  getStageAgingTier,
  STAGE_AGING_STYLES,
} from '../lib/tableUtils';
import { useTableViewPrefs } from '../hooks/useTableViewPrefs';
import { useTablePagination } from '../hooks/useTablePagination';

export interface AllApplicationsTableProps {
  applications: Application[];
  totalAppCount?: number;
  /** Unfiltered list used by the view bar's summary chip counts */
  allApplications?: Application[];
  statusFilter?: ApplicationStatus | 'All' | 'Active';
  onStatusFilterChange?: (status: ApplicationStatus | 'All' | 'Active') => void;
  onOpenAddModal?: () => void;
  onResetFilters?: () => void;
  onSeedDemoData?: () => void;
  selectedAppId: string | null;
  onSelectApp: (app: Application) => void;
  sort: SortState;
  onSortChange: (field: SortField) => void;
  onBulkUpdateStatus: (ids: string[], newStatus: ApplicationStatus) => void;
  onUpdateStatus?: (id: string, newStatus: ApplicationStatus) => void;
  onBulkDelete: (ids: string[]) => void;
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, description?: string) => void;
}

export const AllApplicationsTable: React.FC<AllApplicationsTableProps> = ({
  applications,
  totalAppCount = 0,
  allApplications,
  statusFilter = 'All',
  onStatusFilterChange,
  onOpenAddModal,
  onResetFilters,
  onSeedDemoData,
  selectedAppId,
  onSelectApp,
  sort,
  onSortChange,
  onBulkUpdateStatus,
  onUpdateStatus,
  onBulkDelete,
  onShowToast,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);
  const { prefs, updatePrefs } = useTableViewPrefs();

  // Client-side viewport pagination engine
  const pagination = useTablePagination({
    totalItems: applications.length,
    resetDeps: [statusFilter, sort.field, sort.order],
  });

  const paginatedApplications = useMemo(() => {
    return applications.slice(pagination.startIndex, pagination.endIndex);
  }, [applications, pagination.startIndex, pagination.endIndex]);

  // Reset row focus when navigating pages
  useEffect(() => {
    setFocusedIndex(-1);
  }, [pagination.currentPage]);
  // Prune selectedIds when visible applications change (e.g., search/filter updates)
  // so hidden records are never retained or deleted inadvertently (Issue #52)
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const visibleIds = new Set(applications.map((a) => a.id));
      const next = new Set<string>();
      let changed = false;
      for (const id of prev) {
        if (visibleIds.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [applications]);

  // Close delete confirmation modal if selectedIds becomes empty
  useEffect(() => {
    if (selectedIds.size === 0 && isDeleteConfirmOpen) {
      setIsDeleteConfirmOpen(false);
    }
  }, [selectedIds.size, isDeleteConfirmOpen]);

  // Multi-page selection states
  const isPageAllSelected =
    paginatedApplications.length > 0 &&
    paginatedApplications.every((a) => selectedIds.has(a.id));
  const isPageSomeSelected =
    paginatedApplications.some((a) => selectedIds.has(a.id)) && !isPageAllSelected;

  const headerCheckedState: boolean | 'indeterminate' = isPageAllSelected
    ? true
    : isPageSomeSelected
    ? 'indeterminate'
    : false;

  const toggleSelectAll = () => {
    if (isPageAllSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedApplications.forEach((a) => next.delete(a.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedApplications.forEach((a) => next.add(a.id));
        return next;
      });
    }
  };

  const handleSelectAllMatching = () => {
    setSelectedIds(new Set(applications.map((a) => a.id)));
  };

  const toggleSelectOne = (e?: React.MouseEvent, id?: string) => {
    if (e) e.stopPropagation();
    const targetId = id || (focusedIndex >= 0 && focusedIndex < paginatedApplications.length ? paginatedApplications[focusedIndex].id : undefined);
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
    const ok = exportApplicationsToCSV(selectedApps, 'tracklet_selected_applications');
    if (ok) {
      onShowToast?.('success', 'Export Complete', `Exported ${selectedApps.length} applications to CSV.`);
    } else {
      onShowToast?.('warning', 'Export Empty', 'Select at least one application to export.');
    }
  };

  const handleBulkArchive = () => {
    if (selectedIds.size === 0) return;
    onBulkUpdateStatus(Array.from(selectedIds), 'Archived');
    clearSelection();
  };

  const handleBulkReject = () => {
    if (selectedIds.size === 0) return;
    onBulkUpdateStatus(Array.from(selectedIds), 'Rejected');
    clearSelection();
  };

  const handleBulkDeleteAction = () => {
    if (selectedIds.size === 0) return;
    setIsDeleteConfirmOpen(true);
  };

  const confirmBulkDelete = () => {
    const idsToDelete = Array.from(selectedIds);
    onBulkDelete(idsToDelete);
    clearSelection();
    setIsDeleteConfirmOpen(false);
  };

  const handleRowStatusUpdate = (id: string, newStatus: ApplicationStatus) => {
    if (onUpdateStatus) {
      onUpdateStatus(id, newStatus);
    } else {
      onBulkUpdateStatus([id], newStatus);
    }
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
      // Do not hijack keyboard actions when focused on buttons, links, inputs, or menus
      const target = e.target as HTMLElement | null;
      if (
        target?.closest?.(
          'button, a, input, textarea, select, [role="listbox"], [role="menu"], [aria-haspopup], [contenteditable="true"]'
        )
      ) {
        return;
      }

      // Ignore if typing in input, textarea, select or editable modal
      const activeEl = document.activeElement;
      if (
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.tagName === 'SELECT' ||
        (activeEl as HTMLElement)?.isContentEditable ||
        isDeleteConfirmOpen
      ) {
        return;
      }

      if (paginatedApplications.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev < paginatedApplications.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        // Jump ~8 rows forward
        setFocusedIndex((prev) => Math.min(paginatedApplications.length - 1, (prev < 0 ? 0 : prev) + 8));
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        // Jump ~8 rows backward
        setFocusedIndex((prev) => Math.max(0, (prev < 0 ? 0 : prev) - 8));
      } else if (e.key === 'Home') {
        e.preventDefault();
        setFocusedIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setFocusedIndex(paginatedApplications.length - 1);
      } else if (e.key === 'Enter') {
        if (focusedIndex >= 0 && focusedIndex < paginatedApplications.length) {
          e.preventDefault();
          onSelectApp(paginatedApplications[focusedIndex]);
        }
      } else if (e.key === ' ' || e.key === 'x') {
        if (focusedIndex >= 0 && focusedIndex < paginatedApplications.length) {
          e.preventDefault();
          toggleSelectOne(undefined, paginatedApplications[focusedIndex].id);
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (selectedIds.size > 0) {
          setIsDeleteConfirmOpen(true);
        } else if (focusedIndex >= 0 && focusedIndex < paginatedApplications.length) {
          const appToDelete = paginatedApplications[focusedIndex];
          onBulkDelete([appToDelete.id]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [paginatedApplications, focusedIndex, selectedIds, onSelectApp, isDeleteConfirmOpen, onBulkDelete]);

  // Keep focusedIndex within bounds if paginatedApplications change
  useEffect(() => {
    if (focusedIndex >= paginatedApplications.length) {
      setFocusedIndex(paginatedApplications.length - 1);
    }
  }, [paginatedApplications.length, focusedIndex]);

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

  const renderSortableHeader = (
    label: string,
    field: SortField,
    align: 'left' | 'right' = 'left',
    thClassName = ''
  ) => {
    const isRight = align === 'right';
    const icon = renderSortIcon(field);
    return (
      <th
        aria-sort={sort.field === field ? (sort.order === 'asc' ? 'ascending' : 'descending') : 'none'}
        className={`px-3 py-2.5 font-semibold whitespace-nowrap ${thClassName} ${isRight ? 'text-right' : ''}`}
      >
        <button
          type="button"
          onClick={() => onSortChange(field)}
          aria-label={`Sort by ${label} (${sort.field === field ? sort.order : 'none'})`}
          className={`flex items-center gap-1.5 font-semibold text-slate-500 hover:text-slate-900 group transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 rounded ${isRight ? 'justify-end ml-auto' : ''}`}
        >
          {isRight && icon}
          <span>{label}</span>
          {!isRight && icon}
        </button>
      </th>
    );
  };

  const optionalColumnCount =
    (prefs.showLocation ? 1 : 0) +
    (prefs.showEmploymentType ? 1 : 0) +
    (prefs.showSalary ? 1 : 0) +
    (prefs.showLastActivity ? 1 : 0);
  // checkbox | identity | source | location? | type? | salary? | activity? | applied | status | in stage | actions
  const totalColumnCount = 6 + optionalColumnCount + 1;

  const renderRow = (app: Application, flatIndex: number) => {
    const isSelected = selectedIds.has(app.id);
    const isCurrentRowActive = selectedAppId === app.id;
    const isKeyboardFocused = focusedIndex === flatIndex;
    const daysInStage = calculateDaysInStage(app.stageUpdatedAt);
    const isTerminal = app.status === 'Rejected' || app.status === 'Archived';
    const agingTier = getStageAgingTier(app.status, daysInStage);
    const agingStyle = STAGE_AGING_STYLES[agingTier];
    const lastActivityTs = prefs.showLastActivity ? getLastActivityTimestamp(app) : 0;
    // Exception-based Activity: only show a value when something happened AFTER
    // the last stage change (email logged, task completed, edit). Otherwise the
    // column reads as a dash — divergence from In Stage is the signal.
    const stageUpdatedTs = app.stageUpdatedAt ? new Date(app.stageUpdatedAt).getTime() : 0;
    const hasNewerActivity = Number.isFinite(stageUpdatedTs) && lastActivityTs - stageUpdatedTs > 60_000;

    // One accent per row: the stage pill. Everything else stays in the grayscale
    // hierarchy; terminal rows are muted so active rows pop during a scan.
    const primaryText = isTerminal ? 'text-slate-400' : 'text-slate-900';
    const secondaryText = isTerminal ? 'text-slate-400' : 'text-slate-600';
    const faintText = 'text-slate-300';

    const rowStateClass = isCurrentRowActive
      ? 'bg-blue-50/90 font-medium ring-1 ring-inset ring-blue-300/80'
      : isKeyboardFocused
      ? 'bg-blue-50/50 ring-1 ring-inset ring-blue-200'
      : isSelected
      ? 'bg-slate-100/70'
      : 'bg-white hover:bg-slate-50/80';

    const rowHeightClass = 'h-[54px]';

    return (
      <tr
        key={app.id}
        aria-rowindex={pagination.startIndex + flatIndex + 2}
        ref={(el) => {
          rowRefs.current[flatIndex] = el;
        }}
        onClick={() => {
          const selection = window.getSelection();
          if (selection && !selection.isCollapsed && selection.toString().trim().length > 0) {
            return;
          }
          setFocusedIndex(flatIndex);
          onSelectApp(app);
        }}
        tabIndex={0}
        onFocus={() => setFocusedIndex(flatIndex)}
        className={`${rowHeightClass} group cursor-pointer transition-colors outline-hidden ${rowStateClass}`}
      >
        {/* Checkbox (sticky) */}
        <td
          className="sticky left-0 z-[1] bg-inherit px-3 py-1 text-center align-middle"
          onClick={(e) => toggleSelectOne(e, app.id)}
        >
          <Checkbox
            checked={isSelected}
            onChange={() => toggleSelectOne(null, app.id)}
            ariaLabel={`Select application for ${app.company}`}
          />
        </td>

        {/* Identity: Company — Role (sticky) */}
        <td className={`sticky left-10 z-[1] bg-inherit px-3 py-1.5 align-middle w-[260px] max-w-[270px]`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`shrink-0 ${isTerminal ? 'opacity-50' : ''}`}>
              <CompanyLogo
                company={app.company}
                jobLink={app.jobLink}
                logoUrl={app.logoUrl}
                companyDomain={app.companyDomain}
                size="xs"
              />
            </span>
            <div className="flex flex-col justify-center gap-0.5 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span dir="auto" className={`truncate text-start font-semibold text-[13px] leading-tight ${primaryText}`}>
                  {app.company}
                </span>
                {app.jobLink && (
                  <a
                    href={app.jobLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 -m-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-slate-100 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-colors shrink-0"
                    title="Open job posting link"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span dir="auto" className={`truncate text-start text-xs font-medium leading-tight ${secondaryText}`}>
                  {app.role}
                </span>
              </div>
            </div>
          </div>
        </td>

        {/* Location */}
        {prefs.showLocation && (
          <td className={`w-44 px-3 py-1 align-middle text-xs whitespace-nowrap ${isTerminal ? faintText : secondaryText}`}>
            {(() => {
              const loc = app.location?.trim();
              const workLoc = app.workLocation?.trim();
              if (!loc && !workLoc) return <span className={faintText}>—</span>;
              if (loc && workLoc) {
                if (loc.toLowerCase().includes(workLoc.toLowerCase())) {
                  return (
                    <span dir="auto" className="truncate text-start" title={loc}>
                      {loc}
                    </span>
                  );
                }
                return (
                  <span dir="auto" className="truncate text-start" title={`${loc} · ${workLoc}`}>
                    {loc}
                    <span className="text-slate-300 mx-1">·</span>
                    <span className="text-slate-500 font-medium">{workLoc}</span>
                  </span>
                );
              }
              const single = loc || workLoc;
              return (
                <span dir="auto" className="truncate text-start" title={single}>
                  {single}
                </span>
              );
            })()}
          </td>
        )}

        {/* Status */}
        <td className="px-3 py-1 whitespace-nowrap align-middle" onClick={(e) => e.stopPropagation()}>
          <StageSelectorDropdown
            currentStatus={app.status}
            onSelectStatus={(newStatus) => handleRowStatusUpdate(app.id, newStatus)}
            size="sm"
            variant="badge"
            align="left"
          />
        </td>

        {/* Source: platform the application came through */}
        <td className={`px-3 py-1 align-middle max-w-[110px] text-xs whitespace-nowrap ${isTerminal ? faintText : 'text-slate-500'}`}>
          {app.platform || <span className={faintText}>—</span>}
        </td>

        {/* Salary */}
        {prefs.showSalary && (
          <td className={`w-24 px-3 py-1 align-middle text-xs tabular-nums whitespace-nowrap ${isTerminal ? faintText : secondaryText}`}>
            {app.salary ? (
              <span title={app.salary}>{formatSalaryCompact(app.salary)}</span>
            ) : (
              <span className={faintText} title="Salary not provided">
                —
              </span>
            )}
          </td>
        )}

        {/* Employment type (opt-in via View settings) */}
        {prefs.showEmploymentType && (
          <td className={`w-24 px-3 py-1 align-middle max-w-[90px] text-xs whitespace-nowrap ${isTerminal ? faintText : secondaryText}`}>
            {app.employmentType || <span className={faintText}>—</span>}
          </td>
        )}

        {/* Last activity (only when it diverges from the stage change) */}
        {prefs.showLastActivity && (
          <td className={`w-20 px-3 py-1 align-middle font-mono text-[11px] tabular-nums whitespace-nowrap ${isTerminal ? faintText : 'text-slate-500'}`}>
            {lastActivityTs && hasNewerActivity ? (
              <span title={`Last activity: ${new Date(lastActivityTs).toLocaleString('en-US')}`}>
                {formatRelativeActivity(lastActivityTs)}
              </span>
            ) : (
              <span className={faintText} title={lastActivityTs ? 'No activity since stage change' : 'No tracked activity'}>
                —
              </span>
            )}
          </td>
        )}

        {/* Applied date */}
        <td
          className={`w-[105px] px-3 py-1 align-middle font-mono text-[11px] tabular-nums whitespace-nowrap ${isTerminal ? faintText : 'text-slate-500'}`}
          title={`Applied on ${app.dateApplied}`}
        >
          {formatAppDate(app.dateApplied)}
        </td>

        {/* Days in stage with stage-aware aging bar */}
        <td className="w-24 px-3 py-1 align-middle whitespace-nowrap">
          <span className="inline-flex flex-col items-start gap-1" title={`${daysInStage} days in ${app.status} stage`}>
            <span className={`font-mono text-[11px] tabular-nums leading-none ${agingStyle.text}`}>{daysInStage}d</span>
            <span className={`block h-0.5 w-6 rounded-full ${agingStyle.bar}`} aria-hidden="true" />
          </span>
        </td>

        {/* Hover actions */}
        <td className="px-2 py-1 align-middle text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <RowActions app={app} onUpdateStatus={handleRowStatusUpdate} onShowToast={onShowToast} />
        </td>
      </tr>
    );
  };

  const renderBody = () => {
    if (applications.length === 0) {
      return (
        <tr>
          <td colSpan={totalColumnCount} className="p-0">
            {totalAppCount === 0 && onOpenAddModal && onSeedDemoData ? (
              <OnboardingEmptyState
                onOpenAddModal={onOpenAddModal}
                onSeedDemoData={onSeedDemoData}
                applicationsCount={totalAppCount ?? applications.length}
              />
            ) : (
              <EmptyState
                isFiltered={totalAppCount > 0}
                onAddApplication={onOpenAddModal}
                onResetFilters={onResetFilters}
              />
            )}
          </td>
        </tr>
      );
    }

    return paginatedApplications.map((app, index) => renderRow(app, index));
  };

  return (
    <div className="flex-1 bg-slate-50/60 flex flex-col h-full min-h-0 overflow-hidden relative p-3 sm:p-4 md:p-6 text-slate-900">
      {/* Main Table Framed Card Container */}
      <div className="flex-1 flex flex-col min-h-0 bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden relative">
        {/* View bar: column visibility */}
        <TableViewBar
          prefs={prefs}
          onPrefsChange={updatePrefs}
          visibleRowCount={applications.length}
        />

        {/* Multi-page selection banner */}
        {isPageAllSelected && applications.length > paginatedApplications.length && (
          <div className="bg-blue-50/90 border-b border-blue-100 px-4 py-2 text-xs text-blue-900 flex items-center justify-center gap-2 select-none">
            {selectedIds.size === applications.length ? (
              <span>
                All <strong className="font-semibold text-blue-950">{applications.length}</strong> applications matching filter are selected.{' '}
                <button
                  type="button"
                  onClick={clearSelection}
                  className="font-semibold text-blue-700 hover:text-blue-900 underline ml-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                >
                  Clear selection
                </button>
              </span>
            ) : (
              <span>
                All <strong className="font-semibold text-blue-950">{paginatedApplications.length}</strong> applications on this page are selected.{' '}
                <button
                  type="button"
                  onClick={handleSelectAllMatching}
                  className="font-semibold text-blue-700 hover:text-blue-900 underline ml-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                >
                  Select all {applications.length} applications matching filter
                </button>
              </span>
            )}
          </div>
        )}

        <div className="flex-1 overflow-auto" ref={tableContainerRef}>
          <table
            className="w-full text-left border-collapse text-xs min-w-[880px]"
            aria-rowcount={applications.length + 1}
          >
            <thead className="bg-slate-50/90 border-b border-slate-200/80 sticky top-0 z-10 text-[11px] font-mono text-slate-500 uppercase tracking-wider backdrop-blur-xs select-none">
            <tr>
              <th className="sticky left-0 z-[2] bg-inherit w-10 px-3 py-2.5 text-center">
                <Checkbox
                  checked={headerCheckedState}
                  onCheckedChange={() => toggleSelectAll()}
                  ariaLabel={isPageAllSelected ? 'Deselect all applications on page' : 'Select all applications on page'}
                />
              </th>

              {renderSortableHeader('Company & Role', 'company', 'left', 'w-[260px] max-w-[270px]')}

              {prefs.showLocation && <th className="w-44 px-3 py-2.5 font-semibold whitespace-nowrap">Location</th>}
              {renderSortableHeader('Status', 'status')}
              {renderSortableHeader('Source', 'platform')}
              {prefs.showSalary && renderSortableHeader('Salary', 'salary', 'left', 'w-24')}
              {prefs.showEmploymentType && <th className="w-24 px-3 py-2.5 font-semibold whitespace-nowrap">Type</th>}
              {prefs.showLastActivity && renderSortableHeader('Activity', 'lastActivity', 'left', 'w-20')}

              {renderSortableHeader('Applied', 'dateApplied', 'left', 'w-[105px]')}
              {renderSortableHeader('In Stage', 'daysInStage', 'left', 'w-24')}

              <th className="px-2 py-2.5 font-semibold text-right">
                <span className="sr-only">Row actions</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {renderBody()}
          </tbody>
        </table>
      </div>

        {/* Viewport Pagination Bar */}
        {applications.length > 0 && (
          <TablePaginationBar
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            pageSize={pagination.pageSize}
            displayStart={pagination.displayStart}
            displayEnd={pagination.displayEnd}
            hasNextPage={pagination.hasNextPage}
            hasPrevPage={pagination.hasPrevPage}
            onPageSizeChange={pagination.setPageSize}
            onNextPage={pagination.nextPage}
            onPrevPage={pagination.prevPage}
            onFirstPage={pagination.firstPage}
            onLastPage={pagination.lastPage}
          />
        )}

        {/* Floating bulk actions toast */}
        <BulkActionsBar
          selectedCount={selectedIds.size}
          onExportCSV={handleExportSelectedCSV}
          onArchive={handleBulkArchive}
          onReject={handleBulkReject}
          onDelete={handleBulkDeleteAction}
          onClearSelection={clearSelection}
        />

        {/* Bulk Delete Confirmation Modal */}
        <BulkDeleteConfirmModal
          isOpen={isDeleteConfirmOpen}
          selectedCount={selectedIds.size}
          onConfirm={confirmBulkDelete}
          onCancel={() => setIsDeleteConfirmOpen(false)}
        />
      </div>
    </div>
  );
};
