import React from 'react';
import { AlertTriangle } from 'lucide-react';

export interface AccountDangerZoneProps {
  onOpenDeleteModal: () => void;
}

export const AccountDangerZone: React.FC<AccountDangerZoneProps> = ({ onOpenDeleteModal }) => {
  return (
    <div className="pt-4 border-t border-slate-100">
      <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-rose-900 font-bold text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Delete Account & Wipe Cloud Data</span>
          </div>
          <p className="text-[11px] text-rose-700/90 font-sans">
            Permanently purge all job applications, history timeline records, and delete your Firebase account.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenDeleteModal}
          className="px-3.5 py-2 rounded-xl border border-rose-300 bg-white hover:bg-rose-600 hover:text-white active:scale-[0.99] text-rose-700 font-bold text-xs shadow-2xs transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
        >
          Delete Account
        </button>
      </div>
    </div>
  );
};
