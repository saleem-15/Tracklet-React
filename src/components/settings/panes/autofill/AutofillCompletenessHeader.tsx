import React from 'react';
import { CandidateProfile } from '../../../../types';

export interface AutofillCompletenessHeaderProps {
  profile: Partial<CandidateProfile>;
}

export const AutofillCompletenessHeader: React.FC<AutofillCompletenessHeaderProps> = ({ profile }) => {
  // Calculate completeness score
  const checks = [
    { name: 'Name', done: Boolean(profile.firstName || profile.fullName) },
    { name: 'Email', done: Boolean(profile.email) },
    { name: 'Phone', done: Boolean(profile.phone) },
    { name: 'Location', done: Boolean(typeof profile.location === 'string' ? profile.location : profile.location?.city) },
    { name: 'Work Authorization', done: profile.workAuth?.isLegallyAuthorized !== undefined },
    { name: 'Current Role', done: Boolean(profile.experience?.currentTitle) },
    { name: 'Target Titles', done: Boolean(profile.targetTitles && profile.targetTitles.length > 0) },
    { name: 'LinkedIn URL', done: Boolean(profile.linkedInUrl) },
    {
      name: 'Portfolio or other link',
      done: Boolean(
        profile.portfolioUrl ||
          (Array.isArray(profile.additionalLinks) && profile.additionalLinks.some((link) => Boolean(link?.url)))
      ),
    },
  ];

  const completedCount = checks.filter((c) => c.done).length;
  const percentage = Math.round((completedCount / checks.length) * 100);
  const nextMissing = checks.find((c) => !c.done);

  return (
    <div className="p-4 sm:p-5 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="font-heading text-sm font-bold text-slate-900 tracking-tight">
            ATS Profile Readiness
          </h3>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            {percentage === 100
              ? 'Your profile is fully configured for 1-click ATS applications.'
              : nextMissing
              ? `Add your ${nextMissing.name.toLowerCase()} to maximize autofill coverage.`
              : 'Complete your profile details below.'}
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="font-mono text-xs font-bold text-slate-900">
            {percentage}% Complete
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            percentage >= 80 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-blue-600' : 'bg-amber-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
