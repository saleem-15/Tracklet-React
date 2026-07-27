import React, { useState } from 'react';
import { Application, ApplicationStatus } from '../types';
import { StageSelectorDropdown } from './StageSelectorDropdown';
import { CompanyLogo } from './CompanyLogo';
import { EmptyState } from './EmptyState';
import { 
  ExternalLink, 
  Clock, 
  Building2, 
  GripVertical, 
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Mail,
  CheckSquare,
  Users
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
    status: 'Applied', 
    title: 'Applied', 
    dot: 'bg-slate-400',
    tagBg: 'text-slate-600 bg-slate-100'
  },
  { 
    status: 'Screening', 
    title: 'Screening Call', 
    dot: 'bg-amber-500',
    tagBg: 'text-amber-700 bg-amber-50'
  },
  { 
    status: 'Interview', 
    title: 'Interview Loop', 
    dot: 'bg-blue-500',
    tagBg: 'text-blue-700 bg-blue-50'
  },
  { 
    status: 'Offer', 
    title: 'Offer Received', 
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
  const [lastMovedNotice, setLastMovedNotice] = useState<{ company: string; toStatus: ApplicationStatus } | null>(null);

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
        setLastMovedNotice({ company: app.company, toStatus: targetStatus });
        setTimeout(() => setLastMovedNotice(null), 3500);
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
        <div className="absolute bottom-4 right-6 z-30 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Moved <strong className="font-semibold text-white">{lastMovedNotice.company}</strong> to <span className="font-mono text-blue-300 font-semibold">{lastMovedNotice.toStatus}</span>
          </span>
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
          {/* Table Header Row */}
          <div className="grid grid-cols-4 bg-slate-50/80 border-b border-slate-200/80 sticky top-0 z-10 backdrop-blur-xs">
            {PIPELINE_COLUMNS.map((col) => {
              const count = applications.filter((app) => app.status === col.status).length;
              const isTargeting = dragOverColumn === col.status;

              return (
                <div
                  key={col.status}
                  className={`px-5 py-3.5 flex items-center justify-between transition-colors ${
                    isTargeting ? 'bg-blue-50/80' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full ${col.dot} shadow-xs`} />
                    <span className="font-bold text-slate-800 text-xs tracking-tight">
                      {col.title}
                    </span>
                  </div>
                  <span className={`font-mono text-[11px] px-2 py-0.5 rounded-md font-semibold ${col.tagBg}`}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Table Body Columns Area - Seamless with no dividing vertical borders */}
          <div className="grid grid-cols-4 flex-1 items-stretch min-h-0 divide-x-0">
            {PIPELINE_COLUMNS.map((col) => {
              const columnApps = applications.filter((app) => app.status === col.status);
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
                  {/* Column container with stable DOM structure during drag */}
                  {columnApps.length === 0 ? (
                    <div className="flex-1 min-h-[120px] flex items-center justify-center p-6 text-center text-slate-400 font-mono text-[11px] border border-dashed border-slate-200/60 rounded-xl my-1 bg-slate-50/20">
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
                          draggable
                          onDragStart={(e) => handleDragStart(e, app.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => onSelectApp(app)}
                          className={`p-3.5 rounded-xl border transition-all cursor-grab active:cursor-grabbing group relative ${
                            isBeingDragged
                              ? 'opacity-40 scale-98 border-dashed border-blue-400 bg-blue-50/30'
                              : isSelected
                              ? 'bg-blue-50/70 border-blue-500/80 ring-1 ring-blue-500/20 shadow-xs'
                              : 'bg-white hover:bg-slate-50/90 border-slate-200/80 hover:border-blue-300 shadow-2xs hover:shadow-xs'
                          }`}
                        >
                          {/* Top Row: Grip Handle, Company Avatar & Name, External Link */}
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 shrink-0 transition-colors" />
                              
                              <CompanyLogo
                                company={app.company}
                                jobLink={app.jobLink}
                                logoUrl={app.logoUrl}
                                companyDomain={app.companyDomain}
                                size="xs"
                              />

                              <span className="font-bold text-slate-900 text-xs truncate">
                                {app.company}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {app.jobLink && (
                                <a
                                  href={app.jobLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="Open job link"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Role Title */}
                          <p className="text-slate-700 text-xs font-semibold truncate mb-2 pl-5">
                            {app.role}
                          </p>

                          {/* Notes snippet or Tasks/Contacts chips */}
                          {Boolean(app.tasks?.length || app.contacts?.length || app.contactEmail) ? (
                            <div className="flex items-center gap-1.5 flex-wrap pl-5 mb-2 font-mono text-[10px]">
                              {app.contactEmail ? (
                                <a
                                  href={`mailto:${app.contactEmail}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/80"
                                  title={`Contact email: ${app.contactEmail}`}
                                >
                                  <Mail className="w-2.5 h-2.5 text-blue-500" />
                                  <span className="truncate max-w-[120px]">{app.contactEmail}</span>
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

                          {/* Footer Metadata & Quick Action */}
                          <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100/80 pl-5 gap-1.5">
                            <span className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80 font-medium text-[10px] shrink-0">
                              {app.platform}
                            </span>

                            <div className="flex items-center gap-1.5">
                              <span
                                className={`flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded font-medium ${
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

                              <div onClick={(e) => e.stopPropagation()}>
                                <StageSelectorDropdown
                                  currentStatus={app.status}
                                  onSelectStatus={(newStatus) => {
                                    onUpdateStatus(app.id, newStatus);
                                    setLastMovedNotice({ company: app.company, toStatus: newStatus });
                                    setTimeout(() => setLastMovedNotice(null), 3500);
                                  }}
                                  size="sm"
                                />
                              </div>
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
        </div>
      </div>
      )}
    </div>
  );
};
