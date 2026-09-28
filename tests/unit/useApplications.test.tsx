import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useApplications, UseApplicationsReturn } from '../../src/hooks/useApplications';
import { DEFAULT_FILTER } from '../../src/hooks/useUrlNavigation';
import { FilterState } from '../../src/types';

let host: HTMLDivElement | null = null;
let root: Root | null = null;
let hookResult: UseApplicationsReturn;
let testFilter: FilterState = { ...DEFAULT_FILTER };
let mockAddToast = vi.fn();
let currentSelectedAppId: string | null = null;
let mockSetSelectedAppId = vi.fn((id: string | null) => {
  currentSelectedAppId = id;
});

function Harness() {
  hookResult = useApplications({
    user: null,
    filter: testFilter,
    addToast: mockAddToast,
    selectedAppId: currentSelectedAppId,
    setSelectedAppId: mockSetSelectedAppId,
  });
  return null;
}

function mountHarness() {
  if (root) {
    act(() => root!.unmount());
    root = null;
  }
  if (host) host.remove();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root!.render(<Harness />);
  });
}

describe('useApplications hook', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    testFilter = { ...DEFAULT_FILTER };
    currentSelectedAppId = null;
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

  it('initializes with empty applications and default sort', () => {
    mountHarness();

    expect(hookResult.applications).toEqual([]);
    expect(hookResult.selectedApp).toBeNull();
    expect(hookResult.sort).toEqual({ field: 'dateApplied', order: 'desc' });
  });

  it('adds an application optimistically and triggers success toast', async () => {
    mountHarness();

    await act(async () => {
      await hookResult.handleAddApplication({
        company: 'Linear',
        role: 'Full Stack Engineer',
        status: 'Applied',
        platform: 'LinkedIn',
        dateApplied: '2026-09-01',
      });
    });

    expect(hookResult.applications.length).toBe(1);
    expect(hookResult.applications[0].company).toBe('Linear');
    expect(mockAddToast).toHaveBeenCalledWith('success', 'Application Added', expect.stringContaining('Linear'));
  });

  it('updates application status and appends status history', async () => {
    mountHarness();

    await act(async () => {
      await hookResult.handleAddApplication({
        company: 'Vercel',
        role: 'Systems Engineer',
        status: 'Saved',
        platform: 'Company Site',
        dateApplied: '2026-09-02',
      });
    });

    const createdId = hookResult.applications[0].id;

    await act(async () => {
      await hookResult.handleUpdateApplication(createdId, {
        status: 'Interview',
      });
    });

    expect(hookResult.applications[0].status).toBe('Interview');
    expect(hookResult.applications[0].history?.length).toBeGreaterThan(0);
    expect(mockAddToast).toHaveBeenCalledWith('success', expect.stringContaining('Moved Vercel to'), undefined, expect.any(Object), 'Interview');
  });

  it('deletes application and invokes Undo callback when clicked', async () => {
    mountHarness();

    await act(async () => {
      await hookResult.handleAddApplication({
        company: 'GitHub',
        role: 'DevRel',
        status: 'Applied',
        platform: 'LinkedIn',
        dateApplied: '2026-09-03',
      });
    });

    const targetId = hookResult.applications[0].id;

    await act(async () => {
      await hookResult.handleDeleteApplication(targetId);
    });

    expect(hookResult.applications.length).toBe(0);
    expect(mockAddToast).toHaveBeenCalledWith('info', 'Deleted GitHub', undefined, expect.any(Object));

    // Test Undo action
    const lastToastCall = mockAddToast.mock.calls.find((call) => call[1] === 'Deleted GitHub');
    expect(lastToastCall).toBeDefined();
    const action = lastToastCall[3];

    await act(async () => {
      await action.onClick();
    });

    expect(hookResult.applications.length).toBe(1);
    expect(hookResult.applications[0].company).toBe('GitHub');
  });
});
