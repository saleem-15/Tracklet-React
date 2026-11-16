import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FilterToolbar, FilterChip, FilterField } from '../../src/components/ui/filter-toolbar';

describe('FilterToolbar: Animations, Morphing Menu, and Chip Management', () => {
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

  const fields: FilterField[] = [
    {
      id: 'platform',
      label: 'Platform',
      options: ['LinkedIn', 'Indeed', 'Greenhouse'],
    },
    {
      id: 'work',
      label: 'Work Mode',
      options: ['Remote', 'Hybrid', 'Onsite'],
    },
  ];

  it('renders filter chips and calls onRemove when chip dismiss button is clicked', () => {
    const filters: FilterChip[] = [
      { id: 'platform', label: 'Platform', value: 'LinkedIn' },
      { id: 'work', label: 'Work', value: 'Remote' },
    ];
    const onRemove = vi.fn();
    const onClearAll = vi.fn();

    act(() => {
      root!.render(
        <FilterToolbar
          filters={filters}
          onRemove={onRemove}
          onClearAll={onClearAll}
        />
      );
    });

    expect(host!.textContent).toContain('Platform');
    expect(host!.textContent).toContain('LinkedIn');
    expect(host!.textContent).toContain('Work');
    expect(host!.textContent).toContain('Remote');

    // Click remove button for platform chip
    const removePlatformBtn = host!.querySelector('button[data-chip-remove="platform"]') as HTMLButtonElement;
    expect(removePlatformBtn).not.toBeNull();

    act(() => {
      removePlatformBtn.click();
    });

    expect(onRemove).toHaveBeenCalledWith('platform');
  });

  it('renders Clear all button when filters are active and calls onClearAll', () => {
    const filters: FilterChip[] = [
      { id: 'platform', label: 'Platform', value: 'LinkedIn' },
    ];
    const onRemove = vi.fn();
    const onClearAll = vi.fn();

    act(() => {
      root!.render(
        <FilterToolbar
          filters={filters}
          onRemove={onRemove}
          onClearAll={onClearAll}
        />
      );
    });

    const clearBtn = Array.from(host!.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Clear all')
    );
    expect(clearBtn).toBeDefined();

    act(() => {
      clearBtn!.click();
    });

    expect(onClearAll).toHaveBeenCalledTimes(1);
  });

  it('opens morphing filter menu on click and navigates from Field to Value step', () => {
    const filters: FilterChip[] = [];
    const onRemove = vi.fn();
    const onAdd = vi.fn();

    act(() => {
      root!.render(
        <FilterToolbar
          filters={filters}
          onRemove={onRemove}
          addFilter={{
            fields,
            onAdd,
            label: 'Filter',
          }}
        />
      );
    });

    const triggerBtn = host!.querySelector('button[data-filter-trigger]') as HTMLButtonElement;
    expect(triggerBtn).not.toBeNull();
    expect(triggerBtn.textContent).toContain('Filter');

    // Open the menu
    act(() => {
      triggerBtn.click();
    });

    // Panel is opened
    const panel = host!.querySelector('div[role="dialog"]');
    expect(panel).not.toBeNull();

    // Fields step should display 'Platform' and 'Work Mode'
    const platformRow = Array.from(host!.querySelectorAll('button[data-row]')).find(
      (b) => b.getAttribute('data-row') === 'platform'
    ) as HTMLButtonElement;
    expect(platformRow).toBeDefined();

    // Drill down into 'Platform'
    act(() => {
      platformRow.click();
    });

    // Value options for Platform should now be visible
    const linkedinRow = Array.from(host!.querySelectorAll('button[data-row]')).find(
      (b) => b.getAttribute('data-row') === 'LinkedIn'
    ) as HTMLButtonElement;
    expect(linkedinRow).toBeDefined();

    // Pick 'LinkedIn'
    act(() => {
      linkedinRow.click();
    });

    expect(onAdd).toHaveBeenCalledWith(
      { id: 'platform', label: 'Platform', value: 'LinkedIn' },
      fields[0]
    );
  });
});
