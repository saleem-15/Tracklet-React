import React, { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { useEscapeKey } from '../../lib/useEscapeKey';

export interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: () => Promise<void>;
  isDeleting: boolean;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  onConfirmDelete,
  isDeleting,
}) => {
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');

  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-white rounded-3xl border border-rose-200 shadow-2xl overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-600 font-bold text-base" id="delete-account-title">
            <Trash2 className="w-5 h-5" aria-hidden="true" />
            <span>Confirm Permanent Deletion</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-500 hover:text-slate-700 p-1 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          This action is <strong>irreversible</strong>. All your tracked job applications, interview history logs, and cloud credentials will be immediately purged.
        </p>

        <div className="space-y-1.5 pt-1">
          <label htmlFor="confirm-delete-input" className="block text-xs font-mono text-slate-700 font-semibold">
            Type <span className="text-rose-600 font-bold">DELETE</span> to confirm:
          </label>
          <input
            id="confirm-delete-input"
            type="text"
            value={deleteConfirmationInput}
            onChange={(e) => setDeleteConfirmationInput(e.target.value)}
            placeholder="DELETE"
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={deleteConfirmationInput !== 'DELETE' || isDeleting}
            onClick={onConfirmDelete}
            className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-500/20 cursor-pointer disabled:opacity-50 transition-all"
          >
            {isDeleting ? 'Deleting...' : 'Permanently Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};
