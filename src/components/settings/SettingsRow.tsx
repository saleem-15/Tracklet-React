import React from 'react';

export interface SettingsRowProps {
  title: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode; // Trailing control (switch, select, button, etc.)
  className?: string;
  isDividerVisible?: boolean;
}

/**
 * SettingsRow
 *
 * Apple HIG-grade horizontal list item pattern for settings options.
 * Pairs clear title & explanatory helper text on the leading edge
 * with an interactive control aligned to the trailing edge.
 */
export const SettingsRow: React.FC<SettingsRowProps> = ({
  title,
  subtitle,
  icon,
  children,
  className = '',
  isDividerVisible = false,
}) => {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 ${
        isDividerVisible ? 'border-b border-slate-100' : ''
      } ${className}`}
    >
      <div className="flex items-start gap-3 min-w-0 pr-2">
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0 text-slate-600 mt-0.5">
            {icon}
          </div>
        )}
        <div className="space-y-0.5 min-w-0">
          <div className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug">
            {title}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 font-sans leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="shrink-0 self-start sm:self-auto pt-1 sm:pt-0">{children}</div>
    </div>
  );
};
