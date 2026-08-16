import { ActiveTab, FilterState, JobPlatform, ApplicationStatus } from '../types';

// ─── Path ↔ Tab mapping ──────────────────────────────────────────────────────

export const TAB_TO_PATH: Record<ActiveTab, string> = {
  all: '/applications',
  pipeline: '/pipeline',
  stats: '/analytics',
  settings: '/settings',
};

export const PATH_TO_TAB: Record<string, ActiveTab> = {
  '/': 'all',
  '/applications': 'all',
  '/pipeline': 'pipeline',
  '/analytics': 'stats',
  '/stats': 'stats',
  '/settings': 'settings',
};

export type AuthRouteMode = 'signin' | 'signup' | 'forgot-password';

export const AUTH_PATH_TO_MODE: Record<string, AuthRouteMode> = {
  '/login': 'signin',
  '/signin': 'signin',
  '/signup': 'signup',
  '/register': 'signup',
  '/forgot-password': 'forgot-password',
};

export function getAuthModeFromPath(pathname: string): AuthRouteMode {
  const normalized =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  return AUTH_PATH_TO_MODE[normalized] || 'signin';
}

export function getPathForAuthMode(mode: AuthRouteMode): string {
  if (mode === 'signup') return '/signup';
  if (mode === 'forgot-password') return '/forgot-password';
  return '/login';
}

export function getTabFromPath(pathname: string): ActiveTab {
  const normalized =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  return PATH_TO_TAB[normalized] || 'all';
}

export function getPathForTab(tab: ActiveTab): string {
  return TAB_TO_PATH[tab] || '/applications';
}

// ─── Default filter sentinel ─────────────────────────────────────────────────

export const DEFAULT_FILTER: FilterState = {
  search: '',
  platform: 'All',
  status: 'All',
  dateRange: 'all',
};

// ─── Query-param keys ─────────────────────────────────────────────────────────

const QP = {
  SEARCH: 'q',
  PLATFORM: 'platform',
  STATUS: 'status',
  DATE: 'date',
  APP: 'app',
  NEW: 'new',
} as const;

// ─── Read state FROM the current URL ─────────────────────────────────────────

export interface UrlState {
  filter: FilterState;
  selectedAppId: string | null;
  isAddModalOpen: boolean;
}

export function readUrlState(): UrlState {
  const params = new URLSearchParams(window.location.search);

  const filter: FilterState = {
    search: params.get(QP.SEARCH) ?? DEFAULT_FILTER.search,
    platform: (params.get(QP.PLATFORM) as JobPlatform | 'All') ?? DEFAULT_FILTER.platform,
    status:
      (params.get(QP.STATUS) as ApplicationStatus | 'All' | 'Active') ?? DEFAULT_FILTER.status,
    dateRange:
      (params.get(QP.DATE) as FilterState['dateRange']) ?? DEFAULT_FILTER.dateRange,
  };

  return {
    filter,
    selectedAppId: params.get(QP.APP) ?? null,
    isAddModalOpen: params.has(QP.NEW),
  };
}

// ─── Build a URLSearchParams from current app state ──────────────────────────

function buildSearchParams(
  filter: FilterState,
  selectedAppId: string | null,
  isAddModalOpen: boolean
): string {
  const params = new URLSearchParams();

  if (filter.search) params.set(QP.SEARCH, filter.search);
  if (filter.platform !== 'All') params.set(QP.PLATFORM, filter.platform);
  if (filter.status !== 'All') params.set(QP.STATUS, filter.status);
  if (filter.dateRange !== 'all') params.set(QP.DATE, filter.dateRange);
  if (selectedAppId) params.set(QP.APP, selectedAppId);
  if (isAddModalOpen) params.set(QP.NEW, '1');

  const str = params.toString();
  return str ? `?${str}` : '';
}

// ─── Sync helpers ─────────────────────────────────────────────────────────────

/**
 * Called when filter changes (search / dropdowns).
 * Uses replaceState so typing "google" doesn't create 6 back-history entries.
 */
export function syncFiltersToUrl(
  filter: FilterState,
  selectedAppId: string | null,
  isAddModalOpen: boolean
): void {
  const search = buildSearchParams(filter, selectedAppId, isAddModalOpen);
  const current = window.location.pathname + window.location.search;
  const next = window.location.pathname + search;
  if (current !== next) {
    window.history.replaceState(null, '', next);
  }
}

/**
 * Called when the selected app changes — pushes a new history entry so
 * pressing Back naturally closes the drawer.
 */
export function syncAppSelectionToUrl(
  appId: string | null,
  filter: FilterState,
  isAddModalOpen: boolean
): void {
  const search = buildSearchParams(filter, appId, isAddModalOpen);
  window.history.pushState(null, '', window.location.pathname + search);
}

/**
 * Called when opening / closing the Add Application modal.
 * Pushes a history entry so pressing Back dismisses the modal.
 */
export function syncAddModalToUrl(
  open: boolean,
  filter: FilterState,
  selectedAppId: string | null
): void {
  const search = buildSearchParams(filter, selectedAppId, open);
  window.history.pushState(null, '', window.location.pathname + search);
}
