# LiveKit session hardening review — 2026-07-29

## Outcome

Approved for local product testing. The dedicated two-to-four-person room, required media lobby, strict thirty-minute access window and authoritative LiveKit shutdown are implemented. No actionable code or local-runtime finding remains.

The required real thirty-minute four-participant soak remains a staging promotion gate because it cannot be represented by the compressed local scenario.

## Reviewed boundaries

- The browser obtains a short-lived token only through the same-origin Next.js BFF; PocketBase and LiveKit secrets stay server-only.
- PocketBase authorizes only reserved participants between `startsAt` and `endsAt`.
- Tokens permit camera and microphone publication and subscription, with data publication disabled.
- LiveKit webhooks remain authoritative for attendance. Client disconnects never mutate attendance or session state.
- The lifecycle worker is independent from notifications and deletes expired rooms through a protected internal endpoint.
- Five backend-only minutes remain available for delayed webhook settlement; they do not grant media access.

## Findings resolved

- Replaced the generic conference surface with an immersive custom lobby and responsive 1/2/3/4-person grid.
- Removed chat, screen sharing and sidebar controls; retained only camera, microphone, device choice, report and confirmed leave.
- Added required camera/microphone preview, input level, actionable permission/device errors and an entry gate.
- Corrected PocketBase date parsing in the token route and returned `serverNow`, `startsAt` and `endsAt`.
- Corrected the Content Security Policy so both LiveKit WebSocket signalling and HTTP validation are allowed.
- Upgraded the local LiveKit server from 1.8.4 to 1.13.1 and filtered Windows link-local ICE addresses while retaining reachable LAN, IPv6 and loopback candidates.
- Added 1080p/30 capture with 180p/540p simulcast fallback layers, adaptive streaming, dynacast, echo cancellation, noise reduction and automatic gain.
- Added exact client shutdown at zero, an end/feedback screen and an adaptive room-deletion worker that schedules its next run against the nearest LiveKit deadline.
- Removed the application navigation from the live route and made safety reporting non-destructive in a new tab.
- Corrected the denied-media lobby label so a blocked user is never presented as ready.
- Tightened backend settlement scheduling to evaluate completed sessions every minute after the five-minute webhook window.

## Evidence

- `pnpm audit --audit-level=high` — passed, no known vulnerabilities.
- `pnpm check` — passed: ESLint, TypeScript and 20 Vitest tests.
- Production Next.js build and native local startup — passed.
- `tests/integration/pocketbase.mjs` — passed: strict join windows, capacity/reservation invariants, signed webhooks and protected/idempotent room cleanup.
- `pnpm test:e2e` — passed through the real standalone Next.js server: two desktop/mobile public-flow tests.
- `pnpm test:realtime` — passed with seven isolated browser contexts: denied permissions, post-lobby device failure, 2/3/4-person grids, desktop and 390 px mobile, Native/Practice badges, real camera/audio publication, fifth-connection rejection, signal reconnection, refresh/rejoin and final shutdown.
- Measured local reference results: token p95 446 ms, connection p95 666 ms, remote media p95 3,433 ms and server room deletion 677 ms after `00:00`.
- LiveKit administrative state confirmed `maxParticipants=4`, four active participants, `CanPublishData=false`, camera/microphone-only publication, 1280×720 VP8 with three simulcast layers and adaptive streaming.
- Next.js, PocketBase, LiveKit, notification worker and lifecycle worker produced no unhandled application error during the final scenario.

## Staging promotion gate

Run one uninterrupted real thirty-minute session with four physical participants on the staging network. Confirm there is no unexpected disconnect, sustained CPU/bandwidth remains acceptable, the measured p95 targets hold and `DeleteRoom` occurs no later than five seconds after the scheduled end.

## Minimal room visual alignment — 2026-08-04

The live room was realigned to the Stitch reference `Video Room - Minimal View - NiceToMeetU` (`979a0c00347244ce9cb8518f60a00265`): a centered cream room shell, compact one-line header, navy framed edge-to-edge remote video columns, local picture-in-picture in the upper-right corner and a separated light control row. Product constraints still take precedence over decorative controls in the reference: chat and screen sharing remain absent, while camera, microphone, safety reporting and confirmed leave remain available.

Participant labels now match the compact reference treatment and expose Native/Practice plus a reactive microphone state. The desktop room gives every remote participant equal visual weight; the 390 px layout switches the three-remote case to a readable two-row composition while keeping the local preview small.

Validation performed after the alignment:

- `pnpm audit --audit-level=high` — passed, no known vulnerabilities after moving the compatibility-patched `brace-expansion` override to 5.0.9.
- ESLint, TypeScript and all 20 Vitest tests — passed.
- Production Next.js build and native local restart — passed; PocketBase, LiveKit, Next.js, notification worker and lifecycle worker are running and `/api/health` returns `ok`.
- `pnpm test:e2e` — passed: two Chromium desktop/mobile public-flow tests.
- The realtime browser selectors were updated for the new accessible room heading and safety label. A new local realtime run was not possible from the checked-in environment because it intentionally contains no PocketBase superuser credentials; the previously recorded four-participant media evidence remains the current media-path evidence because token, capacity, publication and shutdown logic were not changed by this visual alignment.
