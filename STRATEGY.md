# Tracklet — Business Strategy

> **One-line thesis:** Tracklet is the open-source, privacy-first alternative to Huntr and Teal — free to self-host, paid for cloud convenience and AI features.

---

## 1. Strategic Positioning

### What We Are

Tracklet is an **open-source job application tracker** that gives job seekers full ownership of their data. The core product — pipeline tracking, Kanban board, stats, contacts, tasks, Chrome extension — is free and self-hostable. A managed cloud version (Tracklet Cloud) and optional AI features provide the revenue layer.

### What We Are NOT

- Not a career platform (no job listings, no employer partnerships)
- Not an auto-apply tool (users control every application)
- Not a resume builder (focused utility, not a Swiss Army knife)
- Not competing head-to-head with Teal/Huntr on features — competing on **values**

### Competitive Wedge

No established competitor in the job-tracker space is open-source or self-hostable. The market is split between:

1. **Closed-source AI platforms** (Teal, Simplify, Huntr) — feature-rich but cloud-only, data-opaque, subscription-dependent
2. **Generic free tools** (Google Sheets, Notion, Trello) — free but not purpose-built, no automation

Tracklet occupies the **uncontested middle**: purpose-built for job tracking, open-source, self-hostable, privacy-first. This is the "Plausible Analytics of job tracking" positioning.

### Target Audience

**Primary:** Tech-savvy job seekers (developers, designers, PMs) who:
- Apply to 15+ roles during a search
- Value data ownership and privacy (especially EU/GDPR-conscious)
- Are comfortable with or drawn to open-source tools
- Distrust closed-source SaaS with their career data

**Secondary:** Bootcamp graduates and career-changers who:
- Apply at high volume (50–200 applications per search)
- Need structure but won't pay $40/month for Huntr Pro
- Discover Tracklet via bootcamp communities, Discord, Reddit

---

## 2. Business Model: Open-Core + Managed Cloud

### Revenue Layer 1: Tracklet Cloud (Primary)

The hosted version at the production URL. Users sign up, start tracking — zero server setup.

| | Self-Hosted (Free) | Tracklet Cloud (Paid) |
|---|---|---|
| **Price** | $0 forever | $5/month or $29/year |
| **Tracking** | Unlimited | Unlimited |
| **Kanban / Stats / Extension** | ✅ Full | ✅ Full |
| **Data storage** | Your own Firebase/Supabase | Managed Firestore |
| **Auth** | Self-configured | Google Sign-In, one click |
| **Backups** | Manual | Automatic |
| **Updates** | Manual `git pull` | Automatic, zero downtime |
| **AI features** | Bring your own API key | Included |
| **Support** | Community (GitHub Issues) | Priority email support |

**Why people pay:** Convenience. Most users — even developers — would rather pay $5/month than configure Firebase, set up Firestore rules, manage auth, and keep the deployment running. The self-hosted option exists for trust and transparency; the cloud version exists for everyone else.

### Revenue Layer 2: AI Features (Open-Core Upsell)

AI-powered capabilities are available in Tracklet Cloud or via user-provided API keys for self-hosters.

| AI Feature | Free (Self-Hosted) | Cloud Free Tier | Cloud Pro |
|---|---|---|---|
| AI follow-up email drafts | BYOK (bring your own key) | 5/month | Unlimited |
| Stale application coaching | BYOK | 5/month | Unlimited |
| ATS keyword match score | BYOK | 3/month | Unlimited |
| Cover letter generation | BYOK | 3/month | Unlimited |

**Pricing note:** The `@google/genai` dependency already exists in the codebase. AI features should use Gemini API to keep costs low (free tier for light usage, ~$0.001–0.01 per generation for heavier usage). At $5/month per user, the margin is healthy even with API costs.

### Revenue Layer 3: Community Funding (Supplemental)

- **GitHub Sponsors:** Individual developers contribute $3–10/month
- **Open Collective:** Companies whose employees use Tracklet contribute for goodwill
- **"Supported by" sponsorships:** Career-adjacent companies (resume services, coaching platforms) pay for tasteful placement in the settings/about page

