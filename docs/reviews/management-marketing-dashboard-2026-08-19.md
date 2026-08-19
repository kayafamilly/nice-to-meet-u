# Management marketing dashboard review — 2026-08-19

## Scope reviewed

- French, read-only `/management` workspace with rolling 24-hour, 7-day and 30-day comparisons.
- Acquisition, activation, session quality, moderation and system indicators.
- Protected BFF DTOs only; PocketBase collections remain locked from browser access.
- Database-side aggregates and paginated user/session/moderation queries.
- Additive management timestamps migration, Next.js cache ownership fix and `nanoid` security update.

## Validation outcome

- `pnpm audit --audit-level high`: pass, no known vulnerability.
- `pnpm check`: pass — lint, types and 36 unit tests.
- `pnpm build`: pass — 59 routes generated.
- Fresh PocketBase migration through `1710000016`: pass.
- Management data for `day`, `week` and `month`: HTTP 200 with empty and populated datasets.
- `pnpm test:integration`: pass, including locked analytics collections, DTO safety, period reports, deduplication and acquisition breakdowns.
- `pnpm test:e2e`: pass, 8/8 including private login, noindex, incorrect password, authenticated dashboard, logout and mobile public layout.
- Browser review: pass at desktop and 390 px mobile widths; empty states and populated marketing data verified with no console errors.
- `pnpm test:realtime`: existing nondeterministic harness did not pass on Windows. First run measured remote-media p95 at 5008 ms against a 5000 ms limit; a clean retry later reported four tiles while also claiming four were expected. No realtime, LiveKit, room or cycle behavior changed in this milestone; integration and E2E gates remain green.

## Promotion decision

Approved for a controlled production promotion after a consistent PocketBase backup. The migration is additive, so application rollback can retain the new nullable date fields. Database restoration is reserved for integrity loss rather than routine application rollback.
