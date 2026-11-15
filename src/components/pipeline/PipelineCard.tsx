import React from 'react';
import { motion } from 'motion/react';
import { CheckSquare, ChevronRight } from 'lucide-react';
import { Application, ApplicationStatus } from '../../types';
import { CompanyLogo } from '../CompanyLogo';
import { calculateDaysInStage } from '../../lib/sampleData';
import { FLOW_SPRING } from '../../lib/motion';
import { formatSalaryCompact } from '../../lib/salaryUtils';
import { PipelineCardContextMenu } from './PipelineCardContextMenu';

export interface PipelineCardShellProps {
  app: Application;
  colTitle?: string;
  isFloating?: boolean;
  isSelected?: boolean;
  nextColumn?: { status: ApplicationStatus; title: string } | null;
  onQuickAdvance?: (e: React.SyntheticEvent, nextStatus: ApplicationStatus) => void;
  onUpdateStatus?: (id: string, newStatus: ApplicationStatus) => void;
  onDeleteApp?: (id: string) => void;
  isMenuOpen?: boolean;
  onToggleMenu?: (e: React.MouseEvent) => void;
  onCloseMenu?: () => void;
}

function getJobMetaParts(app: Application): string[] {
  const parts: string[] = [];

  if (app.workLocation) {
    parts.push(app.workLocation);
  }

  if (app.location) {
    const loc = app.location.trim();
    if (!parts.some((p) => loc.toLowerCase().includes(p.toLowerCase()))) {
      parts.push(loc);
    }
  }

  if (app.employmentType && app.employmentType !== 'Full-time') {
    parts.unshift(app.employmentType);
  }

  if (parts.length === 0 && app.platform) {
    parts.push(app.platform);
  }

  return parts;
}

function getDisplaySalary(app: Application): string | null {
  if (app.salary && app.salary.trim()) {
    return app.salary.trim();
  }

  const notesMatch = app.notes?.match(/(?:salary|base):\s*([$\d,kK\s-]+(?:\/\s*year|base)?)/i);
  if (notesMatch) {
    return notesMatch[1].trim();
  }

  return null;
}

function formatTaskLabel(task: { title: string; dueDate?: string }): string {
  let title = task.title.trim();

  const dayMatch = title.match(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i);
  const dayName = dayMatch ? dayMatch[1].slice(0, 3) : null;

  title = title
    .replace(/\s+(?:for|on)\s+(?:the\s+)?(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?:\s+(?:panel|interview|call|round|loop))?/i, '')
    .trim();

  if (dayName && !title.includes('(')) {
    return `${title} (${dayName})`;
  }

  if (task.dueDate) {
    const rawDue = task.dueDate.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDue)) {
      try {
        const [y, m, d] = rawDue.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        const shortDay = dt.toLocaleDateString('en-US', { weekday: 'short' });
        return `${title} (${shortDay})`;
      } catch {
        return `${title} (${rawDue})`;
      }
    }
    return `${title} (${rawDue})`;
  }

  return title;
}

