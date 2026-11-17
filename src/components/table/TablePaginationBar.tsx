import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { IconButton } from '../IconButton';
import { CustomSelectDropdown, SelectOption } from '../CustomSelectDropdown';
import { ALLOWED_PAGE_SIZES, PageSize } from '../../lib/paginationUtils';

export interface TablePaginationBarProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: PageSize;
  displayStart: number;
  displayEnd: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onPageSizeChange: (size: PageSize) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  onFirstPage: () => void;
  onLastPage: () => void;
  className?: string;
}

const PAGE_SIZE_OPTIONS: SelectOption<PageSize>[] = ALLOWED_PAGE_SIZES.map((size) => ({
  label: `${size} / page`,
  value: size,
}));

/**
 * TablePaginationBar
 *
 * Dedicated viewport pagination controls anchored to the footer of AllApplicationsTable.
 * Adheres to Tracklet's canonical primitives, WCAG AA contrast standards, landmark semantics, and touch ergonomics.
 */
export const TablePaginationBar: React.FC<TablePaginationBarProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  displayStart,
  displayEnd,
  hasNextPage,
  hasPrevPage,
  onPageSizeChange,
  onNextPage,
  onPrevPage,
  onFirstPage,
  onLastPage,
  className = '',
}) => {
  return (
    <nav
      aria-label="Table pagination"
      className={`border-t border-slate-200/80 bg-slate-50/95 px-3.5 py-2 flex flex-wrap items-center justify-between gap-3 text-xs select-none backdrop-blur-xs ${className}`}
      data-testid="table-pagination-bar"
    >
      {/* Left: Range and total summary */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]"
      >
        {totalItems > 0 ? (
          <>
            <span>Showing</span>
            <span className="font-semibold text-slate-800 tabular-nums">
              {displayStart}–{displayEnd}
            </span>
            <span>of</span>
            <span className="font-semibold text-slate-800 tabular-nums">
              {totalItems}
            </span>
            <span>applications</span>
          </>
        ) : (
          <span>No matching applications</span>
        )}
      </div>

      {/* Right: Controls cluster */}
      <div className="flex items-center gap-4 ml-auto">
        {/* Page size selector */}
        <div className="flex items-center gap-1.5">
          <span
            id="rows-per-page-label"
            className="text-slate-500 text-[11px] font-mono sr-only sm:not-sr-only"
          >
            Rows:
          </span>
          <CustomSelectDropdown<PageSize>
            value={pageSize}
            onChange={onPageSizeChange}
            options={PAGE_SIZE_OPTIONS}
            size="sm"
            variant="subtle"
            menuPlacement="up"
            ariaLabelledBy="rows-per-page-label"
            className="w-[96px]"
          />
        </div>

        {/* Page counter & Navigation buttons */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono text-slate-500 mr-1.5">
            Page{' '}
            <span className="font-semibold text-slate-800 tabular-nums">
              {currentPage}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-slate-800 tabular-nums">
              {totalPages}
            </span>
          </span>

          <IconButton
            icon={ChevronsLeft}
            size="sm"
            title="First page"
            disabled={!hasPrevPage}
            onClick={onFirstPage}
            data-testid="pagination-first-page"
          />
          <IconButton
            icon={ChevronLeft}
            size="sm"
            title="Previous page"
            disabled={!hasPrevPage}
            onClick={onPrevPage}
            data-testid="pagination-prev-page"
          />
          <IconButton
            icon={ChevronRight}
            size="sm"
            title="Next page"
            disabled={!hasNextPage}
            onClick={onNextPage}
            data-testid="pagination-next-page"
          />
          <IconButton
            icon={ChevronsRight}
            size="sm"
            title="Last page"
            disabled={!hasNextPage}
            onClick={onLastPage}
            data-testid="pagination-last-page"
          />
        </div>
      </div>
    </nav>
  );
};
