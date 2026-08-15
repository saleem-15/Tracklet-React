import React, { useState, useMemo } from 'react';
import { Application, ApplicationStatus } from '../types';
import { CompanyLogo } from './CompanyLogo';
import { EmptyState } from './EmptyState';
import { 
  Clock, 
  Building2, 
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Mail,
  CheckSquare,
  Users,
  Archive,
  XCircle,
  X
} from 'lucide-react';
import { calculateDaysInStage } from '../lib/sampleData';

interface ActivePipelineBoardProps {
  applications: Application[];
  totalAppCount?: number;
  onOpenAddModal?: () => void;
  onResetFilters?: () => void;
  onSelectApp: (app: Application) => void;
  selectedAppId: string | null;
  onUpdateStatus: (id: string, newStatus: ApplicationStatus) => void;
}

const PIPELINE_COLUMNS: { status: ApplicationStatus; title: string; dot: string; tagBg: string }[] = [
  { 
    status: 'Saved', 
    title: 'Saved', 
    dot: 'bg-purple-500',
    tagBg: 'text-purple-700 bg-purple-50'
  },
  { 
    status: 'Applied', 
    title: 'Applied', 
    dot: 'bg-slate-400',
    tagBg: 'text-slate-600 bg-slate-100'
  },
  { 
    status: 'Screening', 
    title: 'Screening', 
    dot: 'bg-amber-500',
    tagBg: 'text-amber-700 bg-amber-50'
  },
  { 
    status: 'Interview', 
    title: 'Interview', 
    dot: 'bg-blue-500',
    tagBg: 'text-blue-700 bg-blue-50'
  },
  { 
    status: 'Offer', 
    title: 'Offer', 
    dot: 'bg-emerald-500',
    tagBg: 'text-emerald-700 bg-emerald-50'
  },
];

