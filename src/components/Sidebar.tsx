import React from 'react';
import { Table, Kanban, BarChart3, Briefcase, LogIn, LogOut, User as UserIcon, RefreshCw, Settings, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
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
    <aside className="w-[210px] shrink-0 bg-slate-50/90 border-r border-slate-200/80 flex flex-col justify-between h-screen sticky top-0 select-none text-slate-900 font-sans text-xs backdrop-blur-xs">
      <div>
        {/* Brand Header */}
        <div className="h-13 px-4 flex items-center justify-between border-b border-slate-200/80">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white shadow-xs shadow-blue-500/20 font-bold">
              <Briefcase className="w-3.5 h-3.5 stroke-[2.2]" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 tracking-tight text-[13px] leading-none">
                Tracklet
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide">
                Job OS
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono bg-slate-200/60 text-slate-600 px-1.5 py-0.5 rounded-md border border-slate-300/50 font-medium">
            v1.0
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="p-2.5 space-y-1">
          <div className="px-2 pt-1 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
            Views
          </div>

          <button
            onClick={() => setActiveTab('all')}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-all text-left group ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 font-semibold border border-slate-200 shadow-xs ring-1 ring-slate-950/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Table className={`w-3.5 h-3.5 transition-colors ${activeTab === 'all' ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
              <span>All Applications</span>
            </div>
            <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-md border transition-colors ${
              activeTab === 'all'
                ? 'text-slate-700 bg-slate-100 border-slate-200 font-medium'
                : 'text-slate-500 bg-slate-100/60 border-slate-200/60'
            }`}>
              {totalCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('pipeline')}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-all text-left group ${
              activeTab === 'pipeline'
                ? 'bg-white text-slate-900 font-semibold border border-slate-200 shadow-xs ring-1 ring-slate-950/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Kanban className={`w-3.5 h-3.5 transition-colors ${activeTab === 'pipeline' ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
              <span>Active Pipeline</span>
            </div>
            {activePipelineCount > 0 && (
              <span className="font-mono text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-200/80 font-semibold">
                {activePipelineCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-all text-left group ${
              activeTab === 'stats'
                ? 'bg-white text-slate-900 font-semibold border border-slate-200 shadow-xs ring-1 ring-slate-950/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <BarChart3 className={`w-3.5 h-3.5 transition-colors ${activeTab === 'stats' ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
              <span>Analytics & Stats</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-all text-left group ${
              activeTab === 'settings'
                ? 'bg-white text-slate-900 font-semibold border border-slate-200 shadow-xs ring-1 ring-slate-950/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Settings className={`w-3.5 h-3.5 transition-colors ${activeTab === 'settings' ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
              <span>Settings</span>
            </div>
            {expirySettings.enabled && expiringTasksCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Tasks due soon" />
            )}
          </button>
        </nav>

        {/* 'Soon to Expire' Notification Indicator Card */}
        {expirySettings.enabled && (
          <div className="mx-2.5 my-2">
            {expiringTasksCount > 0 ? (
              <button
                onClick={() => setActiveTab('settings')}
                className="w-full text-left p-2.5 rounded-xl bg-gradient-to-br from-amber-50/90 via-amber-100/40 to-orange-50/60 border border-amber-200/90 shadow-2xs hover:border-amber-300 transition-all cursor-pointer group space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-amber-600 animate-bounce" />
                    <span>Soon to Expire</span>
                  </div>
                  <span className="font-mono text-[10px] font-extrabold bg-amber-500 text-white px-1.5 py-0.2 rounded-full shadow-2xs">
                    {expiringTasksCount}
                  </span>
                </div>
                <p className="text-[10px] text-amber-800/90 leading-tight">
                  {expiringTasksCount === 1 
                    ? '1 task due within ' + expirySettings.expiryThresholdHours + 'h!' 
                    : `${expiringTasksCount} tasks due within ${expirySettings.expiryThresholdHours}h!`}
                </p>
                <div className="flex items-center justify-between text-[10px] font-mono text-amber-700 font-semibold pt-0.5 border-t border-amber-200/60">
                  <span>View in Settings</span>
                  <ChevronRight className="w-3 h-3 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            ) : (
              <div className="p-2 rounded-xl bg-slate-100/70 border border-slate-200/60 text-[10px] font-mono text-slate-500 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Tasks: Up to date</span>
                </div>
                <span className="text-[9px] text-slate-400">{expirySettings.expiryThresholdHours}h alert</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer / Account section */}

      <div className="p-2.5 border-t border-slate-200/80 space-y-1.5 bg-slate-50/90">
        <button
          onClick={onSeedDemoData}
          title="Reset or reload 20+ realistic job application entries"
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
        >
          <div className="flex items-center gap-2 text-[11px] font-medium">
            <RefreshCw className="w-3 h-3 text-slate-400" />
            <span>Reset Demo Data</span>
          </div>
        </button>

        {user ? (
          <div className="p-1.5 rounded-lg bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between gap-2">
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
                  <UserIcon className="w-3 h-3 text-slate-500" />
                </div>
              )}
              <span className="truncate text-[11px] text-slate-700 font-mono font-medium">
                {user.email ? user.email.split('@')[0] : 'Signed in'}
              </span>
            </div>
            <button
              onClick={onSignOut}
              title="Sign out"
              className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onSignIn}
            className="w-full flex items-center justify-center gap-2 px-2.5 py-2 rounded-lg bg-white hover:bg-slate-100/80 text-slate-900 border border-slate-200 transition-all font-semibold text-xs shadow-2xs hover:shadow-xs active:scale-[0.99]"
          >
            <LogIn className="w-3.5 h-3.5 text-blue-600" />
            <span>Sign In with Google</span>
          </button>
        )}
      </div>
    </aside>
  );
};
