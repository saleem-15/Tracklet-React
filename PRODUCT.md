# Product

<!-- impeccable:product-schema 1 -->

## Platform

Web (responsive PWA). Self-hostable or managed cloud.

## Users

Job seekers actively applying to multiple roles simultaneously — particularly tech-savvy applicants (developers, designers, PMs) and bootcamp graduates who apply at high volume (15–200+ applications per search). They juggle applications across LinkedIn, Indeed, Greenhouse, Lever, Wellfound, referrals, and company sites. They need a single place to know where every application stands, what's stale, and what needs action next — without surrendering their data to a closed-source SaaS.

**Secondary audience:** Privacy-conscious professionals (especially EU/GDPR-aware) who want full control over their career data and prefer self-hosted, open-source tools over cloud-only subscriptions.

## Product Purpose

Tracklet is the open-source, privacy-first job application tracker. It gives job seekers a clear, organized view of every application they've sent: its current status, how long it's been in each stage, contacts, notes, and follow-up tasks. It removes the anxiety of losing track across platforms and replaces scattered spreadsheets with a structured, fast, purpose-built tool.

Unlike Huntr, Teal, and Simplify — which are closed-source and cloud-only — Tracklet is fully open-source and self-hostable. Users who want zero-setup convenience use Tracklet Cloud; users who want full data ownership self-host for free.

Success means a user can open Tracklet and immediately know: what's active, what needs attention, and what died — without having to think, and without their career data sitting in someone else's database.

## Positioning

**"The Plausible of job tracking."**

Tracklet is the open-source, privacy-first alternative to Huntr and Teal. The core product — pipeline tracking, Kanban board, stats, contacts, tasks, Chrome extension — is 100% free and self-hostable. Tracklet Cloud offers a managed hosted version with optional AI features for users who prefer zero-setup convenience.

Key differentiators:
1. **Open-source & self-hostable** — no competitor in the job-tracker space offers this
2. **Privacy-first** — user data stays under user control; no data selling, no opaque cloud lock-in
3. **No-account guest mode** — start tracking in seconds with localStorage, upgrade to cloud sync when ready
4. **10x cheaper than alternatives** — Tracklet Cloud at $5/month vs. Huntr at $40/month, Teal at $52/month

## Operating Context

Users interact with Tracklet during or right after applying for jobs — often daily during an active search. Typical rituals: logging a new application after submitting it (via Chrome extension or quick-add), checking the pipeline board to see what's stale, updating a status after hearing back from a recruiter, and reviewing stats to understand search velocity. The tool should be fast and low-friction, never in the user's way.

**Deployment contexts:**
- **Tracklet Cloud:** Managed instance at the production URL. Firebase Hosting + Firestore. Users sign up and start immediately.
- **Self-Hosted:** Users clone the repo, configure their own Firebase project (or future Supabase/Postgres alternative), and deploy to Vercel, Railway, Render, or any static host.

## Capabilities and Constraints

- **Status stages:** Saved → Applied → Screening → Interview → Offer → Rejected / Archived
- **Platforms tracked:** LinkedIn, Indeed, Lever, Greenhouse, Otta, Company Site, Referral, Wellfound, Other
- **Per-application data:** company, role, platform, work location, employment type, date applied, status, job link, notes, contacts (name, role, email, phone, LinkedIn, notes), tasks (title, due date, completed), logo/domain, status history
- **Views:** All Applications table (sortable, filterable, bulk actions), Active Pipeline board (kanban), Stats view, Settings view
- **Auth:** Google Sign-In + Email/Password via Firebase (optional; guest mode uses localStorage)
- **Persistence:** Firestore for authenticated users; localStorage for guests
- **Chrome Extension:** One-click job capture from any job board with smart auto-extraction (company, role, platform, URL, highlighted notes)
- **AI features (planned):** Follow-up email drafts, stale application coaching, ATS keyword match scoring, cover letter generation — available via Tracklet Cloud or BYOK (bring your own API key) for self-hosters
- **Export/Import:** CSV export of filtered applications; CSV batch import
- **Expiry notifications:** configurable threshold for flagging stale applications
- **Deployment:** Firebase Hosting (Tracklet Cloud); self-hostable via any static host + Firebase/Supabase backend

## Brand Commitments

Name: **Tracklet** — short, purposeful, tool-like.

Tagline: **"Track your job search. Own your data."**

Voice: Direct, clear, no-nonsense. A precision tool, not a lifestyle brand. Speaks to people in the trenches of a job search who need clarity, not motivation.

## Evidence on Hand

- Full working codebase: React 19 + Vite + TypeScript + TailwindCSS v4 + Firebase + Framer Motion
- Chrome browser extension with smart extraction from major job boards
- Sample/seed data exists in `src/lib/sampleData` for demo experience
- 100/100 Lighthouse scores across Performance, Accessibility, Best Practices, and SEO
- Competitive analysis completed (see `STRATEGY.md` for positioning details)
- No marketing copy, testimonials, press, or logo assets confirmed at this time — future work must not fabricate them

## Product Principles

1. **Zero friction first.** The tool must never slow down a user who just finished applying. Logging, updating, and reviewing should take seconds.
2. **Clarity over completeness.** Show the user what matters right now — active applications, stale stages, next actions — rather than an overwhelming data dump.
3. **User-owned data.** Whether guest, cloud, or self-hosted, users control their records. No lock-in, no required accounts, full data portability (CSV export), open-source as a credibility promise — not a marketing buzzword.
4. **Tool, not platform.** Tracklet is a focused utility. It does one job extremely well and doesn't try to become a career platform, a resume builder, or a coaching product.
5. **Honest empty states.** When there's nothing to show, the UI should be genuinely helpful — prompt the right next action, never fake activity.
6. **Open-source means open.** The core tracking experience is never crippled or artificially limited for free users. Paid features (AI, cloud convenience) are additive, not subtractive.

## Accessibility & Inclusion

Standard web accessibility (WCAG 2.1 AA) is the baseline for Tracklet, with keyboard shortcuts, high contrast WCAG-compliant colors, screen reader ARIA annotations, and motion-reduction support.
