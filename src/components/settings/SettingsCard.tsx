import React from 'react';

export interface SettingsCardProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  isDestructive?: boolean;
}

/**
 * SettingsCard
 *
 * Canonical card container primitive for settings panes.
 * Enforces Design System flat-by-default geometry:
 * - Surface White (`bg-white`)
 * - Structural border (`border-slate-200`)
 * - Rounded-2xl (16px) corner radius
 * - Subtle hover micro-border transition
 */
export const SettingsCard: React.FC<SettingsCardProps> = ({
  title,
  subtitle,
  icon,
  badge,
  headerAction,
  children,
  className = '',
  isDestructive = false,
}) => {
  const hasHeader = Boolean(title || subtitle || icon || badge || headerAction);

  return (
    <div
      className={`rounded-2xl border transition-colors duration-150 ${
        isDestructive
          ? 'bg-rose-50/30 border-rose-200/80'
          : 'bg-white border-slate-200/90 hover:border-slate-300/80 shadow-2xs'
      } ${className}`}
    >
      {hasHeader && (
        <div className={`flex flex-col sm:flex-row justify-between gap-3 p-5 sm:p-6 border-b border-slate-100 ${
          subtitle ? 'sm:items-start' : 'sm:items-center'
        }`}>
          <div className={`flex gap-3.5 ${subtitle ? 'items-start' : 'items-center'}`}>
            {icon && (
              <div
                className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${
                  isDestructive
                    ? 'bg-rose-50 border-rose-200/80 text-rose-600'
                    : 'bg-slate-50 border-slate-200/80 text-slate-700'
                }`}
              >
                {icon}
              </div>
            )}
            <div className={subtitle ? 'space-y-1' : ''}>
              <div className="flex flex-wrap items-center gap-2">
                {title && (
                  <h3
                    className={`font-heading font-bold text-base tracking-tight ${
                      isDestructive ? 'text-rose-950' : 'text-slate-900'
                    }`}
                  >
                    {title}
                  </h3>
                )}
                {badge}
              </div>
              {subtitle && (
                <p className="text-xs text-slate-500 font-sans leading-relaxed max-w-xl">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {headerAction && <div className="shrink-0 self-start sm:self-auto">{headerAction}</div>}
        </div>
      )}
      <div className="p-5 sm:p-6 space-y-4">{children}</div>
    </div>
  );
};
