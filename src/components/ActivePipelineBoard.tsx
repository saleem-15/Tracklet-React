import React, { useState, useMemo, useRef } from 'react';
import { Application, ApplicationStatus } from '../types';
import { CompanyLogo } from './CompanyLogo';
import { EmptyState } from './EmptyState';
import { OnboardingEmptyState } from './OnboardingEmptyState';
import { 
  Clock, 
  CheckCircle2,
  ArrowRight,
  Mail,
  CheckSquare,
  Users,
  Archive,
  XCircle,
  X,
  ChevronRight
} from 'lucide-react';
import { calculateDaysInStage } from '../lib/sampleData';

interface ActivePipelineBoardProps {
  applications: Application[];
  totalAppCount?: number;
  onOpenAddModal?: () => void;
  onResetFilters?: () => void;
  onSeedDemoData?: () => void;
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
    dot: 'bg-slate-500',
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
  onSeedDemoData,
  onSelectApp,
  selectedAppId,
  onUpdateStatus,
}) => {
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ApplicationStatus | null>(null);
  const [isAttentionDismissed, setIsAttentionDismissed] = useState(false);

  // Column refs for mobile stage jump scrolling
  const columnRefs = useRef<{ [key in ApplicationStatus]?: HTMLDivElement | null }>({});

  const scrollToColumn = (status: ApplicationStatus) => {
    const el = columnRefs.current[status];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

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
        onUpdateStatus(id, targetStatus);
      }
    }
    setDraggedAppId(null);
    setDragOverColumn(null);
  };

  const handleQuickAdvance = (e: React.SyntheticEvent, app: Application, nextStatus: ApplicationStatus) => {
    e.stopPropagation();
    onUpdateStatus(app.id, nextStatus);
  };

  return (
    <div className="flex-1 bg-white flex flex-col h-full min-h-0 select-none overflow-hidden relative">
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* "Needs Attention Today" Hero Banner (Responsive layout) */}
        {!isAttentionDismissed && staleApps.length > 0 && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-3.5 py-2.5 flex items-center justify-between text-xs text-amber-900 shrink-0 gap-2">
            <div className="flex items-center gap-2 font-medium min-w-0">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse motion-reduce:animate-none shrink-0" />
              <span className="leading-snug">
                <strong className="font-semibold text-amber-950">Attention Needed:</strong>{' '}
                <span className="font-semibold">{staleApps.length} application{staleApps.length > 1 ? 's' : ''}</span> have been in active hiring stages for over 14 days without progress updates.
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsAttentionDismissed(true)}
              className="text-amber-700 hover:text-amber-950 p-1.5 rounded transition-colors cursor-pointer shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
              title="Dismiss announcement"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Mobile Stage Jump Tabs Bar (Visible only on < 768px) ── */}
        <div className="md:hidden flex items-center gap-1.5 p-2 bg-slate-50/95 border-b border-slate-200/80 overflow-x-auto shrink-0 no-scrollbar">
          {PIPELINE_COLUMNS.map((col) => {
            const count = applications.filter((app) => app.status === col.status).length;
            return (
              <button
                key={col.status}
                type="button"
                onClick={() => scrollToColumn(col.status)}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs font-semibold text-xs whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 min-h-[34px]"
              >
                <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                <span>{col.title}</span>
                <span className="font-mono text-[11px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded-full">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Desktop Column Headers Bar (Visible on md: ≥ 768px) ── */}
        <div className="hidden md:grid md:grid-cols-5 bg-slate-50/80 border-b border-slate-200/80 sticky top-0 z-10 backdrop-blur-xs min-w-[900px]">
          {PIPELINE_COLUMNS.map((col) => {
            const count = applications.filter((app) => app.status === col.status).length;
            const isTargeting = dragOverColumn === col.status;

            return (
              <div
                key={col.status}
                className={`px-3 py-2.5 flex items-center justify-between transition-colors ${
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

        {applications.length === 0 ? (
          <div className="flex-1 overflow-y-auto">
            {totalAppCount === 0 && onOpenAddModal && onSeedDemoData ? (
              <OnboardingEmptyState
                onOpenAddModal={onOpenAddModal}
                onSeedDemoData={onSeedDemoData}
              />
            ) : (
              <EmptyState
                isFiltered={totalAppCount > 0}
                onAddApplication={onOpenAddModal}
                onResetFilters={onResetFilters}
              />
            )}
          </div>
        ) : (
          <>
            {/* ── Kanban Columns Area (Mobile Horizontal Swipe Snap + Desktop 5-Col Grid) ── */}
            <div className="flex-1 flex md:grid md:grid-cols-5 min-h-0 overflow-x-auto md:overflow-y-auto snap-x snap-mandatory md:snap-none scroll-smooth p-3 md:p-0 gap-3 md:gap-0 md:min-w-[900px]">
            {PIPELINE_COLUMNS.map((col, index) => {
              const columnApps = applications
                .filter((app) => app.status === col.status)
                .sort((a, b) => calculateDaysInStage(b.stageUpdatedAt) - calculateDaysInStage(a.stageUpdatedAt));
              const isTargeting = dragOverColumn === col.status;
              const prevColumn = index > 0 ? PIPELINE_COLUMNS[index - 1] : null;
              const nextColumn = index < PIPELINE_COLUMNS.length - 1 ? PIPELINE_COLUMNS[index + 1] : null;

              return (
                <div
                  key={col.status}
                  ref={(el) => { columnRefs.current[col.status] = el; }}
                  onDragOver={(e) => handleDragOver(e, col.status)}
                  onDragLeave={(e) => handleDragLeave(e, col.status)}
                  onDrop={(e) => handleDrop(e, col.status)}
                  className={`w-[85vw] sm:w-[320px] md:w-auto shrink-0 snap-center md:shrink md:snap-align-none rounded-2xl md:rounded-none border md:border-0 border-slate-200/80 md:border-transparent bg-slate-50/40 md:bg-white p-3 md:p-3.5 flex flex-col space-y-2.5 transition-all duration-150 min-h-[400px] ${
                    isTargeting
                      ? 'bg-blue-50/30 ring-2 ring-inset ring-blue-400/30'
                      : 'hover:bg-slate-50/30'
                  }`}
                >
                  {/* Mobile-Only Column Header Card Header */}
                  <div className="md:hidden flex items-center justify-between pb-2 border-b border-slate-200/80">
                    <div className="flex items-center gap-2 font-heading font-bold text-slate-800 text-xs">
                      <span className={`w-2.5 h-2.5 rounded-full ${col.dot} shadow-xs shrink-0`} />
                      <span>{col.title}</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200/80 shadow-2xs">
                      {columnApps.length}
                    </span>
                  </div>

                  {/* Drop zone placeholder indicator when dragging */}
                  {isTargeting && columnApps.length > 0 && (
                    <div className="py-2 px-3 rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/80 text-blue-700 text-[11px] font-semibold flex items-center justify-center gap-1.5 animate-pulse motion-reduce:animate-none shrink-0">
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Move application to {col.title}</span>
                    </div>
                  )}

                  {/* Column application cards */}
                  {columnApps.length === 0 ? (
                    <div className="flex-1 min-h-[140px] flex items-center justify-center p-6 text-center text-slate-500 font-mono text-[11px] border border-dashed border-slate-200/80 rounded-xl my-1 bg-white/60">
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
                            if (e.target !== e.currentTarget) return;
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onSelectApp(app);
                            } else if (e.key === 'ArrowRight' && nextColumn && e.target === e.currentTarget) {
                              e.preventDefault();
                              handleQuickAdvance(e, app, nextColumn.status);
                            } else if (e.key === 'ArrowLeft' && prevColumn && e.target === e.currentTarget) {
                              e.preventDefault();
                              handleQuickAdvance(e, app, prevColumn.status);
                            }
                          }}
                          className={`p-3.5 rounded-xl border transition-all cursor-grab active:cursor-grabbing group relative focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                            isBeingDragged
                              ? 'opacity-40 scale-98 border-dashed border-blue-400 bg-blue-50/30'
                              : isSelected
                              ? 'bg-blue-50/70 border-blue-500/80 ring-1 ring-blue-500/20 shadow-xs'
                              : daysInStage > 14
                              ? 'bg-white hover:bg-slate-50/90 border-rose-200/80 hover:border-rose-300 shadow-2xs hover:shadow-xs hover:-translate-y-0.5'
                              : daysInStage > 7
                              ? 'bg-white hover:bg-slate-50/90 border-amber-200/80 hover:border-amber-300 shadow-2xs hover:shadow-xs hover:-translate-y-0.5'
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

                          {/* Role Title */}
                          <p className="text-slate-700 text-xs font-semibold truncate mb-2">
                            {app.role}
                          </p>

                          {/* Notes snippet or Tasks/Contacts chips */}
                          {Boolean(app.tasks?.length || app.contacts?.length || app.contactEmail) ? (
                            <div className="flex items-center gap-1.5 flex-wrap mb-2 font-mono text-[11px]">
                              {app.contactEmail ? (
                                <a
                                  href={`mailto:${app.contactEmail}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 bg-blue-50/80 hover:bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200/80 transition-colors"
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
                                  <Users className="w-2.5 h-2.5 text-slate-500" />
                                  <span>{app.contacts.length} contact{app.contacts.length > 1 ? 's' : ''}</span>
                                </span>
                              ) : null}
                            </div>
                          ) : null}

                          {/* Notes snippet if present */}
                          {app.notes ? (
                            <p className="text-slate-500 text-[11px] max-h-[4em] overflow-hidden bg-slate-50/80 px-2 py-1 rounded-lg border border-slate-200/60 mb-2.5 font-sans leading-relaxed break-words">
                              {app.notes}
                            </p>
                          ) : null}

                          {/* Footer Metadata: Platform Tag + Days in Stage Recency Badge */}
                          <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100/80 gap-1.5">
                            <span className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80 font-medium text-[11px] shrink-0">
                              {app.platform}
                            </span>

                            <div className="flex items-center gap-1.5">
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

                              {/* Mobile Touch Quick Stage Advance Affordance (eliminates drag requirement) */}
                              {nextColumn && (
                                <button
                                  type="button"
                                  onClick={(e) => handleQuickAdvance(e, app, nextColumn.status)}
                                  title={`Advance to ${nextColumn.title}`}
                                  aria-label={`Advance to ${nextColumn.title}`}
                                  className="md:hidden flex items-center gap-0.5 font-mono text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md border border-blue-200/80 transition-colors cursor-pointer min-h-[30px]"
                                >
                                  <span>{nextColumn.title}</span>
                                  <ChevronRight className="w-3 h-3 text-blue-600" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick-Drop Zones Bar (Archive & Mark Rejected) */}
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
                    : 'bg-amber-50/80 border-amber-300 text-amber-800 animate-pulse motion-reduce:animate-none'
                }`}
              >
                <Archive className={`w-4 h-4 shrink-0 ${dragOverColumn === 'Archived' ? 'text-amber-700' : 'text-amber-600'}`} />
                <span className="truncate">
                  {dragOverColumn === 'Archived' ? 'Release to Archive' : 'Quick Drop: Archive'}
                </span>
              </div>

              <div
                onDragOver={(e) => handleDragOver(e, 'Rejected')}
                onDragLeave={(e) => handleDragLeave(e, 'Rejected')}
                onDrop={(e) => handleDrop(e, 'Rejected')}
                className={`p-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2.5 transition-all duration-200 text-xs font-semibold ${
                  dragOverColumn === 'Rejected'
                    ? 'bg-rose-100/90 border-rose-500 text-rose-900 ring-2 ring-rose-400/30 shadow-md scale-[1.01]'
                    : 'bg-rose-50/80 border-rose-300 text-rose-800 animate-pulse motion-reduce:animate-none'
                }`}
              >
                <XCircle className={`w-4 h-4 shrink-0 ${dragOverColumn === 'Rejected' ? 'text-rose-700' : 'text-rose-600'}`} />
                <span className="truncate">
                  {dragOverColumn === 'Rejected' ? 'Release to Reject' : 'Quick Drop: Reject'}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
};
