# Final code review — 2026-07-25

## Outcome

Approved at code and local-runtime level. The review covered PocketBase invariants, the same-origin BFF, authentication, LiveKit authority, notification delivery, responsive UI flows, migrations, local startup, CI and VPS service definitions. Every finding discovered during the review was corrected and no code finding remains open.

Target-environment promotion still requires the documented firewall, Caddy, `systemd` and backup/restore evidence; those operational checks cannot be reproduced on the Windows local host.

## Corrections closed

- Preserved exact 2 Practice / 2 Support capacity, projected fairness debt, three future reservation slots and non-overlapping schedules under transactional writes.
- Kept started sessions in fairness and conflict calculations until authoritative completion, while releasing their future-reservation slot.
- Removed stale reservation locks and cancelled incomplete rooms at start without no-show penalties.
- Restricted historical participant disclosure and reporting to legitimate reserved/attended/no-show members.
- Made host cancellation, account deletion and participant release coherent and transactional.
- Enforced onboarding consent, immutable native-language setup, language ordering, topic/display-name bounds and active-profile access.
- Added stale notification-claim recovery, retry limits, worker dispatch coverage and post-session LiveKit room cleanup.
- Corrected scheduling rounding/local-date handling, responsive navigation, mobile overflow coverage, cancellation/history states, error messages and logout.
- Applied PocketBase migrations explicitly in local, CI and VPS startup paths and made local rebuilds refuse active services.
- Completed VPS environment keys, dynamic Next port injection and one loopback Redis instance per deployment.
- Upgraded vulnerable dependencies, removed unused test packages and retained compatibility for the secured brace-expansion release.

## Evidence

- `pnpm audit` — passed, no known vulnerabilities.
- `pnpm check` — passed: ESLint, TypeScript and 11 Vitest tests.
- PocketBase hook, migration, integration-script and PowerShell syntax checks — passed.
- `pnpm local:start` — passed from a clean stop; migrations and production Next.js build succeeded.
- `pnpm test:integration` — passed against native PocketBase, LiveKit and compiled Next.js with an ephemeral superuser.
- `pnpm test:e2e` — passed: desktop product-flow smoke and 390 px mobile overflow smoke.
- Web, PocketBase and LiveKit health endpoints — HTTP 200.
- PocketBase, Next.js and notification-worker error logs — clean after the final restart.
