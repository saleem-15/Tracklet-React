import { useContext, useState, useEffect } from 'react';
import { NavigationContext } from '../../context/NavigationContext';
import { LOCAL_STORAGE_KEYS } from '../../lib/constants';
import {
  ApplicationsBoardSkeleton,
  ApplicationsTableSkeleton,
  ApplicationsToolbarSkeleton,
  ContactsHeaderSkeleton,
  ContactsGridSkeleton,
  ContactsTableSkeleton,
  AnalyticsSkeleton,
  SettingsSkeleton,
} from './skeletons';

export interface WorkspaceLoadingStateProps {
  /**
   * When true, renders the Linear-grade focal monolith viewport.
   * Used during cold boot / initial authentication handshake.
   * Default: false (renders in-place workspace content skeleton).
   */
  fullScreen?: boolean;

  /**
   * Whether to include the top action bar skeleton.
   * Default: false (when embedded in WorkspaceContent, TopBar is already mounted above for all/pipeline).
   */
  showToolbar?: boolean;

  /**
   * Controls which view skeleton to render.
   * - 'auto': Inspects active navigation tab ('pipeline' -> 'board', 'contacts' -> 'contacts', 'stats' -> 'stats', 'settings' -> 'settings', otherwise 'table').
   * - 'board': Kanban stage columns.
   * - 'table': Applications table rows.
   * - 'contacts': Contacts view (respects stored grid/table preference).
   * - 'contacts-grid': Contacts card grid.
   * - 'contacts-table': Contacts table rows.
   * - 'stats': Job search analytics & KPIs.
   * - 'settings': Candidate settings hub & account panes.
   * Default: 'auto'.
   */
  viewMode?:
    | 'board'
    | 'table'
    | 'contacts'
    | 'contacts-grid'
    | 'contacts-table'
    | 'stats'
    | 'settings'
    | 'auto';

  /**
   * Custom status label displayed in the discrete branding status anchor.
   * Default: 'loading ...'
   */
  label?: string;

  /**
   * Additional container class names.
   */
  className?: string;
}

/**
 * WorkspaceLoadingState
 *
 * Linear-grade, executive loading experience for Tracklet.
 * Implements the Staged Dissolve architecture:
 *
 * 1. Cold Boot (fullScreen):
 *    - Immaculate, zero-flash bg-slate-50 canvas matching the app shell
 *    - 1.5px top precision vitality rail (hairline progress trace)
 *    - Centered focal Tracklet mark (logo only at start with gentle fade)
 *    - "Texts reveal" transition (transitions.dev) reveals "loading ..." after 300ms
 *
 * 2. In-Workspace (shell mounted):
 *    - Deterministic view skeletons for all 5 workspace tabs:
 *      * Table (All applications)
 *      * Board (Active pipeline Kanban)
 *      * Contacts (Networking directory in Grid or Table layout)
 *      * Analytics (Executive KPIs, conversion funnel, velocity radar, platform ROI)
 *      * Settings (Candidate identity, data portability, danger zone)
 *    - 0 Cumulative Layout Shift (CLS)
 *    - Discreet bottom-bar systems telemetry anchor ("WORKSPACE SYNC")
 *    - Zero circular spinners, zero AI cheerleading copy, zero transition-all
 */
export function WorkspaceLoadingState({
  fullScreen = false,
  showToolbar = false,
  viewMode = 'auto',
  label,
  className = '',
}: WorkspaceLoadingStateProps) {
  const [isTextShown, setIsTextShown] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTextShown(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const navContext = useContext(NavigationContext);
  const activeTab = navContext?.activeTab ?? 'all';

  const isSettingsView = viewMode === 'settings' || (viewMode === 'auto' && activeTab === 'settings');
  const isStatsView = viewMode === 'stats' || (viewMode === 'auto' && activeTab === 'stats');
  const isContactsView =
    viewMode === 'contacts' ||
    viewMode === 'contacts-grid' ||
    viewMode === 'contacts-table' ||
    (viewMode === 'auto' && activeTab === 'contacts');

  const contactsLayout: 'grid' | 'table' = (() => {
    if (viewMode === 'contacts-table') return 'table';
    if (viewMode === 'contacts-grid') return 'grid';
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_KEYS.CONTACTS_LAYOUT) : null;
      return saved === 'table' ? 'table' : 'grid';
    } catch {
      return 'grid';
    }
  })();

  const isBoardView = viewMode === 'board' || (viewMode === 'auto' && activeTab === 'pipeline');
  const statusLabel = label ?? 'loading ...';

  // ── Stage A: Cold Boot Focal Monolith (Linear Aesthetic) ──
  if (fullScreen) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Loading workspace data"
        className="fixed inset-0 h-screen w-screen bg-slate-50 text-slate-900 font-sans select-none overflow-hidden flex flex-col items-center justify-center animate-in fade-in duration-150 motion-reduce:animate-none z-50"
      >
        {/* Top Precision Vitality Rail (1.5px Hairline Tracker) */}
        <div className="fixed top-0 left-0 right-0 h-[2px] bg-slate-200/50 z-50 overflow-hidden">
          <div className="hairline-progress h-full w-1/3 bg-linear-to-r from-transparent via-blue-600 to-transparent" />
        </div>

        {/* Calm Focal Brand Monolith */}
        <div className="flex flex-col items-center gap-3.5 p-8">
          <div className="relative flex items-center justify-center">
            <img
              src="/logo.svg"
              alt="Tracklet"
              className="w-10 h-10 select-none pointer-events-none drop-shadow-xs animate-in fade-in duration-300 motion-reduce:animate-none"
            />
          </div>

          {/* Texts reveal transition from transitions.dev: begins hidden, reveals after 300ms */}
          <div className={`t-stagger ${isTextShown ? 'is-shown' : ''}`}>
            <span className="t-stagger-line font-mono text-[11px] text-slate-400 tracking-wider">
              {statusLabel}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ── Stage B: In-Place Workspace Skeleton (Shell Already Mounted) ──
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading workspace data"
      className={`flex-1 flex flex-col min-h-0 overflow-hidden relative ${
        isSettingsView ? 'bg-white' : 'bg-slate-50'
      } animate-in fade-in duration-150 motion-reduce:animate-none ${className}`}
    >
      {isSettingsView ? (
        <SettingsSkeleton />
      ) : isStatsView ? (
        <AnalyticsSkeleton />
      ) : isContactsView ? (
        <>
          <ContactsHeaderSkeleton layout={contactsLayout} />
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {contactsLayout === 'table' ? <ContactsTableSkeleton /> : <ContactsGridSkeleton />}
          </div>
        </>
      ) : (
        <>
          {showToolbar && <ApplicationsToolbarSkeleton />}
          {isBoardView ? <ApplicationsBoardSkeleton /> : <ApplicationsTableSkeleton />}
        </>
      )}

      {/* Discreet Bottom Status Bar Telemetry Anchor */}
      <footer className="h-7 border-t border-slate-200/70 bg-slate-50/90 px-3 sm:px-4 flex items-center justify-between text-slate-400 select-none shrink-0 backdrop-blur-xs">
        <div className="flex items-center gap-1.5">
          <img
            src="/logo.svg"
            alt=""
            aria-hidden="true"
            className="w-3 h-3 grayscale opacity-50 shrink-0"
          />
          <span className="font-mono text-[11px] text-slate-500 tracking-tight">
            {statusLabel}
          </span>
        </div>
        <div className="font-mono text-[10px] text-slate-400 tracking-wider uppercase">
          WORKSPACE SYNC
        </div>
      </footer>
    </div>
  );
}
