import React, { useState } from 'react';
import { calculateGhostingAndVelocity, StaleAppItem } from '../../lib/analyticsUtils';
import { Application } from '../../types';
import { 
  Clock, 
  CheckCircle, 
  ChevronRight, 
  Mail,
  AlertTriangle
} from 'lucide-react';
import { CompanyLogo } from '../CompanyLogo';

interface ResponseVelocityCardProps {
  applications: Application[];
  onSelectApplication?: (id: string) => void;
  className?: string;
}

export const ResponseVelocityCard: React.FC<ResponseVelocityCardProps> = ({
  applications,
  onSelectApplication,
  className = '',
}) => {
  const [copiedAppId, setCopiedAppId] = useState<string | null>(null);
  const ghosting = calculateGhostingAndVelocity(applications);
  const {
    totalAnalyzed,
    freshCount,
    awaitingCount,
    staleCount,
    ghostedCount,
    ghostingRatePct,
    avgDaysInStage,
    staleApplications,
  } = ghosting;

  const total = Math.max(1, totalAnalyzed);
  const freshPct = Math.round((freshCount / total) * 100);
  const awaitingPct = Math.round((awaitingCount / total) * 100);
  const staleTotal = staleCount + ghostedCount;
  const stalePct = Math.round((staleTotal / total) * 100);

  const handleCopyEmail = (e: React.MouseEvent, app: StaleAppItem) => {
    e.stopPropagation();
    if (app.contactEmail) {
      navigator.clipboard.writeText(app.contactEmail);
      setCopiedAppId(app.id);
      setTimeout(() => setCopiedAppId(null), 2000);
    }
  };

  return (
    <div className={`bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Velocity & Follow-up Queue
            </h3>
          </div>
        </div>

        {/* Ghost Rate & Velocity Badges */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
            ghostingRatePct > 20
              ? 'bg-amber-50 text-amber-800 border-amber-200/80'
              : 'bg-slate-100 text-slate-700 border-slate-200/60'
          }`}>
            Ghost Rate: <strong className="font-bold">{ghostingRatePct}%</strong>
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
            Avg Velocity: <strong className="text-slate-900 font-bold">{avgDaysInStage}d</strong>
          </span>
        </div>
      </div>

      {/* Recency Distribution Bar */}
      <div className="space-y-2">
        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
          {freshCount > 0 && (
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${freshPct}%` }}
              title={`Fresh (<7d): ${freshCount} apps`}
            />
          )}
          {awaitingCount > 0 && (
            <div
              className="bg-blue-500 h-full transition-all duration-500"
              style={{ width: `${awaitingPct}%` }}
              title={`Normal (7-14d): ${awaitingCount} apps`}
            />
          )}
          {staleTotal > 0 && (
            <div
              className="bg-amber-500 h-full transition-all duration-500"
              style={{ width: `${stalePct}%` }}
              title={`Stale/Ghosted (>14d): ${staleTotal} apps (${ghostingRatePct}%)`}
            />
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Fresh (&lt;7d): <strong className="text-slate-800 font-semibold">{freshCount}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Normal (7–14d): <strong className="text-slate-800 font-semibold">{awaitingCount}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Stale / Ghosted (&gt;14d): <strong className="text-amber-700 font-semibold">{staleTotal}</strong> ({ghostingRatePct}%)</span>
          </div>
        </div>
      </div>

      {/* Stale & High Lag Application Action List */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
            Requires Action ({staleApplications.length})
          </span>
          {staleApplications.length > 0 && (
            <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 font-medium">
              Follow up needed
            </span>
          )}
        </div>

        {staleApplications.length === 0 ? (
          <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/70 flex items-center gap-2 text-xs text-emerald-800">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>All active applications have recent momentum (no stale entries &gt;14 days).</span>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            {staleApplications.slice(0, 4).map((app) => (
              <div
                key={app.id}
                onClick={() => onSelectApplication?.(app.id)}
                className="p-2.5 rounded-xl border border-slate-200/70 hover:border-blue-300 bg-slate-50/50 hover:bg-blue-50/20 transition-all flex items-center justify-between gap-2 cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <CompanyLogo company={app.company} size="sm" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-slate-900 truncate">
                        {app.company}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/60 text-slate-600 font-medium">
                        {app.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      {app.role}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${
                    app.daysInStage > 30
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {app.daysInStage}d lag
                  </span>

                  {app.contactEmail ? (
                    <button
                      type="button"
                      onClick={(e) => handleCopyEmail(e, app)}
                      title={`Copy email: ${app.contactEmail}`}
                      className="p-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition-colors"
                    >
                      {copiedAppId === app.id ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Mail className="w-3.5 h-3.5" />
                      )}
                    </button>
                  ) : null}

                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
