import React from 'react';
import { X, Compass } from 'lucide-react';

export interface OnboardingModalHeaderProps {
  step: number;
  onDismiss: () => void;
}

export const OnboardingModalHeader: React.FC<OnboardingModalHeaderProps> = ({
  step,
  onDismiss,
}) => {
  return (
    <div className="px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between gap-3 bg-white shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-2xs">
          <Compass className="w-4 h-4 stroke-[2]" />
        </div>
        <h1 id="onboarding-modal-title" className="text-xs font-bold font-mono tracking-wider text-slate-800 uppercase">
          Welcome to Tracklet
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Stepper Dots */}
        <nav aria-label="Onboarding Progress" className="flex items-center gap-1.5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                s === step
                  ? 'w-5 bg-blue-600'
                  : s < step
                  ? 'w-2 bg-blue-400'
                  : 'w-2 bg-slate-200'
              }`}
              aria-current={s === step ? 'step' : undefined}
            />
          ))}
        </nav>

        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close onboarding guide"
        >
          <X className="w-4 h-4 stroke-[2]" />
        </button>
      </div>
    </div>
  );
};
