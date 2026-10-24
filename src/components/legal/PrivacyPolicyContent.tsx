import React from 'react';
import { Mail } from 'lucide-react';
import { navigateToRoute } from '../../lib/routeUtils';
import { LEGAL_CONFIG } from '../../lib/constants';

export const PRIVACY_SECTIONS = [
  { id: 'overview', title: '1. Introduction & Operating Identity' },
  { id: 'non-monetization', title: '2. The Non-Monetization Pledge' },
  { id: 'information-collected', title: '3. Information We Collect' },
  { id: 'extension-permissions', title: '4. Chrome Extension Data & Permissions' },
  { id: 'scraping-and-ats', title: '5. Job Extraction, ATS Interaction & Autofill' },
  { id: 'ai-governance', title: '6. AI Governance & Document Non-Training Policy' },
  { id: 'cloud-and-security', title: '7. Cloud Infrastructure, Encryption & Tenant Isolation' },
  { id: 'diagnostics-telemetry', title: '8. Diagnostics, Error Monitoring & Telemetry' },
  { id: 'subprocessors', title: '9. Authorized Third-Party Subprocessors' },
  { id: 'cookies-storage', title: '10. Cookies, Local Storage & Session State' },
  { id: 'user-rights-deletion', title: '11. Data Portability, GDPR/CCPA Rights & 30-Day Purge' },
  { id: 'legal-contact', title: '12. Contact & Privacy Office' },
];

