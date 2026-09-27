import React from 'react';
import { History, ArrowRight } from 'lucide-react';
import { ApplicationStatus, StatusHistoryEntry } from '../../types';
import { StatusBadge } from '../StatusBadge';
import { STAGE_CONFIG_MAP } from '../../lib/constants';

export interface StatusHistoryTimelineProps {
  history?: StatusHistoryEntry[];
  currentStatus: ApplicationStatus;
  createdAt?: string;
  stageUpdatedAt?: string;
}

function formatTimestamp(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

export const StatusHistoryTimeline: React.FC<StatusHistoryTimelineProps> = ({
  history = [],
  currentStatus,
  createdAt,
  stageUpdatedAt,
}) => {
  const sortedHistory = React.useMemo(() => {
    return [...history].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return (isNaN(timeA) ? 0 : timeA) < (isNaN(timeB) ? 0 : timeB) ? 1 : -1;
    });
  }, [history]);

  const fallbackConfig = STAGE_CONFIG_MAP[currentStatus] || STAGE_CONFIG_MAP['Applied'];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-blue-500" />
          Status History
        </h3>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs">
        {sortedHistory.length === 0 ? (
          /* Empty state: Rendered within the same unified timeline structure */
          <div className="relative pl-6 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
            <div className="relative flex items-start">
              {/* Perfectly Centered Node: 16px wide container with center at 8px, matching line at 8px (left-[7px] + 1px) */}
              <div className="absolute -left-6 top-0 w-4 h-5 flex items-center justify-center">
                <span className={`w-2 h-2 rounded-full ring-2 ring-white ${fallbackConfig.dot} shrink-0`} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                  <span>Created as</span>
                  <StatusBadge status={currentStatus} size="sm" />
                </div>
                <p className="text-[11px] font-mono text-slate-500 mt-1">
                  {formatTimestamp(createdAt || stageUpdatedAt || new Date().toISOString())}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-[7px] before:top-2.5 before:bottom-2.5 before:w-px before:bg-slate-200">
            {sortedHistory.map((entry, idx) => {
              const stageConfig = STAGE_CONFIG_MAP[entry.toStatus] || fallbackConfig;
              const isLatest = idx === 0;

              return (
                <div key={entry.id || idx} className="relative flex items-start">
                  {/* Perfectly Centered Node: 16px box centered on the 1px spine at x=8px */}
                  <div className="absolute -left-6 top-0 w-4 h-5 flex items-center justify-center">
                    <span
                      className={`w-2 h-2 rounded-full ring-2 ring-white ${stageConfig.dot} shrink-0 ${
                        isLatest ? 'ring-offset-1 ring-slate-100 shadow-2xs' : ''
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0 pl-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {entry.note && (!entry.fromStatus || entry.fromStatus === entry.toStatus) ? (
                        <span className="text-xs font-semibold text-slate-800">{entry.note}</span>
                      ) : entry.fromStatus ? (
                        <>
                          <StatusBadge status={entry.fromStatus} size="sm" />
                          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                          <StatusBadge status={entry.toStatus} size="sm" />
                        </>
                      ) : (
                        <>
                          <span className="text-[11px] font-mono text-slate-500">Set to</span>
                          <StatusBadge status={entry.toStatus} size="sm" />
                        </>
                      )}
                    </div>

                    {entry.note && entry.fromStatus && entry.fromStatus !== entry.toStatus && (
                      <p className="text-xs text-slate-600 mt-0.5">{entry.note}</p>
                    )}

                    <p className="text-[11px] font-mono text-slate-500 mt-0.5 tabular-nums">
                      {formatTimestamp(entry.timestamp)}
                    </p>
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
