# NiceToMeetU

NiceToMeetU is a language-speaking platform for scheduled, 30-minute social practice sessions in small international groups of two to four people. `Native` and `Practice` labels describe the group; they never restrict who may join.

## Architecture

The browser uses a secure Next.js BFF. PocketBase, its SQLite data and its admin UI remain private on loopback. LiveKit is the real-time media endpoint.

```text
Browser -- HTTPS / HttpOnly cookie --> Next.js BFF -- loopback --> PocketBase
Browser -- WSS / WebRTC short token ------------------------------> LiveKit
LiveKit -- signed webhook --> Next.js -- loopback secret ---------> PocketBase
```

## Repository

- `apps/web`: Next.js BFF and UI.
- `services/pocketbase`: PocketBase migrations and business hooks.
- `infra`: local, staging and production operations.
- `tests`: end-to-end and load-test assets.
- `docs`: business, security, testing and deployment decisions.

## Start locally

1. Copy `apps/web/.env.example` to `apps/web/.env.local` and replace every placeholder.
2. Run `pnpm install` once, then `pnpm local:start`.
3. Open `http://127.0.0.1:3000`. This builds and starts Next.js in production mode alongside native PocketBase, LiveKit, the notification worker and the LiveKit lifecycle worker. Stop everything with `pnpm local:stop`.

No Docker runtime or Compose stack is used. The full VPS process, secret requirements and backup policy are in [docs/deployment.md](docs/deployment.md); [docs/testing.md](docs/testing.md) defines the validation gates.
