import React from 'react';
import { motion } from 'motion/react';
import { CheckSquare, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Application, ApplicationStatus } from '../../types';
import { CompanyLogo } from '../CompanyLogo';
import { FLOW_SPRING } from '../../lib/motion';
import { formatSalaryCompact } from '../../lib/salaryUtils';
import { PipelineCardContextMenu } from './PipelineCardContextMenu';

export interface PipelineCardShellProps {
  app: Application;
  colTitle?: string;
  isFloating?: boolean;
  isDropping?: boolean;
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

export const PipelineCardShell: React.FC<PipelineCardShellProps> = ({
  app,
  colTitle: _colTitle,
  isFloating = false,
  isDropping = false,
  isSelected = false,
  nextColumn,
  onQuickAdvance,
  onUpdateStatus,
  onDeleteApp,
  isMenuOpen = false,
  onToggleMenu,
  onCloseMenu,
}) => {
  const jobMetaParts = getJobMetaParts(app);
  const rawSalary = getDisplaySalary(app);
  const compactSalary = formatSalaryCompact(rawSalary);
  const pendingTasks = app.tasks?.filter((t) => !t.completed) || [];
  const hasFooter = Boolean(compactSalary || pendingTasks.length > 0 || (nextColumn && onQuickAdvance));

  return (
    <div
      className={`group relative rounded-xl border p-3.5 select-none transition-colors duration-150 cursor-grab active:cursor-grabbing ${
        isMenuOpen ? 'relative z-40' : ''
      } ${
        isFloating
          ? isDropping
            ? 'bg-white border-slate-200/80 shadow-md ring-1 ring-slate-900/10 transition-shadow duration-200'
            : 'bg-white border-slate-200/80 shadow-xl shadow-slate-900/12 ring-1 ring-slate-900/5'
          : isSelected
          ? 'bg-blue-50/70 border-blue-500/80 ring-1 ring-blue-500/20 shadow-xs'
          : 'bg-white border-slate-200/80 shadow-2xs hover:border-slate-300 hover:shadow-xs'
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

        {isFloating ? (
          <div
            aria-hidden="true"
            className="w-6 h-6 rounded-md text-slate-400 flex items-center justify-center shrink-0 opacity-60"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </div>
        ) : (
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
        <p className={`font-sans text-xs text-slate-500 truncate text-start ${hasFooter ? 'mb-2.5' : ''}`}>
          {jobMetaParts.map((part, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-slate-300 mx-1 select-none">·</span>}
              <span>{part}</span>
            </React.Fragment>
          ))}
        </p>
      ) : null}

      {/* Footer: Standardized Compact Salary + Optional Quiet Task Count + Mobile Advance */}
      {hasFooter && (
        <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-100/80 gap-2">
          {compactSalary ? (
            <span className="font-mono tabular-nums text-xs font-semibold text-slate-700 truncate">
              {compactSalary}
            </span>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2 shrink-0">
            {pendingTasks.length > 0 && (
              <span
                className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-slate-400 hover:text-slate-600 transition-colors"
                title={`${pendingTasks.length} open task${pendingTasks.length === 1 ? '' : 's'}`}
              >
                <CheckSquare className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{pendingTasks.length}</span>
              </span>
            )}

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
      )}
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
