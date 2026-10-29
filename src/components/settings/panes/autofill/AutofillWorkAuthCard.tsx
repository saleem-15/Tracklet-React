import React from 'react';
import { ShieldCheck, Clock, MapPin } from 'lucide-react';
import { SettingsCard } from '../../SettingsCard';
import { CustomSelectDropdown, SelectOption } from '../../../CustomSelectDropdown';
import { CandidateProfile, NoticePeriodOption, RelocationPreference } from '../../../../types';

export interface AutofillWorkAuthCardProps {
  data: Partial<CandidateProfile>;
  onChange: <K extends keyof CandidateProfile>(field: K, value: CandidateProfile[K]) => void;
}

const VISA_STATUS_OPTIONS: SelectOption<string>[] = [
  { value: 'Citizen / Permanent Resident', label: 'Citizen / Permanent Resident' },
  { value: 'Employment Visa (H-1B, TN, E-3)', label: 'Employment Visa (H-1B, TN, E-3)' },
  { value: 'Student / Post-Grad (F-1 STEM OPT)', label: 'Student / Post-Grad (F-1 STEM OPT)' },
  { value: 'Requires Work Visa / Sponsorship', label: 'Requires Work Visa / Sponsorship' },
  { value: 'Other / Freelance Permit', label: 'Other / Freelance Permit' },
];

const NOTICE_PERIOD_OPTIONS: SelectOption<NoticePeriodOption>[] = [
  { value: 'immediate', label: 'Immediate / Ready Now' },
  { value: '2_weeks', label: 'Standard 2 Weeks' },
  { value: '1_month', label: '1 Month' },
  { value: '2_months', label: '2 Months' },
  { value: '3_months', label: '3+ Months' },
];

const RELOCATION_OPTIONS: SelectOption<RelocationPreference>[] = [
  { value: 'remote_only', label: 'Remote Only' },
  { value: 'willing_to_relocate', label: 'Willing to Relocate' },
  { value: 'not_willing', label: 'Not Willing to Relocate' },
  { value: 'negotiable', label: 'Negotiable / Case-by-Case' },
];

export const AutofillWorkAuthCard: React.FC<AutofillWorkAuthCardProps> = ({ data, onChange }) => {
  const isAuthorized = data.workAuth?.isLegallyAuthorized ?? true;
  const requiresSponsorship = data.workAuth?.requiresSponsorship ?? false;
  const currentStatus = data.workAuth?.currentStatus || 'Citizen / Permanent Resident';

  const handleUpdateAuth = (authorized: boolean, sponsorship: boolean, status: string) => {
    onChange('workAuth', {
      isLegallyAuthorized: authorized,
      requiresSponsorship: sponsorship,
      currentStatus: status,
    });
    // Keep legacy string synced for backward compatibility
    onChange('workAuthorization', status);
  };

  return (
    <SettingsCard
      title="Work Authorization & Availability"
      icon={<ShieldCheck className="w-5 h-5 text-emerald-600" />}
    >
      <div className="space-y-4">
        {/* Gate Question 1: Authorized without restriction */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50">
          <div>
            <span className="block text-xs font-semibold text-slate-900">
              Are you legally authorized to work in your target job country?
            </span>
            <span className="text-[11px] text-slate-500 font-sans block mt-0.5">
              Autofills the primary legal eligibility radio question on Greenhouse, Lever, and Workday.
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => handleUpdateAuth(true, requiresSponsorship, currentStatus)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                isAuthorized
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => handleUpdateAuth(false, requiresSponsorship, currentStatus)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                !isAuthorized
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              No
            </button>
          </div>
        </div>

        {/* Gate Question 2: Requires Visa Sponsorship */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50">
          <div>
            <span className="block text-xs font-semibold text-slate-900">
              Will you now or in the future require visa sponsorship?
            </span>
            <span className="text-[11px] text-slate-500 font-sans block mt-0.5">
              Autofills company immigration sponsorship screening questions.
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => handleUpdateAuth(isAuthorized, true, currentStatus)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                requiresSponsorship
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => handleUpdateAuth(isAuthorized, false, currentStatus)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                !requiresSponsorship
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              No
            </button>
          </div>
        </div>

        {/* 3 Secondary Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          {/* Visa Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
              <span>Current Status</span>
            </label>
            <CustomSelectDropdown
              value={currentStatus}
              onChange={(val) => handleUpdateAuth(isAuthorized, requiresSponsorship, val)}
              options={VISA_STATUS_OPTIONS}
              className="w-full"
            />
          </div>

          {/* Notice Period */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Notice Period</span>
            </label>
            <CustomSelectDropdown<NoticePeriodOption>
              value={data.noticePeriod || '2_weeks'}
              onChange={(val) => onChange('noticePeriod', val)}
              options={NOTICE_PERIOD_OPTIONS}
              className="w-full"
            />
          </div>

          {/* Relocation Preference */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span>Relocation</span>
            </label>
            <CustomSelectDropdown<RelocationPreference>
              value={data.relocationPreference || 'remote_only'}
              onChange={(val) => onChange('relocationPreference', val)}
              options={RELOCATION_OPTIONS}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </SettingsCard>
  );
};
