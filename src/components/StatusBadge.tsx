import React from 'react';
import { ApplicationStatus } from '../types';
import { STAGE_CONFIG_MAP } from '../lib/constants';

interface StatusBadgeProps {
  status: ApplicationStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const config = STAGE_CONFIG_MAP[status] || STAGE_CONFIG_MAP['Applied'];
  const sizeClasses = size === 'sm' 
    ? 'text-[11px] font-mono px-2 py-0.5 rounded-md font-medium' 
    : 'text-xs font-mono px-2.5 py-1 rounded-md font-semibold';

  return (
    <span
      className={`inline-flex items-center gap-1.5 border tracking-tight transition-all ${sizeClasses} ${config.bg} ${config.text} ${config.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} shrink-0`} />
      <span className="whitespace-nowrap">{status}</span>
    </span>
  );
};
