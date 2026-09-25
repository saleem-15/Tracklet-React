import React from 'react';
import { RotateCcw } from 'lucide-react';

export interface FollowUpComposerProps {
  subject: string;
  body: string;
  isModified: boolean;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onReset: () => void;
}

export const FollowUpComposer: React.FC<FollowUpComposerProps> = ({
  subject,
  body,
  isModified,
  onSubjectChange,
  onBodyChange,
  onReset,
}) => {
  return (
    <div className="flex-1 flex flex-col space-y-3 min-h-0">
      {/* Subject Line */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
        <span className="font-mono font-semibold text-slate-500 uppercase text-[11px] w-14 shrink-0">
          Subject:
        </span>
        <input
          type="text"
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          placeholder="Email subject line..."
          className="flex-1 text-xs font-medium text-slate-900 bg-transparent focus:outline-none placeholder:text-slate-400"
        />
        {isModified && (
          <button
            type="button"
            onClick={onReset}
            className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer shrink-0"
            title="Reset to template original"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        )}
      </div>

      {/* Message Body Editor Canvas */}
      <div className="flex-1 flex flex-col min-h-0">
        <textarea
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          placeholder="Compose or review your follow-up message..."
          rows={12}
          className="w-full flex-1 p-3.5 text-xs text-slate-800 leading-relaxed bg-slate-50/50 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-none font-sans"
        />
      </div>
    </div>
  );
};
