/**
 * Pagination Utility Functions
 *
 * Pure mathematical boundary and slicing calculations for viewport pagination.
 * Ensures zero-cost, memory-efficient windowing over in-memory datasets.
 */

export interface PaginationResult {
  currentPage: number;
  pageSize: PageSize;
  totalPages: number;
  totalItems: number;
  startIndex: number; // 0-based inclusive index
  endIndex: number; // 0-based exclusive index
  displayStart: number; // 1-based display number for UI
  displayEnd: number; // 1-based display number for UI
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export const DEFAULT_PAGE_SIZE = 25;
export const ALLOWED_PAGE_SIZES = [25, 50, 100] as const;
export type PageSize = typeof ALLOWED_PAGE_SIZES[number];

/**
 * Calculates deterministic pagination bounds given total items, target page, and page size.
 * Handles boundary edge cases gracefully (zero items, negative numbers, out-of-bounds pages).
 */
export function calculatePagination(
  totalItems: number,
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE
): PaginationResult {
  const safeTotalItems = Math.max(0, Math.floor(Number.isFinite(totalItems) ? totalItems : 0));
  const safePageSize: PageSize =
    pageSize > 0 && Number.isFinite(pageSize) && ALLOWED_PAGE_SIZES.includes(pageSize as PageSize)
      ? (pageSize as PageSize)
      : DEFAULT_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(safeTotalItems / safePageSize));
  
  // Clamp page between 1 and totalPages
  const requestedPage = Number.isFinite(page) ? Math.floor(page) : 1;
  const currentPage = Math.min(Math.max(1, requestedPage), totalPages);

  const startIndex = safeTotalItems === 0 ? 0 : (currentPage - 1) * safePageSize;
  const endIndex = Math.min(startIndex + safePageSize, safeTotalItems);

  const displayStart = safeTotalItems === 0 ? 0 : startIndex + 1;
  const displayEnd = endIndex;

  return {
    currentPage,
    pageSize: safePageSize,
    totalPages,
    totalItems: safeTotalItems,
    startIndex,
    endIndex,
    displayStart,
    displayEnd,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
}

/**
 * Returns a windowed slice of the input array according to the pagination bounds.
 */
export function paginateSlice<T>(
  items: T[],
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE
): T[] {
  if (!items || items.length === 0) return [];
  const { startIndex, endIndex } = calculatePagination(items.length, page, pageSize);
  return items.slice(startIndex, endIndex);
}
