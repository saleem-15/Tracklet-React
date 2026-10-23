import React from 'react';
import { FileText, CheckCircle2, AlertTriangle, ShieldCheck, CreditCard, Scale, Mail } from 'lucide-react';

export const TERMS_SECTIONS = [
  { id: 'agreement', title: '1. Acceptance of Terms' },
  { id: 'service-description', title: '2. Description of Service' },
  { id: 'account-security', title: '3. User Accounts & Security' },
  { id: 'content-ownership', title: '4. Customer Content & IP Rights' },
  { id: 'subscriptions-billing', title: '5. Subscriptions, Billing & Cancellations' },
  { id: 'acceptable-use', title: '6. Acceptable Use Policy' },
  { id: 'third-party-portals', title: '7. Third-Party Job Boards & ATS Services' },
  { id: 'service-availability', title: '8. Warranties & Disclaimers' },
  { id: 'limitation-liability', title: '9. Limitation of Liability' },
  { id: 'termination', title: '10. Termination & Survival' },
  { id: 'governing-law', title: '11. Governing Law' },
  { id: 'terms-contact', title: '12. Legal Contact & Notices' },
];

export const TermsOfServiceContent: React.FC = () => {
  return (
    <article className="prose prose-slate max-w-none space-y-10 text-slate-700 font-sans leading-relaxed text-sm">
      {/* Document Header Metadata */}
      <div className="border-b border-slate-200 pb-6 space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono font-medium text-emerald-600">
          <FileText className="w-4 h-4 text-emerald-600" />
          <span>OFFICIAL USER AGREEMENT</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
          Tracklet Terms of Service
        </h1>
        <p className="text-xs text-slate-500">
          Last Updated & Effective Date: October 23, 2026 • Version 2.0 (Commercial SaaS Edition)
        </p>
      </div>

      {/* Section 1: Acceptance */}
      <section id="agreement" className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-heading font-bold text-slate-900">
          1. Acceptance of Terms
        </h2>
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally binding agreement between you (&ldquo;User&rdquo;, &ldquo;you&rdquo;) and Tracklet (&ldquo;Tracklet&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account, accessing our Web Application, or installing the Tracklet Chrome Extension, you signify that you have read, understood, and agree to be bound by these Terms and our Privacy Policy.
        </p>
        <p>
          If you do not agree with any part of these Terms, you must not access the Service, must uninstall the browser extension, and must discontinue all use immediately.
        </p>
      </section>

      {/* Section 2: Description */}
      <section id="service-description" className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-heading font-bold text-slate-900">
          2. Description of the Service
        </h2>
        <p>
          Tracklet provides a cloud-native job search management system comprising a Kanban application pipeline, searchable data tables, recruiter contact management, notes editor, interview tracking, analytical dashboards, and a browser extension for capturing public job postings.
        </p>
      </section>

      {/* Section 3: Accounts */}
      <section id="account-security" className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-heading font-bold text-slate-900">
          3. User Accounts & Security
        </h2>
        <p>
          To access the workspace, you must create a cloud user account via Firebase Authentication using a valid email address or authenticated Google profile. You agree to:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs">
          <li>Provide accurate, current, and complete registration information.</li>
          <li>Maintain the strict confidentiality of your account credentials.</li>
          <li>Promptly notify us at <code className="text-[11px] font-mono text-slate-800">support@tracklet.app</code> upon discovering any unauthorized account access.</li>
          <li>Assume full responsibility for all activities conducted under your credentials.</li>
        </ul>
      </section>

      {/* Section 4: Content Ownership */}
      <section id="content-ownership" className="scroll-mt-24 space-y-4">
        <h2 className="text-lg font-heading font-bold text-slate-900">
          4. Customer Content & Intellectual Property Ownership
        </h2>
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>You Own 100% of Your Data</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed font-sans">
            You retain exclusive copyright, title, and intellectual property rights in and to all career materials you submit, upload, or generate in Tracklet, including your job pipeline records, resumes, cover letters, recruiter communication notes, and contact lists (&ldquo;Customer Content&rdquo;).
          </p>
        </div>
        <p>
          You grant Tracklet only a limited, non-exclusive, worldwide, royalty-free operating license solely necessary to store, parse, index, synchronize, and display your Customer Content for the sole purpose of operating and providing the Service to you.
        </p>
      </section>

      {/* Section 5: Subscriptions & Billing */}
      <section id="subscriptions-billing" className="scroll-mt-24 space-y-4">
        <h2 className="text-lg font-heading font-bold text-slate-900">
          5. Subscription Plans, Billing & Cancellations
        </h2>
        <p>
          Tracklet provides both Free and Pro subscription plans. Specific plan features, quotas, and pricing details are published on our pricing surfaces:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
            <span className="font-bold text-slate-900 block text-xs">Free Tier Plan</span>
            <p className="text-slate-600">
              Free accounts are subject to quota limits, including up to 20 active pipeline applications (non-terminal stages), monthly web extraction limits, and standard diagnostic reporting.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
            <span className="font-bold text-slate-900 block text-xs">Pro Tier Subscription</span>
            <p className="text-slate-600">
              Pro subscriptions unlock unlimited active pipeline cards, elevated AI/ATS extraction quotas, cloud resume attachments, and advanced interview telemetry.
            </p>
          </div>
        </div>
        <ul className="list-disc pl-5 space-y-1.5 text-xs">
          <li><strong>Billing Terms:</strong> Paid subscriptions renew automatically on a recurring monthly or quarterly billing cycle unless cancelled prior to the renewal date.</li>
          <li><strong>Cancellation Policy:</strong> You may cancel your subscription at any time via Account Settings. Upon cancellation, your Pro benefits remain active until the end of your current paid billing period.</li>
          <li><strong>Refund Policy:</strong> Except where required by applicable consumer law, payments are non-refundable. If you experience technical defects preventing service use, contact support within 14 days of purchase.</li>
        </ul>
      </section>

      {/* Section 6: Acceptable Use */}
      <section id="acceptable-use" className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-heading font-bold text-slate-900">
          6. Acceptable Use Policy & System Protection
        </h2>
        <p>
          Tracklet is intended for individual career seekers. You agree not to misuse the Service. Specifically, you agree not to:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs">
          <li>Decompile, reverse-engineer, or disassemble any part of the Web Dashboard, Chrome Extension, or serverless APIs.</li>
          <li>Bypass or attempt to circumvent plan quotas, rate limits, or access controls.</li>
          <li>Use automated scripts or bots to spam, flood, or overload third-party ATS platforms or job boards via our extension.</li>
          <li>Pool or share a single subscription account across multiple recruiting consultants, staffing firms, or agencies.</li>
          <li>Upload malicious files, viruses, or defamatory materials to cloud resume storage.</li>
        </ul>
      </section>

      {/* Section 7: Third-Party Portals */}
      <section id="third-party-portals" className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-heading font-bold text-slate-900">
          7. Third-Party Job Boards & ATS Disclaimers
        </h2>
        <p>
          The Service facilitates capturing job postings from independent third-party portals (such as LinkedIn, Indeed, Greenhouse, Lever, Workday, and corporate career pages). Tracklet is an independent product and is not affiliated, endorsed, or partnered with these providers.
        </p>
        <p>
          We do not guarantee that third-party postings are active, accurate, or complete. External employers control job availability, interview scheduling, and hiring determinations.
        </p>
      </section>

      {/* Section 8: Warranties & Disclaimers */}
      <section id="service-availability" className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-heading font-bold text-slate-900">
          8. Service Availability Target & Disclaimers
        </h2>
        <p>
          We strive for a 99.9% service uptime target. However, the Service is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis without warranties of any kind, whether express, statutory, or implied, including warranties of merchantability, fitness for a particular purpose, or uninterrupted availability.
        </p>
        <p>
          We do not guarantee that using Tracklet will result in job offers, interviews, or employment.
        </p>
      </section>

      {/* Section 9: Limitation of Liability */}
      <section id="limitation-liability" className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-heading font-bold text-slate-900">
          9. Limitation of Liability
        </h2>
        <p>
          To the maximum extent permitted by applicable law, in no event shall Tracklet, its directors, officers, employees, or contractors be liable for any indirect, punitive, incidental, special, consequential, or exemplary damages (including loss of profits, goodwill, data, or employment opportunities) arising out of or relating to your use of the Service.
        </p>
        <p>
          Our total cumulative liability for all claims arising out of these Terms or the Service shall not exceed the greater of fifty U.S. dollars ($50) or the amounts paid by you to Tracklet in the twelve (12) months immediately preceding the event giving rise to liability.
        </p>
      </section>

      {/* Section 10: Termination */}
      <section id="termination" className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-heading font-bold text-slate-900">
          10. Termination & Survival
        </h2>
        <p>
          You may terminate these Terms at any time by deleting your account via Account Settings and uninstalling the Chrome Extension. We reserve the right to suspend or terminate accounts that breach these Terms or engage in abusive platform exploitation.
        </p>
        <p>
          Provisions regarding intellectual property ownership, disclaimers, limitations of liability, and dispute resolution shall survive termination.
        </p>
      </section>

      {/* Section 11: Governing Law */}
      <section id="governing-law" className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-heading font-bold text-slate-900">
          11. Governing Law & Dispute Resolution
        </h2>
        <p>
          These Terms and any disputes arising hereunder shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to conflict of law principles. Any legal suit, action, or proceeding shall be instituted exclusively in the federal or state courts located in Delaware.
        </p>
      </section>

      {/* Section 12: Contact */}
      <section id="terms-contact" className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-heading font-bold text-slate-900">
          12. Legal Contact & Notices
        </h2>
        <p>
          For formal legal notices, questions concerning these Terms, or merchant compliance inquiries, please direct correspondence to:
        </p>
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="font-bold text-slate-900 text-xs">Tracklet Legal Department</span>
            <p className="text-xs text-slate-600">Email: legal@tracklet.app • support@tracklet.app</p>
          </div>
          <a
            href="mailto:legal@tracklet.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors shadow-2xs shrink-0"
          >
            <Mail className="w-3.5 h-3.5 text-emerald-600" />
            <span>Contact Legal Team</span>
          </a>
        </div>
      </section>
    </article>
  );
};
