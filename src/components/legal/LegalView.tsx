import React, { useState, useEffect, useCallback } from 'react';
import { LegalNavbar } from './LegalNavbar';
import { LegalTableOfContents } from './LegalTableOfContents';
import { LegalFooter } from './LegalFooter';
import { PrivacyPolicyContent, PRIVACY_SECTIONS } from './PrivacyPolicyContent';
import { TermsOfServiceContent, TERMS_SECTIONS } from './TermsOfServiceContent';
import { LegalDocType, getLegalDocFromPath, getPathForLegalDoc } from '../../lib/routeUtils';
import { useAuth } from '../../context/AuthContext';

export interface LegalViewProps {
  initialDoc?: LegalDocType;
  onNavigateHome?: () => void;
}

export const LegalView: React.FC<LegalViewProps> = ({
  initialDoc,
  onNavigateHome: customNavigateHome,
}) => {
  const { user } = useAuth();
  const [activeDoc, setActiveDoc] = useState<LegalDocType>(() => {
    if (initialDoc) return initialDoc;
    return getLegalDocFromPath(window.location.pathname);
  });

  // Keep document title and URL synchronized
  useEffect(() => {
    const title = activeDoc === 'privacy' 
      ? 'Privacy Policy | Tracklet' 
      : 'Terms of Service | Tracklet';
    document.title = title;

    const canonicalPath = getPathForLegalDoc(activeDoc);
    if (window.location.pathname !== canonicalPath) {
      window.history.replaceState(null, '', canonicalPath);
    }
  }, [activeDoc]);

  // Handle browser back / forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const doc = getLegalDocFromPath(window.location.pathname);
      setActiveDoc(doc);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelectDoc = useCallback((doc: LegalDocType) => {
    setActiveDoc(doc);
    const targetPath = getPathForLegalDoc(doc);
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleNavigateHome = useCallback(() => {
    if (customNavigateHome) {
      customNavigateHome();
      return;
    }
    const destination = user ? '/applications' : '/login';
    window.history.pushState(null, '', destination);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, [customNavigateHome, user]);

  const handleNavigateAuth = useCallback((mode: 'signin' | 'signup') => {
    const destination = mode === 'signup' ? '/signup' : '/login';
    window.history.pushState(null, '', destination);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const sections = activeDoc === 'privacy' ? PRIVACY_SECTIONS : TERMS_SECTIONS;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col selection:bg-blue-100 selection:text-blue-900">
      <LegalNavbar
        activeDoc={activeDoc}
        onSelectDoc={handleSelectDoc}
        isAuthenticated={Boolean(user)}
        onNavigateHome={handleNavigateHome}
        onNavigateAuth={handleNavigateAuth}
        onPrint={handlePrint}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Main Document Content Card */}
          <div className="flex-1 w-full min-w-0 bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-10 shadow-2xs">
            {activeDoc === 'privacy' ? (
              <PrivacyPolicyContent />
            ) : (
              <TermsOfServiceContent />
            )}
          </div>

          {/* Sticky Table of Contents Navigation */}
          <LegalTableOfContents sections={sections} />
        </div>
      </main>

      <LegalFooter
        onSelectDoc={handleSelectDoc}
        onNavigateHome={handleNavigateHome}
      />
    </div>
  );
};
