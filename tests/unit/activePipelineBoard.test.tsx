import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ActivePipelineBoard, calculateNewOrder } from '../../src/components/ActivePipelineBoard';
import { Application } from '../../src/types';

// Mock sample applications with full valid schema
const mockApplications: Application[] = [
  {
    id: 'app-1',
    userId: 'user-1',
    company: 'Stripe',
    role: 'Staff Frontend Engineer',
    status: 'Saved',
    platform: 'LinkedIn',
    dateApplied: '2026-10-01',
    stageUpdatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    tasks: [{ id: 't1', title: 'Prepare portfolio', completed: false }],
    contacts: [{ id: 'c1', name: 'Alice Recruiter', role: 'Recruiter' }],
    contactEmail: 'alice@stripe.com',
    emails: [
      {
        id: 'e1',
        sender: 'me@example.com',
        recipient: 'alice@stripe.com',
        subject: 'Initial reachout',
        date: '2026-10-02',
        body: 'Hello',
      },
    ],
  },
  {
    id: 'app-2',
    userId: 'user-1',
    company: 'Linear',
    role: 'Product Engineer',
    status: 'Applied',
    platform: 'Company Site',
    dateApplied: '2026-09-15',
    stageUpdatedAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString(), // >14 days stale
    createdAt: '2026-09-15T00:00:00.000Z',
    updatedAt: '2026-09-15T00:00:00.000Z',
  },
  {
    id: 'app-3',
    userId: 'user-1',
    company: 'Figma',
    role: 'Design Systems Architect',
    status: 'Interview',
    platform: 'Greenhouse',
    dateApplied: '2026-10-10',
    stageUpdatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: '2026-10-10T00:00:00.000Z',
    updatedAt: '2026-10-10T00:00:00.000Z',
  },
];

