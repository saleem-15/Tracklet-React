import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Kanban, 
  Users,
  BarChart3, 
  LogIn, 
  LogOut, 
  User as UserIcon, 
  Settings, 
  Clock, 
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  X
} from 'lucide-react';
import { ActiveTab, Application, Contact, ExpiryNotificationSettings } from '../types';
import { User } from '../lib/firebase';
import { getExpiringSoonTasks } from '../lib/expiryUtils';
import { getContactsFollowUpDueSoon } from '../lib/contactUtils';
import { useEscapeKey } from '../lib/useEscapeKey';
import { ACTIVE_STATUSES } from '../lib/constants';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  applications: Application[];
  contacts?: Contact[];
  expirySettings: ExpiryNotificationSettings;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onSeedDemoData: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  applications,
  contacts = [],
  expirySettings,
  user,
  onSignIn,
  onSignOut,
  onSeedDemoData,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('tracklet_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Handle escape key to close mobile drawer (stack-aware)
  useEscapeKey(() => {
    if (onCloseMobile) onCloseMobile();
  }, isMobileOpen);

  // Lock body scroll on mobile when drawer is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  const toggleSidebar = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    try {
      localStorage.setItem('tracklet_sidebar_collapsed', String(nextState));
    } catch (e) {
      console.error(e);
    }
  };

  const activePipelineCount = applications.filter((a) =>
    ACTIVE_STATUSES.includes(a.status)
  ).length;

  const totalCount = applications.filter((a) => a.status !== 'Archived').length;

  const expiringTasks = getExpiringSoonTasks(
    applications,
    expirySettings.expiryThresholdHours
  );
  const expiringTasksCount = expiringTasks.length;

  // Calculate follow-up due count for contacts
  const followUpDueCount = getContactsFollowUpDueSoon(
    contacts,
    expirySettings.expiryThresholdHours
  ).length;

  const handleTabClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (isMobileOpen && onCloseMobile) {
      onCloseMobile();
    }
  };

  const handleMobileSignIn = () => {
    onSignIn();
    if (isMobileOpen && onCloseMobile) {
      onCloseMobile();
    }
  };

  const handleMobileSignOut = () => {
    onSignOut();
    if (isMobileOpen && onCloseMobile) {
      onCloseMobile();
    }
  };

  // Shared Navigation list content
  const renderNavItems = (isMobileView = false) => (
    <nav className={`space-y-1 ${isMobileView ? 'p-3' : 'p-2'}`}>
      {(!isCollapsed || isMobileView) && (
        <div className="px-2.5 pt-1.5 pb-1 text-[11px] font-mono uppercase tracking-wider text-slate-500 font-bold">
          Views
        </div>
      )}

      <button
        type="button"
        onClick={() => handleTabClick('all')}
        title="All Applications"
        className={`w-full flex items-center ${
          isMobileView
            ? 'justify-between px-3.5 py-3 min-h-[44px]'
            : isCollapsed
            ? 'justify-center py-2.5 px-0'
            : 'justify-between px-2.5 py-2'
        } rounded-[10px] border transition-colors duration-150 text-left group cursor-pointer font-semibold ${
          activeTab === 'all'
            ? 'bg-white text-slate-900 border-slate-200/90 shadow-xs ring-1 ring-slate-950/5'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 border-transparent'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Table className={`w-4 h-4 shrink-0 transition-colors ${activeTab === 'all' ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-700'}`} />
          {(!isCollapsed || isMobileView) && <span className="text-xs">All Applications</span>}
        </div>
        {!isCollapsed || isMobileView ? (
          <span className={`font-mono text-xs px-1.5 py-0.5 rounded-md border transition-colors ${
            activeTab === 'all'
              ? 'text-slate-800 bg-slate-100 border-slate-200 font-semibold'
              : 'text-slate-500 bg-slate-100/60 border-slate-200/60'
          }`}>
            {totalCount}
          </span>
        ) : totalCount > 0 ? (
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 absolute top-2 right-2" />
        ) : null}
      </button>

      <button
        type="button"
        onClick={() => handleTabClick('pipeline')}
        title="Active Pipeline"
        className={`w-full flex items-center ${
          isMobileView
            ? 'justify-between px-3.5 py-3 min-h-[44px]'
            : isCollapsed
            ? 'justify-center py-2.5 px-0'
            : 'justify-between px-2.5 py-2'
        } rounded-[10px] border transition-colors duration-150 text-left group cursor-pointer font-semibold ${
          activeTab === 'pipeline'
            ? 'bg-white text-slate-900 border-slate-200/90 shadow-xs ring-1 ring-slate-950/5'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 border-transparent'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Kanban className={`w-4 h-4 shrink-0 transition-colors ${activeTab === 'pipeline' ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-700'}`} />
          {(!isCollapsed || isMobileView) && <span className="text-xs">Active Pipeline</span>}
        </div>
        {!isCollapsed || isMobileView ? (
          activePipelineCount > 0 && (
            <span className="font-mono text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-200/80 font-bold">
              {activePipelineCount}
            </span>
          )
        ) : activePipelineCount > 0 ? (
          <span className="w-2 h-2 rounded-full bg-blue-600" />
        ) : null}
      </button>

      <button
        type="button"
        onClick={() => handleTabClick('contacts')}
        title="Contacts & Mentors"
        className={`w-full flex items-center ${
          isMobileView
            ? 'justify-between px-3.5 py-3 min-h-[44px]'
            : isCollapsed
            ? 'justify-center py-2.5 px-0'
            : 'justify-between px-2.5 py-2'
        } rounded-[10px] border transition-colors duration-150 text-left group cursor-pointer font-semibold ${
          activeTab === 'contacts'
            ? 'bg-white text-slate-900 border-slate-200/90 shadow-xs ring-1 ring-slate-950/5'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 border-transparent'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Users className={`w-4 h-4 shrink-0 transition-colors ${activeTab === 'contacts' ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-700'}`} />
          {(!isCollapsed || isMobileView) && <span className="text-xs">Contacts</span>}
        </div>
        {!isCollapsed || isMobileView ? (
          <div className="flex items-center gap-1.5">
            {followUpDueCount > 0 && (
              <span
                className="font-mono text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/80 font-bold animate-pulse motion-reduce:animate-none"
                title={`${followUpDueCount} follow-up${followUpDueCount === 1 ? '' : 's'} due soon`}
              >
                {followUpDueCount}
              </span>
            )}
            <span className={`font-mono text-xs px-1.5 py-0.5 rounded-md border transition-colors ${
              activeTab === 'contacts'
                ? 'text-slate-800 bg-slate-100 border-slate-200 font-semibold'
                : 'text-slate-500 bg-slate-100/60 border-slate-200/60'
            }`}>
              {contacts.length}
            </span>
          </div>
        ) : followUpDueCount > 0 ? (
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse motion-reduce:animate-none" />
        ) : contacts.length > 0 ? (
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
        ) : null}
      </button>

      <button
        type="button"
        onClick={() => handleTabClick('stats')}
        title="Analytics & Stats"
        className={`w-full flex items-center ${
          isMobileView
            ? 'justify-between px-3.5 py-3 min-h-[44px]'
            : isCollapsed
            ? 'justify-center py-2.5 px-0'
            : 'justify-between px-2.5 py-2'
        } rounded-[10px] border transition-colors duration-150 text-left group cursor-pointer font-semibold ${
          activeTab === 'stats'
            ? 'bg-white text-slate-900 border-slate-200/90 shadow-xs ring-1 ring-slate-950/5'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 border-transparent'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <BarChart3 className={`w-4 h-4 shrink-0 transition-colors ${activeTab === 'stats' ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-700'}`} />
          {(!isCollapsed || isMobileView) && <span className="text-xs">Analytics & Stats</span>}
        </div>
      </button>

      <button
        type="button"
        onClick={() => handleTabClick('settings')}
        title="Settings"
        className={`w-full flex items-center ${
          isMobileView
            ? 'justify-between px-3.5 py-3 min-h-[44px]'
            : isCollapsed
            ? 'justify-center py-2.5 px-0'
            : 'justify-between px-2.5 py-2'
        } rounded-[10px] border transition-colors duration-150 text-left group cursor-pointer font-semibold ${
          activeTab === 'settings'
            ? 'bg-white text-slate-900 border-slate-200/90 shadow-xs ring-1 ring-slate-950/5'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 border-transparent'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Settings className={`w-4 h-4 shrink-0 transition-colors ${activeTab === 'settings' ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-700'}`} />
          {(!isCollapsed || isMobileView) && <span className="text-xs">Settings</span>}
        </div>
        {expirySettings.enabled && expiringTasksCount > 0 && (
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse motion-reduce:animate-none" title="Tasks due soon" />
        )}
      </button>
    </nav>
  );

  // Shared Expiring Tasks Card
  const renderExpiringCard = (isMobileView = false) => {
    if (!expirySettings.enabled) return null;

    return (
      <div className={isMobileView ? 'mx-3 my-2' : 'mx-2 my-2'}>
        {!isCollapsed || isMobileView ? (
          expiringTasksCount > 0 ? (
            <button
              type="button"
              onClick={() => handleTabClick('settings')}
              className="w-full text-left p-2.5 rounded-xl bg-gradient-to-br from-amber-50/90 via-amber-100/40 to-orange-50/60 border border-amber-200/90 shadow-2xs hover:border-amber-300 transition-all motion-reduce:transition-none cursor-pointer group space-y-1.5 min-h-[44px]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Soon to Expire</span>
                </div>
                <span className="font-mono text-xs font-extrabold bg-amber-500 text-white px-1.5 py-0.2 rounded-full shadow-2xs animate-pulse motion-reduce:animate-none">
                  {expiringTasksCount}
                </span>
              </div>
              <p className="text-xs text-amber-800/90 leading-tight">
                {expiringTasksCount === 1 
                  ? '1 task due within ' + expirySettings.expiryThresholdHours + 'h!' 
                  : `${expiringTasksCount} tasks due within ${expirySettings.expiryThresholdHours}h!`}
              </p>
              <div className="flex items-center justify-between text-xs font-mono text-amber-700 font-semibold pt-0.5 border-t border-amber-200/60">
                <span>View in Settings</span>
                <ChevronRight className="w-3 h-3 text-amber-600 group-hover:translate-x-0.5 transition-transform motion-reduce:transition-none" />
              </div>
            </button>
          ) : (
            <div className="p-2 rounded-xl bg-slate-100/70 border border-slate-200/60 text-xs font-mono text-slate-500 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Tasks: Up to date</span>
              </div>
            </div>
          )
        ) : expiringTasksCount > 0 ? (
          <button
            type="button"
            onClick={() => handleTabClick('settings')}
            title={`${expiringTasksCount} tasks expiring soon!`}
            className="w-full flex justify-center p-2 rounded-xl bg-amber-100 border border-amber-300 text-amber-700 animate-pulse motion-reduce:animate-none"
          >
            <Clock className="w-4 h-4 text-amber-600" />
          </button>
        ) : null}
      </div>
    );
  };

  // Shared Account Footer
  const renderFooter = (isMobileView = false) => (
    <div className={`border-t border-slate-200/80 space-y-1.5 bg-slate-50/90 ${isMobileView ? 'p-3' : 'p-2'}`}>
      {user ? (
        <div className={`p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center ${!isMobileView && isCollapsed ? 'justify-center' : 'justify-between'} gap-2`}>
          <div className="flex items-center gap-2 min-w-0">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-6 h-6 rounded-full shrink-0 border border-slate-200"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                <UserIcon className="w-4 h-4 text-slate-500" />
              </div>
            )}
            {(isMobileView || !isCollapsed) && (
              <span className="truncate text-xs text-slate-700 font-mono font-medium">
                {user.email ? user.email.split('@')[0] : 'Signed in'}
              </span>
            )}
          </div>
          {(isMobileView || !isCollapsed) && (
            <button
              type="button"
              onClick={handleMobileSignOut}
              title="Sign out"
              aria-label="Sign out"
              className="text-slate-500 hover:text-slate-700 p-2 rounded-md hover:bg-slate-100 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={handleMobileSignIn}
          title="Sign In / Register"
          className={`w-full flex items-center justify-center gap-2 ${
            isMobileView
              ? 'px-3 py-2.5 min-h-[44px]'
              : isCollapsed
              ? 'p-2'
              : 'px-2.5 py-2'
          } rounded-[10px] bg-white hover:bg-slate-100/80 text-slate-900 border border-slate-200 transition-all font-semibold text-xs shadow-2xs hover:shadow-xs active:scale-[0.99] cursor-pointer`}
        >
          <LogIn className="w-4 h-4 text-blue-600 shrink-0" />
          {(isMobileView || !isCollapsed) && <span>Sign In</span>}
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* ── Desktop Sidebar (Visible on md: ≥ 768px) ── */}
      <aside 
        className={`hidden md:flex ${
          isCollapsed ? 'w-[68px]' : 'w-[210px]'
        } shrink-0 bg-slate-50/90 border-r border-slate-200/80 flex-col justify-between h-screen sticky top-0 select-none text-slate-900 font-sans text-xs backdrop-blur-xs transition-all duration-200 z-20`}
      >
        <div>
          {/* Desktop Brand Header */}
          <div className={`h-13 px-3 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} border-b border-slate-200/80`}>
            {!isCollapsed ? (
              <div className="flex items-center gap-2.5 min-w-0">
                <img src="/logo.svg" alt="Tracklet Logo" className="w-7 h-7 shrink-0" />
                <div className="flex flex-col truncate">
                  <span className="font-bold text-slate-900 tracking-tight text-xs sm:text-sm leading-none font-heading">
                    Tracklet
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium tracking-wide mt-0.5 font-mono">
                    Job OS
                  </span>
                </div>
              </div>
            ) : (
              <img src="/logo.svg" alt="Tracklet Logo" className="w-7.5 h-7.5 shrink-0" />
            )}

            <button
              type="button"
              onClick={toggleSidebar}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
            >
              {isCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Desktop Navigation Items */}
          {renderNavItems(false)}

          {/* Desktop Expiring Indicator Card */}
          {renderExpiringCard(false)}
        </div>

        {/* Desktop Footer */}
        {renderFooter(false)}
      </aside>

      {/* ── Mobile Drawer Overlay (Visible on < 768px when opened) ── */}
      {isMobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation Drawer"
          className="fixed inset-0 z-50 flex md:hidden bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 select-none"
          onClick={onCloseMobile}
        >
          <div
            className="w-[280px] max-w-[85vw] h-full bg-slate-50 border-r border-slate-200 shadow-2xl flex flex-col justify-between animate-in slide-in-from-left duration-250 pb-[max(1rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              {/* Mobile Drawer Header */}
              <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200/80 bg-white">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img src="/logo.svg" alt="Tracklet Logo" className="w-7 h-7 shrink-0" />
                  <div className="flex flex-col truncate">
                    <span className="font-bold text-slate-900 tracking-tight text-sm leading-none font-heading">
                      Tracklet
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium tracking-wide mt-0.5 font-mono">
                      Job Application OS
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onCloseMobile}
                  aria-label="Close navigation drawer"
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Navigation List */}
              {renderNavItems(true)}

              {/* Mobile Expiring Tasks Card */}
              {renderExpiringCard(true)}
            </div>

            {/* Mobile Footer */}
            {renderFooter(true)}
          </div>
        </div>
      )}
    </>
  );
};
