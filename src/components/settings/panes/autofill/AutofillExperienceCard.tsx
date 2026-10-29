import React from 'react';
import { Briefcase, Building, Award } from 'lucide-react';
import { SettingsCard } from '../../SettingsCard';
import { CandidateProfile } from '../../../../types';

export interface AutofillExperienceCardProps {
  data: Partial<CandidateProfile>;
  onChange: <K extends keyof CandidateProfile>(field: K, value: CandidateProfile[K]) => void;
}

export const AutofillExperienceCard: React.FC<AutofillExperienceCardProps> = ({ data, onChange }) => {
  const currentTitle = data.experience?.currentTitle || '';
  const currentCompany = data.experience?.currentCompany || '';
  const yearsExp = data.experience?.yearsOfExperience !== undefined ? String(data.experience.yearsOfExperience) : '';
  const targetTitlesText = data.targetTitles?.join(', ') || '';

  const handleUpdateExperience = (title: string, company: string, years?: number) => {
    onChange('experience', {
      currentTitle: title,
      currentCompany: company,
      yearsOfExperience: years,
    });
  };

  return (
    <SettingsCard
      title="Current Role & Career Targeting"
      icon={<Briefcase className="w-5 h-5 text-blue-600" />}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Current Job Title */}
        <div className="space-y-1.5">
          <label htmlFor="current-title" className="text-xs font-semibold text-slate-800 flex items-center gap-1">
            <Briefcase className="w-3.5 h-3.5 text-slate-500" />
            <span>Current / Most Recent Title</span>
          </label>
          <input
            id="current-title"
            type="text"
            value={currentTitle}
            onChange={(e) =>
              handleUpdateExperience(
                e.target.value,
                currentCompany,
                yearsExp ? parseInt(yearsExp, 10) : undefined
              )
            }
            placeholder="e.g. Senior Frontend Engineer"
            className="w-full h-9 px-3 text-xs bg-slate-50 text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-colors"
          />
        </div>

        {/* Current Employer */}
        <div className="space-y-1.5">
          <label htmlFor="current-company" className="text-xs font-semibold text-slate-800 flex items-center gap-1">
            <Building className="w-3.5 h-3.5 text-slate-500" />
            <span>Current / Most Recent Company</span>
          </label>
          <input
            id="current-company"
            type="text"
            value={currentCompany}
            onChange={(e) =>
              handleUpdateExperience(
                currentTitle,
                e.target.value,
                yearsExp ? parseInt(yearsExp, 10) : undefined
              )
            }
            placeholder="e.g. Stripe, Acme Corp, or Freelance"
            className="w-full h-9 px-3 text-xs bg-slate-50 text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-colors"
          />
        </div>

        {/* Years of Experience */}
        <div className="space-y-1.5">
          <label htmlFor="years-experience" className="text-xs font-semibold text-slate-800 flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-slate-500" />
            <span>Total Years of Experience</span>
          </label>
          <input
            id="years-experience"
            type="number"
            min="0"
            max="50"
            value={yearsExp}
            onChange={(e) =>
              handleUpdateExperience(
                currentTitle,
                currentCompany,
                e.target.value ? parseInt(e.target.value, 10) : undefined
              )
            }
            placeholder="e.g. 6"
            className="w-full h-9 px-3 text-xs bg-slate-50 text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-colors font-mono"
          />
        </div>

        {/* Target Job Titles */}
        <div className="space-y-1.5">
          <label htmlFor="target-titles" className="text-xs font-semibold text-slate-800 block">
            Target Job Titles <span className="text-slate-500 font-normal">(Comma-separated)</span>
          </label>
          <input
            id="target-titles"
            type="text"
            value={targetTitlesText}
            onChange={(e) => {
              const titles = e.target.value
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean);
              onChange('targetTitles', titles);
            }}
            placeholder="e.g. Senior Frontend Engineer, Staff UI Architect"
            className="w-full h-9 px-3 text-xs bg-slate-50 text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-colors"
          />
        </div>
      </div>
    </SettingsCard>
  );
};
