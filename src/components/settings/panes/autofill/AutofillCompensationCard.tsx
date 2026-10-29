import React from 'react';
import { DollarSign } from 'lucide-react';
import { SettingsCard } from '../../SettingsCard';
import { CustomSelectDropdown, SelectOption } from '../../../CustomSelectDropdown';
import { CandidateProfile } from '../../../../types';

export interface AutofillCompensationCardProps {
  data: Partial<CandidateProfile>;
  onChange: <K extends keyof CandidateProfile>(field: K, value: CandidateProfile[K]) => void;
}

const CURRENCY_OPTIONS: SelectOption<string>[] = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'CAD', label: 'CAD ($)' },
  { value: 'AUD', label: 'AUD ($)' },
  { value: 'AED', label: 'AED (د.إ)' },
];

export const AutofillCompensationCard: React.FC<AutofillCompensationCardProps> = ({ data, onChange }) => {
  const currency = data.salaryTarget?.currency || 'USD';
  const minBase = data.salaryTarget?.minimumBase !== undefined ? String(data.salaryTarget.minimumBase) : '';
  const targetOTE = data.salaryTarget?.targetOTE !== undefined ? String(data.salaryTarget.targetOTE) : '';

  const handleUpdateComp = (curr: string, min?: number, ote?: number) => {
    onChange('salaryTarget', {
      currency: curr,
      minimumBase: min,
      targetOTE: ote,
    });
  };

  return (
    <SettingsCard
      title="Salary & Compensation Expectations"
      icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Currency Dropdown */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-slate-500" />
            <span>Currency</span>
          </label>
          <CustomSelectDropdown
            value={currency}
            onChange={(val) =>
              handleUpdateComp(
                val,
                minBase ? parseInt(minBase, 10) : undefined,
                targetOTE ? parseInt(targetOTE, 10) : undefined
              )
            }
            options={CURRENCY_OPTIONS}
            className="w-full"
          />
        </div>

        {/* Minimum Base Salary */}
        <div className="space-y-1.5">
          <label htmlFor="min-salary" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-slate-500" />
            <span>Minimum Base Salary</span>
          </label>
          <input
            id="min-salary"
            type="number"
            value={minBase}
            onChange={(e) =>
              handleUpdateComp(
                currency,
                e.target.value ? parseInt(e.target.value, 10) : undefined,
                targetOTE ? parseInt(targetOTE, 10) : undefined
              )
            }
            placeholder="160000"
            className="w-full h-9 px-3 text-base sm:text-sm bg-slate-50 text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-colors font-mono"
          />
        </div>

        {/* Target OTE / Total Comp */}
        <div className="space-y-1.5">
          <label htmlFor="target-ote" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-slate-500" />
            <span>Target OTE / Total Comp</span>
          </label>
          <input
            id="target-ote"
            type="number"
            value={targetOTE}
            onChange={(e) =>
              handleUpdateComp(
                currency,
                minBase ? parseInt(minBase, 10) : undefined,
                e.target.value ? parseInt(e.target.value, 10) : undefined
              )
            }
            placeholder="200000"
            className="w-full h-9 px-3 text-base sm:text-sm bg-slate-50 text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-colors font-mono"
          />
        </div>
      </div>
    </SettingsCard>
  );
};
