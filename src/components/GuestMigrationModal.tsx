import React from 'react';
import { UploadCloud, Trash2, ArrowRight, Sparkles, X, Users, Briefcase } from 'lucide-react';
import { Application, Contact } from '../types';

interface GuestMigrationModalProps {
  isOpen: boolean;
  guestApplications: Application[];
  guestContacts?: Contact[];
  onImport: () => Promise<void>;
  onDiscard: () => void;
  onClose: () => void;
}

export const GuestMigrationModal: React.FC<GuestMigrationModalProps> = ({
  isOpen,
  guestApplications,
  guestContacts = [],
  onImport,
  onDiscard,
  onClose,
}) => {
  const [isImporting, setIsImporting] = React.useState(false);

  if (!isOpen || (guestApplications.length === 0 && guestContacts.length === 0)) return null;

  const handleImport = async () => {
    setIsImporting(true);
    try {
      await onImport();
    } finally {
      setIsImporting(false);
    }
  };

  const totalItems = guestApplications.length + guestContacts.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Import Guest Workspace"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 motion-reduce:animate-none">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none" />

          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 border border-white/30 shadow-inner mb-3 backdrop-blur-xs">
            <UploadCloud className="w-7 h-7 text-white" />
          </div>

          <h2 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            <span>Import Guest Workspace</span>
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse motion-reduce:animate-none" />
          </h2>
          <p className="text-blue-100 text-xs mt-1.5 max-w-sm mx-auto leading-relaxed">
            We found <strong>{guestApplications.length}</strong> application{guestApplications.length === 1 ? '' : 's'}
            {guestContacts.length > 0 && (
              <> and <strong>{guestContacts.length}</strong> contact{guestContacts.length === 1 ? '' : 's'}</>
            )} tracked during your guest session.
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
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 max-h-56 overflow-y-auto">
            {guestApplications.length > 0 && (
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block mb-1 flex items-center gap-1">
                  <Briefcase className="w-3 h-3 text-blue-500" />
                  Applications ({guestApplications.length}):
                </span>
                <div className="divide-y divide-slate-100">
                  {guestApplications.slice(0, 4).map((app) => (
                    <div key={app.id} className="py-1 flex items-center justify-between text-xs">
                      <div className="font-semibold text-slate-800 truncate mr-2">
                        {app.company} <span className="font-normal text-slate-500">({app.role})</span>
                      </div>
                      <span className="font-mono text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600 shrink-0">
                        {app.status}
                      </span>
                    </div>
                  ))}
                  {guestApplications.length > 4 && (
                    <div className="pt-1 text-center text-[10px] font-mono text-slate-500">
                      + {guestApplications.length - 4} more applications
                    </div>
                  )}
                </div>
              </div>
            )}

            {guestContacts.length > 0 && (
              <div className="pt-2 border-t border-slate-200/60">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block mb-1 flex items-center gap-1">
                  <Users className="w-3 h-3 text-blue-500" />
                  Contacts ({guestContacts.length}):
                </span>
                <div className="divide-y divide-slate-100">
                  {guestContacts.slice(0, 3).map((c) => (
                    <div key={c.id} className="py-1 flex items-center justify-between text-xs">
                      <div className="font-semibold text-slate-800 truncate mr-2">
                        {c.name} <span className="font-normal text-slate-500">({c.role || c.category || 'Contact'})</span>
                      </div>
                      <span className="font-mono text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600 shrink-0">
                        {c.organization || '—'}
                      </span>
                    </div>
                  ))}
                  {guestContacts.length > 3 && (
                    <div className="pt-1 text-center text-[10px] font-mono text-slate-500">
                      + {guestContacts.length - 3} more contacts
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Would you like to sync your guest data to your verified cloud account?
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
              <span>{isImporting ? 'Importing to Cloud...' : `Import ${totalItems} Items to Cloud Account`}</span>
              {!isImporting && <ArrowRight className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onDiscard}
              disabled={isImporting}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-rose-600 hover:bg-rose-50 font-semibold text-xs transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Discard Guest Data &amp; Start Fresh</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
