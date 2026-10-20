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

export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  onExportCSV,
  onArchive,
  onReject,
  onDelete,
  onClearSelection,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-blue-50/90 border-b border-blue-200/80 px-4 py-2 flex items-center justify-between gap-3 text-xs text-blue-950 animate-in fade-in slide-in-from-top-1 duration-150 backdrop-blur-xs shrink-0 min-h-10 relative z-20 overflow-x-auto">
      <div className="flex items-center gap-2.5 shrink-0">
        <span className="font-mono text-blue-600 bg-white px-2 py-0.5 rounded-md border border-blue-200 font-semibold shadow-2xs">
          {selectedCount} selected
        </span>
        <span className="text-slate-600 font-medium">Bulk actions:</span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onExportCSV}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all shadow-2xs font-medium cursor-pointer"
          title="Export selected applications to CSV"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export CSV</span>
        </button>

        <button
          type="button"
          onClick={onArchive}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all shadow-2xs font-medium cursor-pointer"
          title="Archive selected applications"
        >
          <Archive className="w-3.5 h-3.5 text-slate-500" />
          <span>Archive</span>
        </button>

        <button
          type="button"
          onClick={onReject}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 transition-all shadow-2xs font-medium cursor-pointer"
          title="Mark selected applications as Rejected"
        >
          <XCircle className="w-3.5 h-3.5 text-rose-600" />
          <span>Mark Rejected</span>
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 active:bg-rose-100 border border-slate-200 hover:border-rose-200 transition-colors shadow-2xs font-medium cursor-pointer"
          title="Delete selected applications (Del)"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete</span>
        </button>

        <button
          type="button"
          onClick={onClearSelection}
          className="text-slate-500 hover:text-slate-900 ml-2 font-mono text-[11px] font-medium cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
