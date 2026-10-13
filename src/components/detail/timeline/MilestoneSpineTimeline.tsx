import React, { useState, useMemo } from 'react';
import { History, Calendar, Clock, Edit3, Trash2 } from 'lucide-react';
import { ApplicationStatus, StatusHistoryEntry } from '../../../types';
import { STAGE_CONFIG_MAP, DESTRUCTIVE_ACTION_STYLE } from '../../../lib/constants';
import { calculateDwellTime, formatTimelineTimestamp } from './timelineUtils';
import { MilestoneInlineEditRow } from './MilestoneInlineEditRow';
import { MilestoneInlineDeleteRow } from './MilestoneInlineDeleteRow';

export interface MilestoneSpineTimelineProps {
  history?: StatusHistoryEntry[];
  currentStatus: ApplicationStatus;
  createdAt?: string;
  stageUpdatedAt?: string;
  onUpdateEntry?: (id: string, updates: { toStatus?: ApplicationStatus; timestamp?: string; note?: string }) => void;
  onDeleteEntry?: (id: string) => void;
  onRollbackStatus?: (newStatus: ApplicationStatus) => void;
  isInteractive?: boolean;
}

/**
 * MilestoneSpineTimeline (Design A - Milestone Spine)
 * - Single stage headline per node (zero redundant [From] -> [To] chip clutter)
 * - Uniform spine dot geometry (w-2.5 h-2.5) across all stages with no oversized ping halos
 * - Pure typography for metadata: 📅 Date · ⏱️ Dwell time in stage with tabular-nums (no boxed chips)
 * - Quiet note quote rendered only when notes exist
 * - 100% Inline editing and deletion with automatic status rollback for latest entry
 */
