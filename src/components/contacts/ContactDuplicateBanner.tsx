import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Contact } from '../../types';

export interface ContactDuplicateBannerProps {
  duplicateContact: Contact;
  onSelectContact?: (contactId: string) => void;
  onClose: () => void;
  onForceSave: () => void;
}

export const ContactDuplicateBanner: React.FC<ContactDuplicateBannerProps> = ({
  duplicateContact,
  onSelectContact,
  onClose,
  onForceSave,
}) => {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="p-3.5 rounded-[10px] bg-amber-50/90 border border-amber-200/90 text-amber-900 text-xs space-y-2.5 animate-in fade-in duration-150"
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1 min-w-0 flex-1">
          <p className="font-semibold text-amber-900">
            A matching contact already exists
          </p>
          <p className="text-amber-800 leading-relaxed break-words">
            <span className="font-medium text-amber-950">{duplicateContact.name}</span>
            {duplicateContact.organization ? ` at ${duplicateContact.organization}` : ''}
            {duplicateContact.email ? (
              <span className="break-all font-mono text-[11px] text-amber-900"> ({duplicateContact.email})</span>
            ) : ''}{' '}
            is already in your network.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 pt-1 border-t border-amber-200/60">
        {onSelectContact && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onSelectContact(duplicateContact.id);
            }}
            className="px-2.5 py-1 text-xs font-semibold bg-white text-slate-800 border border-slate-300 rounded-[8px] hover:bg-slate-50 transition-colors cursor-pointer min-h-[32px] inline-flex items-center"
          >
            View Existing Contact
          </button>
        )}
        <button
          type="button"
          onClick={onForceSave}
          className="px-2.5 py-1 text-xs font-medium text-amber-800 hover:text-amber-950 underline cursor-pointer min-h-[32px] inline-flex items-center"
        >
          Create duplicate anyway
        </button>
      </div>
    </div>
  );
};
