# Tracklet Privacy Policy

**Effective Date:** October 22, 2026  
**Last Updated:** October 22, 2026  
**Applies To:** Tracklet Cloud (`tracklet.app`), Tracklet Chrome Extension, and associated API services.

---

## 1. Our Privacy Pledge: Strict Data Ownership

At Tracklet, we believe your job search is personal, confidential, and fundamentally yours. 

Traditional recruitment and job search platforms often operate on hidden double-sided business models: offering "free" tracking utilities to job seekers while quietly packaging, pooling, or selling candidate pipelines to recruiters, headhunters, and advertising networks.

**Tracklet does not sell, rent, broker, or monetize your career data. Period.**
- We do not share your job applications, notes, salaries, or resumes with prospective employers, current employers, or recruitment agencies.
- We do not run third-party advertising or sell browsing histories to data brokers.
- We monetize exclusively through transparent, direct software subscriptions (Tracklet Pro). Our incentives align 100% with protecting your career data.

---

## 2. Information We Collect

### A. Account & Authentication Data
When you register for Tracklet Cloud, we collect:
- Your email address, display name, and profile image provided via Firebase Authentication (Google OAuth or email/password).
- Your unique Firebase user identifier (`uid`).
- Subscription state, billing period, and entitlement tier (Free vs. Pro). Payment card numbers are processed directly by our payment processor (e.g., Stripe) and never touch or reside on Tracklet servers.

### B. Customer Career Data (Your Workspace)
To provide the core application tracking service, Tracklet securely synchronizes:
- **Applications**: Company name, role, salary range, job posting URLs, work location (remote/hybrid/onsite), employment type, and stage history.
- **Documents & Resumes**: Uploaded PDF/DOCX resumes and parsed profile metadata, stored in user-isolated cloud buckets.
- **Notes & Contacts**: Rich-text interview notes, recruiter contact details (names, emails, phones, LinkedIn profiles), and follow-up tasks.

### C. Operational Diagnostics & Error Telemetry (Sentry)
To ensure system stability, 99.9% availability, and rapid incident recovery, we collect technical diagnostic events:
- Unhandled JavaScript exceptions, application crashes, and network latency traces.
- Browser type, operating system, screen dimensions, and app release version.
- **Privacy Masking**: Crash replays strictly enforce text masking (`maskAllText: true`) and media blocking (`blockAllMedia: true`). Sensitive job details, salary figures, and uploaded documents are obscured from crash recordings.

### D. Product & Growth Analytics (PostHog)
To identify where users face friction, improve onboarding flows, and detect broken job board scrapers, we collect pseudonymized product telemetry:
- Navigation events, feature usage (e.g., Kanban card drags, template usage, CSV exports), and paywall interaction metrics.
- **Scraper Health Metrics**: When using the Chrome Extension or web scraper, aggregate error codes and job board root domains (e.g., `boards.greenhouse.io`, `jobs.lever.co`) are recorded to identify broken HTML selectors. Candidate identifiers and personal job parameters are stripped.
- All password inputs and sensitive form fields are masked in session recordings.

---

## 3. How We Use Your Information

We process your data strictly to:
1. Provide, maintain, and synchronize your job application pipeline across your browser and extension.
2. Verify account authentication and enforce subscription entitlement limits.
3. Deliver customer support, bug fixes, and critical service notifications.
4. Detect and repair broken job board scrapers across supported ATS platforms.
5. Prevent fraud, abuse, and automated infrastructure degradation.

---

## 4. Security & Encryption Standards

- **Encryption in Transit**: All communication between your browser, extension, and Tracklet services is encrypted using Transport Layer Security (TLS 1.3).
- **Encryption at Rest**: All application records, contact logs, and uploaded resumes are stored in Google Cloud Platform / Firebase infrastructure using AES-256 encryption.
- **Tenant Isolation**: Database rules (`firestore.rules`) strictly enforce that users can only read, write, or query records where `request.auth.uid == userId`. Cross-tenant data leakage is structurally prohibited.

---

## 5. Third-Party Service Providers (Subprocessors)

We work with a minimal set of vetted infrastructure subprocessors:

| Provider | Purpose | Data Transferred | Privacy Guardrails |
| :--- | :--- | :--- | :--- |
| **Google Cloud / Firebase** | Authentication, Firestore Database, Cloud Storage | Account credentials, encrypted application records, uploaded resumes | SOC 2 Type II, ISO 27001, GDPR compliant |
| **Sentry** | Error tracking & crash forensics | Anonymized stack traces, client device metadata | Text & media masking active; zero PII storage |
| **PostHog** | Product analytics & scraper monitoring | Pseudonymized feature events, scraper domain error codes | Password & input masking; EU data residency option |
| **Stripe / LemonSqueezy** | Billing & subscription management | Billing address, payment tokens, tax identifiers | PCI-DSS Level 1 compliant; Tracklet never handles card numbers |

---

## 6. Your Rights & Data Sovereignty (GDPR & CCPA)

Regardless of your geographic location, Tracklet grants you comprehensive control over your personal data:

1. **Right of Access & Portability**: You may export all your tracked job applications and contacts at any time to standard CSV or JSON formats directly from the Settings view.
2. **Right to Rectification**: You can update, correct, or edit any application, contact, or note instantly in the dashboard.
3. **Right to Erasure ("Right to Be Forgotten")**: You can permanently delete your account and all associated cloud records at any time via Settings $\rightarrow$ Account $\rightarrow$ **Delete Account**. This triggers an immediate, permanent purge of your user document, applications, history milestones, contacts, and cloud-stored resumes.
4. **Do Not Sell**: We do not sell your personal information. No opt-out is necessary because we never engage in data brokering or recruiter sharing.

---

## 7. Changes to This Privacy Policy

If we make material changes to how we handle personal data or operational telemetry, we will notify you via an in-app notice or email before changes take effect.

---

## 8. Contact & Data Protection Officer

For privacy inquiries, data deletion verifications, or GDPR/CCPA questions, contact:  
**Email:** privacy@tracklet.app  
**Security Inquiries:** security@tracklet.app
