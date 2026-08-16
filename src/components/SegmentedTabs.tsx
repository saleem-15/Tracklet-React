import React from 'react';

export interface TabOption<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface SegmentedTabsProps<T extends string = string> {
  tabs: TabOption<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export function SegmentedTabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  className = '',
  size = 'md',
  fullWidth = true,
}: SegmentedTabsProps<T>) {
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.id === activeTab));
  const tabCount = tabs.length;

  const sizeConfig = {
    sm: {
      container: 'p-0.5 rounded-lg text-[11px] h-7',
      pill: 'top-0.5 bottom-0.5 left-0.5 rounded-[6px]',
      insetPx: 2,
    },
    md: {
      container: 'p-1 rounded-xl text-xs sm:text-[13px] h-10',
      pill: 'top-1 bottom-1 left-1 rounded-lg',
      insetPx: 4,
    },
    lg: {
      container: 'p-1.5 rounded-2xl text-sm h-11',
      pill: 'top-1.5 bottom-1.5 left-1.5 rounded-xl',
      insetPx: 6,
    },
  };

  const config = sizeConfig[size as 'sm' | 'md' | 'lg'] || sizeConfig.md;

  return (
    <div
      role="tablist"
      className={`relative flex items-center bg-slate-100/90 border border-slate-200/80 select-none ${config.container} ${
        fullWidth ? 'w-full' : 'inline-flex'
      } ${className}`}
    >
      {/* Smooth Sliding Pill Indicator with exact 4-side margin */}
      {tabCount > 0 && (
        <div
          aria-hidden="true"
          className={`absolute bg-white shadow-xs border border-slate-200/90 pointer-events-none transition-transform duration-200 ease-out ${config.pill}`}
          style={{
            width: `calc((100% - ${config.insetPx * 2}px) / ${tabCount})`,
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        />
      )}

      {/* Tab Buttons */}
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 font-bold transition-colors duration-150 cursor-pointer h-full px-2.5 ${
              isActive ? 'text-slate-900 font-semibold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span className="truncate">{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 border border-blue-200/60'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
