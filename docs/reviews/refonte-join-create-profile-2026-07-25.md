# Join / Create / Profile refactor review — 2026-07-25

> Historical implementation log. Intermediate matching and reservation rules in this file are superseded by `docs/architecture.md` and `docs/reviews/ui-ux-stitch-platform-2026-07-25.md`.

## Outcome

Approved for local product testing. The authenticated application now exposes Join, Create, Profile and the notification bell; Docker configuration was removed in favour of native local scripts and native systemd service definitions.

## Reviewed boundaries

- Browser requests use Next.js BFF routes only; PocketBase remains loopback/private.
- VAPID keys, PocketBase internal secret and notification-worker secret are server-only. The browser receives only the authenticated BFF public-key DTO.
- Session, reservation, profile, anonymised deletion, notification and subscription mutations execute through PocketBase custom routes in transactions.
- LiveKit remains the authority for attendance/session completion through its signed webhook path.
- The native runtime keeps binaries and data in ignored `.local/`; the production runbook uses `systemd` and Caddy.

## Checks run

- `pnpm check` — passed (lint, TypeScript, 5 business-rule tests).

## Hosted-session management follow-up

Session DTOs now disclose only the safe `isHost` boolean for the signed-in viewer. Join keeps an upcoming hosted session visible regardless of an old closed reservation record and presents it under a dedicated hosted-session section. The host can cancel an upcoming session through a CSRF-protected BFF route; PocketBase authorizes the host and updates the session, relevant participant reservations, locks, notifications and audit trail in one transaction.

- `pnpm check` — passed (lint, TypeScript, 5 business-rule tests).
- Native host-cancellation validation — passed: the host saw its session in Join, a guest reserved it, then host cancellation marked both reservations cancelled and released both locks. The isolated validation session was removed afterward.
- Native local health — passed: Next.js and PocketBase returned HTTP 200 with no new errors in their logs.

## Relaxed early-product matching follow-up

The early-product matching model now permits up to three concurrent upcoming reservations per member. The database lock is represented by three unique user slots, preserving the limit under concurrent requests. Session capacity remains four total members, but Support/Practice composition no longer limits booking, room readiness or notifications. Native languages determine the historical Support role; every other active catalogue language is Practice and the stored profile preferences do not restrict joining.

Profiles now support one to three native languages and one to three practice languages with a level per practice language. Native languages remain read-only after onboarding. Join starts with All languages rather than a practice-language filter.

- Migration `1710000007_ntmy_three_reservation_slots.js` — applied successfully against the local PocketBase data.
- Native multi-language validation — passed: 3 native and 3 practice languages were accepted and returned through the profile DTO.
- Reservation validation — passed: three sequential reservations succeeded, the fourth returned 409; four concurrent attempts produced exactly three `200` responses and one `409`.
- BFF validation — passed: registration, multi-language onboarding, profile practice-language update and unfiltered Join all completed through Next.js BFF routes.
- `pnpm check` — passed (lint, TypeScript, 5 business-rule tests).
- Native local health — passed: Next.js and PocketBase returned HTTP 200 with no new errors in their logs.

## Reservation visibility and rebooking follow-up

Join now retains an upcoming session after the current viewer cancels their reservation. A cancelled (or legacy pre-start no-show) reservation can be reactivated transactionally when the session still has capacity; the existing participant record is updated rather than duplicated. Other sessions remain visibly unreserved and state the one-active-reservation rule explicitly instead of using the ambiguous “Manage your reservation above” label.

- `pnpm check` — passed (lint, TypeScript, 5 business-rule tests).
- Native rebooking validation — passed: reserve → cancel → list after cancellation → reserve again returned `cancelled`, then `reserved`, while retaining exactly one participant record.
- Native local health — passed: Next.js and PocketBase returned HTTP 200 with no new errors in their logs.
- `pnpm build` — passed with Next.js production output.
- `pnpm test:e2e` — passed against production `next start`.
- `pnpm test:integration` — passed against native PocketBase + LiveKit + production Next.js. It verifies 300 active languages, BFF registration/onboarding/Join filtering/profile/history/push subscription/anonymised deletion, 15-minute/current-year Create boundaries, universal Practice roles, preserved reservation roles, notification outbox/read flow, capacity, signed webhook delivery and webhook lease recovery.
- Native local health — passed: `/`, PocketBase health through the BFF and LiveKit health through the BFF all returned 200.

## Follow-up before VPS promotion

Perform the documented VPS firewall, Caddy, systemd restart and isolated PocketBase backup-restore checks with the actual Hostinger environment and production VAPID keys.

