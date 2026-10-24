import React, { useEffect, useCallback } from 'react';
import { LegalNavbar } from './LegalNavbar';
import { LegalTableOfContents } from './LegalTableOfContents';
import { LegalFooter } from './LegalFooter';
import { PrivacyPolicyContent, PRIVACY_SECTIONS } from './PrivacyPolicyContent';
import { navigateToRoute } from '../../lib/routeUtils';
import { useAuth } from '../../context/AuthContext';

export interface PrivacyPolicyPageProps {
  onNavigateHome?: () => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({
  onNavigateHome: customNavigateHome,
}) => {
  const { user } = useAuth();

  useEffect(() => {
    document.title = 'Privacy Policy | Tracklet';
    if (window.location.pathname !== '/privacy' && window.location.pathname !== '/privacy-policy' && window.location.pathname !== '/legal') {
      window.history.replaceState(null, '', '/privacy');
    }
  }, []);

  const handleNavigateHome = useCallback(() => {
    if (customNavigateHome) {
      customNavigateHome();
      return;
    }
    const destination = user ? '/applications' : '/login';
    navigateToRoute(destination);
  }, [customNavigateHome, user]);

  const handleNavigateAuth = useCallback((mode: 'signin' | 'signup') => {
    const destination = mode === 'signup' ? '/signup' : '/login';
    navigateToRoute(destination);
  }, []);

  const handleSelectDoc = useCallback((doc: 'privacy' | 'terms') => {
    if (doc === 'terms') {
      navigateToRoute('/terms');
    }
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col">
      <LegalNavbar
        activeDoc="privacy"
        onSelectDoc={handleSelectDoc}
        isAuthenticated={Boolean(user)}
        onNavigateHome={handleNavigateHome}
        onNavigateAuth={handleNavigateAuth}
        onPrint={handlePrint}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-14">
          {/* Table of Contents Sticky Sidebar */}
          <aside className="w-full lg:w-72 shrink-0">
            <LegalTableOfContents sections={PRIVACY_SECTIONS} />
          </aside>

          {/* Main Unboxed Article Content (Open Linear-style layout, no enclosing card container) */}
          <article className="flex-1 w-full min-w-0 max-w-3xl">
            <PrivacyPolicyContent />
          </article>
        </div>
      </main>

      <LegalFooter
        onSelectDoc={handleSelectDoc}
        onNavigateHome={handleNavigateHome}
      />
    </div>
  );
};
