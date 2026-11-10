import React, { useState, useEffect } from 'react';
import { Trash2, X } from 'lucide-react';
import { Modal } from '../Modal';

/**
 * Props for DeleteAccountModal.
 */
export interface DeleteAccountModalProps {
  /** Whether the confirmation dialog is currently visible */
  isOpen: boolean;
  /** Callback to close the dialog without deleting */
  onClose: () => void;
  /** Async callback to perform permanent account purge */
  onConfirmDelete: () => Promise<void>;
  /** Whether the account deletion operation is currently processing */
  isDeleting: boolean;
}

/**
 * DeleteAccountModal Component
 *
 * High-friction confirmation modal for permanent account deletion.
 * Enforces typing "DELETE" to prevent accidental data purge.
 * Prevents dismissal via Escape or backdrop click while deletion is in progress.
 */
export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  onConfirmDelete,
  isDeleting,
}) => {
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setDeleteConfirmationInput('');
    }
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      role="dialog"
      ariaLabelledBy="delete-account-title"
      maxWidthClassName="max-w-md"
      className="rounded-3xl border-rose-200 p-6 space-y-4"
      closeOnBackdropClick={!isDeleting}
      closeOnEscape={!isDeleting}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-rose-600 font-bold text-base" id="delete-account-title">
          <Trash2 className="w-5 h-5" aria-hidden="true" />
          <span>Confirm Permanent Deletion</span>
        </div>
        <button
          type="button"
          onClick={isDeleting ? undefined : onClose}
          disabled={isDeleting}
          aria-label="Close"
          className="text-slate-500 hover:text-slate-700 p-1 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          autoComplete="off"
          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-mono"
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirmDelete}
          disabled={deleteConfirmationInput !== 'DELETE' || isDeleting}
          className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-2"
        >
          {isDeleting ? 'Deleting Account...' : 'Permanently Delete'}
        </button>
      </div>
    </Modal>
  );
};
