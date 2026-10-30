import React from 'react';
import { SettingsPaneId } from '../../types';

export interface NavPaneItem {
  id: SettingsPaneId;
  label: string;
}

export const SETTINGS_PANE_ITEMS: NavPaneItem[] = [
  { id: 'account', label: 'Account' },
  // { id: 'autofill', label: 'ATS Autofill' },  // temporarily disabled
  // { id: 'billing', label: 'Billing' },         // temporarily disabled
  // { id: 'workflow', label: 'Workflow' },        // temporarily disabled
];

export interface SettingsSubNavProps {
  activePane: SettingsPaneId;
  onSelectPane: (pane: SettingsPaneId) => void;
  className?: string;
}

/**
 * SettingsSubNav
 *
 * Flat, full-width horizontal tab bar (Untitled UI / Linear / Stripe pattern):
 * - Pure text labels with a subtle active bottom underline indicator
 * - No icons, no pill backgrounds, no container boxes
 * - Horizontally scrollable on narrow viewports without a visible scrollbar
 * - Meets the 44px minimum touch target height
 */
export const SettingsSubNav: React.FC<SettingsSubNavProps> = ({
  activePane,
  onSelectPane,
  className = '',
}) => {
  return (
    <nav
      aria-label="Settings section navigation"
      className={`flex items-center gap-6 overflow-x-auto scrollbar-none border-b border-slate-200/80 ${className}`}
    >
      {SETTINGS_PANE_ITEMS.map((item) => {
        const isActive = activePane === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectPane(item.id)}
            aria-current={isActive ? 'page' : undefined}
            className={`min-h-[44px] pb-3 pt-1 text-sm tracking-tight transition-colors whitespace-nowrap cursor-pointer border-b-2 -mb-px ${
              isActive
                ? 'text-blue-600 font-semibold border-blue-600'
                : 'text-slate-600 hover:text-slate-900 font-semibold border-transparent'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
};
