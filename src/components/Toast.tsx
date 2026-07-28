import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
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
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border shadow-xl backdrop-blur-md text-xs font-sans transition-all animate-in slide-in-from-bottom-5 duration-200 ${
        toast.type === 'success'
          ? 'bg-emerald-950/90 border-emerald-800/80 text-emerald-100 shadow-emerald-950/20'
          : toast.type === 'error'
          ? 'bg-rose-950/90 border-rose-800/80 text-rose-100 shadow-rose-950/20'
          : 'bg-slate-900/90 border-slate-700/80 text-slate-100 shadow-slate-950/20'
      }`}
    >
      <div className="shrink-0 pt-0.5">
        {toast.type === 'success' ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        ) : toast.type === 'error' ? (
          <AlertCircle className="w-4 h-4 text-rose-400" />
        ) : (
          <Info className="w-4 h-4 text-blue-400" />
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="font-bold tracking-tight text-xs leading-snug">{toast.title}</p>
        {toast.description && (
          <p className="text-[11px] opacity-80 leading-normal">{toast.description}</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="text-slate-400 hover:text-white p-0.5 rounded-md hover:bg-white/10 transition-colors cursor-pointer shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
