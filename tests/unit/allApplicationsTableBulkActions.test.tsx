import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { AllApplicationsTable } from '../../src/components/AllApplicationsTable';
import { Sidebar } from '../../src/components/Sidebar';
import { AppProviders } from '../../src/context/AppProviders';
import type { Application, Contact, SortState } from '../../src/types';

let host: HTMLDivElement | null = null;
let root: Root | null = null;

function makeApp(id: string, overrides?: Partial<Application>): Application {
  return {
    id,
    userId: 'u1',
    company: `Company ${id}`,
    role: 'Software Engineer',
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
});

describe('Navigation UX Standards: Action-Only Badge Hierarchy in Sidebar', () => {
  it('renders All Applications and Active Pipeline as clean navigation tabs without static inventory count pills', () => {
    const apps: Application[] = [
      ...Array.from({ length: 23 }, (_, i) => makeApp(`app-${i}`, { status: 'Applied' })),
      makeApp('app-archived-1', { status: 'Archived' }),
      makeApp('app-archived-2', { status: 'Archived' }),
    ];

    act(() => {
      root!.render(
        <AppProviders>
          <Sidebar applications={apps} />
        </AppProviders>
      );
    });

    const allAppsButton = host!.querySelector('button[title="All Applications"]');
    expect(allAppsButton).not.toBeNull();
    // Raw inventory number (e.g. 25 or 23) must NOT be displayed on the persistent nav tab
    expect(allAppsButton!.querySelector('.font-mono')).toBeNull();
    expect(allAppsButton!.textContent).toBe('All Applications');

    const pipelineButton = host!.querySelector('button[title="Active Pipeline"]');
    expect(pipelineButton).not.toBeNull();
    // Active pipeline count (e.g. 23) must NOT be displayed on the persistent nav tab
    expect(pipelineButton!.querySelector('.font-mono')).toBeNull();
    expect(pipelineButton!.textContent).toBe('Active Pipeline');
  });

  it('renders action alert badge on Contacts only when follow-ups are due soon, with zero static inventory clutter', () => {
    // 2 contacts, none due soon
    const contactsClean: Contact[] = [
      {
        id: 'c1',
        userId: 'u1',
        name: 'Sarah Connor',
        category: 'Recruiter',
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-01T00:00:00Z',
      },
    ];

    act(() => {
      root!.render(
        <AppProviders>
          <Sidebar contacts={contactsClean} />
        </AppProviders>
      );
    });

    const contactsButton = host!.querySelector('button[title="Contacts & Mentors"]');
    expect(contactsButton).not.toBeNull();
    // No static inventory count (e.g. "1") on contacts tab when up to date
    expect(contactsButton!.querySelector('.font-mono')).toBeNull();
    expect(contactsButton!.textContent).toBe('Contacts');
  });
});

describe('Bulk Actions Bar Actions (Archive, Reject, Export CSV, Delete)', () => {
  it('renders BulkActionsBar with standard actions and updates status on Archive/Reject', async () => {
    const apps: Application[] = [
      makeApp('app-1', { company: 'Google', status: 'Applied' }),
      makeApp('app-2', { company: 'Meta', status: 'Applied' }),
    ];

    const onBulkUpdateStatus = vi.fn();
    const onBulkDelete = vi.fn();
    const onSelectApp = vi.fn();
    const onSortChange = vi.fn();

    act(() => {
      root!.render(
        <AllApplicationsTable
          applications={apps}
          selectedAppId={null}
          onSelectApp={onSelectApp}
          sort={defaultSort}
          onSortChange={onSortChange}
          onBulkUpdateStatus={onBulkUpdateStatus}
          onBulkDelete={onBulkDelete}
        />
      );
    });

    // Bulk bar not visible initially
    expect(host!.textContent).not.toContain('Bulk actions:');

    // Select first row checkbox
    const checkboxes = host!.querySelectorAll('tbody button[role="checkbox"]');
    expect(checkboxes.length).toBe(2);

    await act(async () => {
      (checkboxes[0] as HTMLButtonElement).click();
    });

    // Bulk bar is now visible
    expect(host!.textContent).toContain('1 selected');
    expect(host!.textContent).toContain('Bulk actions:');

    // Archive button is present
    const archiveBtn = Array.from(host!.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Archive')
    );
    expect(archiveBtn).toBeDefined();

    // Click "Archive"
    await act(async () => {
      archiveBtn!.click();
    });

    // Verify onBulkUpdateStatus was called with ['app-1'] and 'Archived'
    expect(onBulkUpdateStatus).toHaveBeenCalledTimes(1);
    expect(onBulkUpdateStatus).toHaveBeenCalledWith(['app-1'], 'Archived');

    // Selection should be cleared after archive
    expect(host!.textContent).not.toContain('Bulk actions:');
  });
});

