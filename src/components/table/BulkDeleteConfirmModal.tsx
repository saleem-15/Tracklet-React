import React from 'react';
import { Trash2 } from 'lucide-react';
import { useEscapeKey } from '../../lib/useEscapeKey';

export interface BulkDeleteConfirmModalProps {
  isOpen: boolean;
  selectedCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const BulkDeleteConfirmModal: React.FC<BulkDeleteConfirmModalProps> = ({
  isOpen,
  selectedCount,
  onConfirm,
  onCancel,
}) => {
  // Dismiss prompt on Escape key (topmost on stack)
  useEscapeKey(onCancel, isOpen);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-delete-title"
      aria-describedby="bulk-delete-desc"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-4 text-center animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
          <Trash2 className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h3 id="bulk-delete-title" className="font-bold text-slate-900 text-sm">
            Delete {selectedCount} Application{selectedCount === 1 ? '' : 's'}?
          </h3>
          <p id="bulk-delete-desc" className="text-xs text-slate-500">
            Are you sure you want to delete {selectedCount} application{selectedCount === 1 ? '' : 's'}? This action can be undone from the notification banner.
          </p>
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs cursor-pointer transition-colors shadow-xs"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
