import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Application, ApplicationStatus } from '../../types';
import { PipelineCard } from './PipelineCard';
import { FLOW_SPRING } from '../../lib/motion';

export interface PipelineColumnConfig {
  status: ApplicationStatus;
  title: string;
  dot: string;
  tagBg: string;
}

export interface PipelineColumnProps {
  col: PipelineColumnConfig;
  columnApps: Application[];
  dragTaskId?: string;
  isTargeting: boolean;
  targetSlotIndex: number | null;
  dragHeight?: number;
  selectedAppId: string | null;
  grabbedAppId: string | null;
  reduceMotion: boolean;
  nextColumn: { status: ApplicationStatus; title: string } | null;
  colRef: (el: HTMLDivElement | null) => void;
  listRef: (el: HTMLDivElement | null) => void;
  setCardRef: (id: string, el: HTMLDivElement | null) => void;
  onPointerDownCard: (
    e: React.PointerEvent<HTMLDivElement>,
    app: Application,
    colStatus: ApplicationStatus,
    index: number
  ) => void;
  onSelectApp: (app: Application) => void;
  onCardKeyDown: (e: React.KeyboardEvent<HTMLDivElement>, app: Application) => void;
  onQuickAdvance: (e: React.SyntheticEvent, nextStatus: ApplicationStatus) => void;
  onUpdateStatus: (id: string, newStatus: ApplicationStatus) => void;
  onDeleteApp?: (id: string) => void;
  activeMenuAppId?: string | null;
  onToggleMenu?: (id: string) => void;
  onCloseMenu?: () => void;
  isDragOccurred: () => boolean;
  resetDragOccurred: () => void;
}

export const PipelineColumn: React.FC<PipelineColumnProps> = ({
  col,
  columnApps,
  dragTaskId,
  isTargeting,
  targetSlotIndex,
  dragHeight,
  selectedAppId,
  grabbedAppId,
  reduceMotion,
  nextColumn,
  colRef,
  listRef,
  setCardRef,
  onPointerDownCard,
  onSelectApp,
  onCardKeyDown,
  onQuickAdvance,
  onUpdateStatus,
  onDeleteApp,
  activeMenuAppId,
  onToggleMenu,
  onCloseMenu,
  isDragOccurred,
  resetDragOccurred,
}) => {
  const filteredApps = columnApps.filter((t) => t.id !== dragTaskId);

  return (
    <div
      ref={colRef}
      className={`w-[85vw] sm:w-[320px] md:w-72 lg:w-80 shrink-0 bg-slate-100/80 border border-slate-200/80 rounded-xl p-3 flex flex-col snap-start min-h-0 transition-colors duration-150 ${
        isTargeting ? 'ring-2 ring-blue-400/40 bg-blue-50/20' : ''
      }`}
    >
      {/* Integrated Column Header Bar with Badge Counter (Committed State Only) */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200/70 font-heading font-bold text-xs text-slate-800 bg-white/90 px-3 py-2 rounded-lg border border-slate-200/70 shadow-2xs select-none">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${col.dot} shadow-xs shrink-0`} />
          <span>{col.title}</span>
        </div>
        <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80 tabular-nums">
          {columnApps.length}
        </span>
      </div>

      {/* Cards List Container */}
      <div
        ref={listRef}
        className="flex flex-col gap-2.5 flex-1 min-h-[140px] overflow-y-auto pr-0.5"
      >
        {filteredApps.length === 0 && !isTargeting ? (
          <div className="h-28 border-2 border-dashed border-slate-200/90 rounded-xl flex flex-col items-center justify-center text-center p-3 text-slate-400 select-none bg-white/50 my-auto">
            <span className="text-xs font-semibold text-slate-500">No applications in {col.title}</span>
            <span className="text-[11px] text-slate-400 mt-0.5">Drag cards here or click + Add Job</span>
          </div>
        ) : (
          <>
            {filteredApps.map((app, i) => {
              const showPlaceholderBefore = isTargeting && targetSlotIndex === i;

              return (
                <React.Fragment key={app.id}>
                  {showPlaceholderBefore && (
                    <motion.div
                      layout
                      data-kanban-placeholder
                      initial={{ opacity: 0, scaleY: 0.7 }}
                      animate={{ opacity: 1, scaleY: 1 }}
                      exit={{ opacity: 0, scaleY: 0.7 }}
                      transition={FLOW_SPRING}
                      style={{ height: dragHeight || 88 }}
                      className="origin-top rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/70 text-blue-700 text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 select-none"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Drop application here</span>
                    </motion.div>
                  )}
                  <PipelineCard
                    app={app}
                    colTitle={col.title}
                    isSelected={selectedAppId === app.id}
                    isGrabbed={grabbedAppId === app.id}
                    reduceMotion={reduceMotion}
                    nextColumn={nextColumn}
                    elRef={(el) => setCardRef(app.id, el)}
                    onPointerDown={(e) => onPointerDownCard(e, app, col.status, i)}
                    onClick={() => {
                      if (isDragOccurred()) {
                        resetDragOccurred();
                        return;
                      }
                      onSelectApp(app);
                    }}
                    onKeyDown={(e) => onCardKeyDown(e, app)}
                    onQuickAdvance={(e, nextStatus) => {
                      e.stopPropagation();
                      onUpdateStatus(app.id, nextStatus);
                    }}
                    onUpdateStatus={onUpdateStatus}
                    onDeleteApp={onDeleteApp}
                    isMenuOpen={activeMenuAppId === app.id}
                    onToggleMenu={(e) => {
                      e.stopPropagation();
                      onToggleMenu?.(app.id);
                    }}
                    onCloseMenu={onCloseMenu}
                  />
                </React.Fragment>
              );
            })}
            {isTargeting && targetSlotIndex !== null && targetSlotIndex >= filteredApps.length && (
              <motion.div
                layout
                data-kanban-placeholder
                initial={{ opacity: 0, scaleY: 0.7 }}
                animate={{ opacity: 1, scaleY: 1 }}
                exit={{ opacity: 0, scaleY: 0.7 }}
                transition={FLOW_SPRING}
                style={{ height: dragHeight || 88 }}
                className="origin-top rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/70 text-blue-700 text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 select-none"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Drop application here</span>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
