import React from 'react';
import { History, ArrowRight } from 'lucide-react';
import { ApplicationStatus, StatusHistoryEntry } from '../../types';
import { StatusBadge } from '../StatusBadge';

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

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-blue-500" />
          Status History
        </h3>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 max-h-[200px] overflow-y-auto shadow-2xs">
        {sortedHistory.length === 0 ? (
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                Created as <StatusBadge status={currentStatus} size="sm" />
              </div>
              <p className="text-[11px] font-mono text-slate-500 mt-1">
                {formatTimestamp(createdAt || stageUpdatedAt || new Date().toISOString())}
              </p>
            </div>
          </div>
        ) : (
          <div className="relative pl-4 space-y-3.5 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
            {sortedHistory.map((entry, idx) => (
              <div key={entry.id || idx} className="relative flex items-start gap-3">
                <div className="absolute -left-4 top-1.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {entry.fromStatus ? (
                      <>
                        <StatusBadge status={entry.fromStatus} size="sm" />
                        <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                        <StatusBadge status={entry.toStatus} size="sm" />
                      </>
                    ) : (
                      <>
                        <span className="text-[11px] font-mono text-slate-500">Set to</span>
                        <StatusBadge status={entry.toStatus} size="sm" />
                      </>
                    )}
                  </div>
                  <p className="text-[11px] font-mono text-slate-500 mt-0.5">{formatTimestamp(entry.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
