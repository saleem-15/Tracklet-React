import React from 'react';
import { FileText } from 'lucide-react';
import { SettingsCard } from '../../SettingsCard';
import { CandidateProfile } from '../../../../types';

export interface AutofillSnippetsCardProps {
  data: Partial<CandidateProfile>;
  onChange: <K extends keyof CandidateProfile>(field: K, value: CandidateProfile[K]) => void;
}

export const AutofillSnippetsCard: React.FC<AutofillSnippetsCardProps> = ({ data, onChange }) => {
  const bio = data.bioSnippet || '';
  const wordCount = bio.trim() ? bio.trim().split(/\s+/).length : 0;

  return (
    <SettingsCard
      title="Application Snippets & Bio"
      icon={<FileText className="w-5 h-5 text-indigo-600" />}
    >
      <div className="space-y-4">
        {/* Short Bio / Pitch */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="bio-snippet" className="text-xs font-semibold text-slate-800">
              Short Bio / Elevator Pitch
            </label>
            <span className={`text-[11px] font-mono ${wordCount > 150 ? 'text-amber-600' : 'text-slate-500'}`}>
              {wordCount} / 150 words
            </span>
          </div>
          <textarea
            id="bio-snippet"
            rows={3}
            value={bio}
            onChange={(e) => onChange('bioSnippet', e.target.value)}
            placeholder="e.g. Senior Frontend Architect with 7+ years building enterprise React and TypeScript platforms. Passionate about developer tooling, design systems, and web performance..."
            className="w-full p-3 text-xs bg-slate-50 text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-colors resize-y"
          />
        </div>

        {/* Standard Cover Letter Note */}
        <div className="space-y-1.5">
          <label htmlFor="cover-letter-snippet" className="text-xs font-semibold text-slate-800">
            Standard Application Intro Note
          </label>
          <textarea
            id="cover-letter-snippet"
            rows={3}
            value={data.coverLetterSnippet || ''}
            onChange={(e) => onChange('coverLetterSnippet', e.target.value)}
            placeholder="e.g. Hi team, I'm thrilled to apply for this role. My background aligns closely with your tech stack and product mission..."
            className="w-full p-3 text-xs bg-slate-50 text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-colors resize-y"
          />
        </div>
      </div>
    </SettingsCard>
  );
};