export const MilestoneSpineTimeline: React.FC<MilestoneSpineTimelineProps> = ({
  history = [],
  currentStatus,
  createdAt,
  stageUpdatedAt,
  onUpdateEntry,
  onDeleteEntry,
  onRollbackStatus,
  isInteractive = true,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return (isNaN(timeA) ? 0 : timeA) < (isNaN(timeB) ? 0 : timeB) ? 1 : -1;
    });
  }, [history]);

  const fallbackConfig = STAGE_CONFIG_MAP[currentStatus] || STAGE_CONFIG_MAP['Applied'];

  const handleSaveInline = (
    entryId: string,
    updates: { toStatus?: ApplicationStatus; timestamp?: string; note?: string }
  ) => {
    if (onUpdateEntry) {
      onUpdateEntry(entryId, updates);
    }
    setEditingId(null);
  };

  const handleConfirmDelete = (entry: StatusHistoryEntry) => {
    const isLatest = sortedHistory[0]?.id === entry.id;

    if (onDeleteEntry) {
      onDeleteEntry(entry.id);
    }

    if (isLatest && onRollbackStatus) {
      const previousStatus = entry.fromStatus || (sortedHistory[1] ? sortedHistory[1].toStatus : 'Applied');
      onRollbackStatus(previousStatus);
    }

    setDeletingId(null);
  };

  return (
    <div className="space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-blue-500" />
          Status History
        </h3>
        <div className="flex items-center gap-2">
          {sortedHistory.length > 0 && (
            <span className="text-[11px] font-mono text-slate-500">
              {sortedHistory.length} {sortedHistory.length === 1 ? 'stage' : 'stages'}
            </span>
          )}
        </div>
      </div>

      {/* Timeline Container */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs">
        {sortedHistory.length === 0 ? (
          /* Empty / Initial State */
          <div className="relative pl-7 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            <div className="relative flex items-start">
              <div className="absolute -left-7 top-0.5 w-6 h-5 flex items-center justify-center">
                <span
                  className={`w-2.5 h-2.5 rounded-full ring-2 ring-white ${fallbackConfig.dot} shrink-0 ring-offset-1 ring-slate-300 shadow-2xs`}
                />
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-slate-900 tracking-tight">
                  {fallbackConfig.label}
                </h4>

                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 mt-0.5 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{formatTimelineTimestamp(createdAt || stageUpdatedAt)}</span>
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="flex items-center gap-1 text-slate-600 font-medium tabular-nums">
                    <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{calculateDwellTime(stageUpdatedAt || createdAt).fullLabel} in stage</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Populated Milestones Spine */
          <div className="relative pl-7 space-y-4 before:absolute before:left-[11px] before:top-2.5 before:bottom-2.5 before:w-0.5 before:bg-slate-200">
            {sortedHistory.map((entry, idx) => {
              const isCurrent = idx === 0;
              const nextChronological = idx > 0 ? sortedHistory[idx - 1] : null;
              const dwell = calculateDwellTime(
                entry.timestamp,
                nextChronological ? nextChronological.timestamp : undefined
              );

              const stageConfig = STAGE_CONFIG_MAP[entry.toStatus] || fallbackConfig;
              const isEditing = editingId === entry.id;
              const isDeleting = deletingId === entry.id;
              const previousStatus: ApplicationStatus = entry.fromStatus || (
                sortedHistory[idx + 1] ? sortedHistory[idx + 1].toStatus : 'Applied'
              );

              return (
                <div key={entry.id || idx} className="relative group flex items-start">
                  {/* Semantic Spine Node: Uniform dot size across all nodes */}
                  <div className="absolute -left-7 top-0.5 w-6 h-5 flex items-center justify-center">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ring-2 ring-white ${stageConfig.dot} shrink-0 ${
                        isCurrent ? 'ring-offset-1 ring-slate-300 shadow-2xs' : ''
                      }`}
                    />
                  </div>

                  {/* Main Milestone Content Area */}
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <MilestoneInlineEditRow
                        entry={entry}
                        onSave={handleSaveInline}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : isDeleting ? (
                      <MilestoneInlineDeleteRow
                        entry={entry}
                        isCurrent={isCurrent}
                        previousStatus={previousStatus}
                        onConfirm={() => handleConfirmDelete(entry)}
                        onCancel={() => setDeletingId(null)}
                      />
                    ) : (
                      /* Standard View Row */
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            {/* Milestone Stage Headline */}
                            <h4 className="text-xs font-bold text-slate-900 tracking-tight">
                              {stageConfig.label}
                            </h4>

                            {/* Typographic Metadata: Date & Time · Dwell duration (Pure typography, zero chips) */}
                            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 mt-0.5 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{formatTimelineTimestamp(entry.timestamp)}</span>
                              </span>
                              <span className="text-slate-300">·</span>
                              <span className="flex items-center gap-1 text-slate-600 font-medium tabular-nums">
                                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{dwell.fullLabel} in stage</span>
                              </span>
                            </div>
                          </div>

                          {/* Hover Action Triggers */}
                          {isInteractive && (
                            <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-1 shrink-0 ml-1">
                              {onUpdateEntry && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingId(entry.id);
                                    setDeletingId(null);
                                  }}
                                  title="Edit stage & date"
                                  aria-label={`Edit milestone ${entry.toStatus}`}
                                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              )}
                              {onDeleteEntry && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeletingId(entry.id);
                                    setEditingId(null);
                                  }}
                                  title={isCurrent ? 'Delete & revert stage' : 'Delete milestone'}
                                  aria-label={`Delete milestone ${entry.toStatus}`}
                                  className={`p-1 rounded-md ${DESTRUCTIVE_ACTION_STYLE.iconButton} cursor-pointer`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Quiet Note Quote (Rendered cleanly only when note is present) */}
                        {entry.note && (
                          <p className="mt-1 text-[11px] text-slate-500 italic bg-slate-50/60 border-l-2 border-slate-200 pl-2.5 py-0.5 rounded-r-md">
                            &ldquo;{entry.note}&rdquo;
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
