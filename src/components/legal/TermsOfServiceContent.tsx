import React from 'react';
import { Mail } from 'lucide-react';
import { navigateToRoute } from '../../lib/routeUtils';
import { LEGAL_CONFIG } from '../../lib/constants';

export const TERMS_SECTIONS = [
  { id: 'agreement', title: '1. Acceptance of Terms' },
  { id: 'service-description', title: '2. Description of Service' },
  { id: 'account-security', title: '3. User Accounts & Security' },
  { id: 'content-ownership', title: '4. Customer Content & IP Rights' },
  { id: 'subscriptions-billing', title: '5. Subscriptions, Billing & Cancellations' },
  { id: 'ats-autofill-responsibility', title: '6. ATS Autofill Assistant & User Responsibility' },
  { id: 'acceptable-use', title: '7. Acceptable Use Policy & System Protection' },
  { id: 'third-party-portals', title: '8. Third-Party Job Boards & ATS Disclaimers' },
  { id: 'service-availability', title: '9. Warranties & Disclaimers' },
  { id: 'limitation-liability', title: '10. Limitation of Liability' },
  { id: 'termination', title: '11. Termination & Survival' },
  { id: 'governing-law', title: '12. Governing Law & Dispute Resolution' },
  { id: 'terms-contact', title: '13. Legal Contact & Notices' },
];