export const ActivePipelineBoard: React.FC<ActivePipelineBoardProps> = ({
  applications,
  totalAppCount = 0,
  onOpenAddModal,
  onResetFilters,
  onSelectApp,
  selectedAppId,
  onUpdateStatus,
}) => {
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ApplicationStatus | null>(null);
  const [isAttentionDismissed, setIsAttentionDismissed] = useState(false);
  const [lastMovedNotice, setLastMovedNotice] = useState<{
    id: string;
    company: string;
    fromStatus: ApplicationStatus;
    toStatus: ApplicationStatus;
  } | null>(null);

  const staleApps = useMemo(() => {
    return applications.filter(
      (a) =>
        a.status !== 'Rejected' &&
        a.status !== 'Archived' &&
        calculateDaysInStage(a.stageUpdatedAt) > 14
    );
  }, [applications]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedAppId(id);
  };

  const handleDragEnd = () => {
    setDraggedAppId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, status: ApplicationStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== status) {
      setDragOverColumn(status);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>, status: ApplicationStatus) => {
    // Only clear if leaving the main column container
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverColumn === status) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetStatus: ApplicationStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedAppId;
    if (id) {
      const app = applications.find((a) => a.id === id);
      if (app && app.status !== targetStatus) {
        const prevStatus = app.status;
        onUpdateStatus(id, targetStatus);
        setLastMovedNotice({
          id,
          company: app.company,
          fromStatus: prevStatus,
          toStatus: targetStatus,
        });
      }
    }
    setDraggedAppId(null);
    setDragOverColumn(null);
  };

  const draggedApp = applications.find((a) => a.id === draggedAppId);

  return (
    <div className="flex-1 bg-white flex flex-col h-full min-h-0 select-none overflow-hidden relative">
      {/* Status move notification toast */}
      {lastMovedNotice && (
        <div className="absolute bottom-4 right-6 z-30 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-3 text-xs animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Moved <strong className="font-semibold text-white">{lastMovedNotice.company}</strong> to <span className="font-mono text-blue-300 font-semibold">{lastMovedNotice.toStatus}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              onUpdateStatus(lastMovedNotice.id, lastMovedNotice.fromStatus);
              setLastMovedNotice(null);
            }}
            className="ml-1 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 font-semibold px-2 py-0.5 rounded border border-slate-700 text-[11px] transition-colors cursor-pointer"
          >
            Undo
          </button>
        </div>
      )}

      {applications.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
          <EmptyState
            isFiltered={totalAppCount > 0}
            onAddApplication={onOpenAddModal}
            onResetFilters={onResetFilters}
          />
        </div>
      ) : (
        /* Main Single Table Frame (No visible outer column borders) */
        <div className="flex-1 flex flex-col min-h-0 overflow-auto">
        <div className="min-w-[900px] w-full flex-1 flex flex-col">
          {/* "Needs Attention Today" Hero Aggregation Bar */}
          {!isAttentionDismissed && staleApps.length > 0 && (
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs text-amber-900 shrink-0">
              <div className="flex items-center gap-2 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <span>
                  <strong className="font-semibold text-amber-950">Attention Needed:</strong>{' '}
                  <span className="font-semibold">{staleApps.length} application{staleApps.length > 1 ? 's' : ''}</span> have been in active hiring stages for over 14 days without progress updates.
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsAttentionDismissed(true)}
                className="text-amber-700 hover:text-amber-950 p-1 rounded transition-colors cursor-pointer"
                title="Dismiss announcement"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Table Header Row - Streamlined with inline counts */}
          <div className="grid grid-cols-5 bg-slate-50/90 border-b border-slate-200/80 sticky top-0 z-10 backdrop-blur-xs">
            {PIPELINE_COLUMNS.map((col) => {
              const count = applications.filter((app) => app.status === col.status).length;
              const isTargeting = dragOverColumn === col.status;

              return (
                <div
                  key={col.status}
                  className={`px-4 py-3 flex items-center justify-between transition-colors ${
                    isTargeting ? 'bg-blue-50/80' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 font-heading font-bold text-slate-800 text-xs tracking-tight">
                    <span className={`w-2 h-2 rounded-full ${col.dot} shadow-xs shrink-0`} />
                    <span>{col.title}</span>
                    <span className="font-mono text-[11px] font-semibold text-slate-500 ml-0.5">
                      ({count})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Table Body Columns Area - Cards ordered by Staleness (Most Urgent First) */}
          <div className="grid grid-cols-5 flex-1 items-stretch min-h-0 divide-x-0">
            {PIPELINE_COLUMNS.map((col) => {
              const columnApps = applications
                .filter((app) => app.status === col.status)
                .sort((a, b) => calculateDaysInStage(b.stageUpdatedAt) - calculateDaysInStage(a.stageUpdatedAt));
              const isTargeting = dragOverColumn === col.status;

              return (
                <div
                  key={col.status}
                  onDragOver={(e) => handleDragOver(e, col.status)}
                  onDragLeave={(e) => handleDragLeave(e, col.status)}
                  onDrop={(e) => handleDrop(e, col.status)}
                  className={`p-3.5 flex flex-col space-y-2.5 transition-all duration-150 min-h-[400px] ${
                    isTargeting
                      ? 'bg-blue-50/30 ring-2 ring-inset ring-blue-400/30'
                      : 'bg-white hover:bg-slate-50/30'
                  }`}
                >
                  {/* Drop zone placeholder indicator when dragging over column with existing items */}
                  {isTargeting && columnApps.length > 0 && (
                    <div className="py-2 px-3 rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/80 text-blue-700 text-[11px] font-semibold flex items-center justify-center gap-1.5 animate-pulse shrink-0">
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Move application to {col.title}</span>
                    </div>
                  )}

                  {/* Column container with stable DOM structure during drag */}
                  {columnApps.length === 0 ? (
                    <div className="flex-1 min-h-[120px] flex items-center justify-center p-6 text-center text-slate-500 font-mono text-[11px] border border-dashed border-slate-200/60 rounded-xl my-1 bg-slate-50/20">
                      {isTargeting ? (
                        <span className="text-blue-600 font-semibold flex items-center gap-1.5">
                          <ArrowRight className="w-3.5 h-3.5" />
                          Drop application here
                        </span>
                      ) : (
                        `No applications in ${col.title.toLowerCase()}`
                      )}
                    </div>
                  ) : (
                    columnApps.map((app) => {
                      const daysInStage = calculateDaysInStage(app.stageUpdatedAt);
                      const isSelected = selectedAppId === app.id;
                      const isBeingDragged = draggedAppId === app.id;

                      // Company initial avatar color calculation
                      const firstChar = app.company.charAt(0).toUpperCase() || 'C';

                      // Find next stage for quick advance
                      const currentStageIndex = PIPELINE_COLUMNS.findIndex((c) => c.status === app.status);
                      const nextStage = currentStageIndex < PIPELINE_COLUMNS.length - 1 ? PIPELINE_COLUMNS[currentStageIndex + 1] : null;

                      return (
                        <div
                          key={app.id}
                          tabIndex={0}
                          role="button"
                          aria-label={`${app.company}, ${app.role}, in ${col.title}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, app.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => onSelectApp(app)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onSelectApp(app);
                            }
                          }}
                          className={`p-3.5 rounded-xl border transition-all cursor-grab active:cursor-grabbing group relative focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                            isBeingDragged
                              ? 'opacity-40 scale-98 border-dashed border-blue-400 bg-blue-50/30'
                              : isSelected
                              ? 'bg-blue-50/70 border-blue-500/80 ring-1 ring-blue-500/20 shadow-xs'
                              : daysInStage > 14
                              ? 'bg-white hover:bg-slate-50/90 border-slate-200/80 border-l-4 border-l-rose-500 hover:border-blue-300 shadow-2xs hover:shadow-xs hover:-translate-y-0.5'
                              : daysInStage > 7
                              ? 'bg-white hover:bg-slate-50/90 border-slate-200/80 border-l-4 border-l-amber-500 hover:border-blue-300 shadow-2xs hover:shadow-xs hover:-translate-y-0.5'
                              : 'bg-white hover:bg-slate-50/90 border-slate-200/80 hover:border-blue-300 shadow-2xs hover:shadow-xs hover:-translate-y-0.5'
                          }`}
                        >
                          {/* Top Row: Company Avatar & Name */}
                          <div className="flex items-center gap-2 mb-1 min-w-0">
                            <CompanyLogo
                              company={app.company}
                              jobLink={app.jobLink}
                              logoUrl={app.logoUrl}
                              companyDomain={app.companyDomain}
                              size="sm"
                            />

                            <span className="font-heading font-bold text-slate-900 text-xs truncate">
                              {app.company}
                            </span>
                          </div>

                          {/* Role Title - Flush left alignment */}
                          <p className="text-slate-700 text-xs font-semibold truncate mb-2">
                            {app.role}
                          </p>

                          {/* Notes snippet or Tasks/Contacts chips */}
                          {Boolean(app.tasks?.length || app.contacts?.length || app.contactEmail) ? (
                            <div className="flex items-center gap-1.5 flex-wrap mb-2 font-mono text-[10px]">
                              {app.contactEmail ? (
                                <a
                                  href={`mailto:${app.contactEmail}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-800 bg-slate-50 hover:bg-blue-50 px-1.5 py-0.5 rounded border border-slate-200/80 transition-colors"
                                  title={`Contact email: ${app.contactEmail}`}
                                >
                                  <Mail className="w-2.5 h-2.5 text-blue-500" />
                                  <span className="truncate max-w-[110px]">Contact</span>
                                </a>
                              ) : null}
                              {app.tasks && app.tasks.length > 0 ? (
                                <span
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-semibold ${
                                    app.tasks.every((t) => t.completed)
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                                      : 'bg-blue-50 text-blue-700 border-blue-200/80'
                                  }`}
                                  title={`${app.tasks.filter((t) => t.completed).length}/${app.tasks.length} tasks completed`}
                                >
                                  <CheckSquare className="w-2.5 h-2.5" />
                                  <span>{app.tasks.filter((t) => t.completed).length}/{app.tasks.length} tasks</span>
                                </span>
                              ) : null}
                              {app.contacts && app.contacts.length > 0 ? (
                                <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/80" title={`${app.contacts.length} contact(s)`}>
                                  <Users className="w-2.5 h-2.5 text-slate-400" />
                                  <span>{app.contacts.length} contact{app.contacts.length > 1 ? 's' : ''}</span>
                                </span>
                              ) : null}
                            </div>
                          ) : null}

                          {/* Notes snippet if present */}
                          {app.notes ? (
                            <p className="text-slate-500 text-[11px] line-clamp-2 bg-slate-50/80 p-2 rounded-lg border border-slate-200/60 mb-2.5 font-sans leading-relaxed">
                              {app.notes}
                            </p>
                          ) : null}

                          {/* Footer Metadata: Platform Tag + Days in Stage Recency Badge */}
                          <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100/80 gap-1.5">
                            <span className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80 font-medium text-[10px] shrink-0">
                              {app.platform}
                            </span>

                            <span
                              className={`flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-md font-semibold ${
                                daysInStage > 14
                                  ? 'text-rose-700 font-semibold bg-rose-50 border border-rose-200/80'
                                  : daysInStage > 7
                                  ? 'text-amber-700 font-semibold bg-amber-50 border border-amber-200/80'
                                  : 'text-slate-500 bg-slate-100 border border-slate-200/60'
                              }`}
                              title={`In ${app.status} stage for ${daysInStage} days`}
                            >
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>{daysInStage}d</span>
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick-Drop Zones Bar (Archive & Mark Rejected) - expands and fades in smoothly while dragging */}
          <div
            className={`border-t border-slate-200/90 bg-slate-50/90 sticky bottom-0 z-20 backdrop-blur-xs overflow-hidden transition-all duration-300 ease-in-out ${
              draggedAppId !== null
                ? 'max-h-24 opacity-100 p-3 translate-y-0 shadow-lg'
                : 'max-h-0 opacity-0 p-0 translate-y-4 pointer-events-none'
            }`}
          >
            <div className="grid grid-cols-2 gap-3">
              <div
                onDragOver={(e) => handleDragOver(e, 'Archived')}
                onDragLeave={(e) => handleDragLeave(e, 'Archived')}
                onDrop={(e) => handleDrop(e, 'Archived')}
                className={`p-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2.5 transition-all duration-200 text-xs font-semibold ${
                  dragOverColumn === 'Archived'
                    ? 'bg-amber-100/90 border-amber-500 text-amber-900 ring-2 ring-amber-400/30 shadow-md scale-[1.01]'
                    : 'bg-amber-50/80 border-amber-300 text-amber-800 animate-pulse'
                }`}
              >
                <Archive className={`w-4 h-4 shrink-0 ${dragOverColumn === 'Archived' ? 'text-amber-700' : 'text-amber-600'}`} />
                <span>
                  {dragOverColumn === 'Archived' ? 'Release to Archive Application' : 'Quick Drop Zone: Drag here to Archive'}
                </span>
              </div>

              <div
                onDragOver={(e) => handleDragOver(e, 'Rejected')}
                onDragLeave={(e) => handleDragLeave(e, 'Rejected')}
                onDrop={(e) => handleDrop(e, 'Rejected')}
                className={`p-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2.5 transition-all duration-200 text-xs font-semibold ${
                  dragOverColumn === 'Rejected'
                    ? 'bg-rose-100/90 border-rose-500 text-rose-900 ring-2 ring-rose-400/30 shadow-md scale-[1.01]'
                    : 'bg-rose-50/80 border-rose-300 text-rose-800 animate-pulse'
                }`}
              >
                <XCircle className={`w-4 h-4 shrink-0 ${dragOverColumn === 'Rejected' ? 'text-rose-700' : 'text-rose-600'}`} />
                <span>
                  {dragOverColumn === 'Rejected' ? 'Release to Mark as Rejected' : 'Quick Drop Zone: Drag here to Mark Rejected'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
