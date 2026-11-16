import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ActiveTab, FilterState, ApplicationLayout } from '../types';
import {
  getTabFromPath,
  getPathForTab,
  readUrlState,
  syncFiltersToUrl,
  syncAppSelectionToUrl,
  syncAddModalToUrl,
  syncLayoutToUrl,
  DEFAULT_FILTER,
  isAuthPath,
  isKnownRoute,
} from '../lib/routeUtils';

export { DEFAULT_FILTER, getPathForTab, isAuthPath, isKnownRoute } from '../lib/routeUtils';

export interface UseUrlNavigationReturn {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isNotFound: boolean;
  filter: FilterState;
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;
  selectedAppId: string | null;
  setSelectedAppId: (appId: string | null) => void;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
  layout: ApplicationLayout;
  setLayout: (layout: ApplicationLayout) => void;
}

/**
 * Custom hook to manage URL-synchronized state:
 * - Active tab (synced to window.location.pathname)
 * - Search & Filter parameters (synced to query params)
 * - Selected application detail drawer ID (synced to query param ?app=...)
 * - Add application modal visibility (synced to query param ?new=1)
 * - Layout lens mode (Board ⇄ Table, synced to ?layout=board|table and localStorage)
 * - Browser popstate (Back/Forward buttons) restoration
 */
export function useUrlNavigation(): UseUrlNavigationReturn {
  const initialUrlState = readUrlState();

  const [activeTab, setActiveTabState] = useState<ActiveTab>(() =>
    getTabFromPath(window.location.pathname)
  );
  const [isNotFound, setIsNotFoundState] = useState<boolean>(() =>
    !isKnownRoute(window.location.pathname)
  );
  const [filter, setFilterState] = useState<FilterState>(() => initialUrlState.filter);
  const [selectedAppId, setSelectedAppIdState] = useState<string | null>(
    () => initialUrlState.selectedAppId
  );
  const [isAddModalOpen, setIsAddModalOpenState] = useState<boolean>(
    () => initialUrlState.isAddModalOpen
  );
  const [layout, setLayoutState] = useState<ApplicationLayout>(() => initialUrlState.layout);

  // Synchronization refs to avoid stale closures in URL sync helpers
  const filterRef = useRef<FilterState>(initialUrlState.filter);
  const selectedAppIdRef = useRef<string | null>(initialUrlState.selectedAppId);
  const isAddModalOpenRef = useRef<boolean>(initialUrlState.isAddModalOpen);
  const layoutRef = useRef<ApplicationLayout>(initialUrlState.layout);

  // Redirect legacy /pipeline and /all-applications paths to /applications preserving query params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname === '/pipeline' || pathname === '/all-applications') {
        const targetLayout: ApplicationLayout = pathname === '/pipeline' ? 'board' : 'table';
        const searchParams = new URLSearchParams(window.location.search);
        if (!searchParams.has('layout')) {
          searchParams.set('layout', targetLayout);
        }
        const searchStr = searchParams.toString() ? `?${searchParams.toString()}` : '';
        window.history.replaceState(null, '', `/applications${searchStr}`);
        setActiveTabState('all');
        setLayoutState(targetLayout);
        layoutRef.current = targetLayout;
      }
    }
  }, []);

  const setLayout = useCallback((newLayout: ApplicationLayout) => {
    if (layoutRef.current === newLayout) return;
    layoutRef.current = newLayout;
    setLayoutState(newLayout);
    try {
      localStorage.setItem('tracklet_preferred_layout', newLayout);
    } catch {
      // ignore
    }
    syncLayoutToUrl(newLayout, filterRef.current, selectedAppIdRef.current, isAddModalOpenRef.current);
  }, []);

  const setActiveTab = useCallback((tab: ActiveTab) => {
    setActiveTabState(tab);
    setIsNotFoundState(false);
    if (tab === 'pipeline') {
      setLayoutState('board');
      layoutRef.current = 'board';
    }
    const targetPath = getPathForTab(tab);
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  }, []);

  const setFilter: React.Dispatch<React.SetStateAction<FilterState>> = useCallback((action) => {
    setFilterState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      filterRef.current = next;
      syncFiltersToUrl(next, selectedAppIdRef.current, isAddModalOpenRef.current, layoutRef.current);
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilter(DEFAULT_FILTER);
  }, [setFilter]);

  const setSelectedAppId = useCallback((appId: string | null) => {
    selectedAppIdRef.current = appId;
    setSelectedAppIdState(appId);
    syncAppSelectionToUrl(appId, filterRef.current, isAddModalOpenRef.current, layoutRef.current);
  }, []);

  const setIsAddModalOpen = useCallback((open: boolean) => {
    isAddModalOpenRef.current = open;
    setIsAddModalOpenState(open);
    syncAddModalToUrl(open, filterRef.current, selectedAppIdRef.current, layoutRef.current);
  }, []);

  // Restore state on browser Back / Forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const pathname = window.location.pathname;
      if (pathname === '/pipeline' || pathname === '/all-applications') {
        const targetLayout: ApplicationLayout = pathname === '/pipeline' ? 'board' : 'table';
        const searchParams = new URLSearchParams(window.location.search);
        if (!searchParams.has('layout')) {
          searchParams.set('layout', targetLayout);
        }
        const searchStr = searchParams.toString() ? `?${searchParams.toString()}` : '';
        window.history.replaceState(null, '', `/applications${searchStr}`);
      }

      const { filter: uFilter, selectedAppId: uSelectedAppId, isAddModalOpen: uIsAddModalOpen, layout: uLayout } =
        readUrlState();
      setActiveTabState(getTabFromPath(window.location.pathname));
      setIsNotFoundState(!isKnownRoute(window.location.pathname));
      filterRef.current = uFilter;
      selectedAppIdRef.current = uSelectedAppId;
      isAddModalOpenRef.current = uIsAddModalOpen;
      layoutRef.current = uLayout;
      setFilterState(uFilter);
      setSelectedAppIdState(uSelectedAppId);
      setIsAddModalOpenState(uIsAddModalOpen);
      setLayoutState(uLayout);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return {
    activeTab,
    setActiveTab,
    isNotFound,
    filter,
    setFilter,
    resetFilters,
    selectedAppId,
    setSelectedAppId,
    isAddModalOpen,
    setIsAddModalOpen,
    layout,
    setLayout,
  };
}