export const PipelineCardShell: React.FC<PipelineCardShellProps> = ({
  app,
  colTitle: _colTitle,
  isFloating = false,
  isSelected = false,
  nextColumn,
  onQuickAdvance,
  onUpdateStatus,
  onDeleteApp,
  isMenuOpen = false,
  onToggleMenu,
  onCloseMenu,
}) => {
  const daysInStage = calculateDaysInStage(app.stageUpdatedAt);
  const jobMetaParts = getJobMetaParts(app);
  const rawSalary = getDisplaySalary(app);
  const compactSalary = formatSalaryCompact(rawSalary);

  const pendingTasks = app.tasks?.filter((t) => !t.completed) || [];
  const rawInterview = app as unknown as { nextInterview?: string; interviewDate?: string };
  const interviewInfo = rawInterview.nextInterview || rawInterview.interviewDate;

  let actionableSignal: React.ReactNode = null;
  if (interviewInfo) {
    actionableSignal = (
      <div className="max-w-full text-xs font-medium text-purple-700 bg-purple-50/80 border border-purple-200/60 rounded-md px-2 py-1 flex items-center gap-1.5 min-w-0">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
        <span className="max-w-[200px] truncate min-w-0">{interviewInfo}</span>
      </div>
    );
  } else if (pendingTasks.length > 0) {
    const firstTask = pendingTasks[0];
    const taskLabel = formatTaskLabel(firstTask);
    actionableSignal = (
      <div className="max-w-full text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200/60 rounded-md px-2 py-1 flex items-center gap-1.5 min-w-0">
        <CheckSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="max-w-[200px] truncate min-w-0">{taskLabel}</span>
      </div>
    );
  }

  const isStale = daysInStage > 14;

  const recencyDisplay = isStale ? (
    <span
      className="inline-flex items-center gap-1 text-amber-600 font-mono text-xs shrink-0 font-medium"
      title={`In ${app.status} stage for ${daysInStage} days (action recommended)`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
      <span>{daysInStage}d stale</span>
    </span>
  ) : (
    <span
      className="text-slate-500 font-mono text-xs shrink-0"
      title={`In ${app.status} stage for ${daysInStage} day${daysInStage === 1 ? '' : 's'}`}
    >
      {daysInStage === 0 ? 'Today' : `${daysInStage}d`}
    </span>
  );

  return (
    <div
      className={`group relative rounded-xl border p-3.5 select-none transition-colors duration-150 cursor-grab active:cursor-grabbing ${
        isMenuOpen ? 'relative z-40' : ''
      } ${
        isFloating
          ? 'bg-white border-blue-400 ring-2 ring-blue-500/30 shadow-[0_16px_32px_-12px_rgb(0_0_0/0.28)]'
          : isSelected
          ? 'bg-blue-50/70 border-blue-500/80 ring-1 ring-blue-500/20 shadow-xs'
          : 'bg-white rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 hover:shadow-xs'
      }`}
    >
      {/* Line 1: [Uniform Logo Container] Company Title + [··· Context Menu Button] */}
      <div className="flex items-center justify-between gap-2 mb-1.5 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <CompanyLogo
            company={app.company}
            jobLink={app.jobLink}
            logoUrl={app.logoUrl}
            companyDomain={app.companyDomain}
            size="xs"
          />
          <span dir="auto" className="text-sm font-semibold text-slate-900 truncate text-start">
            {app.company}
          </span>
        </div>

        {!isFloating && (
          <PipelineCardContextMenu
            app={app}
            isOpen={isMenuOpen}
            onToggle={onToggleMenu}
            onClose={onCloseMenu}
            onUpdateStatus={onUpdateStatus}
            onDeleteApp={onDeleteApp}
          />
        )}
      </div>

      {/* Line 2: Role Title */}
      <p dir="auto" className="text-sm font-medium text-slate-800 line-clamp-1 text-start mb-0.5">
        {app.role}
      </p>

      {/* Line 3: Work Mode & Location in Clean Sans */}
      {jobMetaParts.length > 0 ? (
        <p className="font-sans text-xs text-slate-500 truncate text-start mb-2.5">
          {jobMetaParts.map((part, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-slate-300 mx-1 select-none">·</span>}
              <span>{part}</span>
            </React.Fragment>
          ))}
        </p>
      ) : null}

      {/* Line 4: Compact Single-Line Task Chip / Actionable Signal */}
      {actionableSignal ? (
        <div className="mb-2.5 min-w-0">
          {actionableSignal}
        </div>
      ) : null}

      {/* Footer: Standardized Compact Salary + Recency / Staleness */}
      <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-100/80 gap-2">
        {compactSalary ? (
          <span className="font-mono tabular-nums text-xs font-semibold text-slate-700 truncate">
            {compactSalary}
          </span>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-2 shrink-0">
          {recencyDisplay}

          {/* Mobile Touch Quick Stage Advance Affordance */}
          {nextColumn && onQuickAdvance && (
            <button
              type="button"
              onClick={(e) => onQuickAdvance(e, nextColumn.status)}
              title={`Advance to ${nextColumn.title}`}
              aria-label={`Advance to ${nextColumn.title}`}
              className="md:hidden flex items-center gap-0.5 font-mono text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200/80 transition-colors cursor-pointer min-h-[26px]"
            >
              <span>{nextColumn.title}</span>
              <ChevronRight className="w-3 h-3 text-blue-600" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export interface PipelineCardProps {
  app: Application;
  colTitle: string;
  isSelected: boolean;
  isGrabbed: boolean;
  reduceMotion: boolean;
  nextColumn: { status: ApplicationStatus; title: string } | null;
  elRef: (el: HTMLDivElement | null) => void;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onQuickAdvance: (e: React.SyntheticEvent, nextStatus: ApplicationStatus) => void;
  onUpdateStatus?: (id: string, newStatus: ApplicationStatus) => void;
  onDeleteApp?: (id: string) => void;
  isMenuOpen?: boolean;
  onToggleMenu?: (e: React.MouseEvent) => void;
  onCloseMenu?: () => void;
}

export const PipelineCard: React.FC<PipelineCardProps> = ({
  app,
  colTitle,
  isSelected,
  isGrabbed,
  reduceMotion,
  nextColumn,
  elRef,
  onPointerDown,
  onClick,
  onKeyDown,
  onQuickAdvance,
  onUpdateStatus,
  onDeleteApp,
  isMenuOpen: controlledMenuOpen,
  onToggleMenu: controlledOnToggleMenu,
  onCloseMenu: controlledOnCloseMenu,
}) => {
  const [internalMenuOpen, setInternalMenuOpen] = React.useState(false);
  const isMenuControlled = controlledMenuOpen !== undefined;
  const isMenuOpen = isMenuControlled ? controlledMenuOpen : internalMenuOpen;

  const handleToggleMenu = (e: React.MouseEvent) => {
    if (isMenuControlled) {
      controlledOnToggleMenu?.(e);
    } else {
      setInternalMenuOpen((prev) => !prev);
    }
  };

  const handleCloseMenu = () => {
    if (isMenuControlled) {
      controlledOnCloseMenu?.();
    } else {
      setInternalMenuOpen(false);
    }
  };

  return (
    <motion.div
      ref={elRef}
      layout
      data-kanban-card={app.id}
      tabIndex={0}
      role="button"
      aria-label={`${app.company}, ${app.role}, in ${colTitle}. Press Space to pick up.`}
      aria-grabbed={isGrabbed}
      onPointerDown={onPointerDown}
      onClick={onClick}
      onKeyDown={onKeyDown}
      style={{ zIndex: isMenuOpen ? 40 : undefined }}
      transition={reduceMotion ? { duration: 0 } : FLOW_SPRING}
      whileHover={reduceMotion ? undefined : { y: -1 }}
      className={`select-none rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 touch-pan-y md:touch-none ${
        isMenuOpen ? 'relative z-40' : ''
      } ${isGrabbed ? 'opacity-30' : ''}`}
    >
      <PipelineCardShell
        app={app}
        colTitle={colTitle}
        isSelected={isSelected}
        nextColumn={nextColumn}
        onQuickAdvance={onQuickAdvance}
        onUpdateStatus={onUpdateStatus}
        onDeleteApp={onDeleteApp}
        isMenuOpen={isMenuOpen}
        onToggleMenu={handleToggleMenu}
        onCloseMenu={handleCloseMenu}
      />
    </motion.div>
  );
};
