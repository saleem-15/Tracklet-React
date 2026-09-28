import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ActiveTab, FilterState } from '../types';
import {
  getTabFromPath,
  getPathForTab,
  readUrlState,
  syncFiltersToUrl,
  syncAppSelectionToUrl,
  syncAddModalToUrl,
  DEFAULT_FILTER,
  isAuthPath,
} from '../lib/routeUtils';

export { DEFAULT_FILTER, getPathForTab, isAuthPath } from '../lib/routeUtils';

export interface UseUrlNavigationReturn {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  filter: FilterState;
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;
  selectedAppId: string | null;
  setSelectedAppId: (appId: string | null) => void;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
}

/**
 * Custom hook to manage URL-synchronized state:
 * - Active tab (synced to window.location.pathname)
 * - Search & Filter parameters (synced to query params)
 * - Selected application detail drawer ID (synced to query param ?app=...)
 * - Add application modal visibility (synced to query param ?new=1)
 * - Browser popstate (Back/Forward buttons) restoration
 */
export function useUrlNavigation(): UseUrlNavigationReturn {
  const initialUrlState = readUrlState();

  const [activeTab, setActiveTabState] = useState<ActiveTab>(() =>
    getTabFromPath(window.location.pathname)
  );
  const [filter, setFilterState] = useState<FilterState>(() => initialUrlState.filter);
  const [selectedAppId, setSelectedAppIdState] = useState<string | null>(
    () => initialUrlState.selectedAppId
  );
  const [isAddModalOpen, setIsAddModalOpenState] = useState<boolean>(
    () => initialUrlState.isAddModalOpen
  );

  // Synchronization refs to avoid stale closures in URL sync helpers
  const filterRef = useRef<FilterState>(initialUrlState.filter);
  const selectedAppIdRef = useRef<string | null>(initialUrlState.selectedAppId);
  const isAddModalOpenRef = useRef<boolean>(initialUrlState.isAddModalOpen);

  const setActiveTab = useCallback((tab: ActiveTab) => {
    setActiveTabState(tab);
    const targetPath = getPathForTab(tab);
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  }, []);

  const setFilter: React.Dispatch<React.SetStateAction<FilterState>> = useCallback((action) => {
    setFilterState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      filterRef.current = next;
      syncFiltersToUrl(next, selectedAppIdRef.current, isAddModalOpenRef.current);
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilter(DEFAULT_FILTER);
  }, [setFilter]);

  const setSelectedAppId = useCallback((appId: string | null) => {
    selectedAppIdRef.current = appId;
    setSelectedAppIdState(appId);
    syncAppSelectionToUrl(appId, filterRef.current, isAddModalOpenRef.current);
  }, []);

  const setIsAddModalOpen = useCallback((open: boolean) => {
    isAddModalOpenRef.current = open;
    setIsAddModalOpenState(open);
    syncAddModalToUrl(open, filterRef.current, selectedAppIdRef.current);
  }, []);

  // Restore state on browser Back / Forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const { filter: uFilter, selectedAppId: uSelectedAppId, isAddModalOpen: uIsAddModalOpen } =
        readUrlState();
      setActiveTabState(getTabFromPath(window.location.pathname));
      filterRef.current = uFilter;
      selectedAppIdRef.current = uSelectedAppId;
      isAddModalOpenRef.current = uIsAddModalOpen;
      setFilterState(uFilter);
      setSelectedAppIdState(uSelectedAppId);
      setIsAddModalOpenState(uIsAddModalOpen);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return {
    activeTab,
    setActiveTab,
    filter,
    setFilter,
    resetFilters,
    selectedAppId,
    setSelectedAppId,
    isAddModalOpen,
    setIsAddModalOpen,
  };
}
