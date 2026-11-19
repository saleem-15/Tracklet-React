import React, { useState, useEffect, useRef } from 'react';
import {
  getCompanyLogoUrls,
  getCompanyCacheKey,
  verifiedLogoCache,
  LogoPatternMode,
  LogoSourceMode,
} from '../lib/logoUtils';
import { useLogoPattern, useLogoSource } from '../hooks/useLogoPattern';
import {
  LogoGeometry,
  LogoSize,
  LogoShape,
  classifyLogoShape,
  logoGeometryCache,
  detectLogoGeometry,
  getWrapperPadding,
  getImageClasses,
} from '../lib/logoGeometry';
import { Building2 } from 'lucide-react';

export interface CompanyLogoProps {
  company: string;
  jobLink?: string;
  logoUrl?: string;
  companyDomain?: string;
  size?: LogoSize;
  className?: string;
  title?: string;
  /** Explicit display mode for previews/labs. Falls back to the persisted global mode. */
  pattern?: LogoPatternMode;
  /** Explicit logo source for previews/labs. Falls back to the persisted global source. */
  source?: LogoSourceMode;
}

/** Box geometry + corner radius shared by every display mode (~17-20% scaled for sharper visual presence). */
const SIZE_BOX: Record<LogoSize, string> = {
  xs: 'w-7 h-7 rounded-md',
  sm: 'w-[38px] h-[38px] rounded-lg',
  md: 'w-12 h-12 rounded-xl',
  lg: 'w-14 h-14 rounded-2xl',
  xl: 'w-[76px] h-[76px] rounded-2xl',
};

const SIZE_ICON: Record<LogoSize, string> = {
  xs: 'w-3.5 h-3.5', sm: 'w-[18px] h-[18px]', md: 'w-6 h-6', lg: 'w-7 h-7', xl: 'w-9 h-9',
};

/** Baseline (production) container treatment. */
const WHITE_TILE = 'bg-white border border-slate-200/90 shadow-2xs select-none';
const ORIGINAL_CONTAINER: Record<LogoSize, string> = {
  xs: 'bg-slate-50 border border-slate-200/70 p-0.5 select-none',
  sm: WHITE_TILE, md: WHITE_TILE, lg: WHITE_TILE, xl: WHITE_TILE,
};

function getContainerClasses(mode: LogoPatternMode, size: LogoSize): string {
  const box = SIZE_BOX[size];

  switch (mode) {
    case 'ghost-squircle':
      return `${box} bg-slate-500/[0.04] ring-1 ring-inset ring-slate-900/[0.05] select-none`;
    case 'pure-borderless':
    case 'smart-keyline':
      return `${box} bg-transparent border-0 shadow-none select-none`;
    case 'original':
    default:
      return `${box} ${ORIGINAL_CONTAINER[size]}`;
  }
}

function getImageStyle(mode: LogoPatternMode): React.CSSProperties | undefined {
  if (mode === 'original') return undefined;
  return { mixBlendMode: 'multiply' };
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  company,
  jobLink,
  logoUrl,
  companyDomain,
  size = 'md',
  className = '',
  title,
  pattern: explicitPattern,
  source: explicitSource,
}) => {
  const [globalPattern] = useLogoPattern();
  const [globalSource, , brandfetchClientId] = useLogoSource();
  const activePattern = explicitPattern || globalPattern;
  const activeSource = explicitSource || globalSource;

  const baseCacheKey = getCompanyCacheKey(company, companyDomain);
  // Keep the production (Google) cache key byte-for-byte identical so existing
  // verifiedLogoCache entries/tests remain valid. Brandfetch variants get their
  // own isolated keys, including whether a Client ID is actually active.
  const cacheKey =
    activeSource === 'google'
      ? baseCacheKey
      : `${baseCacheKey}::${activeSource}::${brandfetchClientId || 'none'}`;
  const imgRef = useRef<HTMLImageElement | null>(null);
  const hasIdentity = !!(company || jobLink || logoUrl || companyDomain);

  // Synchronous Frame 0 check from global in-memory session cache:
  // If this company's logo is known to have failed, render fallback immediately (0ms delay, zero flicker).
  const [hasFailed, setHasFailed] = useState<boolean>(() => {
    if (!hasIdentity) return true;
    return verifiedLogoCache.get(cacheKey) === null;
  });

  const [urlIndex, setUrlIndex] = useState(0);
  const [logoShape, setLogoShape] = useState<LogoShape>('square');

  const logoUrls = getCompanyLogoUrls(company, jobLink, logoUrl, companyDomain, {
    source: activeSource,
    brandfetchClientId,
  });
  const currentUrl = logoUrls[urlIndex];

  // Synchronous Frame 0 geometry: cached classification paints with the correct
  // optical padding and scale on the very first render (zero layout shift).
  const [logoGeometry, setLogoGeometry] = useState<LogoGeometry>(() =>
    currentUrl ? logoGeometryCache.get(currentUrl) || 'unknown' : 'unknown'
  );

  useEffect(() => {
    const isKnownFailed = !hasIdentity || verifiedLogoCache.get(cacheKey) === null;
    setHasFailed(isKnownFailed);
    setUrlIndex(0);
    setLogoShape('square');
  }, [cacheKey, hasIdentity]);

  useEffect(() => {
    if (!currentUrl) {
      setLogoGeometry('unknown');
      return;
    }

    const cached = logoGeometryCache.get(currentUrl);
    if (cached) {
      setLogoGeometry(cached);
      return;
    }

    let active = true;
    void detectLogoGeometry(currentUrl, (detected) => {
      if (active) setLogoGeometry(detected);
    });
    return () => {
      active = false;
    };
  }, [currentUrl, cacheKey]);

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
      setLogoShape(classifyLogoShape(img.naturalWidth, img.naturalHeight));
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
      } else {
        setLogoShape(classifyLogoShape(img.naturalWidth, img.naturalHeight));
      }
    }
  }, [currentUrl, hasFailed]);

  const icon = SIZE_ICON[size] || SIZE_ICON.md;
  const containerClasses = getContainerClasses(activePattern, size);
  const wrapperPadding = getWrapperPadding(activePattern, size, logoShape, logoGeometry);
  const imageClasses = getImageClasses(activePattern, size, logoShape, logoGeometry);
  const imageStyle = getImageStyle(activePattern);
  const showImage = !hasFailed && !!currentUrl;

  return (
    <div
      className={`relative shrink-0 flex items-center justify-center overflow-hidden ${containerClasses} ${showImage ? wrapperPadding : ''} ${className}`.trim()}
      title={title || undefined}
    >
      {showImage ? (
        <img
          ref={imgRef}
          src={currentUrl}
          alt={company ? `${company} logo` : 'Company logo'}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={imageClasses}
          style={imageStyle}
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-500 rounded-[inherit] transition-colors duration-150">
          <Building2 className={`${icon} stroke-[1.75]`} />
        </div>
      )}

      {activePattern === 'smart-keyline' && showImage && (
        <span
          aria-hidden="true"
          data-testid="logo-smart-keyline"
          className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-slate-900/[0.07]"
        />
      )}
    </div>
  );
};
