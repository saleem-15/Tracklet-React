import { Application, Contact } from '../types';
import { getPresetDate } from './contactUtils';

/**
 * Demo seed data — 15 applications spread across every pipeline stage.
 *
 * Conventions:
 * - Top-level ids are authored (`app-<slug>`, `c#`) so the relationship graph
 *   can be wired statically: `contactIds` on applications, `applicationIds`
 *   on contacts, and `contactId` on email logs. The repositories write these
 *   docs with the authored id; user ids are added at seed time.
 * - Nested items use the same ids: contacts `c#`, tasks `t#`, emails `em#`,
 *   status history `hist-<company-slug>-N` (unique across this file).
 * - `dateApplied`, task `dueDate`, email `date`, contact `nextFollowUpDate`
 *   are YYYY-MM-DD; all timestamps are ISO 8601 UTC (`Z`).
 * - Density varies deliberately: a few rich records (contacts + tasks + emails
 *   + history + resume attachment), several mid, and several minimal ones —
 *   real pipelines are uneven.
 * - Salary/location nuance lives in free text: some postings disclose comp,
 *   others don't; remote roles vary between "Remote", "Remote — US only",
 *   "Remote — Worldwide", etc.
 */
export const INITIAL_SAMPLE_APPLICATIONS: Omit<Application, 'userId'>[] = [
  // ─────────────────────────────── OFFER ───────────────────────────────
  {
    id: 'app-honeycomb',
    company: 'Honeycomb',
    role: 'Staff Platform Engineer',
    platform: 'Greenhouse',
    workLocation: 'Hybrid',
    employmentType: 'Full-time',
    location: 'San Francisco, CA',
    dateApplied: '2026-10-05',
    status: 'Offer',
    jobLink: 'https://boards.greenhouse.io/honeycomb/jobs/6102203',
    emailThreadUrl: 'https://mail.google.com/mail/u/0/#inbox/FMfcgzQqZwTkxYvH',
    contactEmail: 'maya.osei@honeycomb.io',
    contactIds: ['c1', 'c2'],
    companyDomain: 'honeycomb.io',
    contacts: [
      {
        id: 'c1',
        name: 'Maya Osei',
        role: 'Technical Recruiter',
        email: 'maya.osei@honeycomb.io',
        phone: '+1 415-555-0162',
        linkedIn: 'https://linkedin.com/in/mayaosei',
        notes: 'Primary contact for the offer. Said start date is flexible — no rush on signing.'
      },
      {
        id: 'c2',
        name: 'Priya Raghavan',
        role: 'Engineering Manager, Ingestion',
        email: 'priya.raghavan@honeycomb.io',
        linkedIn: 'https://linkedin.com/in/priyaraghavan',
        notes: 'Hiring manager. Already discussed team scope — ClickHouse pipeline ownership.'
      }
    ],
    tasks: [
      { id: 't1', title: 'Review offer breakdown (base + signing + RSUs)', completed: true, completedAt: '2026-11-10T13:00:00Z' },
      { id: 't2', title: 'List comp questions for Maya (equity refresh, signing split)', completed: true, completedAt: '2026-11-11T08:00:00Z' },
      { id: 't3', title: 'Decide start date — Dec 7 vs Jan 4', completed: false, dueDate: '2026-11-20' }
    ],
    notes: 'Offer received Nov 9: $232k base + $25k signing + $180k RSUs over 4 years. Hybrid — 3 days/week in SF HQ. Posting did not list a range, so the offer is my first hard number.',
    emails: [
      {
        id: 'em1',
        subject: 'Official Offer — Staff Platform Engineer at Honeycomb',
        sender: 'maya.osei@honeycomb.io',
        contactId: 'c1',
        recipient: 'You',
        date: '2026-11-09',
        timestamp: '2026-11-09T17:25:00Z',
        direction: 'inbound',
        snippet: 'We are delighted to extend an official offer for the Staff Platform Engineer role...',
        body: 'Hi!\n\nWe are delighted to extend an official offer for the Staff Platform Engineer role on the Ingestion team.\n\nSummary of terms:\n• Base Salary: $232,000 / year\n• Signing Bonus: $25,000 (paid in first paycheck)\n• Equity: $180,000 RSUs vested over 4 years with annual refresh\n• Location: SF HQ, hybrid — 3 days onsite\n\nThe DocuSign packet is valid through Nov 23. Ping me anytime to talk through details — happy to jump on a call.\n\nWarmly,\nMaya',
        emailUrl: 'https://mail.google.com/mail/u/0/#inbox/FMfcgzQqZwTkxYvH'
      },
      {
        id: 'em2',
        subject: 'Re: Official Offer — a few questions before I sign',
        sender: 'You',
        recipient: 'maya.osei@honeycomb.io',
        contactId: 'c1',
        date: '2026-11-10',
        timestamp: '2026-11-10T09:20:00Z',
        direction: 'outbound',
        snippet: 'Hi Maya, thank you and the whole panel — I am thrilled. Before signing: how does the annual refresh...',
        body: 'Hi Maya,\n\nThank you, and please pass my thanks to the whole panel — I am genuinely excited about this one.\n\nBefore I sign, three quick things:\n1. How does the annual refresh grant work in practice?\n2. Is the signing bonus negotiable against a slightly higher base?\n3. Could the start date be Jan 4 instead of Dec 7?\n\nA 20-minute call this week would be great if easier.\n\nBest,\nCandidate'
      }
    ],
    history: [
      { id: 'hist-honeycomb-1', toStatus: 'Applied', timestamp: '2026-10-05T08:35:00Z' },
      { id: 'hist-honeycomb-2', fromStatus: 'Applied', toStatus: 'Screening', timestamp: '2026-10-14T17:00:00Z', note: 'Recruiter screen with Maya — strong fit on observability background.' },
      { id: 'hist-honeycomb-3', fromStatus: 'Screening', toStatus: 'Interview', timestamp: '2026-10-28T18:00:00Z', note: 'Virtual onsite completed — 4 rounds, all positive signals.' },
      { id: 'hist-honeycomb-4', fromStatus: 'Interview', toStatus: 'Offer', timestamp: '2026-11-09T17:30:00Z', note: 'Verbal + written offer extended.' }
    ],
    resumeFileName: 'Resume_Staff_Platform_Honeycomb.pdf',
    resumeFileSize: 184320,
    resumeUploadedAt: '2026-10-05T08:40:00Z',
    stageUpdatedAt: '2026-11-09T17:30:00Z',
    createdAt: '2026-10-05T08:35:00Z',
    updatedAt: '2026-11-10T09:20:00Z'
  },

  // ────────────────────────────── INTERVIEW ──────────────────────────────
  {
    id: 'app-duolingo',
    company: 'Duolingo',
    role: 'Senior Backend Engineer',
    platform: 'Company Site',
    workLocation: 'Hybrid',
    employmentType: 'Full-time',
    location: 'Pittsburgh, PA',
    dateApplied: '2026-10-12',
    status: 'Interview',
    jobLink: 'https://careers.duolingo.com/jobs/senior-backend-engineer-learning',
    emailThreadUrl: 'https://mail.google.com/mail/u/0/#inbox/FMfcgzQqZbNvHsTd',
    contactEmail: 'r.betancourt@duolingo.com',
    contactIds: ['c3', 'c4'],
    contacts: [
      {
        id: 'c3',
        name: 'Rachel Betancourt',
        role: 'Talent Partner',
        email: 'r.betancourt@duolingo.com',
        phone: '+1 412-555-0177',
        linkedIn: 'https://linkedin.com/in/rachelbetancourt',
        notes: 'Runs the loop logistics. Fast replies, sends everything in writing.'
      },
      {
        id: 'c4',
        name: 'Sam Okonkwo',
        role: 'Engineering Manager, Learning Platform',
        email: 's.okonkwo@duolingo.com',
        notes: 'HM. Mentioned the team owns the experiment-assignment service.'
      }
    ],
    tasks: [
      { id: 't4', title: 'Backend take-home — Spaced Repetition API', completed: true, dueDate: '2026-10-19', completedAt: '2026-10-19T20:30:00Z' },
      { id: 't5', title: 'Prep system design round: A/B experiment infra', completed: false, dueDate: '2026-11-17' },
      { id: 't6', title: 'Re-read Duolingo engineering blog posts on streaks infra', completed: false, dueDate: '2026-11-16' }
    ],
    notes: 'Posting listed $180–215k base. Take-home passed review with "clean API design" feedback. 3-round virtual loop Nov 18: system design, API deep-dive, values. Role is 2 days/week onsite in Pittsburgh after hire.',
    emails: [
      {
        id: 'em3',
        subject: 'Take-home Exercise — Senior Backend Engineer',
        sender: 'r.betancourt@duolingo.com',
        contactId: 'c3',
        recipient: 'You',
        date: '2026-10-14',
        timestamp: '2026-10-14T14:05:00Z',
        direction: 'inbound',
        snippet: 'Great speaking with you! As promised, here is the take-home: design a Spaced Repetition API...',
        body: 'Hi!\n\nGreat speaking with you today. As promised, here is the take-home exercise:\n\nDesign and implement a small Spaced Repetition API (SM-2 or similar). We care most about API design, data modeling, and tests — not framework choice. Time budget: 4–6 hours, done by Oct 19 EOD.\n\nReply with a repo link and a short README of trade-offs.\n\nBest,\nRachel'
      },
      {
        id: 'em4',
        subject: 'Take-home submission — Spaced Repetition API',
        sender: 'You',
        recipient: 'r.betancourt@duolingo.com',
        contactId: 'c3',
        date: '2026-10-19',
        timestamp: '2026-10-19T20:40:00Z',
        direction: 'outbound',
        snippet: 'Hi Rachel, submission attached. README covers the SM-2 interval math, the review queue model...',
        body: 'Hi Rachel,\n\nSubmission is in: github.com/candidate/srs-takehome.\n\nThe README covers the SM-2 interval math, the review-queue data model, and why I skipped auth (out of scope, noted in trade-offs). Happy to walk through any of it live.\n\nThanks!\nCandidate'
      },
      {
        id: 'em5',
        subject: 'Interview Loop — Wednesday Nov 18',
        sender: 'r.betancourt@duolingo.com',
        contactId: 'c3',
        recipient: 'You',
        date: '2026-11-02',
        timestamp: '2026-11-02T15:55:00Z',
        direction: 'inbound',
        snippet: 'Good news — the team loved your take-home. Your virtual loop is confirmed for Wednesday, Nov 18...',
        body: 'Hi!\n\nGood news — the team really enjoyed your take-home. Your virtual loop is confirmed:\n\nWed, Nov 18 (ET)\n• 10:00 — System design: experiment assignment at scale (Sam)\n• 11:15 — API deep-dive (two engineers)\n• 12:30 — Values & collaboration\n\nCalendar invites with video links to follow. Anything we can do to set you up for success, just say the word.\n\nBest,\nRachel'
      }
    ],
    history: [
      { id: 'hist-duolingo-1', toStatus: 'Applied', timestamp: '2026-10-12T09:15:00Z' },
      { id: 'hist-duolingo-2', fromStatus: 'Applied', toStatus: 'Screening', timestamp: '2026-10-20T15:00:00Z', note: 'Recruiter call with Rachel — positive.' },
      { id: 'hist-duolingo-3', fromStatus: 'Screening', toStatus: 'Interview', timestamp: '2026-11-02T16:00:00Z', note: 'Take-home passed; virtual loop scheduled for Nov 18.' }
    ],
    stageUpdatedAt: '2026-11-02T16:00:00Z',
    createdAt: '2026-10-12T09:15:00Z',
    updatedAt: '2026-11-02T16:00:00Z'
  },
  {
    id: 'app-zapier',
    company: 'Zapier',
    role: 'Staff Full-Stack Engineer',
    platform: 'LinkedIn',
    workLocation: 'Remote',
    employmentType: 'Full-time',
    location: 'Remote — US only',
    dateApplied: '2026-10-18',
    status: 'Interview',
    jobLink: 'https://zapier.com/jobs/staff-fullstack-engineer/',
    emailThreadUrl: 'https://mail.google.com/mail/u/0/#inbox/FMfcgzQqZcKpLwRt',
    contactEmail: 'jana.kowalski@zapier.com',
    contactIds: ['c5'],
    contacts: [
      {
        id: 'c5',
        name: 'Jana Kowalski',
        role: 'Senior Recruiter',
        email: 'jana.kowalski@zapier.com',
        linkedIn: 'https://linkedin.com/in/janakowalski-zapier',
        notes: 'Coordinated both screens. Mentioned comp band is shared only at offer stage.'
      }
    ],
    tasks: [
      { id: 't7', title: 'Prep deep-dive: multi-tenant permissions & audit logging walkthrough', completed: false, dueDate: '2026-11-16' }
    ],
    notes: 'Posting says "Remote — US only" with no comp listed. Deep-dive scheduled Nov 17 with two staff engineers — expects a live walkthrough of a past architecture decision.',
    emails: [
      {
        id: 'em6',
        subject: 'Next Steps — Staff Full-Stack Engineer',
        sender: 'jana.kowalski@zapier.com',
        contactId: 'c5',
        recipient: 'You',
        date: '2026-10-27',
        timestamp: '2026-10-27T15:50:00Z',
        direction: 'inbound',
        snippet: 'Feedback from both of your screens was excellent. We would like to schedule the technical deep-dive...',
        body: 'Hi!\n\nFeedback from both of your screens was excellent, and we would like to move you to the technical deep-dive.\n\nFormat: 75 minutes. The panel asks you to walk through an architecture decision you owned end-to-end — design forces, what you would change now, and how it held up in production.\n\nCould you share 2–3 slots that work between Nov 16–19?\n\nBest,\nJana'
      },
      {
        id: 'em7',
        subject: 'Re: Next Steps — Staff Full-Stack Engineer',
        sender: 'You',
        recipient: 'jana.kowalski@zapier.com',
        contactId: 'c5',
        date: '2026-10-27',
        timestamp: '2026-10-27T19:05:00Z',
        direction: 'outbound',
        snippet: 'Hi Jana, thanks for the quick turnaround. Nov 17 at 1pm PT works best on my side...',
        body: 'Hi Jana,\n\nThanks for the quick turnaround. Nov 17 at 1pm PT works best on my side — I will prep the multi-tenant permissions and audit-logging project as the walkthrough subject since it is the richest one.\n\nLooking forward to it.\n\nBest,\nCandidate'
      }
    ],
    history: [
      { id: 'hist-zapier-1', toStatus: 'Applied', timestamp: '2026-10-18T11:20:00Z' },
      { id: 'hist-zapier-2', fromStatus: 'Applied', toStatus: 'Screening', timestamp: '2026-10-27T16:00:00Z', note: 'Recruiter + hiring manager screens on the same day.' },
      { id: 'hist-zapier-3', fromStatus: 'Screening', toStatus: 'Interview', timestamp: '2026-11-10T15:00:00Z', note: 'Both screens passed; technical deep-dive scheduled Nov 17.' }
    ],
    stageUpdatedAt: '2026-11-10T15:00:00Z',
    createdAt: '2026-10-18T11:20:00Z',
    updatedAt: '2026-11-10T15:00:00Z'
  },
  {
    id: 'app-sourcegraph',
    company: 'Sourcegraph',
    role: 'Senior Backend Engineer',
    platform: 'Referral',
    workLocation: 'Remote',
    employmentType: 'Full-time',
    location: 'Remote',
    dateApplied: '2026-10-09',
    status: 'Interview',
    jobLink: 'https://sourcegraph.com/careers/senior-backend-engineer',
    contactEmail: 'recruiting@sourcegraph.com',
    contactIds: ['c6'],
    contacts: [
      {
        id: 'c6',
        name: 'Dev Patel',
        role: 'Staff Engineer',
        email: 'dev.patel@sourcegraph.com',
        linkedIn: 'https://linkedin.com/in/devpatel-eng',
        notes: 'Former teammate. Referred me directly to the hiring manager — skipping the standard recruiter screen.'
      }
    ],
    tasks: [
      { id: 't8', title: 'Skim Cody context-engine docs and the code-search RFC', completed: true, completedAt: '2026-11-08T11:00:00Z' },
      { id: 't9', title: 'Prep distributed-tracing design walkthrough for Monday panel', completed: false, dueDate: '2026-11-15' }
    ],
    notes: 'Referred by Dev Patel (ex-teammate, now Staff Eng there). Posting listed $190–230k + equity. Panel is Monday Nov 16.',
    emails: [
      {
        id: 'em8',
        subject: 'Interview Panel Confirmed — Monday, Nov 16',
        sender: 'recruiting@sourcegraph.com',
        recipient: 'You',
        date: '2026-11-04',
        timestamp: '2026-11-04T16:30:00Z',
        direction: 'inbound',
        snippet: 'Thanks to Dev\'s referral we are able to fast-track your process. Your panel is confirmed for Monday...',
        body: 'Hi!\n\nThanks to Dev\'s referral we were able to fast-track your process past the standard recruiter screen.\n\nPanel confirmed: Monday, Nov 16, 10:00–12:30 PT.\n• Code search architecture discussion\n• Distributed systems design\n• Career conversation with the director\n\nVideo link will arrive the day before. Good luck — Dev had only good things to say!\n\nRecruiting Team'
      }
    ],
    history: [
      { id: 'hist-sourcegraph-1', toStatus: 'Applied', timestamp: '2026-10-09T13:00:00Z' },
      { id: 'hist-sourcegraph-2', fromStatus: 'Applied', toStatus: 'Interview', timestamp: '2026-11-05T14:00:00Z', note: 'Fast-tracked past recruiter screen via internal referral; panel set for Nov 16.' }
    ],
    stageUpdatedAt: '2026-11-05T14:00:00Z',
    createdAt: '2026-10-09T13:00:00Z',
    updatedAt: '2026-11-05T14:00:00Z'
  },

  // ────────────────────────────── SCREENING ──────────────────────────────
  {
    id: 'app-attio',
    company: 'Attio',
    role: 'Product Engineer',
    platform: 'Lever',
    workLocation: 'Remote',
    employmentType: 'Full-time',
    location: 'Remote — UK & EU',
    dateApplied: '2026-11-01',
    status: 'Screening',
    jobLink: 'https://jobs.lever.co/attio/product-engineer',
    contactEmail: 'people@attio.com',
    contactIds: ['c7'],
    contacts: [
      {
        id: 'c7',
        name: 'Claire Whitfield',
        role: 'People Operations',
        email: 'people@attio.com',
        notes: 'Runs the recruiter screen. Warned the process moves fast — full loop inside two weeks.'
      }
    ],
    tasks: [
      { id: 't10', title: 'Prep for 30-min recruiter screen with Claire', completed: false, dueDate: '2026-11-18' }
    ],
    notes: 'Posting lists £95–120k + equity. Recruiter screen booked Nov 18, 4pm GMT. They want product-minded engineers who have shipped user-facing features end to end.',
    emails: [
      {
        id: 'em9',
        subject: 'Recruiter Screen — Product Engineer at Attio',
        sender: 'people@attio.com',
        contactId: 'c7',
        recipient: 'You',
        date: '2026-11-12',
        timestamp: '2026-11-12T10:25:00Z',
        direction: 'inbound',
        snippet: 'Thanks for applying! We would love to start with a 30-minute intro call on Wednesday, Nov 18...',
        body: 'Hi!\n\nThanks for applying to Attio — your background with data-heavy product work stood out.\n\nFirst step is a 30-minute intro call. Proposed: Wednesday, Nov 18 at 4pm GMT (8am PT). If that does not work, send a couple of alternatives.\n\nTalk soon,\nClaire'
      }
    ],
    history: [
      { id: 'hist-attio-1', toStatus: 'Applied', timestamp: '2026-11-01T10:10:00Z' },
      { id: 'hist-attio-2', fromStatus: 'Applied', toStatus: 'Screening', timestamp: '2026-11-12T10:30:00Z', note: 'Recruiter screen booked for Nov 18.' }
    ],
    stageUpdatedAt: '2026-11-12T10:30:00Z',
    createdAt: '2026-11-01T10:10:00Z',
    updatedAt: '2026-11-12T10:30:00Z'
  },
  {
    id: 'app-neon',
    company: 'Neon',
    role: 'Senior Developer Advocate',
    platform: 'Greenhouse',
    workLocation: 'Remote',
    employmentType: 'Contract',
    location: 'Remote — US',
    dateApplied: '2026-10-25',
    status: 'Screening',
    jobLink: 'https://neon.com/careers/senior-developer-advocate',
    tasks: [
      { id: 't11', title: 'Follow up with Neon recruiting if no reply by Nov 17', completed: false }
    ],
    notes: 'Recruiter screen Oct 31 went well — mostly about conference cadence and content style. No salary in the posting; 6-month contract-to-hire. Awaiting hiring manager review.',
    history: [
      { id: 'hist-neon-1', toStatus: 'Applied', timestamp: '2026-10-25T12:00:00Z' },
      { id: 'hist-neon-2', fromStatus: 'Applied', toStatus: 'Screening', timestamp: '2026-10-31T18:00:00Z', note: 'Recruiter screen completed; awaiting HM review.' }
    ],
    stageUpdatedAt: '2026-10-31T18:00:00Z',
    createdAt: '2026-10-25T12:00:00Z',
    updatedAt: '2026-10-31T18:00:00Z'
  },

  // ─────────────────────────────── APPLIED ───────────────────────────────
  {
    id: 'app-webflow',
    company: 'Webflow',
    role: 'Senior Frontend Engineer',
    platform: 'Company Site',
    workLocation: 'Hybrid',
    employmentType: 'Full-time',
    location: 'San Francisco, CA',
    dateApplied: '2026-11-13',
    status: 'Applied',
    jobLink: 'https://webflow.com/careers/senior-frontend-engineer-interactions',
    notes: 'Applied via careers portal yesterday — no response yet, which is normal this early. Posting listed $185–210k.',
    stageUpdatedAt: '2026-11-13T09:45:00Z',
    createdAt: '2026-11-13T09:45:00Z',
    updatedAt: '2026-11-13T09:45:00Z'
  },
  {
    id: 'app-posthog',
    company: 'PostHog',
    role: 'Growth Engineer',
    platform: 'Company Site',
    workLocation: 'Remote',
    employmentType: 'Full-time',
    location: 'Remote — Worldwide',
    dateApplied: '2026-11-02',
    status: 'Applied',
    jobLink: 'https://posthog.com/careers/growth-engineer',
    tasks: [
      { id: 't12', title: 'Polish growth-experiment portfolio doc', completed: true, completedAt: '2026-11-07T15:00:00Z' },
      { id: 't13', title: 'Send second follow-up if still silent by Nov 17', completed: false, dueDate: '2026-11-17' }
    ],
    notes: 'Applied Nov 2. Sent one polite follow-up Nov 9 — no reply yet. No comp in the posting (very PostHog).',
    emails: [
      {
        id: 'em10',
        subject: 'Growth Engineer application — quick follow-up',
        sender: 'You',
        recipient: 'careers@posthog.com',
        date: '2026-11-09',
        timestamp: '2026-11-09T09:25:00Z',
        direction: 'outbound',
        snippet: 'Hi PostHog team, following up on my Growth Engineer application from Nov 2. Added a short doc...',
        body: 'Hi PostHog team,\n\nFollowing up on my Growth Engineer application from Nov 2. In the meantime I put together a short doc breaking down three growth experiments I would run in my first 90 days: https://candidate.dev/posthog-growth-notes\n\nHappy to share more or adjust course based on what the team is prioritizing.\n\nThanks for the consideration!\nCandidate'
      }
    ],
    stageUpdatedAt: '2026-11-02T10:00:00Z',
    createdAt: '2026-11-02T10:00:00Z',
    updatedAt: '2026-11-09T09:30:00Z'
  },
  {
    id: 'app-careem',
    company: 'Careem',
    role: 'Senior Mobile Engineer',
    platform: 'Bayt',
    workLocation: 'Hybrid',
    employmentType: 'Full-time',
    location: 'Dubai, UAE',
    dateApplied: '2026-11-08',
    status: 'Applied',
    jobLink: 'https://www.bayt.com/en/uae/jobs/senior-mobile-engineer-4401123/',
    companyDomain: 'careem.com',
    tasks: [
      { id: 't14', title: 'Research UAE relocation logistics (visa, schooling)', completed: false, dueDate: '2026-11-24' }
    ],
    notes: 'Applied via Bayt. Hybrid — 3 days in the Dubai Internet City office. Posting mentions a relocation support package. AED salary band not disclosed.',
    emails: [
      {
        id: 'em11',
        subject: 'Your application was sent — Senior Mobile Engineer at Careem',
        sender: 'no-reply@bayt.com',
        recipient: 'You',
        date: '2026-11-08',
        timestamp: '2026-11-08T12:01:00Z',
        direction: 'inbound',
        snippet: 'Thank you for applying! Your application for Senior Mobile Engineer at Careem has been submitted...',
        body: 'Thank you for applying!\n\nYour application for Senior Mobile Engineer at Careem (Dubai, UAE) has been submitted successfully.\n\nWhat happens next:\n• The employer reviews applications on a rolling basis\n• You will receive an email if you are shortlisted\n• Track status anytime from your Bayt account\n\nBayt Job ID: 4401123'
      }
    ],
    stageUpdatedAt: '2026-11-08T12:00:00Z',
    createdAt: '2026-11-08T12:00:00Z',
    updatedAt: '2026-11-08T12:00:00Z'
  },

  // ──────────────────────────────── SAVED ────────────────────────────────
  {
    id: 'app-framer',
    company: 'Framer',
    role: 'Design Engineer',
    platform: 'Otta',
    workLocation: 'Hybrid',
    employmentType: 'Full-time',
    location: 'Amsterdam, Netherlands',
    dateApplied: '2026-11-11',
    status: 'Saved',
    jobLink: 'https://framer.com/careers/design-engineer',
    notes: 'Saved from Otta — not applied yet. Posting lists €85–110k + equity, hybrid in Amsterdam. Strong fit for the canvas/animation background; need to decide if relocating is on the table.',
    stageUpdatedAt: '2026-11-11T20:15:00Z',
    createdAt: '2026-11-11T20:15:00Z',
    updatedAt: '2026-11-11T20:15:00Z'
  },
  {
    id: 'app-watershed',
    company: 'Watershed',
    role: 'Data Engineer',
    platform: 'Wellfound',
    workLocation: 'Hybrid',
    employmentType: 'Full-time',
    location: 'San Francisco, CA',
    dateApplied: '2026-11-06',
    status: 'Saved',
    jobLink: 'https://watershed.com/careers/data-engineer',
    notes: 'Comp not disclosed in the posting. Asked a Wellfound recruiter for the range — holding off on applying until salary is confirmed.',
    stageUpdatedAt: '2026-11-06T17:40:00Z',
    createdAt: '2026-11-06T17:40:00Z',
    updatedAt: '2026-11-06T17:40:00Z'
  },

  // ─────────────────────────────── REJECTED ──────────────────────────────
  {
    id: 'app-klaviyo',
    company: 'Klaviyo',
    role: 'Senior Software Engineer',
    platform: 'LinkedIn',
    workLocation: 'Hybrid',
    employmentType: 'Full-time',
    location: 'Boston, MA',
    dateApplied: '2026-10-20',
    status: 'Rejected',
    jobLink: 'https://klaviyo.com/careers/senior-software-engineer-data-pipelines',
    notes: 'Auto-rejection before any human contact — 9 days after applying. Posting listed $170–200k base. Probably a keyword/filter pass on the data-pipeline experience.',
    emails: [
      {
        id: 'em12',
        subject: 'Your application to Klaviyo',
        sender: 'no-reply@klaviyo.com',
        recipient: 'You',
        date: '2026-10-29',
        timestamp: '2026-10-29T12:58:00Z',
        direction: 'inbound',
        snippet: 'Thank you for your interest in Klaviyo. After careful review, we have decided to move forward...',
        body: 'Thank you for your interest in Klaviyo.\n\nAfter careful review of your application, we have decided to move forward with candidates whose experience more closely matches the requirements of this role.\n\nWe encourage you to apply to other openings that match your skills.\n\nKlaviyo Recruiting Team'
      }
    ],
    history: [
      { id: 'hist-klaviyo-1', toStatus: 'Applied', timestamp: '2026-10-20T14:30:00Z' },
      { id: 'hist-klaviyo-2', fromStatus: 'Applied', toStatus: 'Rejected', timestamp: '2026-10-29T13:00:00Z', note: 'Automated rejection 9 days after applying — no human contact.' }
    ],
    stageUpdatedAt: '2026-10-29T13:00:00Z',
    createdAt: '2026-10-20T14:30:00Z',
    updatedAt: '2026-10-29T13:00:00Z'
  },
  {
    id: 'app-benchling',
    company: 'Benchling',
    role: 'Senior Full-Stack Engineer',
    platform: 'Lever',
    workLocation: 'Hybrid',
    employmentType: 'Full-time',
    location: 'San Francisco, CA',
    dateApplied: '2026-09-28',
    status: 'Rejected',
    jobLink: 'https://jobs.lever.co/benchling/senior-fullstack-engineer',
    emailThreadUrl: 'https://mail.google.com/mail/u/0/#inbox/FMfcgzQqZdRmXjNk',
    contactEmail: 'margaret.yao@benchling.com',
    contactIds: ['c8', 'c9'],
    contacts: [
      {
        id: 'c8',
        name: 'Margaret Yao',
        role: 'Technical Recruiter',
        email: 'margaret.yao@benchling.com',
        phone: '+1 415-555-0139',
        linkedIn: 'https://linkedin.com/in/margaretyao',
        notes: 'Gave genuinely useful rejection feedback and encouraged re-applying in ~6 months.'
      },
      {
        id: 'c9',
        name: 'Anika Srinivasan',
        role: 'Director of Engineering, Notebook',
        email: 'anika.srinivasan@benchling.com',
        linkedIn: 'https://linkedin.com/in/anikasrinivasan',
        notes: 'Hiring manager. Ran the first round — warm, very deep on product thinking.'
      }
    ],
    tasks: [
      { id: 't15', title: 'Take-home: notebook integration design doc', completed: true, dueDate: '2026-10-14', completedAt: '2026-10-13T21:00:00Z' },
      { id: 't16', title: 'Final round loop (4 panels) on Oct 22', completed: true, completedAt: '2026-10-22T23:00:00Z' },
      { id: 't17', title: 'Write retro notes from rejection feedback', completed: true, completedAt: '2026-10-28T09:30:00Z' }
    ],
    notes: 'Full loop completed Oct 22. Positive rejection with real feedback: strong engineering signals, but they wanted deeper life-sciences domain depth. Margaret encouraged re-applying in ~6 months. Retro filed — weakest round was the scientific-data-modeling panel.',
    emails: [
      {
        id: 'em13',
        subject: 'Thank you — final round on Thursday',
        sender: 'You',
        recipient: 'margaret.yao@benchling.com',
        contactId: 'c8',
        date: '2026-10-23',
        timestamp: '2026-10-23T10:15:00Z',
        direction: 'outbound',
        snippet: 'Hi Margaret, thanks for coordinating such a well-run loop yesterday. Please thank Anika and the panel...',
        body: 'Hi Margaret,\n\nThanks for coordinating such a well-run loop yesterday. Please pass along my thanks to Anika and the panel — the domain deep-dive was genuinely fun, even where I was stretching.\n\nHappy to provide anything else that would help the decision.\n\nBest,\nCandidate'
      },
      {
        id: 'em14',
        subject: 'Update on your Benchling application',
        sender: 'margaret.yao@benchling.com',
        contactId: 'c8',
        recipient: 'You',
        date: '2026-10-27',
        timestamp: '2026-10-27T16:40:00Z',
        direction: 'inbound',
        snippet: 'I want to share this news personally rather than via template: we will not be moving forward...',
        body: 'Hi,\n\nI want to share this news personally rather than via a template: we will not be moving forward this time.\n\nThe panel was genuinely impressed with your engineering depth — the design doc and system design rounds were the strongest we have seen this cycle. The gap was life-sciences domain fluency, and the other finalist had five years of it.\n\nThis was a close call. Please do apply again in ~6 months; the Notebook team keeps growing. I would be happy to re-engage you directly.\n\nBest,\nMargaret'
      }
    ],
    history: [
      { id: 'hist-benchling-1', toStatus: 'Applied', timestamp: '2026-09-28T15:05:00Z' },
      { id: 'hist-benchling-2', fromStatus: 'Applied', toStatus: 'Screening', timestamp: '2026-10-06T17:00:00Z', note: 'Recruiter screen with Margaret.' },
      { id: 'hist-benchling-3', fromStatus: 'Screening', toStatus: 'Interview', timestamp: '2026-10-15T14:00:00Z', note: 'HM interview + take-home passed; final loop scheduled Oct 22.' },
      { id: 'hist-benchling-4', fromStatus: 'Interview', toStatus: 'Rejected', timestamp: '2026-10-27T16:45:00Z', note: 'Positive rejection after final round — chose a candidate with deeper biotech domain experience.' }
    ],
    resumeFileName: 'Resume_FullStack_Benchling.pdf',
    resumeFileSize: 201500,
    resumeUploadedAt: '2026-09-28T15:00:00Z',
    stageUpdatedAt: '2026-10-27T16:45:00Z',
    createdAt: '2026-09-28T15:05:00Z',
    updatedAt: '2026-10-28T09:30:00Z'
  },
  {
    id: 'app-amplitude',
    company: 'Amplitude',
    role: 'Backend Engineer, Data Platform',
    platform: 'Indeed',
    workLocation: 'Remote',
    employmentType: 'Full-time',
    location: 'Remote — US only',
    dateApplied: '2026-10-15',
    status: 'Rejected',
    jobLink: 'https://jobs.amplitude.com/backend-engineer-data-platform',
    notes: 'Recruiter screen Oct 22 went fine; the requisition froze a week later and the role was filled via an internal transfer. Recruiter called directly — no emails exchanged.',
    history: [
      { id: 'hist-amplitude-1', toStatus: 'Applied', timestamp: '2026-10-15T11:00:00Z' },
      { id: 'hist-amplitude-2', fromStatus: 'Applied', toStatus: 'Screening', timestamp: '2026-10-22T15:00:00Z', note: 'Recruiter screen completed.' },
      { id: 'hist-amplitude-3', fromStatus: 'Screening', toStatus: 'Rejected', timestamp: '2026-10-30T11:00:00Z', note: 'Requisition frozen — role filled via internal transfer.' }
    ],
    stageUpdatedAt: '2026-10-30T11:00:00Z',
    createdAt: '2026-10-15T11:00:00Z',
    updatedAt: '2026-10-30T11:00:00Z'
  },

  // ─────────────────────────────── ARCHIVED ──────────────────────────────
  {
    id: 'app-gitbook',
    company: 'GitBook',
    role: 'Senior Frontend Engineer — Editor Platform',
    platform: 'Otta',
    workLocation: 'Remote',
    employmentType: 'Full-time',
    location: 'Remote — Europe',
    dateApplied: '2026-09-10',
    status: 'Archived',
    jobLink: 'https://gitbook.com/careers/senior-frontend-editor',
    notes: 'Recruiter never responded after the Otta screening step. Auto-archived Nov 2 after sitting in stage for 45+ days.',
    history: [
      { id: 'hist-gitbook-1', toStatus: 'Applied', timestamp: '2026-09-10T09:30:00Z' },
      { id: 'hist-gitbook-2', fromStatus: 'Applied', toStatus: 'Screening', timestamp: '2026-09-18T14:00:00Z', note: 'Completed Otta screening questions; no recruiter response since.' },
      { id: 'hist-gitbook-3', fromStatus: 'Screening', toStatus: 'Archived', timestamp: '2026-11-02T08:00:00Z', note: 'Auto-archived: 45+ days in stage with no recruiter response.' }
    ],
    stageUpdatedAt: '2026-11-02T08:00:00Z',
    createdAt: '2026-09-10T09:30:00Z',
    updatedAt: '2026-11-02T08:00:00Z'
  }
];

