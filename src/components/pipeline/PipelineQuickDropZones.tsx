import React from 'react';
import { Archive, XCircle } from 'lucide-react';
import { ApplicationStatus } from '../../types';

export interface PipelineQuickDropZonesProps {
  activeDropTarget: ApplicationStatus | null;
  quickDropRef: React.RefObject<HTMLDivElement | null>;
}

export const PipelineQuickDropZones: React.FC<PipelineQuickDropZonesProps> = ({
  activeDropTarget,
  quickDropRef,
}) => {
  return (
    <div
      ref={quickDropRef}
      role="region"
      aria-label="Quick drop stage actions"
      className="border-t border-slate-200/90 bg-white/95 backdrop-blur-xs p-3 shadow-xl pointer-events-auto"
    >
      <div className="grid grid-cols-2 gap-3 max-w-4xl mx-auto">
        {/* Archive Quick Drop Zone */}
        <div
          data-drop-zone="Archived"
          className={`p-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2.5 transition-colors duration-150 text-xs font-semibold ${
            activeDropTarget === 'Archived'
              ? 'bg-amber-100/90 border-amber-500 text-amber-900 ring-2 ring-amber-400/30 shadow-md scale-[1.01]'
              : 'bg-amber-50/80 border-amber-300 text-amber-800'
          }`}
        >
          <Archive
            className={`w-4 h-4 shrink-0 ${
              activeDropTarget === 'Archived' ? 'text-amber-700' : 'text-amber-600'
            }`}
          />
          <span className="truncate">
            {activeDropTarget === 'Archived' ? 'Release to Archive' : 'Quick Drop: Archive'}
          </span>
        </div>

        {/* Reject Quick Drop Zone */}
        <div
          data-drop-zone="Rejected"
          className={`p-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2.5 transition-colors duration-150 text-xs font-semibold ${
            activeDropTarget === 'Rejected'
              ? 'bg-rose-100/90 border-rose-500 text-rose-900 ring-2 ring-rose-400/30 shadow-md scale-[1.01]'
              : 'bg-rose-50/80 border-rose-300 text-rose-800'
          }`}
        >
          <XCircle
            className={`w-4 h-4 shrink-0 ${
              activeDropTarget === 'Rejected' ? 'text-rose-700' : 'text-rose-600'
            }`}
          />
          <span className="truncate">
            {activeDropTarget === 'Rejected' ? 'Release to Reject' : 'Quick Drop: Reject'}
          </span>
        </div>
      </div>
    </div>
  );
};
