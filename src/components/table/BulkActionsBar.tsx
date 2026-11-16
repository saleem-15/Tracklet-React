import React from 'react';
import { Download, Archive, XCircle, Trash2 } from 'lucide-react';

export interface BulkActionsBarProps {
  selectedCount: number;
  onExportCSV: () => void;
  onArchive: () => void;
  onReject: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
}

/**
 * BulkActionsBar
 *
 * Floating action toast anchored to the bottom center of the table canvas.
 * Appears once rows are selected; Archive/Reject apply instantly with Undo
 * offered by the surrounding toast system, Delete still routes through the
 * confirmation modal.
 */
export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  onExportCSV,
  onArchive,
  onReject,
  onDelete,
  onClearSelection,
}) => {
  if (selectedCount === 0) return null;

  const baseButtonClass =
    'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-slate-200 hover:bg-white/10 active:bg-white/15 transition-colors duration-150 font-medium text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 whitespace-nowrap';

  return (
    <div
      role="toolbar"
      aria-label="Bulk actions for selected applications"
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 max-w-[calc(100%-2rem)] bg-slate-900/95 backdrop-blur-md border border-slate-700/60 shadow-2xl rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-white animate-in fade-in slide-in-from-bottom-2 duration-200 motion-reduce:animate-none overflow-x-auto select-none"
    >
      <div className="flex items-center gap-2.5 shrink-0">
        <span className="font-mono text-[11px] font-semibold bg-white/10 text-white px-2 py-0.5 rounded-md tabular-nums">
          {selectedCount} selected
        </span>
        <span className="text-slate-400 font-medium hidden sm:inline">Bulk actions:</span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button type="button" onClick={onExportCSV} className={baseButtonClass} title="Export selected applications to CSV">
          <Download className="w-3.5 h-3.5 text-slate-400" />
          <span>Export CSV</span>
        </button>

        <button type="button" onClick={onArchive} className={baseButtonClass} title="Archive selected applications">
          <Archive className="w-3.5 h-3.5 text-slate-400" />
          <span>Archive</span>
        </button>

        <button
          type="button"
          onClick={onReject}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-rose-300 hover:bg-rose-500/15 active:bg-rose-500/25 transition-colors duration-150 font-medium text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 whitespace-nowrap"
          title="Mark selected applications as Rejected"
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>Mark Rejected</span>
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-slate-300 hover:text-rose-300 hover:bg-rose-500/10 active:bg-rose-500/20 transition-colors duration-150 font-medium text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 whitespace-nowrap"
          title="Delete selected applications (Del)"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete</span>
        </button>

        <button
          type="button"
          onClick={onClearSelection}
          aria-label="Clear selection"
          className="text-slate-400 hover:text-white ml-1 font-mono text-[11px] font-medium cursor-pointer whitespace-nowrap"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