**Expected supplemental:** $200–$1,000/month at maturity. Covers infrastructure costs.

---

## 3. Distribution Strategy

### Primary Channels (Zero Budget)

| Channel | Strategy | Expected Timeline |
|---|---|---|
| **GitHub** | Open-source repo with excellent README, demo screenshots, one-click deploy buttons (Vercel, Railway, Render). Target `awesome-selfhosted` list inclusion. | Month 1 |
| **Hacker News** | "Show HN: Open-source job application tracker" launch post. | Month 1–2 |
| **Product Hunt** | Launch with demo video, position as "the privacy-first Huntr alternative." | Month 1–2 |
| **Reddit** | Genuine participation in r/cscareerquestions, r/selfhosted, r/opensource, r/jobsearch. Share Tracklet when contextually relevant, never spam. | Ongoing |
| **Discord** | Join 5–10 tech job-seeker / bootcamp alumni servers. Participate, share when relevant. | Ongoing |
| **SEO (niche)** | Target uncontested keywords: "open source job tracker", "self hosted job tracker", "privacy first job application tracker". | Month 2–6 |
| **LinkedIn** | Founder-led content: 3 posts/week about job search insights, open-source journey, build-in-public updates. | Ongoing |

### Distribution Flywheel

```
Open-source on GitHub (free)
    │
    ├── GitHub stars → trending → organic discovery
    ├── "awesome-selfhosted" list → self-hosting community
    ├── HN / Product Hunt → launch spike → blog coverage
    ├── Reddit r/selfhosted → privacy-conscious users
    ├── Niche SEO → "open source job tracker" queries
    └── YouTube tech reviewers cover it (free content)
            │
            ├── 85–90% self-host for free → community growth, PRs, word-of-mouth
            └── 10–15% sign up for Tracklet Cloud → revenue
```

### Channels to Avoid (for now)

- **Paid ads:** Zero budget, and job-seeker CPCs are expensive ($3–8 per click)
- **SEO for head terms:** "job application tracker" is dominated by Huntr/Teal. Don't compete here.
- **Enterprise sales:** No sales team, no sales process. Focus on self-serve.
- **App store / mobile:** Web-first. Mobile PWA is sufficient for now.

---

## 4. Pricing Philosophy

### Why $5/month (or $29/year)

1. **Below the "thoughtless" threshold.** Job seekers are cost-conscious. $5/month is the price of a coffee — low enough that cancellation feels more effort than the charge.
2. **Below every competitor.** Huntr Pro is $40/month. Teal+ is ~$52/month. Jobscan is $50/month. Tracklet at $5/month is 8–10x cheaper. That's a positioning statement, not just a price.
3. **One-time purchase option.** Offer a $29/year plan (~$2.42/month). Job seekers who know their search lasts 3–6 months prefer a fixed cost over open-ended subscriptions.
4. **Free tier is genuinely complete.** The free self-hosted version is not crippled. This builds trust and eliminates "bait-and-switch" resentment.

### Pricing Comparisons (Marketing Ammunition)

| Tool | Price | What You Get |
|---|---|---|
| Huntr Pro | $40/month | AI resume/cover letter + unlimited tracking |
| Teal+ | ~$52/month | Advanced resume analysis + unlimited AI |
| Jobscan | $50/month | ATS keyword scoring + tracker |
| Careerflow Premium | $24/month | LinkedIn optimizer + AI tools |
| **Tracklet Cloud** | **$5/month** | **Full tracking + AI features** |
| **Tracklet Self-Hosted** | **$0** | **Full tracking (BYOK for AI)** |

---

## 5. Revenue Projections

### Conservative Scenario

