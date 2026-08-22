import React from 'react';
import { Clock } from 'lucide-react';
import { JobPlatform, WorkLocation, EmploymentType } from '../../types';
import { JOB_PLATFORMS, WORK_LOCATIONS, EMPLOYMENT_TYPES } from '../../lib/constants';
import { CustomSelectDropdown } from '../CustomSelectDropdown';

export interface AddApplicationMetadataFormProps {
  platform: JobPlatform;
  onPlatformChange: (val: JobPlatform) => void;
  dateApplied: string;
  onDateAppliedChange: (val: string) => void;
  workLocation: WorkLocation | '';
  onWorkLocationChange: (val: WorkLocation | '') => void;
  employmentType: EmploymentType | '';
  onEmploymentTypeChange: (val: EmploymentType | '') => void;
  jobLocation: string;
  onJobLocationChange: (val: string) => void;
}

export const AddApplicationMetadataForm: React.FC<AddApplicationMetadataFormProps> = ({
  platform,
  onPlatformChange,
  dateApplied,
  onDateAppliedChange,
  workLocation,
  onWorkLocationChange,
  employmentType,
  onEmploymentTypeChange,
  jobLocation,
  onJobLocationChange,
}) => {
  return (
    <div className="space-y-3 bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 shadow-2xs">
      <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 pb-2 border-b border-slate-200/60">
        <Clock className="w-3.5 h-3.5 text-blue-500" />
        Pipeline Metadata
      </h3>

      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-mono font-medium text-slate-500 mb-1">Platform</label>
          <CustomSelectDropdown<JobPlatform>
            value={platform}
            onChange={(val) => onPlatformChange(val)}
            options={JOB_PLATFORMS.map((p) => ({ label: p, value: p }))}
            className="w-full"
            size="md"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-mono font-medium text-slate-500 mb-1">Work Type</label>
            <CustomSelectDropdown<WorkLocation | ''>
              value={workLocation}
              onChange={(val) => onWorkLocationChange(val)}
              options={[
                { label: 'Not set', value: '' },
                ...WORK_LOCATIONS.map((w) => ({ label: w, value: w })),
              ]}
              labelPrefix="Work Type"
              className="w-full"
              size="md"
            />
          </div>
          <div>
            <label className="block text-[11px] font-mono font-medium text-slate-500 mb-1">Job Type</label>
            <CustomSelectDropdown<EmploymentType | ''>
              value={employmentType}
              onChange={(val) => onEmploymentTypeChange(val)}
              options={[
                { label: 'Not set', value: '' },
                ...EMPLOYMENT_TYPES.map((e) => ({ label: e, value: e })),
              ]}
              labelPrefix="Job Type"
              className="w-full"
              size="md"
            />
          </div>
        </div>

        <div>
          <label htmlFor="add-job-location" className="block text-[11px] font-mono font-medium text-slate-500 mb-1">Job Location</label>
          <input
            id="add-job-location"
            type="text"
            value={jobLocation}
            onChange={(e) => onJobLocationChange(e.target.value)}
            placeholder="e.g. San Francisco, CA or Remote"
            className="w-full bg-white text-slate-900 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 font-mono text-xs transition-all shadow-2xs"
          />
        </div>

        <div>
          <label className="block text-[11px] font-mono font-medium text-slate-500 mb-1">Date Applied</label>
          <input
            type="date"
            value={dateApplied}
            onChange={(e) => onDateAppliedChange(e.target.value)}
            className="w-full bg-white text-slate-900 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 font-mono text-xs cursor-pointer transition-all shadow-2xs"
          />
        </div>
      </div>
    </div>
  );
};
