import React from 'react';
import { User, Briefcase, CreditCard, Bell } from 'lucide-react';
import { SettingsPaneId } from '../../types';

export interface NavPaneItem {
  id: SettingsPaneId;
  label: string;
  icon: React.ReactNode;
}

export const SETTINGS_PANE_ITEMS: NavPaneItem[] = [
  {
    id: 'account',
    label: 'Account & Security',
    icon: <User className="w-4 h-4 shrink-0" />,
  },
  {
    id: 'autofill',
    label: 'ATS Autofill',
    icon: <Briefcase className="w-4 h-4 shrink-0" />,
  },
  {
    id: 'billing',
    label: 'Subscription & Billing',
    icon: <CreditCard className="w-4 h-4 shrink-0" />,
  },
  {
    id: 'workflow',
    label: 'Workflow & Alerts',
    icon: <Bell className="w-4 h-4 shrink-0" />,
  },
];

export interface SettingsSubNavProps {
  activePane: SettingsPaneId;
  onSelectPane: (pane: SettingsPaneId) => void;
  className?: string;
}

/**
 * SettingsSubNav
 *
 * Adaptive Master-Detail navigation component:
 * - Desktop (lg: >= 1024px): Sleek vertical sub-navigation rail (w-56 shrink-0)
 * - Mobile / Tablet (< 1024px): Horizontal segmented pill bar with 44px touch targets
 * - Adheres strictly to UI-UX Standards Rule 6 (constant font-weights, transition-colors)
 */
export const SettingsSubNav: React.FC<SettingsSubNavProps> = ({
  activePane,
  onSelectPane,
  className = '',
}) => {
  return (
    <nav
      aria-label="Settings section navigation"
      className={`${className}`}
    >
      {/* ── Mobile / Tablet Segmented Pill Tabs (< 1024px) ── */}
      <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200/80 -mx-4 px-4 sm:mx-0 sm:px-0">
        {SETTINGS_PANE_ITEMS.map((item) => {
          const isActive = activePane === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectPane(item.id)}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer flex items-center gap-2 border transition-colors duration-150 ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Desktop Vertical Navigation Rail (lg: >= 1024px) ── */}
      <div className="hidden lg:flex flex-col space-y-1 w-56 shrink-0 pr-4">
        {SETTINGS_PANE_ITEMS.map((item) => {
          const isActive = activePane === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectPane(item.id)}
              className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-left cursor-pointer flex items-center gap-3 border transition-colors duration-150 ${
                isActive
                  ? 'bg-blue-50 text-blue-900 border-blue-200/80 shadow-2xs'
                  : 'bg-transparent text-slate-600 border-transparent hover:bg-slate-100/70 hover:text-slate-900'
              }`}
            >
              <div
                className={`p-1.5 rounded-lg border transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-500 border-slate-200/80'
                }`}
              >
                {item.icon}
              </div>
              <span
                className={`text-xs font-semibold truncate ${
                  isActive ? 'text-blue-950 font-bold' : 'text-slate-800'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
