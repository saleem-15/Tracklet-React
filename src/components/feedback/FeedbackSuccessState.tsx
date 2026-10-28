import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface FeedbackSuccessStateProps {
  onClose: () => void;
}

export const FeedbackSuccessState: React.FC<FeedbackSuccessStateProps> = ({ onClose }) => {
  return (
    <div className="py-8 text-center space-y-4">
      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-7 h-7" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-slate-900">Thank You for Your Feedback!</h3>
        <p className="text-xs text-slate-600 max-w-sm mx-auto">
          I've received your note and will review it right away.
        </p>
      </div>
      <div className="pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
};
