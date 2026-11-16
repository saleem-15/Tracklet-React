import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Application, ApplicationStatus } from '../../types';
import { PipelineCard } from './PipelineCard';
import { MetricRoller } from '../MetricRoller';
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
      data-pipeline-column={col.status}
      className={`w-[85vw] sm:w-[320px] md:w-72 lg:w-80 shrink-0 snap-start rounded-2xl p-2 flex flex-col space-y-2 transition-colors duration-150 min-h-[400px] ${
        isTargeting ? 'bg-blue-50/40 ring-1 ring-blue-300/60 rounded-2xl' : ''
      }`}
    >
      {/* Seamless Lane Header: Unboxed native header directly on column runway */}
      <div className="px-1.5 pt-0.5 pb-1.5 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${col.dot} shrink-0`} />
          <span className="font-heading font-semibold text-slate-800 text-xs tracking-tight">
            {col.title}
          </span>
          <MetricRoller
            value={columnApps.length}
            className="font-mono text-[11px] font-medium text-slate-400 tabular-nums"
            valueClassName="text-slate-400"
          />
        </div>
      </div>

      {/* Cards List Container */}
      <div
        ref={listRef}
        className="flex flex-col gap-2.5 flex-1 min-h-[140px] overflow-y-auto pr-0.5"
      >
        {filteredApps.length === 0 && !isTargeting ? (
          <div className="flex-1 min-h-[140px] flex items-center justify-center p-4 text-center select-none">
            <span className="font-mono text-[11px] text-slate-400/80 tracking-tight">
              No applications in {col.title.toLowerCase()}
            </span>
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
