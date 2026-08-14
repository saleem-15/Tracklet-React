import React from 'react';
import { ApplicationStatus } from '../types';

interface StatusBadgeProps {
  status: ApplicationStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const getStyles = (s: ApplicationStatus) => {
    switch (s) {
      case 'Saved':
        return {
          bg: 'bg-purple-50 text-purple-700 border-purple-200/80',
          dot: 'bg-purple-500'
        };
      case 'Applied':
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200/80',
          dot: 'bg-slate-500'
        };
      case 'Screening':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200/80',
          dot: 'bg-amber-500'
        };
      case 'Interview':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200/80',
          dot: 'bg-blue-500'
        };
      case 'Offer':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
          dot: 'bg-emerald-500'
        };
      case 'Rejected':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200/80',
          dot: 'bg-rose-500'
        };
      case 'Archived':
        return {
          bg: 'bg-slate-50 text-slate-500 border-slate-200/60',
          dot: 'bg-slate-400'
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-500'
        };
    }
  };

  const style = getStyles(status);
  const sizeClasses = size === 'sm' 
    ? 'text-[11px] font-mono px-2 py-0.5 rounded-md font-medium' 
    : 'text-xs font-mono px-2.5 py-1 rounded-md font-semibold';

  return (
    <span
      className={`inline-flex items-center gap-1.5 border tracking-tight transition-all ${sizeClasses} ${style.bg}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot} shrink-0`} />
      <span className="whitespace-nowrap">{status}</span>
    </span>
  );
};
