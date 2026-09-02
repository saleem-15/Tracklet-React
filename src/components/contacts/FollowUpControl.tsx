import React, { useState, useRef, useEffect } from 'react';
import { Clock, Calendar, AlertCircle, X, Plus } from 'lucide-react';
import { getHumanFollowUpInfo, getPresetDate } from '../../lib/contactUtils';

export interface FollowUpControlProps {
  dueDateStr?: string;
  onUpdateFollowUp: (dateStr?: string) => void;
  compact?: boolean;
}

const PRESETS = [
  { label: '+3d', days: 3 },
  { label: '+1w', days: 7 },
  { label: '+2w', days: 14 },
];

export const FollowUpControl: React.FC<FollowUpControlProps> = ({
  dueDateStr,
  onUpdateFollowUp,
  compact = false,
}) => {
  const [isPickingCustom, setIsPickingCustom] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const info = getHumanFollowUpInfo(dueDateStr);

  useEffect(() => {
    if (isPickingCustom && dateInputRef.current) {
      dateInputRef.current.focus();
      if ('showPicker' in HTMLInputElement.prototype) {
        try {
          dateInputRef.current.showPicker();
        } catch {
          // Fallback if browser blocks showPicker
        }
      }
    }
  }, [isPickingCustom]);

  const handleApplyPreset = (e: React.MouseEvent, days: number) => {
    e.stopPropagation();
    const date = getPresetDate(days);
    onUpdateFollowUp(date);
    setIsPickingCustom(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateFollowUp(undefined);
    setIsPickingCustom(false);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onUpdateFollowUp(val || undefined);
    setIsPickingCustom(false);
  };

  /* ------------------------------------------------------------- */
  /* STATE 1: NO ACTIVE FOLLOW-UP (Quiet & Compact)                */
  /* ------------------------------------------------------------- */
  if (!info) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => setIsPickingCustom(true)}
          className={`inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 hover:border-blue-400 bg-white hover:bg-blue-50/50 text-slate-600 hover:text-blue-600 font-medium transition-colors cursor-pointer ${
            compact ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-xs'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Set Follow-up</span>
        </button>

        {/* Quick Shortcut Chips */}
        <div className="flex items-center gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={(e) => handleApplyPreset(e, p.days)}
              title={`Set follow-up in ${p.days} days`}
              className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-slate-50 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 border border-slate-200 text-slate-500 rounded-md transition-colors cursor-pointer"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Hidden / Popover Date Picker */}
        {isPickingCustom && (
          <div className="inline-flex items-center gap-1 animate-in fade-in zoom-in-95 duration-150">
            <input
              ref={dateInputRef}
              type="date"
              onChange={handleDateChange}
              onBlur={() => setIsPickingCustom(false)}
              className="bg-white text-slate-900 px-2 py-0.5 rounded-md border border-blue-400 shadow-2xs text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
            />
          </div>
        )}
      </div>
    );
  }

  /* ------------------------------------------------------------- */
  /* STATE 2: ACTIVE FOLLOW-UP (Urgency-Themed Status Pill)         */
  /* ------------------------------------------------------------- */
  const styles = {
    overdue: {
      bg: 'bg-rose-50/80',
      border: 'border-rose-200',
      text: 'text-rose-900',
      badgeBg: 'bg-rose-100/90 text-rose-700 border-rose-300',
      iconColor: 'text-rose-600',
      Icon: AlertCircle,
    },
    'due-today': {
      bg: 'bg-amber-50/80',
      border: 'border-amber-200',
      text: 'text-amber-900',
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
      iconColor: 'text-amber-600',
      Icon: Clock,
    },
    'due-soon': {
      bg: 'bg-amber-50/60',
      border: 'border-amber-200/80',
      text: 'text-amber-900',
      badgeBg: 'bg-amber-100/80 text-amber-700 border-amber-300',
      iconColor: 'text-amber-600',
      Icon: Clock,
    },
    upcoming: {
      bg: 'bg-slate-50/90',
      border: 'border-slate-200',
      text: 'text-slate-800',
      badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
      iconColor: 'text-slate-500',
      Icon: Calendar,
    },
  }[info.urgency];

  const { Icon } = styles;

  return (
    <div
      className={`rounded-xl border p-2 flex items-center justify-between gap-2 flex-wrap transition-colors ${styles.bg} ${styles.border}`}
    >
      {/* Left: Urgency Icon + Relative Label + Date */}
      <div className="flex items-center gap-2 min-w-0">
        <Icon className={`w-4 h-4 shrink-0 ${styles.iconColor}`} />
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border font-mono shrink-0 ${styles.badgeBg}`}
          >
            {info.relativeLabel}
          </span>
          <span className="text-xs text-slate-600 truncate font-medium">
            {info.formattedDate}
          </span>
        </div>
      </div>

      {/* Right: Presets + Change Date + Clear */}
      <div className="flex items-center gap-1 shrink-0 ml-auto" onClick={(e) => e.stopPropagation()}>
        {/* Preset chips for quick rescheduling */}
        <div className="flex items-center gap-0.5">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={(e) => handleApplyPreset(e, p.days)}
              title={`Reschedule to +${p.days} days`}
              className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-white/90 hover:bg-white text-slate-600 hover:text-blue-600 border border-slate-200/80 rounded-md transition-colors cursor-pointer shadow-2xs"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Change Date Trigger */}
        <label
          title="Pick a custom date"
          className="p-1 rounded-md bg-white/90 hover:bg-white border border-slate-200/80 text-slate-600 hover:text-blue-600 transition-colors cursor-pointer shadow-2xs flex items-center justify-center relative"
        >
          <Calendar className="w-3.5 h-3.5" />
          <input
            type="date"
            value={info.dateStr}
            onChange={handleDateChange}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          />
        </label>

        {/* Clear Button */}
        <button
          type="button"
          onClick={handleClear}
          title="Clear follow-up reminder"
          className="p-1 rounded-md bg-white/90 hover:bg-rose-50 border border-slate-200/80 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer shadow-2xs"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
