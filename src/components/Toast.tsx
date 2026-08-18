import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none select-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    // Give more time if there is an undo action
    const duration = toast.action ? 6000 : 4000;
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.action, onDismiss]);

  return (
    <div
      className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border shadow-xl backdrop-blur-md text-xs font-sans transition-all animate-in slide-in-from-bottom-5 duration-200 min-w-[320px] ${
        toast.type === 'success'
          ? 'bg-emerald-950/90 border-emerald-800/80 text-emerald-100 shadow-emerald-950/20'
          : toast.type === 'error'
          ? 'bg-rose-950/90 border-rose-800/80 text-rose-100 shadow-rose-950/20'
          : toast.type === 'warning'
          ? 'bg-amber-950/90 border-amber-800/80 text-amber-100 shadow-amber-950/20'
          : 'bg-slate-900/90 border-slate-700/80 text-slate-100 shadow-slate-950/20'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="shrink-0">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          ) : toast.type === 'warning' ? (
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          ) : (
            <Info className="w-4 h-4 text-blue-400" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="font-bold tracking-tight text-xs leading-snug truncate">{toast.title}</p>
          {toast.description && (
            <p className="text-[11px] opacity-80 leading-normal line-clamp-1">{toast.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick();
              onDismiss(toast.id);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/20 hover:bg-white/30 text-white font-semibold text-[11px] border border-white/25 transition-all cursor-pointer shadow-2xs"
          >
            {toast.action.label}
          </button>
        )}

        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss notification"
          className="text-slate-300 hover:text-white p-0.5 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
