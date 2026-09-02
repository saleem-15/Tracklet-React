import React from 'react';
import { Clock, Calendar, AlertCircle } from 'lucide-react';
import { getHumanFollowUpInfo } from '../../lib/contactUtils';

export interface FollowUpBadgeProps {
  dueDateStr?: string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export const FollowUpBadge: React.FC<FollowUpBadgeProps> = ({
  dueDateStr,
  size = 'sm',
  showIcon = true,
}) => {
  const info = getHumanFollowUpInfo(dueDateStr);
  if (!info) return null;

  const styles = {
    overdue: {
      bg: 'bg-rose-50 text-rose-700 border-rose-200/80',
      iconColor: 'text-rose-500',
      Icon: AlertCircle,
    },
    'due-today': {
      bg: 'bg-amber-50 text-amber-800 border-amber-300',
      iconColor: 'text-amber-600',
      Icon: Clock,
    },
    'due-soon': {
      bg: 'bg-amber-50/70 text-amber-700 border-amber-200',
      iconColor: 'text-amber-500',
      Icon: Clock,
    },
    upcoming: {
      bg: 'bg-slate-50 text-slate-700 border-slate-200/80',
      iconColor: 'text-slate-400',
      Icon: Calendar,
    },
  }[info.urgency];

  const { Icon } = styles;

  return (
    <span
      title={`Follow-up: ${info.formattedDate} (${info.relativeLabel})`}
      className={`inline-flex items-center gap-1 font-mono font-medium rounded-md border transition-colors ${
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
      } ${styles.bg}`}
    >
      {showIcon && <Icon className={`w-3 h-3 shrink-0 ${styles.iconColor}`} />}
      <span>{info.shortLabel}</span>
    </span>
  );
};
