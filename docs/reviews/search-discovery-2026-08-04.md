# Search discovery review — 2026-08-04

## Outcome

The website-side Google Search Console and crawl-discovery implementation is ready for deployment. Public marketing pages are discoverable through canonical metadata and a root sitemap, while authentication, API and member routes remain excluded without any UI, session or business-flow change.

The production origin is fixed to `https://nice-to-meet-u.com` in the VPS deployment example. The local development origin remains `http://127.0.0.1:3000` so local testing is not redirected to production.
The edge proxy declares the apex domain as the only application origin and permanently redirects the `www` hostname to it, preventing duplicate canonical hosts.

## Reviewed boundaries

- The verification token is server-only and is emitted only as the public verification meta value.
- Canonicals, sitemap entries, robots host and structured-data URLs share the configured public application origin.
- The sitemap contains only `/` and `/how-it-works`; it contains no account, profile, session, feedback, token or API URL.
- Private and authentication routes use `noindex`; APIs and authenticated routes also receive `X-Robots-Tag` defense in depth.
- Metadata endpoints bypass the request nonce/CSRF proxy so their output remains cacheable and does not set application cookies.

## Validation

- `pnpm audit --audit-level=high` — passed, no known vulnerabilities.
- ESLint and TypeScript — passed without warnings or errors.
- `pnpm test` — passed: 20 Vitest tests.
- Production Next.js build — passed; `/robots.txt`, `/sitemap.xml` and `/icon.svg` are statically generated metadata routes.
- `pnpm test:e2e` — passed: three Chromium tests, including canonical, sitemap, robots and authentication `noindex` assertions.
- Runtime inspection confirmed correct `text/plain` and `application/xml` content types, no application cookie on metadata endpoints, public canonical/JSON-LD/Open Graph metadata, and `X-Robots-Tag` on `/app` and `/api` responses.
- PocketBase, LiveKit, Next.js, notification worker and lifecycle worker are running; web and LiveKit health endpoints return `ok`.
