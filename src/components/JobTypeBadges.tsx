import React from 'react';
import { WorkLocation, EmploymentType } from '../types';
import {
  WORK_LOCATION_BADGE_STYLES,
  EMPLOYMENT_TYPE_BADGE_STYLES,
} from '../lib/constants';

export interface JobTypeBadgesProps {
  workLocation?: WorkLocation;
  employmentType?: EmploymentType;
  size?: 'xs' | 'sm';
  variant?: 'pill' | 'text' | 'subtle';
  className?: string;
}

/**
 * Renders optional Work Type (Remote/Hybrid/Onsite) and Job Type
 * (Full-time/Part-time/Contract/Internship) chips or calm typographic metadata.
 * Renders nothing when both values are unset.
 */
export const JobTypeBadges: React.FC<JobTypeBadgesProps> = ({
  workLocation,
  employmentType,
  size = 'xs',
  variant = 'pill',
  className = '',
}) => {
  if (!workLocation && !employmentType) return null;

  if (variant === 'text') {
    return (
      <span className={`inline-flex items-center gap-1 font-mono text-[11px] text-slate-500 whitespace-nowrap ${className}`}>
        {workLocation && <span>{workLocation}</span>}
        {workLocation && employmentType && <span className="text-slate-300">·</span>}
        {employmentType && <span>{employmentType}</span>}
      </span>
    );
  }

  const sizeStyles =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px]'
      : 'px-1.5 py-px text-[10px]';

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {workLocation && (
        <span
          title={`Work type: ${workLocation}`}
          className={`inline-flex items-center font-mono font-medium rounded-md border whitespace-nowrap ${sizeStyles} ${WORK_LOCATION_BADGE_STYLES[workLocation]}`}
        >
          {workLocation}
        </span>
      )}
      {employmentType && (
        <span
          title={`Job type: ${employmentType}`}
          className={`inline-flex items-center font-mono font-medium rounded-md border whitespace-nowrap ${sizeStyles} ${EMPLOYMENT_TYPE_BADGE_STYLES[employmentType]}`}
        >
          {employmentType}
        </span>
      )}
    </span>
  );
};
