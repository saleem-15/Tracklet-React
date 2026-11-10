import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useUrlNavigation } from '../hooks/useUrlNavigation';
import { ActiveTab, FilterState } from '../types';
import { LegalDocType, navigateToRoute, getPathForLegalDoc } from '../lib/routeUtils';

export interface NavigationContextType {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isNotFound: boolean;
  navigateToLegal: (doc?: LegalDocType) => void;
  filter: FilterState;
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;
  selectedAppId: string | null;
  setSelectedAppId: (id: string | null) => void;
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
  isShortcutsModalOpen: boolean;
  setIsShortcutsModalOpen: (open: boolean) => void;
  openShortcutsModal: () => void;
  closeShortcutsModal: () => void;
  isOnboardingModalOpen: boolean;
  setIsOnboardingModalOpen: (open: boolean) => void;
  onboardingInitialStep: number;
  openOnboardingModal: (initialStep?: number) => void;
  closeOnboardingModal: () => void;
  isImportModalOpen: boolean;
  setIsImportModalOpen: (open: boolean) => void;
  openImportModal: () => void;
  closeImportModal: () => void;
}

export const NavigationContext = createContext<NavigationContextType | null>(null);

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
    isNotFound,
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
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [onboardingInitialStep, setOnboardingInitialStep] = useState(1);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('action') === 'update-extension' || params.has('update-extension');
    } catch {
      return false;
    }
  });

  // Consume update-extension intent from URL on startup
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'update-extension' || params.has('update-extension')) {
        params.delete('action');
        params.delete('update-extension');
        const newSearch = params.toString();
        const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
        window.history.replaceState(null, '', newUrl);
      }
    } catch {
      // ignore
    }
  }, []);

  const openAddModal = useCallback(() => setIsAddModalOpen(true), [setIsAddModalOpen]);
  const closeAddModal = useCallback(() => setIsAddModalOpen(false), [setIsAddModalOpen]);

  const openMobileSidebar = useCallback(() => setIsMobileSidebarOpen(true), []);
  const closeMobileSidebar = useCallback(() => setIsMobileSidebarOpen(false), []);

  const openFeedbackModal = useCallback(() => setIsFeedbackModalOpen(true), []);
  const closeFeedbackModal = useCallback(() => setIsFeedbackModalOpen(false), []);

  const openExtensionModal = useCallback(() => setIsExtensionModalOpen(true), []);
  const closeExtensionModal = useCallback(() => setIsExtensionModalOpen(false), []);

  const openShortcutsModal = useCallback(() => setIsShortcutsModalOpen(true), []);
  const closeShortcutsModal = useCallback(() => setIsShortcutsModalOpen(false), []);

  const navigateToLegal = useCallback((doc: LegalDocType = 'privacy') => {
    navigateToRoute(getPathForLegalDoc(doc));
  }, []);

  const openOnboardingModal = useCallback((initialStep: number = 1) => {
    setOnboardingInitialStep(initialStep);
    setIsOnboardingModalOpen(true);
  }, []);

  const closeOnboardingModal = useCallback(() => {
    setIsOnboardingModalOpen(false);
  }, []);

  const openImportModal = useCallback(() => setIsImportModalOpen(true), []);
  const closeImportModal = useCallback(() => setIsImportModalOpen(false), []);

  const value = useMemo<NavigationContextType>(() => ({
    activeTab,
    setActiveTab,
    isNotFound,
    navigateToLegal,
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
    isShortcutsModalOpen,
    setIsShortcutsModalOpen,
    openShortcutsModal,
    closeShortcutsModal,
    isOnboardingModalOpen,
    setIsOnboardingModalOpen,
    onboardingInitialStep,
    openOnboardingModal,
    closeOnboardingModal,
    isImportModalOpen,
    setIsImportModalOpen,
    openImportModal,
    closeImportModal,
  }), [
    activeTab,
    setActiveTab,
    isNotFound,
    navigateToLegal,
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
    isShortcutsModalOpen,
    openShortcutsModal,
    closeShortcutsModal,
    isOnboardingModalOpen,
    onboardingInitialStep,
    openOnboardingModal,
    closeOnboardingModal,
    isImportModalOpen,
    openImportModal,
    closeImportModal,
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
