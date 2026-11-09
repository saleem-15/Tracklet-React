# ADR 0013: Cloudflare Edge Reverse Proxy for PostHog Product Telemetry

## Status
Accepted

## Date
2026-11-03

## Context
Following Tracklet's transition into a commercial B2C SaaS ([ADR 0011](0011-pivot-to-commercial-saas-and-cloud-storage.md)) and the introduction of strict data-ownership telemetry ([ADR 0012](0012-saas-telemetry-privacy-and-data-ownership.md)), PostHog is used to monitor user onboarding funnels, feature adoption, and ATS scraper health.

However, in production observability audit data, **between 10% and 25% of client-side telemetry events and session recordings are silently dropped** (`ERR_BLOCKED_BY_CLIENT`). 

This drop is driven by the demographics of Tracklet’s core user base: software engineers, product managers, and tech-savvy job seekers who routinely run content blockers (uBlock Origin, Brave Shields, AdGuard, Firefox Enhanced Tracking Protection). These tools maintain blocklists (such as EasyPrivacy and Peter Lowe's Blocklist) that block all HTTP requests targeting third-party analytics hostnames like `*.posthog.com`.

### Technical & Financial Constraints
1. **No Dedicated Custom Backend**: Tracklet runs on a serverless, static architecture using React 19, Vite, Firebase (Auth/Firestore/Storage), and Cloudflare Pages. Maintaining a dedicated Node/Express or Go backend server would introduce unnecessary infrastructure overhead, operational costs, and maintenance burdens.
2. **First-Party Hosting Without a Mandatory Custom Domain**: Tracklet deploys natively to Cloudflare Pages (`tracklet.pages.dev`). Any proxy solution must function immediately on standard Cloudflare Pages origins without requiring an upfront custom domain purchase or complex DNS routing.
3. **Zero Financial Cost ($0 Budget)**: Operational expenses must remain within the free tiers of existing infrastructure providers.

---

## Decisions

### 1. Same-Origin Ingestion via Cloudflare Pages Functions
Instead of directing `posthog-js` network calls to `https://eu.i.posthog.com`, Tracklet implements a same-origin edge reverse proxy using Cloudflare Pages Functions at `functions/ingest/[[path]].ts` backed by a portable handler in `api/ingest.ts`.

- When the web application loads, PostHog's `api_host` is configured to same-origin path `/ingest` (or configured custom prefix).
- Because requests originate from and target the same origin (`https://tracklet.pages.dev/ingest/*` or future custom domains), browser extensions recognize the requests as legitimate first-party application traffic rather than cross-site third-party tracking.
- The Cloudflare Pages Function runs at the network edge, intercepting the request and forwarding it upstream to PostHog's dedicated proxy infrastructure.
- **Cost**: $0.00. Cloudflare Pages Functions includes **100,000 free requests per day** (~3,000,000 requests/month), providing extensive headroom for early-to-mid stage SaaS operations.

### 2. Dual Upstream Path Dispatching
PostHog decouples static JavaScript SDK bundles and recorder libraries from dynamic ingestion endpoints. The edge proxy enforces intelligent path-based routing:
- **Static Assets & Remote Config (`/static/*`, `/array/*`)**: Routed to PostHog's EU Asset CDN (`eu-assets.i.posthog.com`). This guarantees session replay assets (`recorder.js`, `recorder-v2.js`) and survey bundles load reliably without cross-origin script blocking.
- **Dynamic Events & Ingestion (`/e/*`, `/batch/*`, `/decide/*`, `/s/*`)**: Routed to PostHog's proxy ingest gateway (`eu-proxy-direct.i.posthog.com`). This endpoint is specifically tuned for reverse proxies and eliminates TLS renegotiation stalls.
- **Regional Portability**: If `VITE_POSTHOG_HOST` or `POSTHOG_HOST` contains `us.`, the proxy automatically redirects traffic to the corresponding US hosts (`us-assets.i.posthog.com` and `us-proxy-direct.i.posthog.com`).

### 3. Preserving Real Client Identity and Geo-Location
Standard HTTP proxies inadvertently mask the origin IP, causing all incoming requests to appear to originate from Cloudflare edge data centers. The proxy extracts Cloudflare's trusted visitor IP and forwards it upstream:
- Extracts `cf-connecting-ip`, falling back to `x-real-ip` or `x-forwarded-for`.
- Injects `X-Forwarded-For: <clientIp>` and `X-Real-IP: <clientIp>` into the upstream request.
- PostHog uses this forwarded IP exclusively to compute country/city telemetry without compromising client privacy (IP storage remains masked in PostHog project settings).

### 4. Path Obfuscation and Blocklist Evasion Strategy
To prevent heuristic blocking:
- **Forbidden Route Names**: The proxy explicitly avoids common blocklist keywords such as `/analytics`, `/tracking`, `/telemetry`, and `/posthog`, which are indexed in generic EasyPrivacy URL pattern regex rules (e.g. `*/analytics/*`).
- **Path Selection (`/ingest`)**: The path `/ingest` is an industry-standard term for general data and log pipelines (e.g., Elasticsearch, Datadog, BigQuery, Kafka) and is not globally blocked on first-party domains to prevent catastrophic collateral breakage across enterprise web applications.
- **Configurable Override (`VITE_POSTHOG_API_HOST`)**: If a specific ad blocker rule targets `/ingest` on a user's domain in the future, the endpoint can be re-aliased immediately (e.g., to `/api/p` or `/api/sync`) via environment variable without refactoring application logic.

### 5. Seamless Dev/Prod Environment Parity
- **Production (`import.meta.env.PROD`)**: Automatically defaults `api_host` to same-origin `/ingest`.
- **Local Development (`import.meta.env.DEV`)**: Defaults to direct `posthogHost` (`https://eu.i.posthog.com`) unless an explicit proxy is set, allowing developers to run `npm run dev` with zero requirement for local Cloudflare Wrangler daemon setup.
- **UI Host Segregation**: `ui_host` is explicitly retained as `https://eu.posthog.com` (or `https://us.posthog.com`), ensuring that the PostHog interactive toolbar, session inspector, and Sentry deep links continue navigating correctly to the PostHog administrative web console.

---

## Consequences

### Positive
- **Telemetry Fidelity (10–25% Data Recovery)**: Recovers missing onboarding drop-off, feature retention, and scraper degradation data previously lost to ad blockers.
- **Zero Server Maintenance**: Serverless edge deployment through Cloudflare Pages Functions requires no Docker containers, Node/Go daemons, or server maintenance.
- **Zero Additional Cost**: 100% covered by Cloudflare’s free tier (100k edge invocations/day) and PostHog’s free tier (1M events/month).
- **Same-Origin Security**: Eliminates cross-origin CORS complexity between the frontend and third-party tracking origins.

### Negative / Trade-offs
- **Daily Invocation Budget**: High-frequency session replay capturing consumes Cloudflare Functions invocations. If Tracklet scales past 100,000 daily requests, Cloudflare Workers Paid ($5/month for 10M requests) or sampling down session recording rates will be required.
- **Maintenance Footprint**: Reverse proxy logic lives inside the Tracklet repository (`api/ingest.ts`) and must be maintained if PostHog changes its upstream proxy domain conventions.
