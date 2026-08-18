import React from 'react';
import { ApplicationStatus } from '../../types';
import { CompanyLogo } from '../CompanyLogo';
import { StageSelectorDropdown } from '../StageSelectorDropdown';
import { CloseIconButton } from '../IconButton';

export interface AddApplicationHeaderProps {
  company: string;
  role: string;
  jobLink: string;
  companyDomain: string;
  status: ApplicationStatus;
  onStatusChange: (status: ApplicationStatus) => void;
  onClose: () => void;
}

export const AddApplicationHeader: React.FC<AddApplicationHeaderProps> = ({
  company,
  role,
  jobLink,
  companyDomain,
  status,
  onStatusChange,
  onClose,
}) => {
  return (
    <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 shrink-0 gap-3">
      <div className="flex items-center gap-3.5 min-w-0">
        <CompanyLogo company={company || 'Company'} jobLink={jobLink} companyDomain={companyDomain} size="lg" />
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate leading-tight font-display">
            {company.trim() ? company : 'Add Application'}
          </h2>
          <p className="text-xs font-medium text-slate-500 truncate mt-0.5 font-mono">
            {role.trim() ? role : 'New application'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <StageSelectorDropdown currentStatus={status} onSelectStatus={onStatusChange} size="md" />
        <div className="h-5 w-px bg-slate-200 hidden sm:block" />
        <CloseIconButton onClick={onClose} title="Close modal (Esc)" />
      </div>
    </div>
  );
};
