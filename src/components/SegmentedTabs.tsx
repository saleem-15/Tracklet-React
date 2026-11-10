import React, { useRef, useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';

export interface TabOption<T extends string = string> {
  id: T;
  label?: string;
  icon?: React.ReactNode;
  badge?: string | number;
  title?: string;
  'aria-label'?: string;
  className?: string;
}

export interface SegmentedTabsProps<T extends string = string> {
  tabs: TabOption<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  className?: string;
  tabClassName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  prefix?: React.ReactNode;
  layoutId?: string;
  activeColor?: 'default' | 'blue';
  hasBorder?: boolean;
  pillBorder?: boolean;
  gap?: boolean;
  inactiveWeight?: 'medium' | 'semibold';
  activeWeight?: 'semibold' | 'bold';
  rounded?: string;
  pillRadius?: string;
}

export function SegmentedTabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  className = '',
  tabClassName = '',
  size = 'md',
  fullWidth = true,
  prefix,
  layoutId,
  activeColor = 'default',
  hasBorder = false,
  pillBorder = false,
  gap = false,
  inactiveWeight = 'medium',
  activeWeight = 'semibold',
  rounded,
  pillRadius,
}: SegmentedTabsProps<T>) {
  const generatedId = useId();
  const activeLayoutId = layoutId || `segmented-pill-${generatedId}`;
  const prefersReducedMotion = useReducedMotion();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabCount = tabs.length;

  const sizeConfig = {
    xs: {
      container: 'p-0.5 text-[11px] h-7',
      containerRadius: 'rounded-lg',
      pillRadius: 'rounded-[6px]',
      buttonText: 'px-2 py-0.5 text-[11px]',
      buttonIcon: 'p-1 aspect-square',
    },
    sm: {
      container: 'p-0.5 text-xs h-8',
      containerRadius: 'rounded-xl',
      pillRadius: 'rounded-lg',
      buttonText: 'px-3 py-1 text-xs',
      buttonIcon: 'p-1.5 aspect-square',
    },
    md: {
      container: 'p-1 text-xs h-9.5',
      containerRadius: 'rounded-xl',
      pillRadius: 'rounded-lg',
      buttonText: 'px-3 py-1.5 text-xs',
      buttonIcon: 'p-2 aspect-square',
    },
    lg: {
      container: 'p-1.5 text-sm h-11',
      containerRadius: 'rounded-2xl',
      pillRadius: 'rounded-xl',
      buttonText: 'px-3.5 py-2 text-sm',
      buttonIcon: 'p-2.5 aspect-square',
    },
  };

  const config = sizeConfig[size as keyof typeof sizeConfig] || sizeConfig.md;
  const effectivePillRadius = pillRadius || config.pillRadius;
  const effectiveContainerRadius = rounded || config.containerRadius;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    if (tabCount <= 1) return;

    let targetIndex = -1;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        targetIndex = (currentIndex + 1) % tabCount;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        targetIndex = (currentIndex - 1 + tabCount) % tabCount;
        break;
      case 'Home':
        e.preventDefault();
        targetIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        targetIndex = tabCount - 1;
        break;
      default:
        return;
    }

    if (targetIndex >= 0 && targetIndex < tabCount) {
      const nextTab = tabs[targetIndex];
      onChange(nextTab.id);
      tabRefs.current[targetIndex]?.focus();
    }
  };

  const activeWeightClass = activeWeight === 'bold' ? 'font-bold' : 'font-semibold';
  const inactiveWeightClass = inactiveWeight === 'medium' ? 'font-medium' : 'font-semibold';

  const activeTextColor =
    activeColor === 'blue'
      ? `text-blue-700 ${activeWeightClass}`
      : `text-slate-900 ${activeWeightClass}`;

  const inactiveTextColor = `text-slate-600 hover:text-slate-900 ${inactiveWeightClass}`;

  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={`relative flex items-center select-none ${
        hasBorder ? 'border border-slate-200/80' : ''
      } ${gap ? 'gap-1' : ''} ${config.container} ${effectiveContainerRadius} ${
        fullWidth ? 'w-full' : 'inline-flex'
      } ${className}`}
    >
      {prefix && (
        <div className="shrink-0 flex items-center select-none" aria-hidden="true">
          {prefix}
        </div>
      )}

      {tabs.map((tab, idx) => {
        const isActive = tab.id === activeTab;
        const isIconOnly = !tab.label && !!tab.icon;
        const accessibleLabel =
          tab['aria-label'] || tab.title || (typeof tab.label === 'string' ? tab.label : undefined);
        const buttonPaddingClass = isIconOnly ? config.buttonIcon : config.buttonText;

        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[idx] = el;
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            title={tab.title || (typeof tab.label === 'string' ? tab.label : undefined)}
            aria-label={accessibleLabel}
            data-tooltip={tab.title}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`relative flex items-center justify-center transition-colors duration-150 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${effectivePillRadius} h-full ${
              fullWidth ? 'flex-1' : 'shrink-0'
            } ${buttonPaddingClass} ${
              isActive ? activeTextColor : inactiveTextColor
            } ${tabClassName} ${tab.className || ''}`}
          >
            {/* Sliding Pill Indicator */}
            {isActive &&
              (prefersReducedMotion ? (
                <span
                  aria-hidden="true"
                  className={`absolute inset-0 bg-white shadow-2xs pointer-events-none ${effectivePillRadius} ${
                    pillBorder ? 'border border-slate-200/90' : ''
                  }`}
                />
              ) : (
                <motion.span
                  layoutId={activeLayoutId}
                  aria-hidden="true"
                  className={`absolute inset-0 bg-white shadow-2xs pointer-events-none ${effectivePillRadius} ${
                    pillBorder ? 'border border-slate-200/90' : ''
                  }`}
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 38,
                    mass: 0.8,
                  }}
                />
              ))}

            {/* Tab Content (relative z-10 ensures it stays above the sliding pill) */}
            <span className="relative z-10 flex items-center justify-center gap-1.5 leading-none">
              {tab.icon && (
                <span className="shrink-0 flex items-center justify-center">
                  {tab.icon}
                </span>
              )}
              {tab.label && <span className="truncate">{tab.label}</span>}
              {tab.badge !== undefined && (
                <span
                  className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-full transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 border border-blue-200/60'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
