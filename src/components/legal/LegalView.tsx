import React, { useState, useEffect } from 'react';
import { PrivacyPolicyPage } from './PrivacyPolicyPage';
import { TermsOfServicePage } from './TermsOfServicePage';
import { LegalDocType, getLegalDocFromPath } from '../../lib/routeUtils';

export interface LegalViewProps {
  initialDoc?: LegalDocType;
  onNavigateHome?: () => void;
}

/**
 * LegalView
 *
 * Canonical unified wrapper that renders either the dedicated PrivacyPolicyPage
 * or TermsOfServicePage based on the provided document or current pathname.
 * Both pages feature an open unboxed document layout (no enclosing cards)
 * and persistent sidebar tables per modern SaaS design standards.
 */
export const LegalView: React.FC<LegalViewProps> = ({
  initialDoc,
  onNavigateHome,
}) => {
  const [activeDoc, setActiveDoc] = useState<LegalDocType>(() => {
    if (initialDoc) return initialDoc;
    return getLegalDocFromPath(typeof window !== 'undefined' ? window.location.pathname : '/privacy');
  });

  useEffect(() => {
    if (initialDoc) {
      setActiveDoc(initialDoc);
    }
  }, [initialDoc]);

  // Keep state synchronized with browser navigation
  useEffect(() => {
    const handlePopState = () => {
      const doc = getLegalDocFromPath(window.location.pathname);
      setActiveDoc(doc);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (activeDoc === 'terms') {
    return <TermsOfServicePage onNavigateHome={onNavigateHome} />;
  }

  return <PrivacyPolicyPage onNavigateHome={onNavigateHome} />;
};
