---
name: lighthouse-audit
description: Guide for maintaining 100/100 Lighthouse scores and modern web standards across Performance, Accessibility, Best Practices, and SEO in Tracklet.
---

# Lighthouse & Modern Web Standards Skill

Use this skill when auditing, adding UI features, or optimizing performance and accessibility to ensure Tracklet maintains **100/100 Lighthouse scores across all categories**.

---

## 1. SEO Standards (Target: 100)

1. **Meta Description & Title**:
   - `index.html` must always have a descriptive, non-generic `<meta name="description">` (50–160 chars).
   - Document title must follow: `Tracklet — Modern Job Application Tracker`.
2. **Canonical Link**:
   - Maintain `<link rel="canonical" href="https://tracklet-eight.vercel.app/" />`.
3. **Robots & Agentic Browsing**:
   - `public/robots.txt` must explicitly allow crawling (`Allow: /`) and reference `sitemap.xml`.
   - `public/llms.txt` must follow LLMs.txt format: `# Project Name`, markdown blockquote summary, `## About`, `## Features`, and hyperlinked navigation endpoints.

---

## 2. Accessibility / WCAG AA Standards (Target: 100)

1. **Color Contrast**:
   - **Never** use `text-slate-400` (`#94a3b8`) for visible text on white/light backgrounds (contrast is only ~3.0:1, failing WCAG AA).
   - **Always** use `text-slate-500` (`#64748b`, ~5.4:1 contrast) or darker (`text-slate-600`, `text-slate-700`, `text-slate-900`) for all readable labels, badge counts, subtitles, and hints.
2. **Form Controls & Inputs**:
   - All input fields must have visible labels or explicit `aria-label`/`title` attributes.
   - Placeholder text is not a substitute for accessible labels.
3. **Interactive Elements**:
   - All icon-only buttons (`<button>`) must include a `title` or `aria-label`.
   - External links must include `rel="noopener noreferrer"` and an accessible description.

---

## 3. Performance Standards (Target: 100)

1. **Eliminate Render-Blocking CSS/Fonts**:
   - External Google Fonts should be loaded with `preload` + `media="print" onload="this.media='all'"` and `font-display=swap`.
2. **Third-Party API & Network Resilience**:
   - Avoid unauthenticated third-party services that could fail or become deprecated (e.g., Clearbit).
   - Always chain image fallbacks (`onError`) to local placeholder avatars (`Building2` or colored initials).
3. **Code Splitting & Lazy Loading**:
   - Heavy modal components or auxiliary views can be dynamically loaded if bundle size exceeds thresholds.

---

## 4. Modern Web Standards & CSS (Target: 100)

1. **Modern CSS Properties**:
   - Use standards-based `scrollbar-width: thin` and `scrollbar-color` instead of vendor-prefixed `::-webkit-scrollbar`.
   - Set native `color-scheme: light` in `:root`.
   - Define `<meta name="theme-color" content="#2563eb">` for mobile browser styling.

---

## 5. Verification Checklist

Before completing any UI or infrastructure change, execute:
1. `npx tsc --noEmit` — Zero TypeScript errors.
2. `npm run build` — Production build must succeed.
3. Inspect dev server console — Zero uncaught errors or 404 image requests.
