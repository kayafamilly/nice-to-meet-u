# Private management back-office review — 2026-08-13

## Scope

- Read-only `/management` workspace with an independent eight-hour owner session.
- Salted scrypt password verification, encrypted `HttpOnly` cookie, CSRF/origin checks, rate limiting and five-attempt lockout.
- Explicit server DTOs for overview, analytics, users, sessions, moderation and system health.
- First-party anonymous visits and page views with 30-minute visits, event deduplication, route normalization and 90-day detailed retention.
- Locked PocketBase analytics/security collections and internal-secret-only transactional routes.
- Safe CSV exports, local-time rendering, desktop and 390 px responsive layouts.
- Google exclusion through metadata, `X-Robots-Tag`, `robots.txt` and absence from the sitemap.
- Authenticated heartbeats for notification and LiveKit lifecycle workers.

## Security review

- PocketBase is never called from browser code and all management records remain inaccessible through collection APIs.
- No password, token, LiveKit payload, push endpoint, raw IP, full user-agent or PocketBase record is returned by a management endpoint.
- The owner password is not stored in Git; production receives only its salted scrypt hash.
- Anonymous visitor identifiers are opaque random cookies and become keyed hashes before PocketBase storage.
- CSV fields beginning with spreadsheet formula characters are neutralized.
- Management pages and responses are private and `no-store`.

## Validation outcome

- `pnpm audit --audit-level high` — passed, no known vulnerabilities.
- `pnpm check` — passed: lint, TypeScript and 34 unit tests.
- `pnpm build` — passed, including all management and SEO routes.
- `pnpm test:integration` — passed against native PocketBase, LiveKit and Next.js; includes locked collections, secret rejection, analytics transaction/deduplication, DTO checks and lockout.
- Management Playwright suite — 3/3 passed: redirect/noindex, bad password, good password/dashboard/logout.
- Full Playwright suite — passed.
- Visual inspection — desktop and 390 px passed; system page showed healthy PocketBase/LiveKit and no browser console errors.

## Result

No open findings remain. Existing SEO changes in the workspace were preserved and validated together with this milestone.
