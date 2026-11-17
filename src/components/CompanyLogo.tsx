import React, { useState, useEffect, useRef } from 'react';
import {
  getCompanyLogoUrls,
  getCompanyCacheKey,
  verifiedLogoCache,
} from '../lib/logoUtils';
import { Building2 } from 'lucide-react';

export interface CompanyLogoProps {
  company: string;
  jobLink?: string;
  logoUrl?: string;
  companyDomain?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  title?: string;
}

const SIZE_MAP = {
  xs: { box: 'w-6 h-6 rounded-md bg-slate-50 border border-slate-200/70 p-0.5', icon: 'w-3 h-3', imgSize: '' },
  sm: { box: 'w-8 h-8 rounded-lg bg-white border border-slate-200/90 shadow-2xs', icon: 'w-4 h-4', imgSize: 'p-1' },
  md: { box: 'w-10 h-10 rounded-xl bg-white border border-slate-200/90 shadow-2xs', icon: 'w-5 h-5', imgSize: 'p-1.5' },
  lg: { box: 'w-12 h-12 rounded-2xl bg-white border border-slate-200/90 shadow-2xs', icon: 'w-6 h-6', imgSize: 'p-2' },
  xl: { box: 'w-16 h-16 rounded-2xl bg-white border border-slate-200/90 shadow-2xs', icon: 'w-8 h-8', imgSize: 'p-2.5' },
};

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  company,
  jobLink,
  logoUrl,
  companyDomain,
  size = 'md',
  className = '',
  title,
}) => {
  const cacheKey = getCompanyCacheKey(company, companyDomain);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Synchronous Frame 0 check from global in-memory session cache:
  // If this company's logo is known to have failed, render fallback immediately (0ms delay, zero flicker).
  const [hasFailed, setHasFailed] = useState<boolean>(() => {
    if (!company && !jobLink && !logoUrl && !companyDomain) return true;
    return verifiedLogoCache.get(cacheKey) === null;
  });

  const [urlIndex, setUrlIndex] = useState(0);

  useEffect(() => {
    const isKnownFailed = verifiedLogoCache.get(cacheKey) === null;
    setHasFailed(isKnownFailed);
    setUrlIndex(0);
  }, [cacheKey]);

  const logoUrls = getCompanyLogoUrls(company, jobLink, logoUrl, companyDomain);
  const currentUrl = logoUrls[urlIndex];

  const handleImageError = () => {
    if (urlIndex < logoUrls.length - 1) {
      setUrlIndex((prev) => prev + 1);
    } else {
      verifiedLogoCache.set(cacheKey, null);
      setHasFailed(true);
    }
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    // Google's default fallback globe is 16x16 pixels when requested with sz=128.
    // If Google returns this tiny 16x16 fallback or fails to decode, reject it.
    if ((img.naturalWidth <= 16 && img.naturalHeight <= 16) || img.naturalWidth === 0) {
      handleImageError();
    } else {
      if (currentUrl) {
        verifiedLogoCache.set(cacheKey, currentUrl);
      }
    }
  };

  // Inspect image on mount to handle cached images that don't trigger synthetic onLoad
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && !hasFailed && currentUrl) {
      const img = imgRef.current;
      if ((img.naturalWidth <= 16 && img.naturalHeight <= 16) || img.naturalWidth === 0) {
        handleImageError();
      }
    }
  }, [currentUrl, hasFailed]);

  const { box, icon, imgSize } = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <div
      className={`relative shrink-0 flex items-center justify-center overflow-hidden select-none ${box} ${className}`}
      title={title || undefined}
    >
      {!hasFailed && currentUrl ? (
        <img
          ref={imgRef}
          src={currentUrl}
          alt={company ? `${company} logo` : 'Company logo'}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={`w-full h-full object-contain ${imgSize}`}
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-500 transition-colors duration-150"
        >
          <Building2 className={`${icon} stroke-[1.75]`} />
        </div>
      )}
    </div>
  );
};
