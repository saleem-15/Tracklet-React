import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  useTablePagination,
  type UseTablePaginationReturn,
  PAGE_SIZE_STORAGE_KEY,
} from '../../src/hooks/useTablePagination';

let host: HTMLDivElement | null = null;
let root: Root | null = null;
let hookResult: UseTablePaginationReturn;

function PaginationHarness({
  totalItems,
  initialPage,
  initialPageSize,
  resetDeps,
}: {
  totalItems: number;
  initialPage?: number;
  initialPageSize?: any;
  resetDeps?: unknown[];
}) {
  hookResult = useTablePagination({ totalItems, initialPage, initialPageSize, resetDeps });
  return null;
}

function mountHarness(
  total: number,
  initialPage?: number,
  initialPageSize?: any,
  resetDeps?: unknown[]
) {
  if (!host) {
    host = document.createElement('div');
    document.body.appendChild(host);
  }
  if (!root) {
    root = createRoot(host);
  }
  act(() => {
    root!.render(
      <PaginationHarness
        totalItems={total}
        initialPage={initialPage}
        initialPageSize={initialPageSize}
        resetDeps={resetDeps}
      />
    );
  });
}

describe('useTablePagination hook', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    if (root) {
      act(() => root!.unmount());
      root = null;
    }
    if (host) {
      host.remove();
      host = null;
    }
    localStorage.clear();
  });

  it('initializes with default page 1 and pageSize 25', () => {
    mountHarness(80);

    expect(hookResult.currentPage).toBe(1);
    expect(hookResult.pageSize).toBe(25);
    expect(hookResult.totalPages).toBe(4);
    expect(hookResult.totalItems).toBe(80);
    expect(hookResult.startIndex).toBe(0);
    expect(hookResult.endIndex).toBe(25);
    expect(hookResult.displayStart).toBe(1);
    expect(hookResult.displayEnd).toBe(25);
    expect(hookResult.hasNextPage).toBe(true);
    expect(hookResult.hasPrevPage).toBe(false);
  });

  it('navigates next, prev, first, and last correctly', () => {
    mountHarness(80);

    // Next page -> 2
    act(() => {
      hookResult.nextPage();
    });
    expect(hookResult.currentPage).toBe(2);
    expect(hookResult.displayStart).toBe(26);
    expect(hookResult.displayEnd).toBe(50);
    expect(hookResult.hasPrevPage).toBe(true);
    expect(hookResult.hasNextPage).toBe(true);

    // Last page -> 4
    act(() => {
      hookResult.lastPage();
    });
    expect(hookResult.currentPage).toBe(4);
    expect(hookResult.displayStart).toBe(76);
    expect(hookResult.displayEnd).toBe(80);
    expect(hookResult.hasNextPage).toBe(false);

    // Prev page -> 3
    act(() => {
      hookResult.prevPage();
    });
    expect(hookResult.currentPage).toBe(3);

    // First page -> 1
    act(() => {
      hookResult.firstPage();
    });
    expect(hookResult.currentPage).toBe(1);
  });

  it('enforces boundary clamping on setPage and nextPage', () => {
    mountHarness(50); // 2 pages

    // Out-of-bounds negative, zero, NaN
    act(() => {
      hookResult.setPage(-5);
    });
    expect(hookResult.currentPage).toBe(1);

    act(() => {
      hookResult.setPage(0);
    });
    expect(hookResult.currentPage).toBe(1);

    act(() => {
      hookResult.setPage(NaN);
    });
    expect(hookResult.currentPage).toBe(1);

    // Beyond max pages
    act(() => {
      hookResult.setPage(999);
    });
    expect(hookResult.currentPage).toBe(2);

    // nextPage at last page stays at last page
    act(() => {
      hookResult.nextPage();
    });
    expect(hookResult.currentPage).toBe(2);
  });

  it('slices array items to match active page window', () => {
    const items = Array.from({ length: 60 }, (_, i) => ({ id: `item-${i}` }));
    mountHarness(items.length);

    const page1 = hookResult.paginate(items);
    expect(page1.length).toBe(25);
    expect(page1[0].id).toBe('item-0');
    expect(page1[24].id).toBe('item-24');

    act(() => {
      hookResult.nextPage();
    });

    const page2 = hookResult.paginate(items);
    expect(page2.length).toBe(25);
    expect(page2[0].id).toBe('item-25');
    expect(page2[24].id).toBe('item-49');

    act(() => {
      hookResult.nextPage();
    });

    const page3 = hookResult.paginate(items);
    expect(page3.length).toBe(10);
    expect(page3[0].id).toBe('item-50');
    expect(page3[9].id).toBe('item-59');
  });

  it('auto-clamps page when totalItems shrinks below active page threshold', () => {
    mountHarness(100);

    // Advance to page 4
    act(() => {
      hookResult.setPage(4);
    });
    expect(hookResult.currentPage).toBe(4);

    // Filter reduces totalItems to 15 (only 1 page of 25)
    mountHarness(15);

    expect(hookResult.totalPages).toBe(1);
    expect(hookResult.currentPage).toBe(1);
    expect(hookResult.displayStart).toBe(1);
    expect(hookResult.displayEnd).toBe(15);
  });

  it('persists preferred pageSize and restores it across unmount and remount', () => {
    mountHarness(120);

    act(() => {
      hookResult.setPageSize(50);
    });
    expect(hookResult.pageSize).toBe(50);
    expect(localStorage.getItem(PAGE_SIZE_STORAGE_KEY)).toBe('50');

    // Unmount and remount fresh instance without initialPageSize
    act(() => {
      root!.unmount();
      root = null;
    });

    mountHarness(120);
    expect(hookResult.pageSize).toBe(50);
  });

  it('resets page to 1 when resetDeps change (e.g. filter/sort change)', () => {
    let filter = 'Applied';
    mountHarness(100, 1, 25, [filter]);

    act(() => {
      hookResult.setPage(3);
    });
    expect(hookResult.currentPage).toBe(3);

    // User changes filter
    filter = 'Interview';
    mountHarness(100, 1, 25, [filter]);

    expect(hookResult.currentPage).toBe(1);
  });
});
