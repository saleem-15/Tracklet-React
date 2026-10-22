import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, EyeOff, FileText, X, CheckCircle2 } from 'lucide-react';

interface SecurityPrivacyCardProps {
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
}

export const SecurityPrivacyCard: React.FC<SecurityPrivacyCardProps> = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>('privacy');

  // Modal Escape keydown listener per AGENTS.md requirements
  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition-all">
        <div className="p-5 sm:p-6 space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 font-heading">
                    Enterprise Security & Data Ownership
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100/80 text-emerald-800">
                    <CheckCircle2 className="w-3 h-3" />
                    Zero Recruiter Monetization
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your career search is strictly confidential. Encrypted cloud sync with 100% user data ownership.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-2xs"
            >
              <FileText className="w-4 h-4 text-slate-500" />
              <span>Review Privacy & Terms</span>
            </button>
          </div>

          {/* Three Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Zero Recruiter Selling</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
                We never sell, broker, or share your applications, resumes, or recruiter notes with hiring agencies or ad networks.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Encrypted Cloud Sync</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
                AES-256 encryption at rest and TLS 1.3 in transit with user-scoped Firestore rules for strict tenant isolation.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <EyeOff className="w-4 h-4 text-purple-600 shrink-0" />
                <span>PII-Masked Telemetry</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
                Operational error logs (Sentry) and funnel metrics (PostHog) automatically mask passwords, candidate text, and notes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Dialog for In-App Privacy Policy & Terms */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="privacy-terms-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200"
        >
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0 bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="privacy-terms-title" className="text-base font-bold text-slate-900 font-heading">
                    Legal & Privacy Governance
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tracklet Cloud data protection covenants and user agreements
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close dialog"
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Selector */}
            <div className="px-5 pt-3 pb-2 border-b border-slate-200 flex gap-2 shrink-0 bg-white">
              <button
                type="button"
                onClick={() => setActiveTab('privacy')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'privacy'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('terms')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'terms'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Terms of Service
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 font-sans leading-relaxed">
              {activeTab === 'privacy' ? (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200/60 text-emerald-950 space-y-1">
                    <p className="font-bold text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      The Non-Monetization Pledge
                    </p>
                    <p className="text-[11px] text-emerald-900 leading-normal">
                      Tracklet operates on a transparent SaaS subscription model. We never sell, rent, or pool your job applications, notes, resumes, or recruiter contacts to recruiters, staffing agencies, or ad brokers.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-900 text-sm">1. Information We Collect</h4>
                    <p>
                      <strong>Account Data:</strong> Firebase Auth identifiers (email, user ID). Payment card details are handled directly by PCI-compliant processors (Stripe) and never stored on Tracklet servers.
                    </p>
                    <p>
                      <strong>Customer Career Data:</strong> Tracked job applications, interview timelines, recruiter contact emails, and cloud-synced resume files.
                    </p>
                    <p>
                      <strong>Operational Diagnostics (Sentry):</strong> Application error traces and latency metrics. Session replay enforces strict client-side DOM text masking and media blocking.
                    </p>
                    <p>
                      <strong>Product Telemetry (PostHog):</strong> Navigation milestones and aggregate job board scraping status codes to fix broken ATS extractors without capturing candidate identifiers.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-900 text-sm">2. Security & Tenant Isolation</h4>
                    <p>
                      All customer records are encrypted at rest with AES-256 and transmitted exclusively via TLS 1.3. User-scoped security rules strictly restrict read and write access to authenticated owners.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-900 text-sm">3. Portability & Deletion Rights</h4>
                    <p>
                      You retain full rights to export your entire application pipeline to CSV/JSON at any time and permanently delete your account and all associated cloud data via the Danger Zone in Account Settings.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-900 text-sm">1. Customer Content Ownership</h4>
                    <p>
                      You retain exclusive ownership of all job applications, resumes, notes, and materials you create in Tracklet. Tracklet receives only a limited operating license to store, encrypt, and display your data to provide the Service.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-900 text-sm">2. Subscription Plans & Entitlements</h4>
                    <p>
                      Tracklet provides Free and Pro subscription tiers (monthly or quarterly Job Hunt Pass). Subscriptions renew automatically unless cancelled prior to the renewal date. Cancelled subscriptions retain Pro access through the end of the paid period.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-900 text-sm">3. Acceptable Use Policy</h4>
                    <p>
                      The Tracklet Chrome Extension and Web Dashboard are provided for personal job search management. You agree not to reverse engineer the Service, abuse third-party ATS platforms, bypass rate limits, or pool accounts across staffing agencies.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-900 text-sm">4. Service Availability & Disclaimers</h4>
                    <p>
                      Tracklet targets 99.9% availability for cloud sync. The Service is provided &ldquo;as is&rdquo; without warranties against external ATS structure modifications or third-party hiring portal downtime.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 flex justify-end shrink-0 bg-slate-50">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
