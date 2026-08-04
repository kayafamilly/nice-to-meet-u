# Architecture decision record

## Decision

NiceToMeetU is a Next.js application with a same-origin BFF. The browser never receives a PocketBase token and has no network path to PocketBase. The encrypted session cookie contains the PocketBase token only for server-side use.

```text
Browser -> HTTPS -> Next.js BFF -> 127.0.0.1 PocketBase
Browser -> WSS/WebRTC (short-lived token) -> LiveKit
LiveKit -> signed webhook -> Next.js -> loopback-secret -> PocketBase
```

## Non-negotiable rules

- All PocketBase collections have `null` API rules. Only `api/ntmy/*` business routes are used by the BFF.
- The client receives only DTOs, never user emails, PocketBase tokens or internal audit records.
- A LiveKit token is created only after a valid reservation, a viable group of two to four people and the time-window checks pass.
- The ten minutes before a session are a local camera/microphone lobby. LiveKit access starts at the scheduled time and ends exactly at the scheduled end; chat, data publishing and screen sharing are forbidden by the token.
- A room with fewer than two reserved participants at its start is cancelled automatically without no-show penalties. A dedicated lifecycle worker deletes LiveKit rooms at their scheduled deadline.
- Attendance is credited only after 20 accumulated minutes of ordered LiveKit join/leave intervals (or the scheduled end for an open interval at closure).
- Reservations and capacity checks run in a PocketBase transaction and are backed by a unique `(session, user)` index.
- Native and Practice participant types are informative. Any active member may join any language session while capacity, schedule and reservation-limit checks pass.
- A member can hold at most three future reservations. Overlapping sessions are rejected, while adjacent sessions remain valid.
- A host may cancel or delete their account only while nobody else is actively reserved in one of their upcoming sessions.
- A cancellation before the scheduled start releases the seat. Missing the session is recorded from authoritative LiveKit attendance; three no-shows in 30 days suspend new reservations for seven days.
- LiveKit webhooks are signature-verified by Next.js, then recorded with `received`, `processing`, `processed` or `failed` state. A failed first handling is never acknowledged as a duplicate success.
- The five-minute post-session period is backend-only: it lets delayed LiveKit webhooks settle before attendance is finalized and never permits media access or rejoining.

## Explicit Phase 1 limits

- English UI only.
- No recordings, payment flow, direct messages or public user profiles.
- Moderator overrides remain an authenticated back-office operation; ordinary users cannot change attendance, suspension or report state.
