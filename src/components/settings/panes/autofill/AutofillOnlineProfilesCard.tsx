import React from 'react';
import { ExternalLink, Globe } from 'lucide-react';
import { SettingsCard } from '../../SettingsCard';
import { CandidateProfile } from '../../../../types';

export interface AutofillOnlineProfilesCardProps {
  data: Partial<CandidateProfile>;
  onChange: <K extends keyof CandidateProfile>(field: K, value: CandidateProfile[K]) => void;
}

export const AutofillOnlineProfilesCard: React.FC<AutofillOnlineProfilesCardProps> = ({ data, onChange }) => {
  const normalizeUrlOnBlur = (field: 'linkedInUrl' | 'githubUrl' | 'portfolioUrl', val?: string) => {
    if (!val) return;
    const trimmed = val.trim();
    if (!trimmed) return;
    if (!/^https?:\/\//i.test(trimmed)) {
      onChange(field, `https://${trimmed}`);
    }
  };

  return (
    <SettingsCard
      title="Online Presence & Portfolios"
      icon={<Globe className="w-5 h-5 text-blue-600" />}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* LinkedIn Profile */}
        <div className="space-y-1.5">
          <label htmlFor="linkedin-url" className="text-xs font-semibold text-slate-800 flex items-center gap-1">
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            <span>LinkedIn URL</span>
          </label>
          <input
            id="linkedin-url"
            type="url"
            value={data.linkedInUrl || ''}
            onChange={(e) => onChange('linkedInUrl', e.target.value)}
            onBlur={(e) => normalizeUrlOnBlur('linkedInUrl', e.target.value)}
            placeholder="https://linkedin.com/in/username"
            className="w-full h-9 px-3 text-xs bg-slate-50 text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-colors"
          />
        </div>

        {/* GitHub Profile */}
        <div className="space-y-1.5">
          <label htmlFor="github-url" className="text-xs font-semibold text-slate-800 flex items-center gap-1">
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            <span>GitHub URL</span>
          </label>
          <input
            id="github-url"
            type="url"
            value={data.githubUrl || ''}
            onChange={(e) => onChange('githubUrl', e.target.value)}
            onBlur={(e) => normalizeUrlOnBlur('githubUrl', e.target.value)}
            placeholder="https://github.com/username"
            className="w-full h-9 px-3 text-xs bg-slate-50 text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-colors"
          />
        </div>

        {/* Portfolio / Website */}
        <div className="space-y-1.5">
          <label htmlFor="portfolio-url" className="text-xs font-semibold text-slate-800 flex items-center gap-1">
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            <span>Portfolio / Website</span>
          </label>
          <input
            id="portfolio-url"
            type="url"
            value={data.portfolioUrl || ''}
            onChange={(e) => onChange('portfolioUrl', e.target.value)}
            onBlur={(e) => normalizeUrlOnBlur('portfolioUrl', e.target.value)}
            placeholder="https://yourportfolio.dev"
            className="w-full h-9 px-3 text-xs bg-slate-50 text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-colors"
          />
        </div>
      </div>
    </SettingsCard>
  );
};
