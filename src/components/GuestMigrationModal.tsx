import React from 'react';
import { UploadCloud, Trash2, ArrowRight, ShieldCheck, Sparkles, X } from 'lucide-react';
import { Application } from '../types';

interface GuestMigrationModalProps {
  isOpen: boolean;
  guestApplications: Application[];
  onImport: () => Promise<void>;
  onDiscard: () => void;
  onClose: () => void;
}

export const GuestMigrationModal: React.FC<GuestMigrationModalProps> = ({
  isOpen,
  guestApplications,
  onImport,
  onDiscard,
  onClose,
}) => {
  const [isImporting, setIsImporting] = React.useState(false);

  if (!isOpen || guestApplications.length === 0) return null;

  const handleImport = async () => {
    setIsImporting(true);
    try {
      await onImport();
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none" />

          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 border border-white/30 shadow-inner mb-3 backdrop-blur-xs">
            <UploadCloud className="w-7 h-7 text-white" />
          </div>

          <h2 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            <span>Import Guest Applications</span>
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          </h2>
          <p className="text-blue-100 text-xs mt-1.5 max-w-sm mx-auto leading-relaxed">
            We found <strong>{guestApplications.length}</strong> job application{guestApplications.length === 1 ? '' : 's'} tracked during your guest session.
          </p>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute top-4 right-4 p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 max-h-48 overflow-y-auto">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold block">
              Found local applications:
            </span>
            <div className="divide-y divide-slate-100">
              {guestApplications.slice(0, 5).map((app) => (
                <div key={app.id} className="py-1.5 flex items-center justify-between text-xs">
                  <div className="font-semibold text-slate-800 truncate mr-2">
                    {app.company} <span className="font-normal text-slate-500">({app.role})</span>
                  </div>
                  <span className="font-mono text-[11px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600 shrink-0">
                    {app.status}
                  </span>
                </div>
              ))}
              {guestApplications.length > 5 && (
                <div className="pt-1.5 text-center text-[11px] font-mono text-slate-400">
                  + {guestApplications.length - 5} more applications
                </div>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Would you like to upload these applications to your verified cloud account so they sync across all your devices?
          </p>

          {/* Action buttons */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={handleImport}
              disabled={isImporting}
              aria-busy={isImporting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-60"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{isImporting ? 'Importing to Cloud...' : `Import ${guestApplications.length} Applications to Account`}</span>
              {!isImporting && <ArrowRight className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onDiscard}
              disabled={isImporting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-rose-50 text-rose-700 hover:text-rose-800 hover:border-rose-200 border border-transparent font-semibold text-xs transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Discard Guest Data & Start Fresh</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-500 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Encrypted Cloud Sync to Your User ID</span>
        </div>
      </div>
    </div>
  );
};
