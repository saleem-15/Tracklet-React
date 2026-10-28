import React from 'react';
import { FeedbackIntentId, FEEDBACK_INTENTS } from '../../lib/feedbackUtils';

interface FeedbackIntentSelectorProps {
  selectedId: FeedbackIntentId;
  onSelect: (id: FeedbackIntentId) => void;
}

export const FeedbackIntentSelector: React.FC<FeedbackIntentSelectorProps> = ({
  selectedId,
  onSelect,
}) => {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-800 mb-2">
        Category
      </label>
      <div
        role="radiogroup"
        aria-label="Category"
        className="flex flex-wrap gap-2"
      >
        {FEEDBACK_INTENTS.map((intent) => {
          const isActive = selectedId === intent.id;
          return (
            <button
              key={intent.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onSelect(intent.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer select-none ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs font-semibold'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {intent.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
