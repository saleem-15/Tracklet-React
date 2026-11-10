import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { SegmentedTabs, TabOption } from '../../src/components/SegmentedTabs';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('SegmentedTabs Component', () => {
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

  it('renders all tab options and marks active tab with aria-selected="true"', () => {
    const tabs: TabOption<'grid' | 'table'>[] = [
      { id: 'grid', label: 'Grid' },
      { id: 'table', label: 'Table' },
    ];
    const onChange = vi.fn();

    act(() => {
      root!.render(
        <SegmentedTabs
          tabs={tabs}
          activeTab="grid"
          onChange={onChange}
        />
      );
    });

    const buttons = host!.querySelectorAll('button[role="tab"]');
    expect(buttons.length).toBe(2);

    expect(buttons[0].getAttribute('aria-selected')).toBe('true');
    expect(buttons[0].getAttribute('tabindex')).toBe('0');
    expect(buttons[0].textContent).toContain('Grid');

    expect(buttons[1].getAttribute('aria-selected')).toBe('false');
    expect(buttons[1].getAttribute('tabindex')).toBe('-1');
    expect(buttons[1].textContent).toContain('Table');
  });

  it('fires onChange when an inactive tab is clicked', () => {
    const tabs: TabOption<'a' | 'b'>[] = [
      { id: 'a', label: 'Option A' },
      { id: 'b', label: 'Option B' },
    ];
    const onChange = vi.fn();

    act(() => {
      root!.render(
        <SegmentedTabs
          tabs={tabs}
          activeTab="a"
          onChange={onChange}
        />
      );
    });

    const buttons = host!.querySelectorAll<HTMLButtonElement>('button[role="tab"]');
    act(() => {
      buttons[1].click();
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('supports keyboard navigation via ArrowRight, ArrowLeft, Home, and End', () => {
    const tabs: TabOption<'tab1' | 'tab2' | 'tab3'>[] = [
      { id: 'tab1', label: 'Tab 1' },
      { id: 'tab2', label: 'Tab 2' },
      { id: 'tab3', label: 'Tab 3' },
    ];
    const onChange = vi.fn();

    act(() => {
      root!.render(
        <SegmentedTabs
          tabs={tabs}
          activeTab="tab1"
          onChange={onChange}
        />
      );
    });

    const buttons = host!.querySelectorAll<HTMLButtonElement>('button[role="tab"]');

    // ArrowRight on tab 1 -> moves to tab 2
    act(() => {
      buttons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith('tab2');

    // ArrowLeft on tab 1 -> wraps to tab 3
    act(() => {
      buttons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith('tab3');

    // End on tab 1 -> jumps to last tab (tab 3)
    act(() => {
      buttons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith('tab3');

    // Home on tab 2 -> jumps to first tab (tab 1)
    act(() => {
      buttons[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith('tab1');
  });

  it('correctly handles icon-only tabs with accessible labels and tooltips', () => {
    const tabs: TabOption<'grid' | 'table'>[] = [
      {
        id: 'grid',
        icon: <span data-testid="icon-grid">G</span>,
        title: 'Grid layout',
        'aria-label': 'Grid layout',
      },
      {
        id: 'table',
        icon: <span data-testid="icon-table">T</span>,
        title: 'Table layout',
        'aria-label': 'Table layout',
      },
    ];
    const onChange = vi.fn();

    act(() => {
      root!.render(
        <SegmentedTabs
          tabs={tabs}
          activeTab="grid"
          onChange={onChange}
          size="sm"
          fullWidth={false}
          hasBorder={true}
          pillBorder={false}
        />
      );
    });

    const buttons = host!.querySelectorAll<HTMLButtonElement>('button[role="tab"]');
    expect(buttons[0].getAttribute('aria-label')).toBe('Grid layout');
    expect(buttons[0].getAttribute('title')).toBe('Grid layout');
    expect(buttons[0].getAttribute('data-tooltip')).toBe('Grid layout');
    expect(buttons[1].getAttribute('aria-label')).toBe('Table layout');
    expect(buttons[1].getAttribute('title')).toBe('Table layout');

    // Pill must NOT have border when pillBorder={false}
    const pill = host!.querySelector('span[aria-hidden="true"]');
    expect(pill?.className).not.toContain('border-slate-200');
  });

  it('renders prefix icon, supports gap, and applies font-medium when inactiveWeight="medium"', () => {
    const tabs: TabOption<'all' | 'recent'>[] = [
      { id: 'all', label: 'All Time' },
      { id: 'recent', label: 'Recent' },
    ];

    act(() => {
      root!.render(
        <SegmentedTabs
          tabs={tabs}
          activeTab="all"
          onChange={vi.fn()}
          prefix={<span data-testid="test-prefix">CALENDAR</span>}
          gap={true}
          hasBorder={false}
          pillBorder={false}
          inactiveWeight="medium"
        />
      );
    });

    expect(host!.querySelector('[data-testid="test-prefix"]')).not.toBeNull();
    const container = host!.querySelector('div[role="tablist"]');
    expect(container?.className).toContain('gap-1');
    expect(container?.className).not.toContain('border-slate-200');

    const buttons = host!.querySelectorAll('button[role="tab"]');
    expect(buttons[0].className).toContain('font-semibold');
    expect(buttons[1].className).toContain('font-medium');
  });

  it('renders badges when provided', () => {
    const tabs: TabOption<'active' | 'archived'>[] = [
      { id: 'active', label: 'Active', badge: 5 },
      { id: 'archived', label: 'Archived', badge: 0 },
    ];

    act(() => {
      root!.render(
        <SegmentedTabs
          tabs={tabs}
          activeTab="active"
          onChange={vi.fn()}
        />
      );
    });

    const buttons = host!.querySelectorAll('button[role="tab"]');
    expect(buttons[0].textContent).toContain('5');
    expect(buttons[1].textContent).toContain('0');
  });
});
