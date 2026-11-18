import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { AllApplicationsTable } from '../../src/components/AllApplicationsTable';
import type { Application, SortState } from '../../src/types';

let host: HTMLDivElement | null = null;
let root: Root | null = null;

function makeApp(id: string, overrides?: Partial<Application>): Application {
  return {
    id,
    userId: 'u1',
    company: `Company ${id}`,
    role: `Software Engineer ${id}`,
    platform: 'LinkedIn',
    dateApplied: '2026-08-01',
    status: 'Applied',
    stageUpdatedAt: '2026-08-01T00:00:00Z',
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
    ...overrides,
  };
}

const defaultSort: SortState = {
  field: 'dateApplied',
  order: 'desc',
};

beforeEach(() => {
  localStorage.clear();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
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

describe('AllApplicationsTable Viewport Pagination', () => {
  it('renders exactly 25 rows on page 1 with landmark and aria semantics', () => {
    const apps = Array.from({ length: 70 }, (_, i) => makeApp(`app-${i + 1}`));

    act(() => {
      root!.render(
        <AllApplicationsTable
          applications={apps}
          selectedAppId={null}
          onSelectApp={vi.fn()}
          sort={defaultSort}
          onSortChange={vi.fn()}
          onBulkUpdateStatus={vi.fn()}
          onBulkDelete={vi.fn()}
        />
      );
    });

    // Check table aria-rowcount (+1 for header)
    const table = host!.querySelector('table');
    expect(table).not.toBeNull();
    expect(table!.getAttribute('aria-rowcount')).toBe('71');

    // Check rows rendered in tbody and their aria-rowindex
    const rows = host!.querySelectorAll('tbody tr');
    expect(rows.length).toBe(25);
    expect(rows[0].getAttribute('aria-rowindex')).toBe('2'); // header is row 1
    expect(rows[24].getAttribute('aria-rowindex')).toBe('26');

    // Verify pagination nav landmark and live region
    const paginationNav = host!.querySelector('nav[aria-label="Table pagination"]');
    expect(paginationNav).not.toBeNull();

    const liveStatus = paginationNav!.querySelector('[role="status"]');
    expect(liveStatus).not.toBeNull();
    expect(liveStatus!.textContent).toContain('1–25');
    expect(liveStatus!.textContent).toContain('70');
  });

  it('navigates to next page and updates visible rows and aria-rowindex', async () => {
    const apps = Array.from({ length: 70 }, (_, i) => makeApp(`app-${i + 1}`));

    act(() => {
      root!.render(
        <AllApplicationsTable
          applications={apps}
          selectedAppId={null}
          onSelectApp={vi.fn()}
          sort={defaultSort}
          onSortChange={vi.fn()}
          onBulkUpdateStatus={vi.fn()}
          onBulkDelete={vi.fn()}
        />
      );
    });

    const nextBtn = host!.querySelector('button[aria-label="Next page"]') as HTMLButtonElement;
    expect(nextBtn).not.toBeNull();
    expect(nextBtn.disabled).toBe(false);

    await act(async () => {
      nextBtn.click();
    });

    // Page 2 should render next 25 rows
    const rows = host!.querySelectorAll('tbody tr');
    expect(rows.length).toBe(25);
    expect(host!.textContent).toContain('Showing');
    expect(host!.textContent).toContain('26–50');
    expect(host!.textContent).toContain('Page 2 of 3');

    // Row 1 on page 2 is item 26 (aria-rowindex 27)
    expect(rows[0].textContent).toContain('Company app-26');
    expect(rows[0].getAttribute('aria-rowindex')).toBe('27');
  });

  it('allows keyboard activation on pagination controls without row hijacking', async () => {
    const apps = Array.from({ length: 70 }, (_, i) => makeApp(`app-${i + 1}`));
    const onSelectApp = vi.fn();

    act(() => {
      root!.render(
        <AllApplicationsTable
          applications={apps}
          selectedAppId={null}
          onSelectApp={onSelectApp}
          sort={defaultSort}
          onSortChange={vi.fn()}
          onBulkUpdateStatus={vi.fn()}
          onBulkDelete={vi.fn()}
        />
      );
    });

    // Focus row 0
    const firstRow = host!.querySelector('tbody tr') as HTMLElement;
    act(() => {
      firstRow.focus();
    });

    // Tab to next-page button in footer
    const nextBtn = host!.querySelector('button[aria-label="Next page"]') as HTMLButtonElement;
    expect(nextBtn).not.toBeNull();
    act(() => {
      nextBtn.focus();
    });

    // Bubbling Enter/Space on a focused button must not reach the row keydown handler
    await act(async () => {
      nextBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    await act(async () => {
      nextBtn.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    });

    // Verify row was NOT selected/opened by row keydown handler
    expect(onSelectApp).not.toHaveBeenCalled();

    // Explicit activation still advances the page
    await act(async () => {
      nextBtn.click();
    });

    // And page advanced
    expect(host!.textContent).toContain('Page 2 of 3');
  });

  it('renders BulkActionsBar offset above TablePaginationBar without visual overlap', async () => {
    const apps = Array.from({ length: 70 }, (_, i) => makeApp(`app-${i + 1}`));

    act(() => {
      root!.render(
        <AllApplicationsTable
          applications={apps}
          selectedAppId={null}
          onSelectApp={vi.fn()}
          sort={defaultSort}
          onSortChange={vi.fn()}
          onBulkUpdateStatus={vi.fn()}
          onBulkDelete={vi.fn()}
        />
      );
    });

    // Select row 1
    const checkboxes = host!.querySelectorAll('tbody button[role="checkbox"]');
    await act(async () => {
      (checkboxes[0] as HTMLButtonElement).click();
    });

    // BulkActionsBar is rendered
    const bulkBar = host!.querySelector('[role="toolbar"][aria-label="Bulk actions for selected applications"]');
    expect(bulkBar).not.toBeNull();

    // Contains elevated bottom-14 offset to clear footer
    expect(bulkBar!.className).toContain('bottom-14');
  });

  it('supports selecting all visible rows on current page and expanding to global selection', async () => {
    const apps = Array.from({ length: 70 }, (_, i) => makeApp(`app-${i + 1}`));

    act(() => {
      root!.render(
        <AllApplicationsTable
          applications={apps}
          selectedAppId={null}
          onSelectApp={vi.fn()}
          sort={defaultSort}
          onSortChange={vi.fn()}
          onBulkUpdateStatus={vi.fn()}
          onBulkDelete={vi.fn()}
        />
      );
    });

    // Click header checkbox to select visible page
    const headerCheckbox = host!.querySelector('thead button[role="checkbox"]') as HTMLButtonElement;
    await act(async () => {
      headerCheckbox.click();
    });

    // 25 items selected in bulk bar
    expect(host!.textContent).toContain('25 selected');

    // Multi-page banner appears
    expect(host!.textContent).toContain('All 25 applications on this page are selected.');
    expect(host!.textContent).toContain('Select all 70 applications matching filter');

    // Click "Select all 70 applications matching filter"
    const selectAllBtn = Array.from(host!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Select all 70 applications')
    );
    expect(selectAllBtn).toBeDefined();

    await act(async () => {
      selectAllBtn!.click();
    });

    // Now all 70 items are selected
    expect(host!.textContent).toContain('70 selected');
    expect(host!.textContent).toContain('All 70 applications matching filter are selected.');
  });

  it('auto-clamps to page 1 when filtering reduces results below current page threshold', async () => {
    const apps = Array.from({ length: 70 }, (_, i) => makeApp(`app-${i + 1}`));

    act(() => {
      root!.render(
        <AllApplicationsTable
          applications={apps}
          selectedAppId={null}
          onSelectApp={vi.fn()}
          sort={defaultSort}
          onSortChange={vi.fn()}
          onBulkUpdateStatus={vi.fn()}
          onBulkDelete={vi.fn()}
        />
      );
    });

    // Advance to page 3 (items 51-70)
    const nextBtn = host!.querySelector('button[aria-label="Next page"]') as HTMLButtonElement;
    await act(async () => {
      nextBtn.click();
    });
    await act(async () => {
      nextBtn.click();
    });
    expect(host!.textContent).toContain('Page 3 of 3');

    // Filter applied: only 5 apps match
    const filteredApps = apps.slice(0, 5);
    act(() => {
      root!.render(
        <AllApplicationsTable
          applications={filteredApps}
          selectedAppId={null}
          onSelectApp={vi.fn()}
          sort={defaultSort}
          onSortChange={vi.fn()}
          onBulkUpdateStatus={vi.fn()}
          onBulkDelete={vi.fn()}
        />
      );
    });

    // Should auto-clamp back to Page 1 of 1 with 5 items
    expect(host!.textContent).toContain('Page 1 of 1');
    expect(host!.textContent).toContain('1–5');
    const rows = host!.querySelectorAll('tbody tr');
    expect(rows.length).toBe(5);
  });
});