export const INITIAL_SAMPLE_CONTACTS: Omit<Contact, 'userId'>[] = [
  {
    id: 'c1',
    name: 'Maya Osei',
    role: 'Technical Recruiter',
    organization: 'Honeycomb',
    category: 'Recruiter',
    email: 'maya.osei@honeycomb.io',
    phone: '+1 415-555-0162',
    linkedIn: 'https://linkedin.com/in/mayaosei',
    notes: 'Primary contact for the Honeycomb offer. Said start date is flexible — no rush on signing.',
    applicationIds: ['app-honeycomb'],
    createdAt: '2026-10-14T17:00:00Z',
    updatedAt: '2026-11-09T17:30:00Z'
  },
  {
    id: 'c2',
    name: 'Priya Raghavan',
    role: 'Engineering Manager, Ingestion',
    organization: 'Honeycomb',
    category: 'Hiring Manager',
    email: 'priya.raghavan@honeycomb.io',
    linkedIn: 'https://linkedin.com/in/priyaraghavan',
    notes: 'Hiring manager for the Staff Platform role. Already walked through team scope — ClickHouse pipeline ownership.',
    applicationIds: ['app-honeycomb'],
    createdAt: '2026-10-14T17:00:00Z',
    updatedAt: '2026-11-09T17:30:00Z'
  },
  {
    id: 'c3',
    name: 'Rachel Betancourt',
    role: 'Talent Partner',
    organization: 'Duolingo',
    category: 'Recruiter',
    email: 'r.betancourt@duolingo.com',
    phone: '+1 412-555-0177',
    linkedIn: 'https://linkedin.com/in/rachelbetancourt',
    notes: 'Runs the Duolingo loop logistics. Fast replies, sends everything in writing.',
    applicationIds: ['app-duolingo'],
    createdAt: '2026-10-12T09:15:00Z',
    updatedAt: '2026-11-02T16:00:00Z'
  },
  {
    id: 'c4',
    name: 'Sam Okonkwo',
    role: 'Engineering Manager, Learning Platform',
    organization: 'Duolingo',
    category: 'Hiring Manager',
    email: 's.okonkwo@duolingo.com',
    notes: 'Hiring manager. Runs the experiment-assignment service — the team Duolingo is hiring for.',
    applicationIds: ['app-duolingo'],
    createdAt: '2026-10-12T09:15:00Z',
    updatedAt: '2026-11-02T16:00:00Z'
  },
  {
    id: 'c5',
    name: 'Jana Kowalski',
    role: 'Senior Recruiter',
    organization: 'Zapier',
    category: 'Recruiter',
    email: 'jana.kowalski@zapier.com',
    linkedIn: 'https://linkedin.com/in/janakowalski-zapier',
    notes: 'Coordinated both Zapier screens. Mentioned the comp band is shared only at offer stage.',
    applicationIds: ['app-zapier'],
    createdAt: '2026-10-18T11:20:00Z',
    updatedAt: '2026-11-10T15:00:00Z'
  },
  {
    id: 'c8',
    name: 'Margaret Yao',
    role: 'Technical Recruiter',
    organization: 'Benchling',
    category: 'Recruiter',
    email: 'margaret.yao@benchling.com',
    phone: '+1 415-555-0139',
    linkedIn: 'https://linkedin.com/in/margaretyao',
    notes: 'Gave genuinely useful rejection feedback. Encouraged re-applying in ~6 months and offered to re-engage directly.',
    applicationIds: ['app-benchling'],
    createdAt: '2026-09-28T15:05:00Z',
    updatedAt: '2026-10-27T16:45:00Z'
  },
  {
    id: 'c9',
    name: 'Anika Srinivasan',
    role: 'Director of Engineering, Notebook',
    organization: 'Benchling',
    category: 'Hiring Manager',
    email: 'anika.srinivasan@benchling.com',
    linkedIn: 'https://linkedin.com/in/anikasrinivasan',
    notes: 'Ran the first Benchling round — warm, very deep on product thinking. Worth reconnecting regardless of outcome.',
    applicationIds: ['app-benchling'],
    createdAt: '2026-09-28T15:05:00Z',
    updatedAt: '2026-10-27T16:45:00Z'
  },
  {
    id: 'c6',
    name: 'Dev Patel',
    role: 'Staff Engineer',
    organization: 'Sourcegraph',
    category: 'Peer / Alumni',
    email: 'dev.patel@sourcegraph.com',
    linkedIn: 'https://linkedin.com/in/devpatel-eng',
    notes: 'Former teammate. Referred me to the Sourcegraph hiring manager and fast-tracked the process.',
    nextFollowUpDate: getPresetDate(3),
    applicationIds: ['app-sourcegraph'],
    createdAt: '2026-10-09T13:00:00Z',
    updatedAt: '2026-11-05T14:00:00Z'
  },
  {
    id: 'c7',
    name: 'Claire Whitfield',
    role: 'People Operations',
    organization: 'Attio',
    category: 'Recruiter',
    email: 'people@attio.com',
    notes: 'Runs the recruiter screen. Warned the process moves fast — full loop inside two weeks.',
    applicationIds: ['app-attio'],
    createdAt: '2026-11-01T10:10:00Z',
    updatedAt: '2026-11-12T10:30:00Z'
  },
  {
    id: 'c10',
    name: 'Naomi Adler',
    role: 'Principal Engineer & Career Mentor',
    organization: 'Independent',
    category: 'Mentor',
    email: 'naomi.adler@mentorship.dev',
    phone: '+1 206-555-0121',
    linkedIn: 'https://linkedin.com/in/naomiadler',
    notes: 'Monthly 1:1 on offer strategy and system design prep. Currently helping pressure-test the Honeycomb negotiation.',
    nextFollowUpDate: getPresetDate(1),
    applicationIds: [],
    emails: [
      {
        id: 'email-mentor-1',
        subject: 'Honeycomb offer — negotiation prep for Thursday',
        sender: 'naomi.adler@mentorship.dev',
        recipient: 'You',
        date: '2026-11-12',
        timestamp: '2026-11-12T15:00:00Z',
        direction: 'inbound',
        body: 'Hi!\n\nReviewed the Honeycomb terms you forwarded. The base is at market; the levers are signing bonus and the equity refresh cadence. Bring your three questions to our Thursday sync and we will script the Maya conversation.\n\nAlso: do not forget the Sourcegraph panel Monday — block Sunday evening for the tracing walkthrough rehearsal.\n\n— Naomi',
        snippet: 'Reviewed the Honeycomb terms you forwarded. The base is at market; the levers are signing bonus and equity refresh cadence...'
      }
    ],
    createdAt: '2026-10-01T09:00:00Z',
    updatedAt: '2026-11-12T15:00:00Z'
  }
];

import { calculateDaysInStage } from './dateUtils';

export { calculateDaysInStage };
