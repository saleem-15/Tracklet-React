import React from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Download, 
  Check, 
  Loader2 
} from 'lucide-react';
import { EXTENSION_DISTRIBUTION_CONFIG } from '../../lib/constants';
import { UI_TOKENS } from '../../theme/tokens';

export interface OnboardingModalFooterProps {
  step: number;
  isExtensionConnected: boolean;
  isCompleting: boolean;
  onBack: () => void;
  onSkip: () => void;
  onAdvanceToStep: (nextStep: number) => void;
  onDownloadExtension: () => void;
  onComplete: () => void;
}

export const OnboardingModalFooter: React.FC<OnboardingModalFooterProps> = ({
  step,
  isExtensionConnected,
  isCompleting,
  onBack,
  onSkip,
  onAdvanceToStep,
  onDownloadExtension,
  onComplete,
}) => {
  return (
    <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3 shrink-0">
      <div className="flex items-center gap-2">
        {step > 1 && (
          <button
            type="button"
            onClick={onBack}
            className={UI_TOKENS.btnSecondary}
          >
            <ArrowLeft className="w-4 h-4 stroke-[2]" />
            <span>Back</span>
          </button>
        )}
        <button
          type="button"
          onClick={onSkip}
          className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2 transition-colors cursor-pointer px-1 py-1"
        >
          Skip guide
        </button>
      </div>

      <div className="flex items-center gap-2.5">
        {step === 1 && (
          <button
            type="button"
            onClick={() => onAdvanceToStep(2)}
            className={UI_TOKENS.btnPrimary}
          >
            <span>Continue to Extension</span>
            <ArrowRight className="w-4 h-4 stroke-[2]" />
          </button>
        )}

        {step === 2 && (
          <>
            {!isExtensionConnected ? (
              <>
                <button
                  type="button"
                  onClick={() => onAdvanceToStep(3)}
                  className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2 transition-colors cursor-pointer mr-1"
                >
                  I'll install this later
                </button>
                <a
                  href={EXTENSION_DISTRIBUTION_CONFIG.localDownloadUrl}
                  download={EXTENSION_DISTRIBUTION_CONFIG.downloadFilename}
                  onClick={onDownloadExtension}
                  className={UI_TOKENS.btnPrimary}
                >
                  <Download className="w-4 h-4 stroke-[2]" />
                  <span>Download Extension (.zip)</span>
                </a>
              </>
            ) : (
              <button
                type="button"
                onClick={() => onAdvanceToStep(3)}
                className={UI_TOKENS.btnPrimary}
              >
                <span>Continue to Features</span>
                <ArrowRight className="w-4 h-4 stroke-[2]" />
              </button>
            )}
          </>
        )}

        {step === 3 && (
          <button
            type="button"
            onClick={onComplete}
            disabled={isCompleting}
            className={`${UI_TOKENS.btnPrimary} bg-blue-600 hover:bg-blue-700 shadow-sm`}
          >
            {isCompleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Entering Workspace...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Enter Workspace</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
