import React from 'react';
import { UI_TOKENS } from '../../theme/tokens';

export interface AddApplicationFooterProps {
  onCancel: () => void;
  isSubmitDisabled: boolean;
}

export const AddApplicationFooter: React.FC<AddApplicationFooterProps> = ({
  onCancel,
  isSubmitDisabled,
}) => {
  return (
    <div className="px-5 py-3.5 border-t border-slate-200/80 bg-slate-50/80 flex items-center justify-end gap-2 shrink-0">
      <button
        type="button"
        onClick={onCancel}
        className="h-[34px] px-3.5 rounded-[10px] text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 font-medium transition-all shadow-2xs cursor-pointer text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isSubmitDisabled}
        className={`${UI_TOKENS.btnPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        Add Application
      </button>
    </div>
  );
};
