import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { ApplicationStatus } from '../types';
import { STAGE_CONFIG_MAP } from '../lib/constants';
import { MOTION_TIMING, MOTION_EASE } from '../lib/motion';
import { ActionSuccessCheck } from './ActionFeedback';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
  stage?: ApplicationStatus;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  // Limit max visible toasts to 3 to prevent cluttering the board
  const visibleToasts = toasts.slice(-3);

  return (
    <div
      aria-label="Notifications"
      className="fixed bottom-4 sm:bottom-5 right-4 sm:right-5 z-50 flex flex-col gap-2 max-w-[calc(100vw-2rem)] sm:max-w-md w-auto pointer-events-none select-none items-end"
    >
      <AnimatePresence mode="popLayout">
        {visibleToasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(toast.duration || (toast.action ? 6000 : 4000));
  const timerIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isPaused) {
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
        timerIdRef.current = null;
      }
      const elapsed = Date.now() - startTimeRef.current;
      remainingTimeRef.current = Math.max(1000, remainingTimeRef.current - elapsed);
    } else {
      startTimeRef.current = Date.now();
      timerIdRef.current = setTimeout(() => {
        onDismiss(toast.id);
      }, remainingTimeRef.current);
    }

    return () => {
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
      }
    };
  }, [isPaused, toast.id, onDismiss]);

  const stageConfig = toast.stage ? STAGE_CONFIG_MAP[toast.stage] : null;

  return (
    <motion.div
      layout
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          duration: MOTION_TIMING.snappy,
          ease: MOTION_EASE.command,
        },
      }}
      exit={{
        opacity: 0,
        x: 24,
        scale: 0.96,
        transition: {
          duration: 0.14,
          ease: MOTION_EASE.exit,
        },
      }}
      className={`pointer-events-auto flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl border shadow-2xl backdrop-blur-md text-xs font-sans min-w-[280px] max-w-full sm:max-w-md will-change-transform ${
        toast.type === 'error'
          ? 'bg-slate-900/95 border-rose-800/80 text-slate-100 shadow-rose-950/30'
          : toast.type === 'warning'
          ? 'bg-slate-900/95 border-amber-800/80 text-slate-100 shadow-amber-950/30'
          : 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-slate-950/40'
      }`}
    >
      {/* Icon & Message Container */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="shrink-0 flex items-center justify-center">
          {toast.type === 'success' ? (
            <ActionSuccessCheck size={16} className="text-emerald-400" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          ) : toast.type === 'warning' ? (
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          ) : (
            <Info className="w-4 h-4 text-blue-400" />
          )}
        </div>

        <div className="min-w-0 flex-1 flex items-center flex-wrap gap-x-2 gap-y-1">
          <span className="font-semibold text-white tracking-tight text-xs leading-snug">
            {toast.title}
          </span>

          {/* Stage badge with specific stage colors */}
          {stageConfig && (
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold border ${stageConfig.darkBadge}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${stageConfig.dot} shrink-0`} />
              <span>{toast.stage}</span>
            </span>
          )}

          {toast.description && (
            <span className="text-[11px] text-slate-300/90 leading-snug truncate">
              {toast.description}
            </span>
          )}
        </div>
      </div>

      {/* Actions / Close */}
      <div className="flex items-center gap-2 shrink-0">
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick();
              onDismiss(toast.id);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-300 hover:text-amber-200 font-semibold text-[11px] border border-slate-700 transition-colors duration-150 cursor-pointer shadow-2xs"
          >
            {toast.action.label}
          </button>
        )}

        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss notification"
          className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
};
