import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  calculatePagination,
  DEFAULT_PAGE_SIZE,
  ALLOWED_PAGE_SIZES,
  PageSize,
  PaginationResult,
} from '../lib/paginationUtils';

export const PAGE_SIZE_STORAGE_KEY = 'tracklet_table_page_size';

export interface UseTablePaginationOptions {
  totalItems: number;
  initialPage?: number;
  initialPageSize?: PageSize;
  resetDeps?: unknown[];
}

export interface UseTablePaginationReturn extends PaginationResult {
  setPage: (page: number) => void;
  setPageSize: (size: PageSize) => void;
  nextPage: () => void;
  prevPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
  paginate: <T>(items: readonly T[]) => T[];
}

function clampPage(p: number, maxPages: number): number {
  const safeP = Number.isFinite(p) ? Math.floor(p) : 1;
  return Math.min(Math.max(1, safeP), Math.max(1, maxPages));
}

/**
 * useTablePagination
 *
 * Headless hook encapsulating client-side table viewport pagination.
 * Ensures single-source-of-truth bounds, zero-effect clamping, and memoized identities.
 */
export function useTablePagination({
  totalItems,
  initialPage = 1,
  initialPageSize,
  resetDeps,
}: UseTablePaginationOptions): UseTablePaginationReturn {
  // Resolve preferred page size from localStorage or fallback
  const [pageSize, setPageSizeState] = useState<PageSize>(() => {
    if (initialPageSize && ALLOWED_PAGE_SIZES.includes(initialPageSize)) {
      return initialPageSize;
    }
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(PAGE_SIZE_STORAGE_KEY);
        if (stored) {
          const parsed = parseInt(stored, 10);
          if (ALLOWED_PAGE_SIZES.includes(parsed as PageSize)) {
            return parsed as PageSize;
          }
        }
      } catch {
        // Ignore localStorage read errors in restricted contexts
      }
    }
    return DEFAULT_PAGE_SIZE;
  });

  const [page, setPageState] = useState<number>(() => {
    return Math.max(1, Math.floor(Number.isFinite(initialPage) ? initialPage : 1));
  });

  // Calculate current pagination bounds
  const pagination = useMemo(() => {
    return calculatePagination(totalItems, page, pageSize);
  }, [totalItems, page, pageSize]);

  // Adjust state during render if dataset shrunk below current page (React-recommended pattern)
  if (page > pagination.totalPages) {
    setPageState(pagination.totalPages);
  }

  // Reset to page 1 whenever reset dependencies (e.g. status filter, sort) change
  const prevResetDepsRef = useRef<unknown[] | undefined>(resetDeps);
  useEffect(() => {
    if (resetDeps !== undefined && prevResetDepsRef.current !== undefined) {
      const hasChanged =
        resetDeps.length !== prevResetDepsRef.current.length ||
        resetDeps.some((dep, i) => dep !== prevResetDepsRef.current![i]);

      if (hasChanged) {
        setPageState(1);
      }
    }
    prevResetDepsRef.current = resetDeps;
  }, [resetDeps]);

  const setPage = useCallback((targetPage: number) => {
    setPageState((_prev) => clampPage(targetPage, pagination.totalPages));
  }, [pagination.totalPages]);

  const setPageSize = useCallback((newSize: PageSize) => {
    const validSize = ALLOWED_PAGE_SIZES.includes(newSize)
      ? newSize
      : DEFAULT_PAGE_SIZE;
    setPageSizeState(validSize);
    setPageState(1); // Reset to first page when changing page size

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(validSize));
      } catch {
        // Ignore localStorage write errors
      }
    }
  }, []);

  const nextPage = useCallback(() => {
    setPageState((prev) => clampPage(prev + 1, pagination.totalPages));
  }, [pagination.totalPages]);

  const prevPage = useCallback(() => {
    setPageState((prev) => Math.max(1, prev - 1));
  }, []);

  const firstPage = useCallback(() => {
    setPageState(1);
  }, []);

  const lastPage = useCallback(() => {
    setPageState(pagination.totalPages);
  }, [pagination.totalPages]);

  const { startIndex, endIndex } = pagination;
  const paginate = useCallback(
    <T,>(items: readonly T[]): T[] => {
      if (!items || items.length === 0) return [];
      return items.slice(startIndex, endIndex);
    },
    [startIndex, endIndex]
  );

  return useMemo<UseTablePaginationReturn>(
    () => ({
      ...pagination,
      setPage,
      setPageSize,
      nextPage,
      prevPage,
      firstPage,
      lastPage,
      paginate,
    }),
    [
      pagination,
      setPage,
      setPageSize,
      nextPage,
      prevPage,
      firstPage,
      lastPage,
      paginate,
    ]
  );
}
