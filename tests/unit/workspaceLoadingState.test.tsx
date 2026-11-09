import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { WorkspaceLoadingState } from '../../src/components/layout/WorkspaceLoadingState';
import { NavigationContext, NavigationContextType } from '../../src/context/NavigationContext';

let host: HTMLDivElement | null = null;
let root: Root | null = null;

beforeEach(() => {
  vi.useFakeTimers();
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
  vi.useRealTimers();
});

describe('WorkspaceLoadingState Component (Executive Staged Dissolve)', () => {
  describe('Stage A: Cold Boot Focal Monolith (fullScreen)', () => {
    it('initially renders ONLY the logo, without name or texts, then reveals "loading ..." after 300ms via transitions.dev Texts reveal', () => {
      act(() => {
        root!.render(<WorkspaceLoadingState fullScreen />);
      });

      // Role and Accessibility
      const statusContainer = host?.querySelector('[role="status"]');
      expect(statusContainer).toBeTruthy();
      expect(statusContainer?.getAttribute('aria-live')).toBe('polite');
      expect(statusContainer?.getAttribute('aria-label')).toBe('Loading workspace data');

      // 1.5px top precision vitality rail
      const hairlineRail = host?.querySelector('.hairline-progress');
      expect(hairlineRail).toBeTruthy();

      // Brand Logo is visible
      const logoImg = host?.querySelector('img[src="/logo.svg"]');
      expect(logoImg).toBeTruthy();

      // All texts including the brand name "Tracklet" are removed per request
      expect(host?.textContent).not.toContain('Tracklet');
      expect(host?.textContent).not.toContain('WORKSPACE INITIALIZING');
      expect(host?.textContent).not.toContain('SECURE USER-SCOPED SESSION');

      // At start (t=0): .t-stagger exists, but does NOT have .is-shown class yet
      const staggerContainer = host?.querySelector('.t-stagger');
      expect(staggerContainer).toBeTruthy();
      expect(staggerContainer?.classList.contains('is-shown')).toBe(false);

      // Fast-forward 300ms
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // After 300ms: .is-shown is added, triggering the Texts reveal transition
      expect(staggerContainer?.classList.contains('is-shown')).toBe(true);
      expect(host?.textContent).toContain('loading ...');

      // Anti-slop constraints: No circular spinners, no emojis, no raw fallback string
      expect(host?.querySelector('.animate-spin')).toBeNull();
      expect(host?.textContent).not.toContain('Loading Tracklet workspace...');
      expect(host?.textContent).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u);
    });

    it('reveals custom label after 300ms when custom label prop is provided', () => {
      act(() => {
        root!.render(<WorkspaceLoadingState fullScreen label="loading ..." />);
      });

      expect(host?.querySelector('.t-stagger')?.classList.contains('is-shown')).toBe(false);

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(host?.querySelector('.t-stagger')?.classList.contains('is-shown')).toBe(true);
      expect(host?.textContent).toContain('loading ...');
    });
  });

  describe('Stage B: In-Place Workspace Dissolve (Embedded)', () => {
    it('renders table rows skeleton by default with deterministic 38px row height and zero CLS', () => {
      act(() => {
        root!.render(<WorkspaceLoadingState />);
      });

      // Accessible container
      const statusContainer = host?.querySelector('[role="status"]');
      expect(statusContainer).toBeTruthy();

      // Table skeleton headers
      expect(host?.textContent).toContain('Company');
      expect(host?.textContent).toContain('Role');
      expect(host?.textContent).toContain('Platform');
      expect(host?.textContent).toContain('Applied');
      expect(host?.textContent).toContain('Stage');
      expect(host?.textContent).toContain('Status');

      // Table rows with deterministic h-[38px]
      const rows = host?.querySelectorAll('tbody tr');
      expect(rows?.length).toBe(8);
      rows?.forEach((row) => {
        expect(row.className).toContain('h-[38px]');
      });

      // Discrete bottom-bar systems telemetry
      const footer = host?.querySelector('footer');
      expect(footer).toBeTruthy();
      expect(footer?.textContent).toContain('loading ...');
      expect(footer?.textContent).toContain('WORKSPACE SYNC');

      // Anti-slop constraints
      expect(host?.querySelector('.animate-spin')).toBeNull();
      expect(host?.className).not.toContain('transition-all');
    });

    it('renders board columns skeleton when viewMode="board" with deterministic min-h-[96px] cards', () => {
      act(() => {
        root!.render(<WorkspaceLoadingState viewMode="board" />);
      });

      // 5 Kanban Stage headers
      expect(host?.textContent).toContain('Saved');
      expect(host?.textContent).toContain('Applied');
      expect(host?.textContent).toContain('Screening');
      expect(host?.textContent).toContain('Interview');
      expect(host?.textContent).toContain('Offer');

      // Kanban cards have deterministic min-h-[96px]
      const cards = host?.querySelectorAll('.min-h-\\[96px\\]');
      expect(cards && cards.length).toBeGreaterThanOrEqual(10);

      // Bottom bar label for board view
      const footer = host?.querySelector('footer');
      expect(footer?.textContent).toContain('loading ...');
    });

    it('adapts to active navigation tab automatically when inside NavigationContext', () => {
      const mockNavContext: Partial<NavigationContextType> = {
        activeTab: 'pipeline',
      };

      act(() => {
        root!.render(
          <NavigationContext.Provider value={mockNavContext as NavigationContextType}>
            <WorkspaceLoadingState />
          </NavigationContext.Provider>
        );
      });

      // Automatically selects board view because activeTab is 'pipeline'
      expect(host?.textContent).toContain('Saved');
      expect(host?.textContent).toContain('Applied');
      expect(host?.textContent).toContain('Screening');
      expect(host?.textContent).toContain('loading ...');
    });

    it('renders contacts header and grid skeleton when activeTab="contacts"', () => {
      const mockNavContext: Partial<NavigationContextType> = {
        activeTab: 'contacts',
      };

      act(() => {
        root!.render(
          <NavigationContext.Provider value={mockNavContext as NavigationContextType}>
            <WorkspaceLoadingState />
          </NavigationContext.Provider>
        );
      });

      // Contacts Header elements
      expect(host?.textContent).toContain('Contacts');
      expect(host?.textContent).toContain('Add Contact');
      expect(host?.textContent).toContain('Search by name, role, organization, or email...');
      expect(host?.textContent).toContain('All (0)');
      expect(host?.textContent).toContain('Mentor');
      expect(host?.textContent).toContain('Recruiter');
      expect(host?.textContent).toContain('Hiring Manager');
      expect(host?.textContent).toContain('Needs Follow-up');

      // Grid skeleton cards with deterministic min-h-[170px]
      const cards = host?.querySelectorAll('.min-h-\\[170px\\]');
      expect(cards?.length).toBe(8);

      // Bottom bar
      expect(host?.textContent).toContain('loading ...');
      expect(host?.textContent).toContain('WORKSPACE SYNC');
    });

    it('renders contacts table skeleton when viewMode="contacts-table"', () => {
      act(() => {
        root!.render(<WorkspaceLoadingState viewMode="contacts-table" />);
      });

      // Contacts Table headers
      expect(host?.textContent).toContain('Contacts');
      expect(host?.textContent).toContain('Name');
      expect(host?.textContent).toContain('Role & Org');
      expect(host?.textContent).toContain('Category');
      expect(host?.textContent).toContain('Follow-up');
      expect(host?.textContent).toContain('Linked Applications');
      expect(host?.textContent).toContain('Actions');

      // Table rows
      const rows = host?.querySelectorAll('tbody tr');
      expect(rows?.length).toBe(8);
    });

    it('respects stored table layout preference from localStorage for contacts', () => {
      localStorage.setItem('tracklet_contacts_layout_v1', 'table');

      try {
        act(() => {
          root!.render(<WorkspaceLoadingState viewMode="contacts" />);
        });

        // Renders table view because localStorage preference is 'table'
        expect(host?.textContent).toContain('Role & Org');
        expect(host?.textContent).toContain('Linked Applications');
        const rows = host?.querySelectorAll('tbody tr');
        expect(rows?.length).toBe(8);
      } finally {
        localStorage.removeItem('tracklet_contacts_layout_v1');
      }
    });

    it('renders analytics view skeleton when activeTab="stats"', () => {
      const mockNavContext: Partial<NavigationContextType> = {
        activeTab: 'stats',
      };

      act(() => {
        root!.render(
          <NavigationContext.Provider value={mockNavContext as NavigationContextType}>
            <WorkspaceLoadingState />
          </NavigationContext.Provider>
        );
      });

      // Analytics Heading & Filter Bar
      expect(host?.textContent).toContain('Job Search Analytics');
      expect(host?.textContent).toContain('All Time');
      expect(host?.textContent).toContain('Past 30 Days');

      // 4 Executive KPIs
      expect(host?.textContent).toContain('Active Pipeline');
      expect(host?.textContent).toContain('Screening Yield');
      expect(host?.textContent).toContain('Offer Rate');
      expect(host?.textContent).toContain('Decision Pending');

      // 2-Column Analytics Intelligence Cards
      expect(host?.textContent).toContain('Conversion Funnel');
      expect(host?.textContent).toContain('Response Velocity');
      expect(host?.textContent).toContain('Application Sources');
      expect(host?.textContent).toContain('Activity & Consistency Cadence');

      // Bottom bar
      expect(host?.textContent).toContain('loading ...');
      expect(host?.textContent).toContain('WORKSPACE SYNC');
    });

    it('renders analytics view skeleton explicitly when viewMode="stats"', () => {
      act(() => {
        root!.render(<WorkspaceLoadingState viewMode="stats" />);
      });

      expect(host?.textContent).toContain('Job Search Analytics');
      expect(host?.textContent).toContain('Conversion Funnel');
    });

    it('renders settings view skeleton on white canvas when activeTab="settings"', () => {
      const mockNavContext: Partial<NavigationContextType> = {
        activeTab: 'settings',
      };

      act(() => {
        root!.render(
          <NavigationContext.Provider value={mockNavContext as NavigationContextType}>
            <WorkspaceLoadingState />
          </NavigationContext.Provider>
        );
      });

      // Status container uses bg-white for settings
      const statusContainer = host?.querySelector('[role="status"]');
      expect(statusContainer?.className).toContain('bg-white');

      // Settings Heading & Sub-Nav
      expect(host?.textContent).toContain('Settings');
      expect(host?.textContent).toContain('Account');

      // Workspace Data Portability & Backup sections
      expect(host?.textContent).toContain('Workspace Backup');
      expect(host?.textContent).toContain('Spreadsheet Export & Import');

      // Danger Zone
      expect(host?.textContent).toContain('Danger Zone');
      expect(host?.textContent).toContain('Delete Account');

      // Bottom bar
      expect(host?.textContent).toContain('loading ...');
      expect(host?.textContent).toContain('WORKSPACE SYNC');
    });

    it('renders settings view skeleton explicitly when viewMode="settings"', () => {
      act(() => {
        root!.render(<WorkspaceLoadingState viewMode="settings" />);
      });

      expect(host?.textContent).toContain('Settings');
      expect(host?.textContent).toContain('Danger Zone');
    });

    it('renders top toolbar skeleton only when showToolbar={true}', () => {
      act(() => {
        root!.render(<WorkspaceLoadingState showToolbar />);
      });

      const toolbar = host?.querySelector('header');
      expect(toolbar).toBeTruthy();
      expect(toolbar?.className).toContain('h-13');
    });
  });
});
