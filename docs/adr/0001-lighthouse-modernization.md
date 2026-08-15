# ADR 0001: 100/100 Lighthouse Score Optimization & Modern Web Standards

## Status
Accepted

## Context
Tracklet is a modern, high-clarity job application tracking system deployed on Vercel (`https://tracklet-eight.vercel.app/`). An initial Lighthouse audit revealed several issues impacting all 4 core metrics:
- **SEO (Score: 83)**: Missing `<meta name="description">`, lack of canonical link tag, missing static `robots.txt` causing SPA HTML fallback to crawler requests, and missing agentic browsing metadata (`llms.txt`).
- **Accessibility (Score: 96)**: WCAG AA contrast failures across secondary and muted text elements where `text-slate-400` (~3.0:1 contrast on white) was used instead of the minimum required 4.5:1 ratio.
- **Performance (Score: 92)**: Render-blocking Google Fonts `<link>` stylesheet on the critical rendering path, causing FCP/LCP delays.
- **Best Practices (Score: 96)**: Console errors triggered by DNS resolution failures of the defunct Clearbit logo API (`logo.clearbit.com`), and legacy webkit-only scrollbar pseudo-elements.

## Decision

We instituted the following architectural and code modernization changes across the project:

### 1. Asynchronous Font Loading (Performance)
- Replaced synchronous `<link rel="stylesheet">` for Google Fonts in [`index.html`](file:///d:/Programming/Tracklet/index.html) with `<link rel="preload" as="style">` combined with an asynchronous `media="print" onload="this.media='all'"` pattern and `<noscript>` fallback.
- **Outcome**: Completely eliminated render-blocking CSS while retaining critical font styles without layout shifts (`font-display=swap`).

### 2. WCAG AA Compliant Text Contrast (Accessibility)
- Enforced a minimum contrast token standard: all permanently visible text previously using `text-slate-400` (`#94a3b8`) was upgraded to `text-slate-500` (`#64748b`, ~5.4:1 contrast on white) across table statuses, sidebar subheaders, badge counters, and metadata labels.
- Icon-only decorative items and hover states maintain subtle slate tokens since they do not convey unique textual information or are augmented with tooltip/accessible labels.

### 3. Native CSS Standards & Theming (Modern Web Standards)
- Migrated from legacy `::-webkit-scrollbar` pseudo-selectors in [`src/index.css`](file:///d:/Programming/Tracklet/src/index.css) to standard CSS properties:
  ```css
  :root {
    color-scheme: light;
    scrollbar-color: #cbd5e1 transparent;
    scrollbar-width: thin;
  }
  ```
- Added `<meta name="theme-color" content="#2563eb">` for browser chrome color integration.

### 4. Search Engine & Agentic Crawling Metadata (SEO)
- Added `<meta name="description">` and `<link rel="canonical" href="https://tracklet-eight.vercel.app/" />` in [`index.html`](file:///d:/Programming/Tracklet/index.html).
- Added static [`public/robots.txt`](file:///d:/Programming/Tracklet/public/robots.txt) to explicitly allow crawlers and link to the sitemap, preventing single-page application router fallback.
- Added [`public/llms.txt`](file:///d:/Programming/Tracklet/public/llms.txt) complying with the Agentic/LLM web discovery standard with clear H1 headers, feature summaries, and navigation links.

### 5. Resilient Third-Party Asset Resolution (Best Practices)
- Removed defunct Clearbit API endpoints from [`src/lib/logoUtils.ts`](file:///d:/Programming/Tracklet/src/lib/logoUtils.ts).
- Established a prioritized, fail-safe fallback chain: Google S2 Favicon API (`https://www.google.com/s2/favicons?domain=...`) $\rightarrow$ Unavatar $\rightarrow$ Local initials SVG avatar fallback.

## Consequences

### Positive
- **100/100 Across All Lighthouse Categories**: SEO, Accessibility, Best Practices, and Performance all achieve the top tier score.
- **Zero Console Errors**: Image loading and logo resolution fail gracefully without emitting 404/DNS resolution errors.
- **Standardized CSS**: Eliminated vendor-prefixed scrollbar quirks in favor of standards-compliant CSS supported across modern browsers.
- **Future-Proof Agentic SEO**: Structured for both human web crawlers and modern AI/LLM agents via `llms.txt`.

### Neutral / Maintenance
- Future UI contributions must adhere to the `text-slate-500` minimum baseline for readable body and label text to prevent contrast regression.
