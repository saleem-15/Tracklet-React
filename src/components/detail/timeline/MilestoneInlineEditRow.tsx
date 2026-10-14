import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { ApplicationStatus, StatusHistoryEntry } from '../../../types';
import { APPLICATION_STATUSES, STAGE_CONFIG_MAP } from '../../../lib/constants';
import { CustomSelectDropdown, SelectOption } from '../../CustomSelectDropdown';

export interface MilestoneInlineEditRowProps {
  entry: StatusHistoryEntry;
  onSave: (entryId: string, updates: { toStatus?: ApplicationStatus; timestamp?: string; note?: string }) => void;
  onCancel: () => void;
}

function toLocalDatetimeInput(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

const STAGE_OPTIONS: SelectOption<ApplicationStatus>[] = APPLICATION_STATUSES.map((status) => ({
  value: status,
  label: STAGE_CONFIG_MAP[status]?.label || status,
}));

export const MilestoneInlineEditRow: React.FC<MilestoneInlineEditRowProps> = ({
  entry,
  onSave,
  onCancel,
}) => {
  const [editStatus, setEditStatus] = useState<ApplicationStatus>(entry.toStatus || 'Applied');
  const [editDatetime, setEditDatetime] = useState<string>(toLocalDatetimeInput(entry.timestamp));
  const [editNote, setEditNote] = useState<string>(entry.note || '');

  const handleSave = () => {
    const finalIso = editDatetime ? new Date(editDatetime).toISOString() : new Date().toISOString();
    onSave(entry.id, {
      toStatus: editStatus,
      timestamp: finalIso,
      note: editNote.trim(),
    });
  };

  return (
    <div className="p-3 bg-slate-50 border border-blue-200/90 rounded-xl space-y-2.5 animate-in fade-in duration-150">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-mono uppercase font-bold text-slate-500 block mb-1">
            Stage
          </label>
          <CustomSelectDropdown
            value={editStatus}
            onChange={(val) => setEditStatus(val as ApplicationStatus)}
            options={STAGE_OPTIONS}
            size="sm"
          />
        </div>
        <div>
          <label className="text-[10px] font-mono uppercase font-bold text-slate-500 block mb-1">
            Date & Time
          </label>
          <input
            type="datetime-local"
            value={editDatetime}
            onChange={(e) => setEditDatetime(e.target.value)}
            className="w-full text-xs font-mono text-slate-800 bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] font-mono uppercase font-bold text-slate-500">
            Note (Optional)
          </label>
          {editNote.trim().length > 0 && (
            <button
              type="button"
              onClick={() => setEditNote('')}
              className="text-[10px] font-mono text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
            >
              Clear note
            </button>
          )}
        </div>
        <input
          type="text"
          value={editNote}
          onChange={(e) => setEditNote(e.target.value)}
          placeholder="Brief reason or takeaway..."
          className="w-full text-xs text-slate-800 bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200/60">
        <button
          type="button"
          onClick={onCancel}
          className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200/70 rounded-md transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-2xs transition-colors cursor-pointer"
        >
          <Check className="w-3 h-3" />
          <span>Save Changes</span>
        </button>
      </div>
    </div>
  );
};