describe('ActivePipelineBoard Motion, Drag & Gesture Architecture', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders all 5 pipeline columns with optimistic count counters', async () => {
    const handleSelectApp = vi.fn();
    const handleUpdateStatus = vi.fn();

    await act(async () => {
      root.render(
        <ActivePipelineBoard
          applications={mockApplications}
          selectedAppId={null}
          onSelectApp={handleSelectApp}
          onUpdateStatus={handleUpdateStatus}
        />
      );
    });

    expect(container.textContent).toContain('Saved');
    expect(container.textContent).toContain('Applied');
    expect(container.textContent).toContain('Screening');
    expect(container.textContent).toContain('Interview');
    expect(container.textContent).toContain('Offer');

    // Verify company cards rendered
    expect(container.textContent).toContain('Stripe');
    expect(container.textContent).toContain('Linear');
    expect(container.textContent).toContain('Figma');
  });

  it('preserves ambient canvas calm without banner noise and displays in-context card staleness', async () => {
    await act(async () => {
      root.render(
        <ActivePipelineBoard
          applications={mockApplications}
          selectedAppId={null}
          onSelectApp={vi.fn()}
          onUpdateStatus={vi.fn()}
        />
      );
    });

    // Ambient canvas calm: no alarming full-width banner
    expect(container.textContent).not.toContain('Attention Needed');
    expect(container.querySelector('button[title="Dismiss announcement"]')).toBeNull();

    // Contextual staleness: surfaced directly on the affected card
    expect(container.textContent).toContain('16d stale');
  });

  it('selects application when card is clicked without dragging', async () => {
    const handleSelectApp = vi.fn();

    await act(async () => {
      root.render(
        <ActivePipelineBoard
          applications={mockApplications}
          selectedAppId={null}
          onSelectApp={handleSelectApp}
          onUpdateStatus={vi.fn()}
        />
      );
    });

    const stripeCard = container.querySelector('[data-kanban-card="app-1"]') as HTMLElement;
    expect(stripeCard).not.toBeNull();

    await act(async () => {
      stripeCard.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(handleSelectApp).toHaveBeenCalledWith(mockApplications[0]);
  });

  it('opens application details when Enter key is pressed on an ungrabbed card', async () => {
    const handleSelectApp = vi.fn();

    await act(async () => {
      root.render(
        <ActivePipelineBoard
          applications={mockApplications}
          selectedAppId={null}
          onSelectApp={handleSelectApp}
          onUpdateStatus={vi.fn()}
        />
      );
    });

    const stripeCard = container.querySelector('[data-kanban-card="app-1"]') as HTMLElement;
    expect(stripeCard).not.toBeNull();

    // Press Enter while not grabbed -> must open card details
    await act(async () => {
      stripeCard.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(handleSelectApp).toHaveBeenCalledWith(mockApplications[0]);
    // Must NOT have grabbed the card
    expect(stripeCard.getAttribute('aria-grabbed')).not.toBe('true');
  });

  it('supports keyboard navigation: Space to pick up, ArrowRight to advance, Space to drop', async () => {
    const handleUpdateStatus = vi.fn();

    await act(async () => {
      root.render(
        <ActivePipelineBoard
          applications={mockApplications}
          selectedAppId={null}
          onSelectApp={vi.fn()}
          onUpdateStatus={handleUpdateStatus}
        />
      );
    });

    const stripeCard = container.querySelector('[data-kanban-card="app-1"]') as HTMLElement;
    expect(stripeCard).not.toBeNull();

    // 1. Press Space to pick up
    await act(async () => {
      stripeCard.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    });

    expect(stripeCard.getAttribute('aria-grabbed')).toBe('true');
    const liveRegion = container.querySelector('[role="status"]');
    expect(liveRegion?.textContent).toContain('Picked up Stripe');

    // 2. Press ArrowRight to advance to next stage (Applied)
    await act(async () => {
      stripeCard.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });

    expect(handleUpdateStatus).toHaveBeenCalledWith('app-1', 'Applied');
    expect(liveRegion?.textContent).toContain('Stripe moved to Applied');

    // 3. Press Space again to drop
    await act(async () => {
      stripeCard.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    });

    expect(stripeCard.getAttribute('aria-grabbed')).toBe('false');
    expect(liveRegion?.textContent).toContain('Dropped Stripe');
  });

  it('supports keyboard Escape to cancel and restore original stage', async () => {
    const handleUpdateStatus = vi.fn();

    await act(async () => {
      root.render(
        <ActivePipelineBoard
          applications={mockApplications}
          selectedAppId={null}
          onSelectApp={vi.fn()}
          onUpdateStatus={handleUpdateStatus}
        />
      );
    });

    const stripeCard = container.querySelector('[data-kanban-card="app-1"]') as HTMLElement;

    // Pick up
    await act(async () => {
      stripeCard.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    });
    expect(stripeCard.getAttribute('aria-grabbed')).toBe('true');

    // Advance
    await act(async () => {
      stripeCard.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });

    // Cancel with Escape
    await act(async () => {
      stripeCard.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(stripeCard.getAttribute('aria-grabbed')).toBe('false');
    const liveRegion = container.querySelector('[role="status"]');
    expect(liveRegion?.textContent).toContain('Cancelled');
  });

  it('advances status when mobile quick advance button is clicked', async () => {
    const handleUpdateStatus = vi.fn();

    await act(async () => {
      root.render(
        <ActivePipelineBoard
          applications={mockApplications}
          selectedAppId={null}
          onSelectApp={vi.fn()}
          onUpdateStatus={handleUpdateStatus}
        />
      );
    });

    const stripeCard = container.querySelector('[data-kanban-card="app-1"]') as HTMLElement;
    const advanceBtn = stripeCard.querySelector('button[title="Advance to Applied"]');
    expect(advanceBtn).not.toBeNull();

    await act(async () => {
      advanceBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(handleUpdateStatus).toHaveBeenCalledWith('app-1', 'Applied');
  });

  it('suppresses onSelectApp after a pointer drag operation completes', async () => {
    const handleSelectApp = vi.fn();
    const handleUpdateStatus = vi.fn();

    await act(async () => {
      root.render(
        <ActivePipelineBoard
          applications={mockApplications}
          selectedAppId={null}
          onSelectApp={handleSelectApp}
          onUpdateStatus={handleUpdateStatus}
        />
      );
    });

    const stripeCard = container.querySelector('[data-kanban-card="app-1"]') as HTMLElement;
    expect(stripeCard).not.toBeNull();

    // Mock getBoundingClientRect
    vi.spyOn(stripeCard, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 100,
      right: 300,
      bottom: 200,
      width: 200,
      height: 100,
      x: 100,
      y: 100,
      toJSON: () => {},
    });

    // 1. Pointer down
    await act(async () => {
      stripeCard.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          button: 0,
          clientX: 120,
          clientY: 120,
        })
      );
    });

    // 2. Pointer move > 4px threshold
    await act(async () => {
      window.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          clientX: 180,
          clientY: 180,
        })
      );
    });

    // 3. Pointer up (drop)
    await act(async () => {
      window.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
        })
      );
    });

    // 4. Emulate subsequent click dispatched by browser
    await act(async () => {
      stripeCard.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // onSelectApp must NOT be called because a drag occurred
    expect(handleSelectApp).not.toHaveBeenCalled();
  });

  it('renders Active Capacity banner when activeQuota is passed', async () => {
    const onUpgradeClick = vi.fn();

    await act(async () => {
      root.render(
        <ActivePipelineBoard
          applications={mockApplications}
          selectedAppId={null}
          onSelectApp={vi.fn()}
          onUpdateStatus={vi.fn()}
          activeQuota={{
            current: 10,
            max: 20,
            isGrandfathered: true,
            onUpgradeClick,
          }}
        />
      );
    });

    expect(container.textContent).toContain('Active Capacity:');
    expect(container.textContent).toContain('10 / 20');
    expect(container.textContent).toContain('Grandfathered Access');
  });

  it('renders EmptyState when applications array is empty', async () => {
    const onResetFilters = vi.fn();

    await act(async () => {
      root.render(
        <ActivePipelineBoard
          applications={[]}
          totalAppCount={10}
          selectedAppId={null}
          onSelectApp={vi.fn()}
          onUpdateStatus={vi.fn()}
          onResetFilters={onResetFilters}
        />
      );
    });

    expect(container.textContent).toContain('No matching applications found');
  });

  it('renders card context menu (···) and allows archiving and deleting', async () => {
    const handleUpdateStatus = vi.fn();
    const handleDeleteApp = vi.fn();

    await act(async () => {
      root.render(
        <ActivePipelineBoard
          applications={mockApplications}
          selectedAppId={null}
          onSelectApp={vi.fn()}
          onUpdateStatus={handleUpdateStatus}
          onDeleteApp={handleDeleteApp}
        />
      );
    });

    // Find the context menu toggle button on Stripe's card
    const stripeCard = container.querySelector('[data-kanban-card="app-1"]') as HTMLElement;
    const menuBtn = stripeCard.querySelector('button[aria-label="Actions for Stripe"]') as HTMLButtonElement;
    expect(menuBtn).not.toBeNull();

    // Context menu should not be open initially
    expect(container.querySelector('[role="menu"]')).toBeNull();

    // Click menu toggle button
    await act(async () => {
      menuBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Menu should now be open with Archive and Delete
    const menu = container.querySelector('[role="menu"]');
    expect(menu).not.toBeNull();
    expect(menu?.textContent).toContain('Archive');
    expect(menu?.textContent).toContain('Delete');

    // Test clicking Archive
    const archiveBtn = Array.from(menu!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Archive')
    );
    expect(archiveBtn).toBeDefined();

    await act(async () => {
      archiveBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(handleUpdateStatus).toHaveBeenCalledWith('app-1', 'Archived');
    // Menu trigger aria-expanded should be false after action
    expect(menuBtn.getAttribute('aria-expanded')).toBe('false');

    // Reopen menu to test delete
    await act(async () => {
      menuBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const deleteBtn = Array.from(container.querySelectorAll('[role="menu"] button')).find((b) =>
      b.textContent?.includes('Delete')
    );
    expect(deleteBtn).toBeDefined();

    await act(async () => {
      deleteBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(handleDeleteApp).toHaveBeenCalledWith('app-1');
  });

  it('renders 3-tier surface contrast: canvas, column tracks, and integrated lane headers', async () => {
    await act(async () => {
      root.render(
        <ActivePipelineBoard
          applications={mockApplications}
          selectedAppId={null}
          onSelectApp={vi.fn()}
          onUpdateStatus={vi.fn()}
        />
      );
    });

    // Canvas foundation
    const canvas = container.querySelector('.bg-slate-50\\/60');
    expect(canvas).not.toBeNull();

    // Column tracks
    const columnTracks = container.querySelectorAll('.bg-slate-100\\/80');
    expect(columnTracks.length).toBe(5);

    // Integrated lane headers inside column tracks
    const laneHeaders = container.querySelectorAll('.bg-white\\/90');
    expect(laneHeaders.length).toBe(5);

    // Physical white cards
    const card = container.querySelector('[data-kanban-card="app-1"] .bg-white.rounded-xl.border');
    expect(card).not.toBeNull();
  });

  describe('Kanban Fractional Indexing & Card Reordering', () => {
    const dummyApp = (id: string, order?: number): Application => ({
      id,
      userId: 'u1',
      company: `Company ${id}`,
      role: 'Engineer',
      status: 'Saved',
      platform: 'LinkedIn',
      dateApplied: '2026-10-01',
      stageUpdatedAt: '2026-10-01T00:00:00.000Z',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
      order,
    });

    it('calculates default order for empty column', () => {
      expect(calculateNewOrder(0, [])).toBe(10000);
    });

    it('calculates order when dropped at top of column', () => {
      const cards = [dummyApp('a1', 10000), dummyApp('a2', 20000)];
      expect(calculateNewOrder(0, cards)).toBe(0);
    });

    it('calculates order when dropped at bottom of column', () => {
      const cards = [dummyApp('a1', 10000), dummyApp('a2', 20000)];
      expect(calculateNewOrder(2, cards)).toBe(30000);
    });

    it('calculates exact midpoint when dropped between two cards', () => {
      const cards = [dummyApp('a1', 10000), dummyApp('a2', 20000)];
      expect(calculateNewOrder(1, cards)).toBe(15000);
    });

    it('renders cards in ascending order of explicit order property', async () => {
      const reorderedApps: Application[] = [
        {
          ...mockApplications[0],
          id: 'app-low-priority',
          company: 'Low Priority Co',
          status: 'Saved',
          order: 50000,
          stageUpdatedAt: '2026-10-25T00:00:00.000Z', // Fresher date
        },
        {
          ...mockApplications[0],
          id: 'app-high-priority',
          company: 'Dream Job Co',
          status: 'Saved',
          order: 1000,
          stageUpdatedAt: '2026-10-01T00:00:00.000Z', // Older date
        },
      ];

      await act(async () => {
        root.render(
          <ActivePipelineBoard
            applications={reorderedApps}
            selectedAppId={null}
            onSelectApp={vi.fn()}
            onUpdateStatus={vi.fn()}
          />
        );
      });

      const renderedCards = container.querySelectorAll('[data-kanban-card]');
      expect(renderedCards.length).toBe(2);
      // High priority (order: 1000) must render first despite older date
      expect(renderedCards[0].getAttribute('data-kanban-card')).toBe('app-high-priority');
      expect(renderedCards[1].getAttribute('data-kanban-card')).toBe('app-low-priority');
    });
  });
});
