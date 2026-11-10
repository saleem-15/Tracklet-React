import React from 'react';
import { Trash2 } from 'lucide-react';
import { Modal } from '../Modal';

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
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      role="dialog"
      ariaLabelledBy="bulk-delete-title"
      ariaDescribedBy="bulk-delete-desc"
      maxWidthClassName="max-w-sm"
      className="p-5 space-y-4 text-center"
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
    </Modal>
  );
};
