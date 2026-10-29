import React from 'react';

export interface SettingsCardProps {
  title?: React.ReactNode;
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
 * Canonical settings section primitive (Untitled UI / Linear pattern).
 * Renders a containerless, borderless vertical section on the white canvas:
 * - No enclosing box, background fill, or drop shadow
 * - Typographic sub-headline header (no icon chrome)
 * - Bottom hairline divider (`border-slate-200/70`), suppressed on the last child
 */
export const SettingsCard: React.FC<SettingsCardProps> = ({
  title,
  subtitle,
  badge,
  headerAction,
  children,
  className = '',
  isDestructive = false,
}) => {
  const hasHeader = Boolean(title || subtitle || badge || headerAction);

  return (
    <section
      className={`py-6 sm:py-8 border-b border-slate-200/70 last:border-b-0 space-y-4 ${className}`}
    >
      {hasHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
          <div className="space-y-1">
            {title && (
              <h3
                className={`font-heading font-bold text-base sm:text-lg tracking-tight ${
                  isDestructive ? 'text-rose-950' : 'text-slate-900'
                }`}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-slate-500 font-sans leading-relaxed max-w-xl">
                {subtitle}
              </p>
            )}
            {badge}
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      )}
      <div className="pt-2">{children}</div>
    </section>
  );
};
