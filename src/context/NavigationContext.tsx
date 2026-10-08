import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { ActiveTab, FilterState } from '../types';
import { useUrlNavigation } from '../hooks/useUrlNavigation';

export interface NavigationContextType {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  filter: FilterState;
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;
  selectedAppId: string | null;
  setSelectedAppId: (appId: string | null) => void;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
  openAddModal: () => void;
  closeAddModal: () => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  isFeedbackModalOpen: boolean;
  setIsFeedbackModalOpen: (open: boolean) => void;
  openFeedbackModal: () => void;
  closeFeedbackModal: () => void;
  isExtensionModalOpen: boolean;
  setIsExtensionModalOpen: (open: boolean) => void;
  openExtensionModal: () => void;
  closeExtensionModal: () => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

/**
 * NavigationProvider
 *
 * Scoped feature provider for URL-synchronized routing and drawer/modal visibility:
 * - Active tab (synced to window.location.pathname)
 * - Search & Filter parameters (synced to query params ?q=... etc.)
 * - Selected application detail drawer ID (?app=...)
 * - Add application modal visibility (?new=1)
 * - Mobile sidebar drawer state
 *
 * Analogous to Flutter's GoRouter / RouteInformationParser combined with NavigationCubit.
 */
export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    activeTab,
    setActiveTab,
    filter,
    setFilter,
    resetFilters,
    selectedAppId,
    setSelectedAppId,
    isAddModalOpen,
    setIsAddModalOpen,
  } = useUrlNavigation();

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);

  const openAddModal = useCallback(() => setIsAddModalOpen(true), [setIsAddModalOpen]);
  const closeAddModal = useCallback(() => setIsAddModalOpen(false), [setIsAddModalOpen]);

  const openMobileSidebar = useCallback(() => setIsMobileSidebarOpen(true), []);
  const closeMobileSidebar = useCallback(() => setIsMobileSidebarOpen(false), []);

  const openFeedbackModal = useCallback(() => setIsFeedbackModalOpen(true), []);
  const closeFeedbackModal = useCallback(() => setIsFeedbackModalOpen(false), []);

  const openExtensionModal = useCallback(() => setIsExtensionModalOpen(true), []);
  const closeExtensionModal = useCallback(() => setIsExtensionModalOpen(false), []);

  const value = useMemo<NavigationContextType>(() => ({
    activeTab,
    setActiveTab,
    filter,
    setFilter,
    resetFilters,
    selectedAppId,
    setSelectedAppId,
    isAddModalOpen,
    setIsAddModalOpen,
    openAddModal,
    closeAddModal,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    openMobileSidebar,
    closeMobileSidebar,
    isFeedbackModalOpen,
    setIsFeedbackModalOpen,
    openFeedbackModal,
    closeFeedbackModal,
    isExtensionModalOpen,
    setIsExtensionModalOpen,
    openExtensionModal,
    closeExtensionModal,
  }), [
    activeTab,
    setActiveTab,
    filter,
    setFilter,
    resetFilters,
    selectedAppId,
    setSelectedAppId,
    isAddModalOpen,
    setIsAddModalOpen,
    openAddModal,
    closeAddModal,
    isMobileSidebarOpen,
    openMobileSidebar,
    closeMobileSidebar,
    isFeedbackModalOpen,
    openFeedbackModal,
    closeFeedbackModal,
    isExtensionModalOpen,
    openExtensionModal,
    closeExtensionModal,
  ]);

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
