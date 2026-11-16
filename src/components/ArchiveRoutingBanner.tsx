import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { ApplicationStatus } from '../types';

export interface ArchiveRoutingBannerProps {
  status: ApplicationStatus | 'All' | 'Active';
  onResetToActive: () => void;
}

export const ArchiveRoutingBanner: React.FC<ArchiveRoutingBannerProps> = ({
  status,
  onResetToActive,
}) => {
  if (status !== 'Archived' && status !== 'Rejected') {
    return null;
  }

  const isArchived = status === 'Archived';

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-slate-900 text-white px-4 py-2.5 text-xs flex items-center justify-between border-b border-slate-800 shrink-0 z-20 animate-in fade-in slide-in-from-top-1 duration-150 motion-reduce:animate-none"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            isArchived ? 'bg-amber-400' : 'bg-rose-400'
          }`}
          aria-hidden="true"
        />
        <span className="font-semibold text-slate-100">
          Viewing {isArchived ? 'Archived' : 'Rejected'} Applications
        </span>
        <span className="text-slate-400 text-[11px] hidden sm:inline truncate">
          — Automatically switched to Table layout for dense audit.
        </span>
      </div>
      <button
        type="button"
        onClick={onResetToActive}
        className="text-xs font-semibold text-blue-300 hover:text-white underline underline-offset-2 transition-colors cursor-pointer shrink-0 ml-3 flex items-center gap-1"
      >
        <ArrowLeft className="w-3 h-3" />
        <span>Back to Active Board</span>
      </button>
    </div>
  );
};
