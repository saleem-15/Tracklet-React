import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Kanban, 
  BarChart3, 
  LogIn, 
  LogOut, 
  User as UserIcon, 
  Settings, 
  Clock, 
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { ActiveTab, Application, ExpiryNotificationSettings } from '../types';
import { User } from '../lib/firebase';
import { getExpiringSoonTasks } from '../lib/expiryUtils';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  applications: Application[];
  expirySettings: ExpiryNotificationSettings;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onSeedDemoData: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  applications,
  expirySettings,
  user,
  onSignIn,
  onSignOut,
  onSeedDemoData,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('tracklet_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    try {
      localStorage.setItem('tracklet_sidebar_collapsed', String(nextState));
    } catch (e) {
      console.error(e);
    }
  };

  const activePipelineCount = applications.filter(
    (a) => a.status === 'Screening' || a.status === 'Interview' || a.status === 'Offer'
  ).length;

  const totalCount = applications.filter((a) => a.status !== 'Archived').length;

  // Calculate expiring tasks count based on threshold settings
  const expiringTasks = getExpiringSoonTasks(
    applications,
    expirySettings.expiryThresholdHours
  );
  const expiringTasksCount = expiringTasks.length;

  return (
    <aside 
      className={`${
        isCollapsed ? 'w-[68px]' : 'w-[210px]'
      } shrink-0 bg-slate-50/90 border-r border-slate-200/80 flex flex-col justify-between h-screen sticky top-0 select-none text-slate-900 font-sans text-xs backdrop-blur-xs transition-all duration-200 z-20`}
    >
      <div>
        {/* Brand Header */}
        <div className={`h-13 px-3 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} border-b border-slate-200/80`}>
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <img src="/logo.svg" alt="Tracklet Logo" className="w-7 h-7 shrink-0" />
              <div className="flex flex-col truncate">
                <span className="font-bold text-slate-900 tracking-tight text-xs sm:text-[14px] leading-none font-heading">
                  Tracklet
                </span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wide mt-0.5 font-mono">
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
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-2 space-y-1">
          {!isCollapsed && (
            <div className="px-2.5 pt-1.5 pb-1 text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">
              Views
            </div>
          )}

          <button
            onClick={() => setActiveTab('all')}
            title="All Applications"
            className={`w-full flex items-center ${isCollapsed ? 'justify-center py-2.5 px-0' : 'justify-between px-2.5 py-2'} rounded-[10px] transition-all text-left group cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 font-bold border border-slate-200/90 shadow-xs ring-1 ring-slate-950/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Table className={`w-4 h-4 shrink-0 transition-colors ${activeTab === 'all' ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
              {!isCollapsed && <span className="text-xs">All Applications</span>}
            </div>
            {!isCollapsed ? (
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
            onClick={() => setActiveTab('pipeline')}
            title="Active Pipeline"
            className={`w-full flex items-center ${isCollapsed ? 'justify-center py-2.5 px-0' : 'justify-between px-2.5 py-2'} rounded-[10px] transition-all text-left group cursor-pointer ${
              activeTab === 'pipeline'
                ? 'bg-white text-slate-900 font-bold border border-slate-200/90 shadow-xs ring-1 ring-slate-950/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Kanban className={`w-4 h-4 shrink-0 transition-colors ${activeTab === 'pipeline' ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
              {!isCollapsed && <span className="text-xs">Active Pipeline</span>}
            </div>
            {!isCollapsed ? (
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
            onClick={() => setActiveTab('stats')}
            title="Analytics & Stats"
            className={`w-full flex items-center ${isCollapsed ? 'justify-center py-2.5 px-0' : 'justify-between px-2.5 py-2'} rounded-[10px] transition-all text-left group cursor-pointer ${
              activeTab === 'stats'
                ? 'bg-white text-slate-900 font-bold border border-slate-200/90 shadow-xs ring-1 ring-slate-950/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <BarChart3 className={`w-4 h-4 shrink-0 transition-colors ${activeTab === 'stats' ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
              {!isCollapsed && <span className="text-xs">Analytics & Stats</span>}
            </div>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            title="Settings"
            className={`w-full flex items-center ${isCollapsed ? 'justify-center py-2.5 px-0' : 'justify-between px-2.5 py-2'} rounded-[10px] transition-all text-left group cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-white text-slate-900 font-bold border border-slate-200/90 shadow-xs ring-1 ring-slate-950/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Settings className={`w-4 h-4 shrink-0 transition-colors ${activeTab === 'settings' ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
              {!isCollapsed && <span className="text-xs">Settings</span>}
            </div>
            {expirySettings.enabled && expiringTasksCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Tasks due soon" />
            )}
          </button>
        </nav>

        {/* 'Soon to Expire' Notification Indicator Card */}
        {expirySettings.enabled && (
          <div className="mx-2 my-2">
            {!isCollapsed ? (
              expiringTasksCount > 0 ? (
                <button
                  onClick={() => setActiveTab('settings')}
                  className="w-full text-left p-2.5 rounded-xl bg-gradient-to-br from-amber-50/90 via-amber-100/40 to-orange-50/60 border border-amber-200/90 shadow-2xs hover:border-amber-300 transition-all cursor-pointer group space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Soon to Expire</span>
                    </div>
                    <span className="font-mono text-xs font-extrabold bg-amber-500 text-white px-1.5 py-0.2 rounded-full shadow-2xs animate-pulse">
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
                    <ChevronRight className="w-3 h-3 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              ) : (
                <div className="p-2 rounded-xl bg-slate-100/70 border border-slate-200/60 text-xs font-mono text-slate-500 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Tasks: Up to date</span>
                  </div>
                </div>
              )
            ) : expiringTasksCount > 0 ? (
              <button
                onClick={() => setActiveTab('settings')}
                title={`${expiringTasksCount} tasks expiring soon!`}
                className="w-full flex justify-center p-2 rounded-xl bg-amber-100 border border-amber-300 text-amber-700 animate-pulse"
              >
                <Clock className="w-4 h-4 text-amber-600" />
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* Footer / Account section */}
      <div className="p-2 border-t border-slate-200/80 space-y-1.5 bg-slate-50/90">
        {user ? (
          <div className={`p-1.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} gap-2`}>
            <div className="flex items-center gap-2 min-w-0">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-5 h-5 rounded-full shrink-0 border border-slate-200"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                  <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                </div>
              )}
              {!isCollapsed && (
                <span className="truncate text-xs text-slate-700 font-mono font-medium">
                  {user.email ? user.email.split('@')[0] : 'Signed in'}
                </span>
              )}
            </div>
            {!isCollapsed && (
              <button
                onClick={onSignOut}
                title="Sign out"
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={onSignIn}
            title="Sign In with Google"
            className={`w-full flex items-center justify-center gap-2 ${isCollapsed ? 'p-2' : 'px-2.5 py-2'} rounded-[10px] bg-white hover:bg-slate-100/80 text-slate-900 border border-slate-200 transition-all font-semibold text-xs shadow-2xs hover:shadow-xs active:scale-[0.99] cursor-pointer`}
          >
            <LogIn className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            {!isCollapsed && <span>Sign In with Google</span>}
          </button>
        )}
      </div>
    </aside>
  );
};