| Phase | Timeline | GitHub Stars | Free Users | Cloud Paid Users | MRR |
|---|---|---|---|---|---|
| Launch | Month 1–3 | 100–500 | 200–500 | 10–25 | $50–$125 |
| Traction | Month 4–12 | 500–2,000 | 1K–3K | 50–150 | $250–$750 |
| Growth | Year 2 | 2K–5K | 5K–10K | 200–500 | $1,000–$2,500 |
| Maturity | Year 3+ | 5K–10K | 10K–20K | 500–1,000 | $2,500–$5,000 |

**Year 1 ARR:** $3K–$9K (covers infrastructure, not salary)
**Year 3 ARR:** $30K–$60K (lifestyle business territory)

### Escape Velocity Triggers

If any of these occur, the trajectory changes significantly:

- **Viral HN post** (front page for 12+ hours) → 10K+ visitors in a day → 500+ stars overnight
- **Major tech YouTuber review** (Fireship, Theo, etc.) → 50K+ impressions
- **Bootcamp partnership** (a single bootcamp recommending Tracklet to cohorts) → 200+ users per quarter
- **"Awesome" list inclusion** (awesome-selfhosted has 200K+ stars) → sustained organic traffic

---

## 6. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Competitor forks the repo and offers their own cloud | Medium | High | Move fast on brand, community trust, and hosted-version UX. Forks compete on code; you compete on experience and reliability. |
| Free tier is "too good" — no one upgrades | High | Medium | AI features and zero-setup convenience are the upgrade triggers. Monitor conversion closely; adjust gates if <3% convert. |
| Job-seeker churn (users leave after finding a job) | Certain | High | Structural reality. Offset via constant top-of-funnel from GitHub/SEO. Consider "career CRM" expansion (long-term networking tracker) to extend lifetime. |
| Solo founder burnout / support burden | Medium | High | Community-driven support (GitHub Discussions). Clear contribution guidelines. Accept that response times won't match funded competitors. |
| Firebase costs scale faster than revenue | Low | Medium | Firestore read/write costs are minimal for this use case. Monitor per-user cost. Migrate to self-managed Postgres/Supabase if costs spike. |

---

## 7. Success Metrics

### North Star Metric
**Monthly Active Trackers (MAT):** Users who logged or updated at least one application in the last 30 days.

### Key Metrics by Phase

| Phase | Primary Metric | Target |
|---|---|---|
| Launch (Month 1–3) | GitHub stars + first 100 Cloud signups | 500 stars, 100 signups |
| Traction (Month 4–12) | Cloud free-to-paid conversion rate | >5% conversion |
| Growth (Year 2) | MRR + organic search traffic | $1K MRR, 2K organic visits/month |
| Maturity (Year 3+) | Net revenue retention + community PRs | $3K+ MRR, 10+ community contributors |

### Metrics to Ignore (for now)

- Total signups (vanity — doesn't indicate value)
- Page views (vanity — doesn't indicate usage)
- Social media followers (vanity — doesn't convert)

---

## 8. What Needs to Be Built (Gaps vs. Current State)

| Capability | Status | Priority for Launch |
|---|---|---|
| Core tracking (table, pipeline, stats, detail panel) | ✅ Built | — |
| Chrome extension (auto-extract + save) | ✅ Built | — |
| Auth (Google Sign-In + guest mode) | ✅ Built | — |
| CSV import/export | ✅ Built | — |
| Self-hosting documentation | ❌ Missing | 🔴 Critical |
| One-click deploy buttons (Vercel/Railway) | ❌ Missing | 🔴 Critical |
| Open-source README (screenshots, demo, setup) | ❌ Missing | 🔴 Critical |
| LICENSE file (MIT or AGPL) | ❌ Missing | 🔴 Critical |
| Contributing guidelines (CONTRIBUTING.md) | ❌ Missing | 🟡 Important |
| AI features (follow-up drafts, ATS scoring) | ❌ Not built | 🟡 Post-launch |
| Stripe/payment integration for Cloud tier | ❌ Not built | 🟡 Post-launch |
| Landing page / marketing site | ❌ Not built | 🟡 Post-launch |
| BYOK (bring your own API key) settings | ❌ Not built | 🟡 Post-launch |
