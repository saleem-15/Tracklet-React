import React from 'react';
import { Pencil } from 'lucide-react';
import { Application, ApplicationStatus } from '../../types';
import { UI_TOKENS } from '../../theme/tokens';
import { CompanyLogo } from '../CompanyLogo';
import { StageSelectorDropdown } from '../StageSelectorDropdown';
import { CloseIconButton } from '../IconButton';
import { JobTypeBadges } from '../JobTypeBadges';

export interface ApplicationDetailHeaderProps {
  app: Application;
  isEditingInfo: boolean;
  onToggleEditInfo: () => void;
  onStatusChange: (status: ApplicationStatus) => void;
  onClose: () => void;
}

export const ApplicationDetailHeader: React.FC<ApplicationDetailHeaderProps> = ({
  app,
  isEditingInfo,
  onToggleEditInfo,
  onStatusChange,
  onClose,
}) => {
  return (
    <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 shrink-0 gap-3">
      <div className="flex items-center gap-3.5 min-w-0">
        <CompanyLogo company={app.company} jobLink={app.jobLink} logoUrl={app.logoUrl} companyDomain={app.companyDomain} size="lg" />
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate leading-tight">{app.company}</h2>
          <p className="text-xs font-semibold text-slate-500 truncate mt-0.5 flex items-center gap-1.5">
            <span className="truncate">{app.role}</span>
            {(app.workLocation || app.employmentType) && (
              <JobTypeBadges
                workLocation={app.workLocation}
                employmentType={app.employmentType}
              />
            )}
          </p>
          {app.location && (
            <p className="text-[11px] font-mono text-slate-500 truncate mt-0.5">{app.location}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onToggleEditInfo}
          className={`flex items-center gap-1.5 px-3 ${UI_TOKENS.controlMd} text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
            isEditingInfo
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
          }`}
        >
          <Pencil className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isEditingInfo ? 'Cancel' : 'Edit Info'}</span>
        </button>
        <StageSelectorDropdown currentStatus={app.status} onSelectStatus={onStatusChange} size="md" />
        <div className="h-5 w-px bg-slate-200 hidden sm:block" />
        <CloseIconButton onClick={onClose} title="Close (Esc)" />
      </div>
    </div>
  );
};
