import React from 'react';
import { Loader2 } from 'lucide-react';
import { UI_TOKENS } from '../../theme/tokens';

export interface ContactModalFooterProps {
  onClose: () => void;
  isSubmitting: boolean;
  canSubmit: boolean;
  isEditing: boolean;
}

export const ContactModalFooter: React.FC<ContactModalFooterProps> = ({
  onClose,
  isSubmitting,
  canSubmit,
  isEditing,
}) => {
  return (
    <div className="px-5 py-3.5 bg-white border-t border-slate-200/80 flex items-center justify-end gap-2 shrink-0">
      <button
        type="button"
        onClick={onClose}
        className={`${UI_TOKENS.btnOutline} active:scale-[0.98] transition-[background-color,border-color,color,transform] duration-150`}
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isSubmitting || !canSubmit}
        className={`${UI_TOKENS.btnPrimary} relative min-w-[124px] overflow-hidden transition-[background-color,border-color,box-shadow,transform] duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <span className="flex items-center justify-center gap-1.5 transition-opacity duration-150">
          {isSubmitting && (
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-white" />
          )}
          <span>{isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Contact'}</span>
        </span>
      </button>
    </div>
  );
};
