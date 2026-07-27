import React, { useState, useEffect } from 'react';
import { getCompanyLogoUrls, getCompanyAvatarColors } from '../lib/logoUtils';
import { Building2 } from 'lucide-react';

interface CompanyLogoProps {
  company: string;
  jobLink?: string;
  logoUrl?: string;
  companyDomain?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_MAP = {
  xs: { box: 'w-6 h-6 rounded-md text-[10px]', icon: 'w-3 h-3', imgSize: 'p-0.5' },
  sm: { box: 'w-8 h-8 rounded-xl text-xs', icon: 'w-4 h-4', imgSize: 'p-1' },
  md: { box: 'w-10 h-10 rounded-xl text-sm', icon: 'w-5 h-5', imgSize: 'p-1.5' },
  lg: { box: 'w-12 h-12 rounded-2xl text-base', icon: 'w-6 h-6', imgSize: 'p-2' },
  xl: { box: 'w-16 h-16 rounded-2xl text-xl', icon: 'w-8 h-8', imgSize: 'p-2.5' },
};

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  company,
  jobLink,
  logoUrl,
  companyDomain,
  size = 'md',
  className = '',
}) => {
  const [urlIndex, setUrlIndex] = useState(0);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    setUrlIndex(0);
    setHasFailed(false);
  }, [company, jobLink, logoUrl, companyDomain]);

  const logoUrls = getCompanyLogoUrls(company, jobLink, logoUrl, companyDomain);
  const currentUrl = logoUrls[urlIndex];

  const handleImageError = () => {
    if (urlIndex < logoUrls.length - 1) {
      setUrlIndex((prev) => prev + 1);
    } else {
      setHasFailed(true);
    }
  };

  const { box, icon, imgSize } = SIZE_MAP[size] || SIZE_MAP.md;
  const avatarColors = getCompanyAvatarColors(company || 'Company');
  const initial = company ? company.trim().charAt(0).toUpperCase() : '?';

  return (
    <div
      className={`relative shrink-0 flex items-center justify-center font-bold overflow-hidden bg-white border border-slate-200/90 shadow-2xs ${box} ${className}`}
    >
      {!hasFailed && currentUrl ? (
        <img
          src={currentUrl}
          alt={`${company} logo`}
          onError={handleImageError}
          className={`w-full h-full object-contain ${imgSize}`}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center font-mono ${avatarColors.bg} ${avatarColors.text}`}
        >
          {initial ? (
            <span>{initial}</span>
          ) : (
            <Building2 className={`${icon} opacity-60`} />
          )}
        </div>
      )}
    </div>
  );
};
