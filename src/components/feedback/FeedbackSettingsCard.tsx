import React from 'react';
import { MessageSquare, ArrowRight } from 'lucide-react';
import { AuthUser } from '../../types';

interface FeedbackSettingsCardProps {
  onOpenReportModal: () => void;
  user?: AuthUser | null;
}

export const FeedbackSettingsCard: React.FC<FeedbackSettingsCardProps> = ({
  onOpenReportModal,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden transition-all">
      <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 font-heading">
              Feedback & Problem Reporting
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Encountered a glitch, have an idea, or want to share a thought? Send a direct note to the founder.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenReportModal}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs hover:shadow-sm active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <span>Share Feedback</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