export const PrivacyPolicyContent: React.FC = () => {
  return (
    <div className="space-y-12 text-slate-700 font-sans leading-relaxed text-sm">
      {/* Document Header Metadata */}
      <div className="border-b border-slate-200 pb-8 space-y-3">
        <h1 className="text-3xl sm:text-4xl font-heading font-extrabold text-slate-900 tracking-tight">
          Tracklet Privacy Policy
        </h1>
        <p className="text-xs text-slate-500 font-mono">
          Last updated: October 24, 2026
        </p>
      </div>

      {/* Section 1: Introduction */}
      <section id="overview" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl font-heading font-bold text-slate-900">
          1. Introduction & Operating Identity
        </h2>
        <p>
          Tracklet (&ldquo;Tracklet&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) operates the Tracklet web platform, cloud synchronization services, and companion Manifest V3 browser extension (collectively, the &ldquo;Service&rdquo;). Tracklet is an independent career pipeline management workspace engineered to help job seekers clip, track, organize, and optimize their job applications.
        </p>
        <p>
          We believe that seeking employment is inherently confidential. This Privacy Policy operates in conjunction with our{' '}
          <a
            href="/terms"
            onClick={(e) => {
              e.preventDefault();
              navigateToRoute('/terms');
            }}
            className="font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2"
          >
            Terms of Service
          </a>
          . It details our binding commitments regarding the collection, processing, storage, and disposal of your personal data when you interact with our Web Dashboard and Chrome Extension.
        </p>
      </section>

      {/* Section 2: Non-Monetization Pledge */}
      <section id="non-monetization" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-heading font-bold text-slate-900">
          2. The Non-Monetization Pledge
        </h2>
        <h3 className="text-sm font-bold text-slate-900">
          Zero Recruiter Monetization Covenant
        </h3>
        <p>
          Tracklet operates exclusively on a direct customer subscription SaaS model. <strong>We do not sell, rent, broker, exchange, or commercialize your job search data, resumes, recruiter notes, interview schedules, or contact lists</strong> to hiring agencies, headhunters, data aggregators, or targeted advertising networks. You are our customer, not the product.
        </p>
      </section>

      {/* Section 3: Information We Collect */}
      <section id="information-collected" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl font-heading font-bold text-slate-900">
          3. Information We Collect
        </h2>
        <p>
          We only collect data strictly necessary to provide and safeguard the Service:
        </p>
        <ul className="list-disc pl-5 space-y-3 text-xs text-slate-700">
          <li>
            <strong>Account & Authentication Credentials:</strong> When registering via Google OAuth or Email/Password, we store your Firebase User ID, email address, display name, and avatar URL. We never store or receive raw account passwords.
          </li>
          <li>
            <strong>Career Pipeline Records:</strong> Job listing titles, companies, job URLs, salary ranges, application stages, interview notes, email communications, and linked recruiter contacts created or clipped by you.
          </li>
          <li>
            <strong>Resumes & Career Documents:</strong> PDF or text resumes uploaded to your account are encrypted and isolated under your private cloud storage directory (<code className="text-[11px] font-mono text-slate-800">users/&#123;userId&#125;/resumes</code>).
          </li>
          <li>
            <strong>Billing & Subscription State:</strong> Subscription plan tier (<code className="text-[11px] font-mono text-slate-800">free</code> or <code className="text-[11px] font-mono text-slate-800">pro</code>), entitlement quotas, and subscription lifecycle status. Credit card numbers are handled directly by PCI-DSS Level 1 compliant processors and are never processed on Tracklet servers.
          </li>
        </ul>
      </section>

      {/* Section 4: Chrome Extension */}
      <section id="extension-permissions" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl font-heading font-bold text-slate-900">
          4. Chrome Extension Data & Permissions Disclosure
        </h2>
        <p>
          The Tracklet Chrome Extension operates under Google Chrome Manifest V3. To provide single-click job capture, ATS detection, and cloud synchronization, the extension requests the following granular browser permissions:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-900 font-semibold">
                <th scope="col" className="py-2.5 pr-4 font-semibold">Permission</th>
                <th scope="col" className="py-2.5 px-4 font-semibold">Technical Purpose</th>
                <th scope="col" className="py-2.5 pl-4 font-semibold">Privacy Guarantee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              <tr>
                <td className="py-3 pr-4 font-mono font-semibold text-slate-900 align-top">storage</td>
                <td className="py-3 px-4 align-top">Stores your authenticated session token, user preferences, and cached sync timestamps locally.</td>
                <td className="py-3 pl-4 align-top">Isolated to extension local storage; not accessible to external websites.</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-mono font-semibold text-slate-900 align-top">activeTab</td>
                <td className="py-3 px-4 align-top">Permits reading the active web page ONLY when you explicitly invoke the extension to clip a job or autofill an ATS form.</td>
                <td className="py-3 pl-4 align-top">Does NOT monitor background browsing or inspect tabs you do not explicitly clip.</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-mono font-semibold text-slate-900 align-top">scripting</td>
                <td className="py-3 px-4 align-top">Executes lightweight DOM extractor routines on supported job boards (LinkedIn, Indeed, Greenhouse, Lever) to parse job title, company, and location.</td>
                <td className="py-3 pl-4 align-top">Runs strictly in response to user clipping commands. Does not read unrelated browser data or keystrokes.</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-mono font-semibold text-slate-900 align-top">tabs & sidePanel</td>
                <td className="py-3 px-4 align-top">Renders the extension companion UI in the Chrome side panel and coordinates deep linking to your web dashboard.</td>
                <td className="py-3 pl-4 align-top">No URL logging or browsing history aggregation.</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-mono font-semibold text-slate-900 align-top">host_permissions (&lt;all_urls&gt;)</td>
                <td className="py-3 px-4 align-top">Allows job capture across arbitrary company careers portals, ATS domains, and employer job pages worldwide.</td>
                <td className="py-3 pl-4 align-top">Content parsing activates solely upon explicit user action on an active job posting.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 5: Scraping, ATS & Autofill */}
      <section id="scraping-and-ats" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl font-heading font-bold text-slate-900">
          5. Job Extraction, ATS Interaction & Autofill
        </h2>
        <p>
          When you use Tracklet to save a job posting from external career sites (e.g. Greenhouse, Lever, Workday, LinkedIn, or Indeed), extraction parses public metadata (job role, employer, job description text, work location) from the DOM.
        </p>
        <p>
          If fallback serverless extraction is required, our authenticated endpoint (<code className="text-[11px] font-mono text-slate-800">/api/scrape-job</code>) retrieves the public HTML of that specific listing on your behalf. Tracklet never bypasses authentication paywalls or accesses private corporate employer dashboards.
        </p>
        <h3 className="text-sm font-bold text-slate-900 pt-1">
          Autofill Transparency
        </h3>
        <p>
          When utilizing 1-click ATS form autofill, profile fields and resume highlights are populated into third-party applicant tracking system forms strictly upon your direct request. Data remains inside your browser session until you review and submit the application to the respective employer.
        </p>
      </section>

      {/* Section 6: AI Governance */}
      <section id="ai-governance" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl font-heading font-bold text-slate-900">
          6. AI Governance & Document Non-Training Policy
        </h2>
        <p>
          Tracklet may offer opt-in intelligent features such as resume keyword alignment, cover letter drafting, and salary intelligence. We adhere to strict enterprise AI privacy safeguards:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-xs">
          <li><strong>Zero Foundation Model Training:</strong> Your private resumes, cover letters, recruiter communication logs, and interview prep notes are NEVER used to train, retrain, or fine-tune public foundation AI models (such as OpenAI, Anthropic, or Google DeepMind models).</li>
          <li><strong>Ephemeral Processing:</strong> When AI assistance is invoked, data prompts are transmitted via zero-data-retention APIs and discarded immediately upon response generation.</li>
          <li><strong>Customer Sovereignty:</strong> You may disable AI-assisted suggestions entirely in Account Settings without affecting core pipeline tracking features.</li>
        </ul>
      </section>

      {/* Section 7: Cloud Infrastructure */}
      <section id="cloud-and-security" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl font-heading font-bold text-slate-900">
          7. Cloud Infrastructure, Encryption & Tenant Isolation
        </h2>
        <p>
          Tracklet utilizes Google Cloud Platform and Firebase infrastructure hosted in secure ISO 27001 and SOC 2 Type II certified data centers:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-xs">
          <li><strong>Encryption in Transit:</strong> All data transmitted between your browser, the Chrome Extension, and Tracklet Cloud is encrypted with Transport Layer Security (TLS 1.3).</li>
          <li><strong>Encryption at Rest:</strong> Application records and document attachments in Cloud Firestore and Cloud Storage are encrypted using 256-bit Advanced Encryption Standard (AES-256).</li>
          <li><strong>Strict Multi-Tenant Isolation:</strong> Our Cloud Firestore Security Rules enforce zero cross-tenant visibility. Every document path is strictly restricted to authenticated queries matching the requesting user&rsquo;s Firebase UID (<code className="text-[11px] font-mono text-slate-800">users/&#123;userId&#125;/**</code>).</li>
        </ul>
      </section>

      {/* Section 8: Diagnostics & Telemetry */}
      <section id="diagnostics-telemetry" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl font-heading font-bold text-slate-900">
          8. Diagnostics, Error Monitoring & Telemetry
        </h2>
        <p>
          To maintain 99.9% system reliability and rapidly fix broken ATS scrapers when job portals update their DOM schemas, we employ modern diagnostic instrumentation with comprehensive PII masking:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-xs">
          <li>
            <strong>Operational Error Monitoring (Sentry):</strong> Captures JavaScript exception stack traces and network failures. Sentry is configured with strict client-side DOM text masking, password sanitization, and media blocking. Candidate notes, application inputs, and personally identifiable text are scrubbed before transmission.
          </li>
          <li>
            <strong>Product Analytics (PostHog):</strong> Records anonymous feature usage patterns, navigation funnels, and aggregate extraction success codes to identify failing job boards. IP addresses are anonymized and form inputs are redacted.
          </li>
        </ul>
      </section>

      {/* Section 9: Subprocessors Table */}
      <section id="subprocessors" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl font-heading font-bold text-slate-900">
          9. Authorized Third-Party Subprocessors
        </h2>
        <p>
          Tracklet engages trusted third-party subprocessors to deliver core infrastructure. Each provider is bound by strict Data Processing Agreements:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-900 font-semibold">
                <th scope="col" className="py-2.5 pr-4 font-semibold">Subprocessor</th>
                <th scope="col" className="py-2.5 px-4 font-semibold">Role & Service</th>
                <th scope="col" className="py-2.5 pl-4 font-semibold">Data Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              <tr>
                <td className="py-3 pr-4 font-semibold text-slate-900 align-top">Google Cloud / Firebase</td>
                <td className="py-3 px-4 align-top">Authentication, Cloud Database, Encrypted Storage, Hosting</td>
                <td className="py-3 pl-4 align-top">United States (Multi-region)</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold text-slate-900 align-top">Cloudflare, Inc.</td>
                <td className="py-3 px-4 align-top">Edge Compute (Pages Functions), DDoS Shield, Global CDN</td>
                <td className="py-3 pl-4 align-top">Global Edge Network</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold text-slate-900 align-top">Functional Software (Sentry)</td>
                <td className="py-3 px-4 align-top">Error tracking & performance monitoring (DOM text masked)</td>
                <td className="py-3 pl-4 align-top">United States</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold text-slate-900 align-top">PostHog, Inc.</td>
                <td className="py-3 px-4 align-top">Product usage telemetry & funnel optimization (IP anonymized)</td>
                <td className="py-3 pl-4 align-top">United States</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 10: Cookies & Local Storage */}
      <section id="cookies-storage" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl font-heading font-bold text-slate-900">
          10. Cookies, Local Storage & Session State
        </h2>
        <p>
          Tracklet does not use third-party advertising cookies or cross-site tracking beacons. We use local storage tokens strictly for operational integrity:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-900 font-semibold">
                <th scope="col" className="py-2.5 pr-4 font-semibold">Key / Cookie</th>
                <th scope="col" className="py-2.5 px-4 font-semibold">Type</th>
                <th scope="col" className="py-2.5 pl-4 font-semibold">Functional Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              <tr>
                <td className="py-3 pr-4 font-mono font-semibold text-slate-900 align-top">firebase:authUser</td>
                <td className="py-3 px-4 align-top">IndexedDB / LocalStorage</td>
                <td className="py-3 pl-4 align-top">Maintains authenticated Firebase login session across tabs.</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-mono font-semibold text-slate-900 align-top">tracklet_sidebar_collapsed</td>
                <td className="py-3 px-4 align-top">LocalStorage</td>
                <td className="py-3 pl-4 align-top">Remembers UI navigation drawer preference (collapsed/expanded).</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-mono font-semibold text-slate-900 align-top">tracklet_session_id</td>
                <td className="py-3 px-4 align-top">SessionStorage</td>
                <td className="py-3 pl-4 align-top">Correlates diagnostic traces for support issue reporting.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 11: User Rights & Deletion */}
      <section id="user-rights-deletion" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl font-heading font-bold text-slate-900">
          11. Data Portability, GDPR/CCPA Rights & 30-Day Purge
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

      {/* Section 12: Contact */}
      <section id="legal-contact" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl font-heading font-bold text-slate-900">
          12. Contact & Privacy Office
        </h2>
        <p>
          If you have questions, feedback, or concerns regarding this Privacy Policy or wish to exercise your data subject access rights, please contact our designated Privacy Office:
        </p>
        <div className="space-y-1.5 pt-1 text-xs">
          <p className="font-bold text-slate-900">Tracklet Privacy & Compliance Office</p>
          <p className="flex items-center gap-2 text-slate-700">
            <Mail className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Email:{' '}
              <a
                href={`mailto:${LEGAL_CONFIG.PRIVACY_EMAIL}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-600 hover:text-blue-700 underline underline-offset-2"
              >
                {LEGAL_CONFIG.PRIVACY_EMAIL}
              </a>
            </span>
          </p>
        </div>
      </section>
    </div>
  );
};
