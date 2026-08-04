# UI/UX Stitch platform review — 2026-07-25

## Outcome

Approved for local product testing. This review supersedes the earlier relaxed-matching and single-reservation notes in the historical Join/Create/Profile review.

The six Stitch references are now represented by one coherent responsive design system and a complete authenticated flow:

`Landing → Register/Login → Onboarding → Explore → Reserve/Create → Session detail → Room → Profile/History`

## Product rules verified

- Four-person rooms use exactly two Practice and two Support seats.
- The role is derived from the session language and the member's native languages.
- A member can hold three future, non-overlapping reservations.
- A new Practice reservation is blocked when its projected exchange debt requires a Support contribution; Support stays open.
- Room access is limited to reserved members, requires the exact 2+2 composition and opens from ten minutes before until five minutes after the start.
- Session topics are required (3–120 characters); descriptions are optional (500 characters maximum).
- Calendar export, safe participant previews, participant-scoped reporting, notifications, cancellation and history all use the same-origin BFF.
- PocketBase records and secrets remain server-only. LiveKit webhooks remain authoritative for attendance and session completion.

## UI/UX review

- Desktop browser flow passed through registration, four-step onboarding, Explore, four-step creation, publication, session detail and Profile.
- The generated session appeared immediately in the member's upcoming history with its preserved Practice role.
- Exchange balance and remaining reservation slots were consistent between Explore and Profile.
- An optional-language removal gap found during browser QA was corrected with an accessible `Clear …` action and revalidated on the compiled production build.
- Empty, loading, full, blocked, reserved, cancellation, join-window and reporting states have explicit user-facing copy.
- Responsive navigation, card grids, sticky actions and room layout are covered by the shared mobile breakpoints.

## Checks run

- `pnpm lint` — passed.
- `pnpm typecheck` — passed.
- `pnpm test` — passed, 11 business-rule and scheduling tests.
- `pnpm build` — passed with the production Next.js output.
- `pnpm test:e2e` — passed with desktop and mobile-width smoke coverage against the compiled local application.
- Integration product segment — passed, including BFF safety, exact role capacity, three reservations, schedule overlap rejection and projected-debt rejection.
- Full integration webhook segment — passed locally with an ephemeral PocketBase superuser, including signed/unsigned webhook handling, lease recovery and notification dispatch.
- Native services and `/api/health` — passed after the final production restart.

## Promotion gate

Rerun the complete integration suite in CI before merge or VPS promotion, then execute the existing firewall, Caddy, systemd and backup/restore checks against the target environment.