## Authentication follow-up

The production-mode local runtime was reviewed after login and registration appeared non-functional. Two independent issues were corrected: the strict CSP nonce was not reaching Next.js document rendering, preventing React form hydration; and HTTP localhost received cookies marked `Secure` because the runtime uses `NODE_ENV=production` for production-mode validation. The nonce is now consumed by the root layout without adding `unsafe-eval`, and cookie security/name now follow the configured app URL protocol: HTTP localhost uses a regular non-secure session cookie, while the HTTPS VPS uses `__Host-ntmy-session` with `Secure`.

- `pnpm lint`, `pnpm typecheck`, `pnpm build` â€” passed after the correction.
- Browser verification against `http://127.0.0.1:3000` â€” a newly registered account reached `/app/onboarding`; a fresh browser context then logged in with the same account and also reached `/app/onboarding`.
- Browser console â€” no CSP or React `eval()` errors.
- Native local health â€” passed after restart.

## Language selector follow-up

The browser-native `datalist` was replaced with an application-controlled combobox for the 300-language catalogue. It shows a scrollable, two-column option grid, searchable by language name or stable code, with mouse and keyboard selection. The same component is used for onboarding, session creation, profile editing and Join filtering.

- `pnpm lint`, `pnpm typecheck`, `pnpm build` â€” passed after the selector change.
- Native local services â€” restarted against the new production build.

## Join reservation-state follow-up

The Join and detail flows now receive viewer-specific reservation state in their safe DTOs. A created session is recognised as the creator's reservation, remains visible while filtering by a different language, and no longer offers an incorrect Reserve action. Join disables new reservations while the server-enforced one-upcoming-reservation rule applies; full sessions are labelled accordingly. Session detail exposes cancellation, room access and safety reporting only to an active reserved participant. Profile session history entries now link to their details.

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test` â€” passed.
- Local integration BFF segment â€” passed the new created-session, cross-language filter and session-detail reservation-state assertions.
- Complete `pnpm test:integration` webhook segment — requires `POCKETBASE_SUPERUSER_EMAIL` and `POCKETBASE_SUPERUSER_PASSWORD`, which are not configured in this local terminal. This is an environment prerequisite, not a product-test failure; the process reached that prerequisite after the new BFF assertions.
- Native local health — passed after service restart; PocketBase and Next logs contain no runtime error for these routes.

## Reservation consistency follow-up

Reservation state is now protected by a private `active_reservation_locks` collection with a unique user index. The transaction that creates a participant also acquires this lock, so rapid or concurrent requests cannot create multiple upcoming reservations. Cancelling a future session releases the lock transactionally; expired-session processing and account deletion release it as well. Future cancellations now remain `cancelled` until the session begins, rather than being converted into an immediate no-show.

Join renders active reservations in a dedicated section, reloads server state after a mutation and disables all competing reserve actions while a request is in flight. Session details now support reservation when eligible and explain final reservation states; Profile only lists active reserved sessions under Upcoming.

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test` â€” passed.
- Native PocketBase migration `1710000006_ntmy_active_reservation_lock.js` — applied successfully.
- Local integration BFF segment — passed the new concurrent-reservation invariant: exactly one `200`, one `409`; cancelling the winner then allowed the second reservation.
- Complete webhook segment remains gated by absent local PocketBase superuser credentials, after all product assertions above have passed.

## Local reservation recovery follow-up

The Join BFF now omits sessions for which the viewer has a prior closed reservation. Those entries remain available in Profile history, but Join no longer exposes a Reserve action that PocketBase must reject as a duplicate participant.

- Removed 32 locally generated test/anonymised-host sessions only; the two non-test sessions were preserved.
- Seeded four independent local demo sessions: English, French, Spanish and German.
- `pnpm lint` and `pnpm typecheck` — passed.
- Native production restart — passed; the local web entrypoint returned HTTP 200.
- Transactional reservation validation — passed: a new independent member reserved the English demo session, then cancelled it. The active-reservation lock count returned to the four demo hosts, confirming that the cancelled validation reservation and the prior test-user lock were both released.

## Native standalone runtime follow-up

The native local script and VPS `systemd` web service now start Next.js through its generated standalone `server.js`, rather than `next start`. The build copies Next static assets (and `public/` when present) into the standalone application directory before launch.

- Native production restart — passed: web and PocketBase both returned HTTP 200.
- Web error log — no standalone/`next start` warning after the restart.
- `pnpm check` — passed (lint, TypeScript, 5 business-rule tests).
