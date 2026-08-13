# SEO speaking guides and verified activity review - 2026-08-09

## Outcome

Approved for deployment. NiceToMeetU now publishes six crawlable, English-language speaking-practice guides for Spanish, English, French, German, Japanese, and Korean. Each guide includes a browser-only 30-minute conversation planner with adaptable themes and prompts.

The change stays within the audit scope: it contains no RideShare work, India-focused acquisition pages, paid Speaking Club experiment, B2B feature, testimonial, rating, or fabricated activity claim.

## Public discovery and trust boundaries

- `/guides` and the six guide URLs are linked from the public site and included in the canonical sitemap.
- Each guide has a canonical URL, page-specific metadata, and CSP-nonced factual `Article` structured data.
- The planner is entirely static and client-side. It does not call PocketBase, a Next API, or an external service.
- The homepage no longer presents named or location-labelled portraits as member evidence. The remaining imagery is explicitly illustrative.
- The optional activity proof exposes only one aggregate: completed sessions with at least two attendees confirmed by authoritative LiveKit evidence.
- PocketBase keeps that counter in a private singleton. Its source route requires the internal webhook secret; the browser receives only a strict Next BFF DTO containing a nonnegative safe integer.
- The counter is seeded from completed historical sessions with at least two attended participants and is incremented in the existing closure transaction before a qualifying scheduled session becomes completed. A failed transaction cannot leave a partial increment.

## Validation

- `pnpm audit` - passed, no known vulnerabilities. During validation, two newly reported transitive advisory fixes were pinned with compatible `js-yaml` and `nanoid` overrides.
- `pnpm check` - passed: ESLint, TypeScript, and 24 Vitest tests.
- `pnpm build` - passed with the guide index, dynamic guide route, sitemap, and public metrics BFF route in the production output.
- `pnpm test:e2e` - passed: four Chromium tests against an isolated compiled production instance, covering public navigation, mobile overflow, guide metadata/structured data, the interactive planner, and sitemap/private-route boundaries.
- Fresh isolated PocketBase migration - passed through `1710000013_ntmy_verified_session_metrics.js`.
- `pnpm test:integration` - passed against an isolated PocketBase database, isolated Next BFF, and temporary native LiveKit. It verified that the PocketBase metrics route rejects unauthenticated requests and that the public BFF returns only the validated aggregate DTO.
