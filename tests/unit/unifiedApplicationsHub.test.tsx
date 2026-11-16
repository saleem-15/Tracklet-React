import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Sidebar } from '../../src/components/Sidebar';
import { TopBar } from '../../src/components/TopBar';
import { WorkspaceContent } from '../../src/components/layout/WorkspaceContent';
import { AppProviders } from '../../src/context';
import { NavigationContext, NavigationContextType } from '../../src/context/NavigationContext';
import { ApplicationsContext, ApplicationsContextType } from '../../src/context/ApplicationsContext';
import { Application, FilterState, ApplicationLayout } from '../../src/types';
import { AllApplicationsTable } from '../../src/components/AllApplicationsTable';
import { readUrlState } from '../../src/lib/routeUtils';
import { useUrlNavigation } from '../../src/hooks/useUrlNavigation';

function makeApp(id: string, overrides: Partial<Application> = {}): Application {
  return {
    id,
    userId: 'user-1',
    company: 'Test Company',
    role: 'Frontend Engineer',
    location: 'Remote',
    platform: 'LinkedIn',
    status: 'Applied',
    dateApplied: new Date().toISOString().slice(0, 10),
    stageUpdatedAt: new Date().toISOString(),
    notes: '',
    workLocation: 'Remote',
    employmentType: 'Full-time',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('Unified Applications Hub: Routing, Toolbar, and Canvas Wiring', () => {
  let host: HTMLDivElement | null = null;
  let root: Root | null = null;

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
    vi.restoreAllMocks();
  });

  it('renders a single unified Applications navigation item in Sidebar', () => {
    const apps: Application[] = [
      makeApp('app-1', { status: 'Applied' }),
      makeApp('app-2', { status: 'Screening' }),
    ];

    act(() => {
      root!.render(
        <AppProviders>
          <Sidebar applications={apps} />
        </AppProviders>
      );
    });

    // Unified Applications tab exists
    const appsButton = host!.querySelector('button[title="Applications"]');
    expect(appsButton).not.toBeNull();
    expect(appsButton!.textContent).toContain('Applications');

    // Legacy separated tabs do not exist in the sidebar
    expect(host!.querySelector('button[title="All Applications"]')).toBeNull();
    expect(host!.querySelector('button[title="Active Pipeline"]')).toBeNull();
  });

  it('renders TopBar with search, status selector, layout switcher, and Add Job CTA', () => {
    const mockFilter: FilterState = {
      search: '',
      platform: 'All',
      status: 'Active',
      workLocation: 'All',
      employmentType: 'All',
      dateRange: 'all',
    };
    const setFilter = vi.fn();
    const onOpenAddModal = vi.fn();
    const onLayoutChange = vi.fn();

    act(() => {
      root!.render(
        <AppProviders>
          <TopBar
            filter={mockFilter}
            setFilter={setFilter}
            onOpenAddModal={onOpenAddModal}
            totalFilteredCount={4}
            layout="board"
            onLayoutChange={onLayoutChange}
          />
        </AppProviders>
      );
    });

    // 1. Search input with ⌘K badge
    const searchInput = host!.querySelector('input[placeholder="Search jobs..."]') as HTMLInputElement;
    expect(searchInput).not.toBeNull();
    expect(host!.textContent).toContain('⌘K');

    // 2. Status filter chip in unified FilterToolbar
    expect(host!.textContent).toContain('Status');
    expect(host!.textContent).toContain('Active Only');

    // 3. Layout switcher SegmentedTabs (Board ⇄ Table)
    const boardTab = host!.querySelector('button[role="tab"][aria-label="Board layout"]');
    const tableTab = host!.querySelector('button[role="tab"][aria-label="Table layout"]');
    expect(boardTab).not.toBeNull();
    expect(tableTab).not.toBeNull();
    expect(boardTab!.getAttribute('aria-selected')).toBe('true');
    expect(tableTab!.getAttribute('aria-selected')).toBe('false');

    // 4. Primary CTA
    const addJobBtn = Array.from(host!.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Add Job')
    );
    expect(addJobBtn).toBeDefined();

    // Clicking Add Job triggers onOpenAddModal
    act(() => {
      addJobBtn!.click();
    });
    expect(onOpenAddModal).toHaveBeenCalledTimes(1);

    // Clicking Table tab switches layout
    act(() => {
      (tableTab as HTMLButtonElement).click();
    });
    expect(onLayoutChange).toHaveBeenCalledWith('table');
  });

  it('auto-switches layout to table when Archived or Rejected status is selected in TopBar', () => {
    let currentFilter: FilterState = {
      search: '',
      platform: 'All',
      status: 'Active',
      workLocation: 'All',
      employmentType: 'All',
      dateRange: 'all',
    };
    let currentLayout: ApplicationLayout = 'board';

    const setFilter = vi.fn().mockImplementation((updater) => {
      currentFilter = typeof updater === 'function' ? updater(currentFilter) : updater;
    });
    const onLayoutChange = vi.fn().mockImplementation((layout) => {
      currentLayout = layout;
    });

    const mockNav: Partial<NavigationContextType> = {
      filter: currentFilter,
      setFilter: setFilter as any,
      layout: currentLayout,
      setLayout: onLayoutChange,
      openAddModal: vi.fn(),
      openMobileSidebar: vi.fn(),
      activeTab: 'all',
      isNotFound: false,
    };

    act(() => {
      root!.render(
        <AppProviders>
          <NavigationContext.Provider value={mockNav as NavigationContextType}>
            <TopBar
              filter={currentFilter}
              setFilter={setFilter}
              layout={currentLayout}
              onLayoutChange={onLayoutChange}
              totalFilteredCount={2}
            />
          </NavigationContext.Provider>
        </AppProviders>
      );
    });

    // Find and open unified Filter menu
    const filterBtn = host!.querySelector('button[data-filter-trigger]') as HTMLButtonElement;
    expect(filterBtn).not.toBeNull();

    act(() => {
      filterBtn.click();
    });

    // Pick Status field
    const statusRow = Array.from(host!.querySelectorAll('button[data-row]')).find(
      (b) => b.getAttribute('data-row') === 'status'
    ) as HTMLButtonElement;
    expect(statusRow).toBeDefined();

    act(() => {
      statusRow.click();
    });

    // Select Archived option
    const archivedOption = Array.from(host!.querySelectorAll('button[data-row]')).find(
      (b) => b.getAttribute('data-row') === 'Archived'
    ) as HTMLButtonElement;
    expect(archivedOption).toBeDefined();

    act(() => {
      archivedOption.click();
    });

    expect(setFilter).toHaveBeenCalled();
    expect(onLayoutChange).toHaveBeenCalledWith('table');
  });

  it('renders ArchiveRoutingBanner in WorkspaceContent when viewing Archived or Rejected status', () => {
    const apps: Application[] = [
      makeApp('app-archived-1', { status: 'Archived', company: 'Past Corp' }),
    ];

    const setLayout = vi.fn();
    const setFilter = vi.fn();

    const mockNav: Partial<NavigationContextType> = {
      activeTab: 'all',
      isNotFound: false,
      filter: {
        search: '',
        platform: 'All',
        status: 'Archived',
        workLocation: 'All',
        employmentType: 'All',
        dateRange: 'all',
      },
      setFilter: setFilter as any,
      layout: 'table',
      setLayout,
      selectedAppId: null,
      setSelectedAppId: vi.fn(),
      openAddModal: vi.fn(),
      resetFilters: vi.fn(),
      openMobileSidebar: vi.fn(),
      openOnboardingModal: vi.fn(),
    };

    const mockApps: Partial<ApplicationsContextType> = {
      applications: apps,
      filteredApplications: apps,
      filteredAndSortedApplications: apps,
      duplicateCount: 0,
      isDuplicateBannerDismissed: true,
      sort: { field: 'dateApplied', order: 'desc' },
      handleSortChange: vi.fn(),
      handleBulkUpdateStatus: vi.fn(),
      handleBulkDelete: vi.fn(),
      handleUpdatePipelineStatus: vi.fn(),
      handleSeedDemoData: vi.fn(),
    };

    act(() => {
      root!.render(
        <AppProviders>
          <NavigationContext.Provider value={mockNav as NavigationContextType}>
            <ApplicationsContext.Provider value={mockApps as ApplicationsContextType}>
              <WorkspaceContent />
            </ApplicationsContext.Provider>
          </NavigationContext.Provider>
        </AppProviders>
      );
    });

    // Banner is rendered
    expect(host!.textContent).toContain('Viewing Archived Applications');
    expect(host!.textContent).toContain('Automatically switched to Table layout');

    // Click "Back to Active Board"
    const backBtn = Array.from(host!.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Back to Active Board')
    );
    expect(backBtn).toBeDefined();

    act(() => {
      backBtn!.click();
    });

    expect(setFilter).toHaveBeenCalled();
    expect(setLayout).toHaveBeenCalledWith('board');
  });

  it('renders ActivePipelineBoard when layout is board and AllApplicationsTable when layout is table', () => {
    const apps: Application[] = [
      makeApp('app-1', { status: 'Applied', company: 'Google' }),
      makeApp('app-2', { status: 'Interview', company: 'Meta' }),
    ];

    const mockApps: Partial<ApplicationsContextType> = {
      applications: apps,
      filteredApplications: apps,
      filteredAndSortedApplications: apps,
      duplicateCount: 0,
      isDuplicateBannerDismissed: true,
      sort: { field: 'dateApplied', order: 'desc' },
      handleSortChange: vi.fn(),
      handleBulkUpdateStatus: vi.fn(),
      handleBulkDelete: vi.fn(),
      handleUpdatePipelineStatus: vi.fn(),
      handleSeedDemoData: vi.fn(),
    };

    // 1. Board Layout
    const mockNavBoard: Partial<NavigationContextType> = {
      activeTab: 'all',
      isNotFound: false,
      filter: {
        search: '',
        platform: 'All',
        status: 'Active',
        workLocation: 'All',
        employmentType: 'All',
        dateRange: 'all',
      },
      setFilter: vi.fn(),
      layout: 'board',
      setLayout: vi.fn(),
      selectedAppId: null,
      setSelectedAppId: vi.fn(),
      openAddModal: vi.fn(),
      resetFilters: vi.fn(),
      openMobileSidebar: vi.fn(),
      openOnboardingModal: vi.fn(),
    };

    act(() => {
      root!.render(
        <AppProviders>
          <NavigationContext.Provider value={mockNavBoard as NavigationContextType}>
            <ApplicationsContext.Provider value={mockApps as ApplicationsContextType}>
              <WorkspaceContent />
            </ApplicationsContext.Provider>
          </NavigationContext.Provider>
        </AppProviders>
      );
    });

    // Kanban stage columns (Saved, Applied, Screening, Interview, Offer) are present in board
    expect(host!.textContent).toContain('Saved');
    expect(host!.textContent).toContain('Applied');
    expect(host!.textContent).toContain('Interview');
    expect(host!.textContent).toContain('Offer');

    // 2. Switch to Table Layout
    const mockNavTable: Partial<NavigationContextType> = {
      ...mockNavBoard,
      layout: 'table',
    };

    act(() => {
      root!.render(
        <AppProviders>
          <NavigationContext.Provider value={mockNavTable as NavigationContextType}>
            <ApplicationsContext.Provider value={mockApps as ApplicationsContextType}>
              <WorkspaceContent />
            </ApplicationsContext.Provider>
          </NavigationContext.Provider>
        </AppProviders>
      );
    });

    // Table headers (Company, Position, Stage, Date Applied, etc.) are present
    expect(host!.querySelector('table')).not.toBeNull();
    expect(host!.textContent).toContain('Google');
    expect(host!.textContent).toContain('Meta');
  });

  it('enforces table layout when status is Archived, Rejected, or any specific stage even if layout=board is in URL (smart routing edge case)', () => {
    window.history.pushState(null, '', '/applications?status=Archived&layout=board');
    const stateArchived = readUrlState();
    expect(stateArchived.filter.status).toBe('Archived');
    expect(stateArchived.layout).toBe('table');

    window.history.pushState(null, '', '/applications?status=Rejected&layout=board');
    const stateRejected = readUrlState();
    expect(stateRejected.filter.status).toBe('Rejected');
    expect(stateRejected.layout).toBe('table');

    window.history.pushState(null, '', '/applications?status=Interview&layout=board');
    const stateInterview = readUrlState();
    expect(stateInterview.filter.status).toBe('Interview');
    expect(stateInterview.layout).toBe('table');
  });

  it('resets status to Active when switching to Board layout from Archived or Rejected', () => {
    const mockFilter: FilterState = {
      search: '',
      platform: 'All',
      status: 'Archived',
      workLocation: 'All',
      employmentType: 'All',
      dateRange: 'all',
    };
    const setFilter = vi.fn();
    const onLayoutChange = vi.fn();

    act(() => {
      root!.render(
        <AppProviders>
          <TopBar
            filter={mockFilter}
            setFilter={setFilter}
            layout="table"
            onLayoutChange={onLayoutChange}
            totalFilteredCount={1}
          />
        </AppProviders>
      );
    });

    const boardTab = host!.querySelector('button[role="tab"][aria-label="Board layout"]') as HTMLButtonElement;
    expect(boardTab).not.toBeNull();

    act(() => {
      boardTab.click();
    });

    expect(setFilter).toHaveBeenCalled();
    // Status was reset to Active
    const updater = setFilter.mock.calls[0][0];
    const updated = typeof updater === 'function' ? updater(mockFilter) : updater;
    expect(updated.status).toBe('Active');
    expect(onLayoutChange).toHaveBeenCalledWith('board');
  });

  it('auto-redirects legacy /pipeline?q=React to /applications?q=React&layout=board', () => {
    window.history.pushState(null, '', '/pipeline?q=React');

    let hookResult: ReturnType<typeof useUrlNavigation> | null = null;
    function TestHookComponent() {
      hookResult = useUrlNavigation();
      return <div>Test</div>;
    }

    act(() => {
      root!.render(<TestHookComponent />);
    });

    expect(window.location.pathname).toBe('/applications');
    expect(window.location.search).toContain('layout=board');
    expect(window.location.search).toContain('q=React');
    expect(hookResult?.activeTab).toBe('all');
    expect(hookResult?.layout).toBe('board');
  });

  it('auto-redirects legacy /all-applications?status=Saved to /applications?status=Saved&layout=table', () => {
    window.history.pushState(null, '', '/all-applications?status=Saved');

    let hookResult: ReturnType<typeof useUrlNavigation> | null = null;
    function TestHookComponent() {
      hookResult = useUrlNavigation();
      return <div>Test</div>;
    }

    act(() => {
      root!.render(<TestHookComponent />);
    });

    expect(window.location.pathname).toBe('/applications');
    expect(window.location.search).toContain('layout=table');
    expect(window.location.search).toContain('status=Saved');
    expect(hookResult?.activeTab).toBe('all');
    expect(hookResult?.layout).toBe('table');
  });

  it('does not intercept Ctrl+/ or Cmd+/ with the search input focus handler', () => {
    act(() => {
      root!.render(
        <AppProviders>
          <TopBar
            filter={{
              search: '',
              platform: 'All',
              status: 'Active',
              workLocation: 'All',
              employmentType: 'All',
              dateRange: 'all',
            }}
            setFilter={vi.fn()}
            layout="board"
            onLayoutChange={vi.fn()}
            totalFilteredCount={3}
          />
        </AppProviders>
      );
    });

    const searchInput = host!.querySelector('input[placeholder="Search jobs..."]') as HTMLInputElement;
    expect(document.activeElement).not.toBe(searchInput);

    // Press '/' without modifiers -> focuses search
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }));
    });
    expect(document.activeElement).toBe(searchInput);

    // Blur search
    searchInput.blur();
    expect(document.activeElement).not.toBe(searchInput);

    // Press 'Ctrl+/' -> must NOT focus search (reserved for keyboard shortcuts cheat sheet)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '/', ctrlKey: true, bubbles: true }));
    });
    expect(document.activeElement).not.toBe(searchInput);
  });

  it('renders dismissible filter chips with 28px hit targets (w-7 h-7)', () => {
    const filterWithChips: FilterState = {
      search: '',
      platform: 'LinkedIn',
      status: 'Active',
      workLocation: 'Remote',
      employmentType: 'Full-time',
      dateRange: '7days',
    };

    act(() => {
      root!.render(
        <AppProviders>
          <TopBar
            filter={filterWithChips}
            setFilter={vi.fn()}
            layout="board"
            onLayoutChange={vi.fn()}
            totalFilteredCount={1}
          />
        </AppProviders>
      );
    });

    const dismissBtns = Array.from(host!.querySelectorAll('button[aria-label^="Remove filter"]'));
    expect(dismissBtns.length).toBe(5);
    dismissBtns.forEach((btn) => {
      expect(btn.className).toContain('w-7');
      expect(btn.className).toContain('h-7');
    });
  });

  it('keeps Filter trigger button calm without redundant badges while active filter chips render in toolbar', () => {
    const filterWithFilters: FilterState = {
      search: '',
      platform: 'LinkedIn',
      status: 'Active',
      workLocation: 'Remote',
      employmentType: 'All',
      dateRange: 'all',
    };

    act(() => {
      root!.render(
        <AppProviders>
          <TopBar
            filter={filterWithFilters}
            setFilter={vi.fn()}
            layout="board"
            onLayoutChange={vi.fn()}
            totalFilteredCount={1}
          />
        </AppProviders>
      );
    });

    const trigger = host!.querySelector('[data-filter-trigger]') as HTMLButtonElement;
    expect(trigger).not.toBeNull();
    // Filter button must remain a clean trigger without noise
    expect(trigger.textContent?.trim()).toBe('Filter');
    expect(host!.querySelector('[data-testid="filter-active-count"]')).toBeNull();

    // Active filter chips are rendered visibly right in the toolbar
    const chips = Array.from(host!.querySelectorAll('button[aria-label^="Remove filter"]'));
    expect(chips.length).toBe(3); // Status: Active Only, Platform: LinkedIn, Work: Remote
  });

  it('supports inline quick stage transition in AllApplicationsTable row via StageSelectorDropdown without row selection', () => {
    const onSelectApp = vi.fn();
    const onUpdateStatus = vi.fn();
    const onBulkUpdateStatus = vi.fn();

    const app = makeApp('app-42', { company: 'Linear', status: 'Applied' });

    act(() => {
      root!.render(
        <AllApplicationsTable
          applications={[app]}
          totalAppCount={1}
          selectedAppId={null}
          onSelectApp={onSelectApp}
          sort={{ field: 'dateApplied', order: 'desc' }}
          onSortChange={vi.fn()}
          onBulkUpdateStatus={onBulkUpdateStatus}
          onUpdateStatus={onUpdateStatus}
          onBulkDelete={vi.fn()}
        />
      );
    });

    // Verify StageSelectorDropdown trigger rendered with variant="badge"
    const stageTrigger = host!.querySelector('button[aria-label^="Current stage: Applied"]') as HTMLButtonElement;
    expect(stageTrigger).not.toBeNull();
    expect(stageTrigger.textContent).toContain('Applied');

    // Click stage trigger to open menu
    act(() => {
      stageTrigger.click();
    });

    // onSelectApp must NOT be called (row click stopped)
    expect(onSelectApp).not.toHaveBeenCalled();

    // The listbox menu opens
    const interviewOption = host!.querySelector('[id$="-opt-Interview"]') as HTMLButtonElement;
    expect(interviewOption).not.toBeNull();

    // Select Interview
    act(() => {
      interviewOption.click();
    });

    expect(onUpdateStatus).toHaveBeenCalledWith('app-42', 'Interview');
    expect(onSelectApp).not.toHaveBeenCalled();
  });
});