describe('Issue #52: Pruning Stale Hidden Search Records & Bulk Delete Confirmation Modal', () => {
  it('prunes selectedIds when search filters hide previously selected records', async () => {
    const app1 = makeApp('app-1', { company: 'Google' });
    const app2 = makeApp('app-2', { company: 'Apple' });

    const onBulkDelete = vi.fn();
    const onBulkUpdateStatus = vi.fn();

    // Render initially with both apps visible
    act(() => {
      root!.render(
        <AllApplicationsTable
          applications={[app1, app2]}
          selectedAppId={null}
          onSelectApp={vi.fn()}
          sort={defaultSort}
          onSortChange={vi.fn()}
          onBulkUpdateStatus={onBulkUpdateStatus}
          onBulkDelete={onBulkDelete}
        />
      );
    });

    // Select row 2 (Apple)
    const checkboxes = host!.querySelectorAll('tbody button[role="checkbox"]');
    await act(async () => {
      (checkboxes[1] as HTMLButtonElement).click();
    });

    expect(host!.textContent).toContain('1 selected');

    // Simulate search query "Google" - applications prop updates to only [app1]
    act(() => {
      root!.render(
        <AllApplicationsTable
          applications={[app1]}
          selectedAppId={null}
          onSelectApp={vi.fn()}
          sort={defaultSort}
          onSortChange={vi.fn()}
          onBulkUpdateStatus={onBulkUpdateStatus}
          onBulkDelete={onBulkDelete}
        />
      );
    });

    // Because app-2 is now hidden by search, selectedIds is pruned and bulk bar hides
    expect(host!.textContent).not.toContain('1 selected');
    expect(host!.textContent).not.toContain('Bulk actions:');
  });

  it('prompts with BulkDeleteConfirmModal before deleting selected items and cancels on request', async () => {
    const apps: Application[] = [
      makeApp('app-1', { company: 'Google' }),
      makeApp('app-2', { company: 'Apple' }),
    ];

    const onBulkDelete = vi.fn();

    act(() => {
      root!.render(
        <AllApplicationsTable
          applications={apps}
          selectedAppId={null}
          onSelectApp={vi.fn()}
          sort={defaultSort}
          onSortChange={vi.fn()}
          onBulkUpdateStatus={vi.fn()}
          onBulkDelete={onBulkDelete}
        />
      );
    });

    // Select all applications via the header checkbox
    const headerCheckbox = host!.querySelector('thead button[role="checkbox"]') as HTMLButtonElement;
    await act(async () => {
      headerCheckbox.click();
    });

    expect(host!.textContent).toContain('2 selected');

    // Find Delete button in BulkActionsBar
    const deleteBtn = Array.from(host!.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Delete' && b.title?.includes('Delete')
    );
    expect(deleteBtn).toBeDefined();

    // Click Delete in BulkActionsBar
    await act(async () => {
      deleteBtn!.click();
    });

    // Deletion should NOT happen immediately
    expect(onBulkDelete).not.toHaveBeenCalled();

    // Confirmation modal should now be visible
    const modalDialog = host!.querySelector('[role="dialog"]');
    expect(modalDialog).not.toBeNull();
    expect(modalDialog!.textContent).toContain('Delete 2 Applications?');

    // Click Cancel in modal
    const cancelBtn = Array.from(modalDialog!.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Cancel'
    );
    await act(async () => {
      cancelBtn!.click();
    });

    // Modal should close and delete must NOT have been called
    expect(host!.querySelector('[role="dialog"]')).toBeNull();
    expect(onBulkDelete).not.toHaveBeenCalled();
    // Selection remains intact
    expect(host!.textContent).toContain('2 selected');
  });

  it('executes bulk delete with confirmed records and clears selection when confirmed', async () => {
    const apps: Application[] = [
      makeApp('app-1', { company: 'Google' }),
      makeApp('app-2', { company: 'Apple' }),
    ];

    const onBulkDelete = vi.fn();

    act(() => {
      root!.render(
        <AllApplicationsTable
          applications={apps}
          selectedAppId={null}
          onSelectApp={vi.fn()}
          sort={defaultSort}
          onSortChange={vi.fn()}
          onBulkUpdateStatus={vi.fn()}
          onBulkDelete={onBulkDelete}
        />
      );
    });

    // Select row 1 (Google)
    const checkboxes = host!.querySelectorAll('tbody button[role="checkbox"]');
    await act(async () => {
      (checkboxes[0] as HTMLButtonElement).click();
    });

    // Click Delete in BulkActionsBar
    const deleteBtn = Array.from(host!.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Delete' && b.title?.includes('Delete')
    );
    await act(async () => {
      deleteBtn!.click();
    });

    const modalDialog = host!.querySelector('[role="dialog"]');
    expect(modalDialog).not.toBeNull();
    expect(modalDialog!.textContent).toContain('Delete 1 Application?');

    // Click Delete in the confirmation modal
    const modalConfirmBtn = Array.from(modalDialog!.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Delete'
    );
    await act(async () => {
      modalConfirmBtn!.click();
    });

    // Verify onBulkDelete was called with ['app-1']
    expect(onBulkDelete).toHaveBeenCalledTimes(1);
    expect(onBulkDelete).toHaveBeenCalledWith(['app-1']);

    // Modal is closed and selection cleared
    expect(host!.querySelector('[role="dialog"]')).toBeNull();
    expect(host!.textContent).not.toContain('Bulk actions:');
  });

  it('dismisses BulkDeleteConfirmModal on Escape key', async () => {
    const apps: Application[] = [makeApp('app-1', { company: 'Google' })];
    const onBulkDelete = vi.fn();

    act(() => {
      root!.render(
        <AllApplicationsTable
          applications={apps}
          selectedAppId={null}
          onSelectApp={vi.fn()}
          sort={defaultSort}
          onSortChange={vi.fn()}
          onBulkUpdateStatus={vi.fn()}
          onBulkDelete={onBulkDelete}
        />
      );
    });

    // Select row 1
    const checkbox = host!.querySelector('tbody button[role="checkbox"]') as HTMLButtonElement;
    await act(async () => {
      checkbox.click();
    });

    // Open delete modal
    const deleteBtn = Array.from(host!.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Delete' && b.title?.includes('Delete')
    );
    await act(async () => {
      deleteBtn!.click();
    });

    expect(host!.querySelector('[role="dialog"]')).not.toBeNull();

    // Press Escape
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    // Modal should close without deleting
    expect(host!.querySelector('[role="dialog"]')).toBeNull();
    expect(onBulkDelete).not.toHaveBeenCalled();
  });
});