export const TermsOfServiceContent: React.FC = () => {
  return (
    <div className="space-y-12 text-slate-700 font-sans leading-relaxed text-sm">
      {/* Document Header Metadata */}
      <div className="border-b border-slate-200 pb-8 space-y-3">
        <h1 className="text-3xl sm:text-4xl font-heading font-extrabold text-slate-900 tracking-tight">
          Tracklet Terms of Service
        </h1>
        <p className="text-xs text-slate-500 font-mono">
          Last updated: October 24, 2026
        </p>
      </div>

      {/* Section 1: Acceptance */}
      <section id="agreement" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl font-heading font-bold text-slate-900">
          1. Acceptance of Terms
        </h2>
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally binding agreement between you (&ldquo;User&rdquo;, &ldquo;you&rdquo;) and Tracklet (&ldquo;Tracklet&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account, accessing our Web Application, or installing the Tracklet Chrome Extension, you signify that you have read, understood, and agree to be bound by these Terms and our{' '}
          <a
            href="/privacy"
            onClick={(e) => {
              e.preventDefault();
              navigateToRoute('/privacy');
            }}
            className="font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2"
          >
            Privacy Policy
          </a>
          .
        </p>
        <p>
          If you do not agree with any part of these Terms, you must not access the Service, must uninstall the browser extension, and must discontinue all use immediately.
        </p>
      </section>

      {/* Section 2: Description */}
      <section id="service-description" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl font-heading font-bold text-slate-900">
          2. Description of the Service
        </h2>
        <p>
          Tracklet provides a cloud-native job search management system comprising a Kanban application pipeline, searchable data tables, recruiter contact management, notes editor, interview tracking, analytical dashboards, and a browser extension for capturing public job postings and assisting candidate form autofill.
        </p>
      </section>

      {/* Section 3: Accounts */}
      <section id="account-security" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl font-heading font-bold text-slate-900">
          3. User Accounts & Security
        </h2>
        <p>
          To access the workspace, you must create a cloud user account via Firebase Authentication using a valid email address or authenticated Google profile. You agree to:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs">
          <li>Provide accurate, current, and complete registration information.</li>
          <li>Maintain the strict confidentiality of your account credentials.</li>
          <li>Promptly notify us at <code className="text-[11px] font-mono text-slate-800">{LEGAL_CONFIG.SUPPORT_EMAIL}</code> upon discovering any unauthorized account access.</li>
          <li>Assume full responsibility for all activities conducted under your credentials.</li>
        </ul>
      </section>

      {/* Section 4: Content Ownership */}
      <section id="content-ownership" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-heading font-bold text-slate-900">
          4. Customer Content & Intellectual Property Ownership
        </h2>
        <h3 className="text-sm font-bold text-slate-900">
          You Own 100% of Your Data
        </h3>
        <p>
          You retain exclusive copyright, title, and intellectual property rights in and to all career materials you submit, upload, or generate in Tracklet, including your job pipeline records, resumes, cover letters, recruiter communication notes, and contact lists (&ldquo;Customer Content&rdquo;).
        </p>
        <p>
          You grant Tracklet only a limited, non-exclusive, worldwide, royalty-free operating license solely necessary to store, parse, index, synchronize, and display your Customer Content for the sole purpose of operating and providing the Service to you.
        </p>
      </section>

      {/* Section 5: Subscriptions & Billing */}
      <section id="subscriptions-billing" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl font-heading font-bold text-slate-900">
          5. Subscription Plans, Billing & Cancellations
        </h2>
        <div className="p-3.5 bg-blue-50 border border-blue-200/90 rounded-xl text-xs text-blue-900 leading-relaxed">
          <strong className="font-bold">Experimental Preview Notice:</strong> Tracklet is currently in an experimental preview. Paid subscriptions, billing, and tier restrictions are temporarily disabled during this testing period; all registered users enjoy full platform access free of charge.
        </div>
        <p>
          Tracklet provides both Free and Pro subscription plans. Specific plan features, quotas, and pricing details are published on our pricing surfaces:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-900 font-semibold">
                <th scope="col" className="py-2.5 pr-4 font-semibold">Plan Tier</th>
                <th scope="col" className="py-2.5 px-4 font-semibold">Active Pipeline Quota</th>
                <th scope="col" className="py-2.5 px-4 font-semibold">Extension & Autofill</th>
                <th scope="col" className="py-2.5 pl-4 font-semibold">Resume Vault</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              <tr>
                <td className="py-3 pr-4 font-semibold text-slate-900 align-top">Free Tier</td>
                <td className="py-3 px-4 align-top">Up to 20 active applications</td>
                <td className="py-3 px-4 align-top">Standard job capture & basic autofill</td>
                <td className="py-3 pl-4 align-top">1 primary resume file</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold text-slate-900 align-top">Pro Tier</td>
                <td className="py-3 px-4 align-top">Unlimited active applications</td>
                <td className="py-3 px-4 align-top">Unlimited 1-click capture & rapid autofill</td>
                <td className="py-3 pl-4 align-top">Unlimited tailored resumes</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul className="list-disc pl-5 space-y-1.5 text-xs">
          <li><strong>Billing Terms:</strong> Paid subscriptions renew automatically on a recurring monthly or quarterly billing cycle unless cancelled prior to the renewal date.</li>
          <li><strong>Cancellation Policy:</strong> You may cancel your subscription at any time via Account Settings. Upon cancellation, your Pro benefits remain active until the end of your current paid billing period.</li>
          <li><strong>Refund Policy:</strong> Except where required by applicable consumer law, payments are non-refundable. If you experience technical defects preventing service use, contact support within 14 days of purchase.</li>
        </ul>
      </section>

      {/* Section 6: ATS Autofill Assistant */}
      <section id="ats-autofill-responsibility" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl font-heading font-bold text-slate-900">
          6. ATS Autofill Assistant & User Review Responsibility
        </h2>
        <p>
          The Tracklet browser extension includes an autofill assistant designed to help candidates streamline submitting repetitive employment application forms on third-party ATS platforms (including Greenhouse, Lever, Workday, Ashby, and BambooHR).
        </p>
        <h3 className="text-sm font-bold text-slate-900 pt-1">
          Important Candidate Verification Notice
        </h3>
        <p>
          While Tracklet endeavors to match and populate fields accurately based on your profile and resumes, <strong>you acknowledge and agree that you remain exclusively responsible for inspecting, proofreading, and verifying the accuracy and completeness of all data</strong> populated into any application form before final submission to an employer.
        </p>
        <p>
          Tracklet does not guarantee that third-party ATS portals will accept, process, or correctly interpret autofilled fields. Tracklet shall not be liable for any errors, omissions, missed deadlines, or application rejections resulting from third-party form submissions.
        </p>
      </section>

      {/* Section 7: Acceptable Use */}
      <section id="acceptable-use" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl font-heading font-bold text-slate-900">
          7. Acceptable Use Policy & System Protection
        </h2>
        <p>
          Tracklet is intended for individual career seekers. You agree not to misuse the Service. Specifically, you agree not to:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs">
          <li>Decompile, reverse-engineer, or disassemble any part of the Web Dashboard, Chrome Extension, or serverless APIs.</li>
          <li>Bypass or attempt to circumvent plan quotas, rate limits, or access controls.</li>
          <li>Deploy automated scripts, bots, or headless crawlers to flood or overload employer ATS endpoints through the extension.</li>
          <li>Pool or share a single subscription account across multiple recruiting consultants, staffing firms, or agencies.</li>
          <li>Upload malicious code, viruses, or defamatory materials to cloud resume storage.</li>
        </ul>
      </section>

      {/* Section 8: Third-Party Portals */}
      <section id="third-party-portals" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl font-heading font-bold text-slate-900">
          8. Third-Party Job Boards & ATS Disclaimers
        </h2>
        <p>
          The Service facilitates capturing job postings from independent third-party portals (such as LinkedIn, Indeed, Greenhouse, Lever, Workday, and corporate career pages). Tracklet is an independent product and is not affiliated, endorsed, or partnered with these providers.
        </p>
        <p>
          We do not guarantee that third-party postings are active, accurate, or complete. External employers control job availability, interview scheduling, and hiring determinations.
        </p>
      </section>

      {/* Section 9: Warranties & Disclaimers */}
      <section id="service-availability" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl font-heading font-bold text-slate-900">
          9. Service Availability Target & Disclaimers
        </h2>
        <p>
          We strive for a 99.9% service uptime target. However, the Service is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis without warranties of any kind, whether express, statutory, or implied, including warranties of merchantability, fitness for a particular purpose, or uninterrupted availability.
        </p>
        <p>
          We do not guarantee that using Tracklet will result in job offers, interviews, or employment.
        </p>
      </section>

      {/* Section 10: Limitation of Liability */}
      <section id="limitation-liability" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl font-heading font-bold text-slate-900">
          10. Limitation of Liability
        </h2>
        <p>
          To the maximum extent permitted by applicable law, in no event shall Tracklet, its directors, officers, employees, or contractors be liable for any indirect, punitive, incidental, special, consequential, or exemplary damages (including loss of profits, goodwill, data, or employment opportunities) arising out of or relating to your use of the Service.
        </p>
        <p>
          Our total cumulative liability for all claims arising out of these Terms or the Service shall not exceed the greater of fifty U.S. dollars ($50) or the amounts paid by you to Tracklet in the twelve (12) months immediately preceding the event giving rise to liability.
        </p>
      </section>

      {/* Section 11: Termination */}
      <section id="termination" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl font-heading font-bold text-slate-900">
          11. Termination & Survival
        </h2>
        <p>
          You may terminate these Terms at any time by deleting your account via Account Settings and uninstalling the Chrome Extension. We reserve the right to suspend or terminate accounts that breach these Terms or engage in abusive platform exploitation.
        </p>
        <p>
          Provisions regarding intellectual property ownership, disclaimers, limitations of liability, and dispute resolution shall survive termination.
        </p>
      </section>

      {/* Section 12: Governing Law */}
      <section id="governing-law" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl font-heading font-bold text-slate-900">
          12. Governing Law & Dispute Resolution
        </h2>
        <p>
          These Terms and any disputes arising hereunder shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to conflict of law principles. Any legal suit, action, or proceeding shall be instituted exclusively in the federal or state courts located in Delaware.
        </p>
      </section>

      {/* Section 13: Contact */}
      <section id="terms-contact" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl font-heading font-bold text-slate-900">
          13. Legal Contact & Notices
        </h2>
        <p>
          For formal legal notices, questions concerning these Terms, or merchant compliance inquiries, please direct correspondence to:
        </p>
        <div className="space-y-1.5 pt-1 text-xs">
          <p className="font-bold text-slate-900">Tracklet Legal Department</p>
          <p className="flex items-center gap-2 text-slate-700">
            <Mail className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Email:{' '}
              <a
                href={`mailto:${LEGAL_CONFIG.LEGAL_EMAIL}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-600 hover:text-blue-700 underline underline-offset-2"
              >
                {LEGAL_CONFIG.LEGAL_EMAIL}
              </a>
            </span>
          </p>
        </div>
      </section>
    </div>
  );
};
