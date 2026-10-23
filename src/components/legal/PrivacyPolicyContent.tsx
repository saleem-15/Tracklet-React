import React from 'react';
import { ShieldCheck, CheckCircle2, Lock, EyeOff, Server, HardDrive, Cpu, Trash2, Mail, ExternalLink } from 'lucide-react';

export const PRIVACY_SECTIONS = [
  { id: 'overview', title: '1. Introduction & Operating Identity' },
  { id: 'non-monetization', title: '2. The Non-Monetization Pledge' },
  { id: 'information-collected', title: '3. Information We Collect' },
  { id: 'extension-permissions', title: '4. Chrome Extension Data & Permissions' },
  { id: 'scraping-and-ats', title: '5. Job Extraction & ATS Interaction' },
  { id: 'cloud-and-security', title: '6. Cloud Infrastructure & Security' },
  { id: 'diagnostics-telemetry', title: '7. Diagnostics & Product Telemetry' },
  { id: 'subprocessors', title: '8. Authorized Subprocessors' },
  { id: 'user-rights-deletion', title: '9. Data Portability & Deletion Rights' },
  { id: 'legal-contact', title: '10. Contact & Privacy Inquiries' },
];

export const PrivacyPolicyContent: React.FC = () => {
  return (
    <article className="prose prose-slate max-w-none space-y-10 text-slate-700 font-sans leading-relaxed text-sm">
      {/* Document Header Metadata */}
      <div className="border-b border-slate-200 pb-6 space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono font-medium text-blue-600">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>OFFICIAL PRIVACY POLICY</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
          Tracklet Privacy Policy
        </h1>
        <p className="text-xs text-slate-500">
          Last Updated & Effective Date: October 23, 2026 • Version 2.0 (Cloud SaaS Edition)
        </p>
      </div>

      {/* Section 1: Introduction */}
      <section id="overview" className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-heading font-bold text-slate-900 flex items-center gap-2">
          1. Introduction & Operating Identity
        </h2>
        <p>
          Tracklet (&ldquo;Tracklet&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) operates the Tracklet web application, cloud services, and companion Manifest V3 browser extension (collectively, the &ldquo;Service&rdquo;). Tracklet is an independent career pipeline management workspace engineered to help job seekers clip, track, organize, and optimize their job applications.
        </p>
        <p>
          We believe that seeking employment is inherently personal and confidential. This Privacy Policy details our binding commitments regarding the collection, processing, storage, and disposal of your personal data when you interact with our Web Dashboard and Chrome Extension.
        </p>
      </section>

      {/* Section 2: Non-Monetization Pledge */}
      <section id="non-monetization" className="scroll-mt-24 space-y-4">
        <h2 className="text-lg font-heading font-bold text-slate-900 flex items-center gap-2">
          2. The Non-Monetization Pledge
        </h2>
        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/90 border border-emerald-200/80 text-emerald-950 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Zero Recruiter Monetization Covenant</span>
          </div>
          <p className="text-xs text-emerald-900 leading-relaxed font-sans">
            Tracklet operates exclusively on a direct customer subscription SaaS model. <strong>We do not sell, rent, broker, exchange, or commercialize your job search data, resumes, recruiter notes, interview schedules, or contact lists</strong> to hiring agencies, headhunters, data aggregators, or targeted advertising networks. You are our customer, not the product.
          </p>
        </div>
      </section>

      {/* Section 3: Information We Collect */}
      <section id="information-collected" className="scroll-mt-24 space-y-4">
        <h2 className="text-lg font-heading font-bold text-slate-900">
          3. Information We Collect
        </h2>
        <p>
          We only collect data necessary to provide and safeguard the Service:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <Lock className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Account & Authentication Credentials</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              When registering via Google OAuth or Email/Password, we store your Firebase User ID, email address, display name, and avatar URL. We never store or receive raw account passwords.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <HardDrive className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Career Pipeline Records</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Job listing titles, companies, job URLs, salary ranges, application stages, interview notes, email communications, and linked recruiter contacts created or clipped by you.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <Server className="w-4 h-4 text-purple-600 shrink-0" />
              <span>Resumes & Career Documents</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              PDF or text resumes uploaded to your account are encrypted and isolated under your private cloud storage directory (<code className="text-[11px] font-mono text-slate-800">users/&#123;userId&#125;/resumes</code>).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <Cpu className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Billing & Subscription State</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Subscription plan tier (<code className="text-[11px] font-mono text-slate-800">free</code> or <code className="text-[11px] font-mono text-slate-800">pro</code>), entitlement quotas, and subscription lifecycle status. Credit card numbers are handled directly by PCI-DSS Level 1 compliant processors and are never processed on Tracklet servers.
            </p>
          </div>
        </div>
      </section>

      {/* Section 4: Chrome Extension */}
      <section id="extension-permissions" className="scroll-mt-24 space-y-4">
        <h2 className="text-lg font-heading font-bold text-slate-900">
          4. Chrome Extension Data & Permissions Disclosure
        </h2>
        <p>
          The Tracklet Chrome Extension operates under Google Chrome Manifest V3. To provide single-click job capture, ATS detection, and cloud synchronization, the extension requests the following granular browser permissions:
        </p>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold">
              <tr>
                <th scope="col" className="px-4 py-3 text-left">Permission</th>
                <th scope="col" className="px-4 py-3 text-left">Technical Purpose</th>
                <th scope="col" className="px-4 py-3 text-left">Privacy Guarantee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-600">
              <tr>
                <td className="px-4 py-3 font-mono font-semibold text-slate-900">storage</td>
                <td className="px-4 py-3">Stores your authenticated session token, user preferences, and cached sync timestamps locally.</td>
                <td className="px-4 py-3">Isolated to extension local storage; not accessible to external websites.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono font-semibold text-slate-900">activeTab</td>
                <td className="px-4 py-3">Permits reading the active web page ONLY when you explicitly invoke the extension to clip a job.</td>
                <td className="px-4 py-3">Does NOT monitor background browsing or inspect tabs you do not explicitly clip.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono font-semibold text-slate-900">scripting</td>
                <td className="px-4 py-3">Executes lightweight DOM extractor routines on supported job boards (LinkedIn, Indeed, Greenhouse, Lever) to parse job title, company, and location.</td>
                <td className="px-4 py-3">Runs strictly in response to user clipping commands. Does not read unrelated browser data or keystrokes.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono font-semibold text-slate-900">tabs & sidePanel</td>
                <td className="px-4 py-3">Renders the extension companion UI in the Chrome side panel and coordinates deep linking to your web dashboard.</td>
                <td className="px-4 py-3">No URL logging or browsing history aggregation.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono font-semibold text-slate-900">host_permissions (&lt;all_urls&gt;)</td>
                <td className="px-4 py-3">Allows job capture across arbitrary company careers portals, ATS domains, and employer job pages worldwide.</td>
                <td className="px-4 py-3">Content parsing activates solely upon explicit user action on an active job posting.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 5: Scraping & ATS */}
      <section id="scraping-and-ats" className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-heading font-bold text-slate-900">
          5. Job Extraction & ATS Interaction
        </h2>
        <p>
          When you use Tracklet to save a job posting from external career sites (e.g. Greenhouse, Lever, Workday, LinkedIn, or Indeed), the extraction parses public metadata (job role, employer, job description text, work location) from the DOM.
        </p>
        <p>
          If fallback serverless extraction is required, our authenticated endpoint (<code className="text-[11px] font-mono text-slate-800">/api/scrape-job</code>) retrieves the public HTML of that specific listing on your behalf. Tracklet never bypasses authentication paywalls or accesses private corporate employer dashboards.
        </p>
      </section>

      {/* Section 6: Cloud Infrastructure */}
      <section id="cloud-and-security" className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-heading font-bold text-slate-900">
          6. Cloud Infrastructure, Encryption & Tenant Isolation
        </h2>
        <p>
          Tracklet utilizes Google Cloud Platform and Firebase infrastructure hosted in secure ISO 27001 and SOC 2 Type II certified data centers:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs">
          <li><strong>Encryption in Transit:</strong> All data transmitted between your browser, the Chrome Extension, and Tracklet Cloud is encrypted with Transport Layer Security (TLS 1.3).</li>
          <li><strong>Encryption at Rest:</strong> Application records and document attachments in Cloud Firestore and Cloud Storage are encrypted using 256-bit Advanced Encryption Standard (AES-256).</li>
          <li><strong>Strict Multi-Tenant Isolation:</strong> Our Cloud Firestore Security Rules enforce zero cross-tenant visibility. Every document path is strictly restricted to authenticated queries matching the requesting user&rsquo;s Firebase UID (<code className="text-[11px] font-mono text-slate-800">users/&#123;userId&#125;/**</code>).</li>
        </ul>
      </section>

      {/* Section 7: Telemetry */}
      <section id="diagnostics-telemetry" className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-heading font-bold text-slate-900">
          7. Diagnostics, Error Monitoring & Product Telemetry
        </h2>
        <p>
          To maintain 99.9% system reliability and rapidly fix broken ATS scrapers when job portals update their DOM schemas, we employ modern diagnostic instrumentation with comprehensive PII masking:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs">
          <li>
            <strong>Operational Error Monitoring (Sentry):</strong> Captures JavaScript exception stack traces and network failures. Sentry is configured with strict client-side DOM text masking, password sanitization, and media blocking. Candidate notes, application inputs, and personally identifiable text are scrubbed before transmission.
          </li>
          <li>
            <strong>Product Analytics (PostHog):</strong> Records anonymous feature usage patterns, navigation funnels, and aggregate extraction success codes to identify failing job boards. IP addresses are anonymized and form inputs are redacted.
          </li>
        </ul>
      </section>

      {/* Section 8: Subprocessors */}
      <section id="subprocessors" className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-heading font-bold text-slate-900">
          8. Authorized Third-Party Subprocessors
        </h2>
        <p>
          Tracklet engages trusted third-party subprocessors to deliver core infrastructure. Each provider is bound by strict Data Processing Agreements:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
            <span className="font-bold text-slate-900 block">Google Cloud & Firebase</span>
            <span className="text-slate-500">Authentication, Cloud Database, Document Storage, Hosting</span>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
            <span className="font-bold text-slate-900 block">Vercel Inc.</span>
            <span className="text-slate-500">Serverless API execution & edge frontend distribution</span>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
            <span className="font-bold text-slate-900 block">Functional Software, Inc. (Sentry)</span>
            <span className="text-slate-500">Application stability & crash reporting (PII masked)</span>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
            <span className="font-bold text-slate-900 block">PostHog, Inc.</span>
            <span className="text-slate-500">Aggregated product analytics & funnel diagnostics</span>
          </div>
        </div>
      </section>

      {/* Section 9: User Rights & Deletion */}
      <section id="user-rights-deletion" className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-heading font-bold text-slate-900">
          9. Data Portability, Retention & Deletion Rights
        </h2>
        <p>
          In accordance with GDPR, CCPA, and global data privacy standards, you maintain sovereign control over your career records:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-xs">
          <li>
            <strong>Data Portability:</strong> You may export your entire application pipeline, status timelines, contacts, and logs to CSV or JSON at any time with a single click from the toolbar.
          </li>
          <li>
            <strong>Permanent Account & Data Deletion:</strong> You have the absolute right to purge your data. Initiating account deletion in Account Settings (&ldquo;Danger Zone&rdquo;) triggers a cascading deletion that permanently wipes your Firestore user profile, application subcollections, contact records, and Cloud Storage resume attachments.
          </li>
          <li>
            <strong>Retention Policy:</strong> We retain your cloud records only for as long as your account remains active. Deleted items and accounts are permanently destroyed from our production databases within 30 days.
          </li>
        </ul>
      </section>

      {/* Section 10: Contact */}
      <section id="legal-contact" className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-heading font-bold text-slate-900">
          10. Contact & Privacy Inquiries
        </h2>
        <p>
          If you have questions, feedback, or concerns regarding this Privacy Policy or wish to exercise your data subject access rights, please contact our designated Privacy Office:
        </p>
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="font-bold text-slate-900 text-xs">Tracklet Privacy & Compliance Office</span>
            <p className="text-xs text-slate-600">Email: privacy@tracklet.app • support@tracklet.app</p>
          </div>
          <a
            href="mailto:privacy@tracklet.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors shadow-2xs shrink-0"
          >
            <Mail className="w-3.5 h-3.5 text-blue-600" />
            <span>Contact Privacy Office</span>
          </a>
        </div>
      </section>
    </article>
  );
};
