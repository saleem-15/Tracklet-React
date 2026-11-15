import React, { useState } from 'react';
import { FilterState, ActiveTab, ApplicationLayout } from '../types';
import { ApplicationsFilterBar } from './ApplicationsFilterBar';
import { MobileFilterDrawer } from './MobileFilterDrawer';
import { useNavigation } from '../context/NavigationContext';
import { useApplicationsContext } from '../context/ApplicationsContext';

export interface TopBarProps {
  filter?: FilterState;
  setFilter?: React.Dispatch<React.SetStateAction<FilterState>>;
  onOpenAddModal?: () => void;
  totalFilteredCount?: number;
  onExportCSV?: () => void;
  activeTab?: ActiveTab;
  onOpenMobileSidebar?: () => void;
  layout?: ApplicationLayout;
  onLayoutChange?: (layout: ApplicationLayout) => void;
}

export const TopBar: React.FC<TopBarProps> = (props) => {
  const nav = useNavigation();
  const apps = useApplicationsContext();

  const filter = props.filter ?? nav.filter;
  const setFilter = props.setFilter ?? nav.setFilter;
  const onOpenAddModal = props.onOpenAddModal ?? nav.openAddModal;
  const totalFilteredCount = props.totalFilteredCount ?? apps.filteredAndSortedApplications.length;
  const onOpenMobileSidebar = props.onOpenMobileSidebar ?? nav.openMobileSidebar;
  const layout = props.layout ?? nav.layout;
  const setLayout = props.onLayoutChange ?? nav.setLayout;

  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  return (
    <>
      <header className="h-13 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2 sm:gap-3 sticky top-0 z-30 text-xs shadow-2xs">
        <ApplicationsFilterBar
          filter={filter}
          setFilter={setFilter}
          layout={layout}
          onLayoutChange={setLayout}
          onOpenAddModal={onOpenAddModal}
          totalFilteredCount={totalFilteredCount}
          onOpenMobileSidebar={onOpenMobileSidebar}
        />
      </header>

      {/* Mobile Filter Drawer */}
      <MobileFilterDrawer
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        filter={filter}
        setFilter={setFilter}
        totalFilteredCount={totalFilteredCount}
      />
    </>
  );
};
