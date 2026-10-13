import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { ApplicationStatus, StatusHistoryEntry } from '../../../types';
import { STAGE_CONFIG_MAP } from '../../../lib/constants';

export interface MilestoneInlineDeleteRowProps {
  entry: StatusHistoryEntry;
  isCurrent: boolean;
  previousStatus: ApplicationStatus;
  onConfirm: () => void;
  onCancel: () => void;
}

export const MilestoneInlineDeleteRow: React.FC<MilestoneInlineDeleteRowProps> = ({
  isCurrent,
  previousStatus,
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2 animate-in fade-in duration-150">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
        <div className="text-xs text-rose-900 leading-snug">
          {isCurrent ? (
            <span>
              Delete this checkpoint? Application status will automatically revert to{' '}
              <strong className="font-semibold">{STAGE_CONFIG_MAP[previousStatus]?.label || previousStatus}</strong>.
            </span>
          ) : (
            <span>Are you sure you want to delete this historical milestone?</span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-2.5 py-1 text-xs text-slate-600 hover:bg-rose-100/70 rounded-md transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          aria-label="Confirm delete"
          onClick={onConfirm}
          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md shadow-2xs transition-colors cursor-pointer"
        >
          <Trash2 className="w-3 h-3" />
          <span>{isCurrent ? 'Confirm & Revert' : 'Confirm Delete'}</span>
        </button>
      </div>
    </div>
  );
};
