# ADR 0004: Conditional Sentry Telemetry for Self-Hosting & Production Dual-Mode

## Status
Accepted

## Date
2026-08-20

## Context
Tracklet is designed to support two core deployment modes:
1. **Managed SaaS / Production**: Hosted on public infrastructure, requiring real-time error tracking, performance tracing, and crash diagnostics to maintain high availability and user trust.
2. **Open-Source / Self-Hosted / Offline Guest Mode**: Cloned and deployed by community developers or private individuals who do not possess a Sentry account and want full data sovereignty without telemetry reporting.

If Sentry is initialized unconditionally without verifying the presence of a Data Source Name (`VITE_SENTRY_DSN`), several issues occur:
- The Sentry SDK registers global window listeners, DOM mutation observers for session replay, and performance tracing interceptors that consume memory and CPU cycles even when no backend ingest endpoint exists.
- In unconfigured environments, unhandled exceptions or SDK attempts to dispatch beacons can produce noisy browser console warnings or failed network calls.
- AI coding assistants and future contributors reviewing `src/instrument.ts` or `src/main.tsx` might mistakenly assume an unconfigured `VITE_SENTRY_DSN` is an error or attempt to make Sentry credentials mandatory in `.env.example`, breaking the zero-friction onboarding principle for open-source developers.

## Decision

1. **Explicit DSN Presence Guard in `src/instrument.ts`**:
   - The Sentry initialization strictly inspects `const dsn = import.meta.env.VITE_SENTRY_DSN;`.
   - Sentry is initialized with:
     ```typescript
     Sentry.init({
       dsn: dsn || undefined,
       enabled: Boolean(dsn),
       ...
     });
     ```
   - When `dsn` is omitted, empty, or undefined, Sentry enters a passive, zero-overhead no-op state. Tracing listeners, DOM recording workers, and network transports remain completely inactive.

2. **Safe Code-Level Telemetry Invocations**:
   - Calls to `Sentry.captureReactException(error, errorInfo)` in `ErrorBoundary.tsx`, `Sentry.setUser(...)` in `AuthContext.tsx`, and `reactErrorHandler()` in `main.tsx` remain in the codebase.
   - The Sentry SDK safely absorbs these invocations as no-ops when `enabled: false`, eliminating the need for boilerplate `if (isSentryEnabled)` conditionals throughout presentation components.

3. **Isolated Vendor Chunking in Vite**:
   - Configured `vendor-sentry` in `vite.config.ts` Rollup `manualChunks` to keep Sentry SDK code separated from the core application vendor bundle.

4. **Production Diagnostic Log Suppression**:
   - Set `enableLogs: !import.meta.env.PROD && Boolean(dsn)` to keep end-user browser consoles clean in production while enabling debugging logs in local development only when explicitly testing Sentry integration.

## Consequences

### Positive
- **Zero-Friction Self-Hosting**: Open-source contributors and self-hosters can clone, run `npm install`, and launch Tracklet immediately without needing Sentry credentials or seeing console errors.
- **Data Sovereignty & Privacy**: Self-hosted instances never leak crash logs, URLs, or metadata to external third-party monitoring endpoints.
- **Architectural Clarity for AI & Human Contributors**: Establishes a permanent record that `VITE_SENTRY_DSN` is strictly optional, preventing automated agents or developers from refactoring the guard away.
- **Clean Bundle Separation**: Isolate Sentry logic in `vendor-sentry`, preventing it from polluting primary runtime chunks.

### Negative / Trade-offs
- **Bundle Payload**: The Sentry client library (~92 kB gzip) is present in the vendor chunk even if unconfigured, though it remains dormant at runtime. If ultimate bundle size minimization is required for self-hosted Docker images in the future, dynamic `import()` or build-time plugin stripping can be introduced.
