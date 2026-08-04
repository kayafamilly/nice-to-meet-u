# Native local and VPS deployment

## Local

Docker is not part of this project. `pnpm local:start` verifies/downloads the Windows PocketBase and LiveKit binaries into ignored `.local/bin/`, keeps data in ignored `.local/pocketbase/`, applies pending PocketBase migrations, builds Next.js, then starts PocketBase, LiveKit, the generated standalone Next.js server, the notification worker and the LiveKit lifecycle worker. Production-mode validation therefore never requires weakening the CSP for development-only React diagnostics.

```powershell
pnpm local:setup
pnpm local:start
pnpm local:status
pnpm local:stop
powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/local.ps1 superuser -Email admin@example.test -Password a-long-unique-password
```

Create `apps/web/.env.local` from its example before starting. VAPID keys and every secret remain server-only; the client receives only the VAPID public key through an authenticated BFF route.

## VPS

The VPS runs native `systemd` services for PocketBase, an isolated Redis instance per environment, LiveKit, Next.js, the notification worker and the LiveKit lifecycle worker. Caddy is the system Caddy service and proxies HTTPS to loopback Next.js and LiveKit listeners. Install Redis as the native `redis-server` package; the templated `ntmy-redis@<deployment>` unit binds its configured port to loopback.

1. Install `nodejs`, `pnpm`, `curl`, `unzip`, `redis-server`, `caddy`, `gettext-base` and UFW. Create an unprivileged `ntmy` system user and check out the release under `/opt/nicetomeetu`.
2. Copy an environment example to an untracked file, set URLs, independent secrets and VAPID keys, then run `./scripts/deploy-vps.sh path/to/environment.env`. The script stops the application services, applies pending PocketBase migrations as the unprivileged service user, and restarts the full stack only after migration success.
3. The deployment puts secrets in `/etc/nicetomeetu/<deployment>.env`, stores PocketBase data in `/var/lib/nicetomeetu/<deployment>/pocketbase`, and installs all templated PocketBase, Redis, LiveKit, web, notification and lifecycle units from `infra/vps/systemd/`.
4. Render/install the Caddyfile with the edge-domain environment, then reload Caddy. Caddy is the only public HTTP(S) process.

PocketBase, Redis, Next.js and LiveKit HTTP signaling ports stay private. Allow only SSH, 80/TCP, 443/TCP, required LiveKit TCP ports, TURN UDP and the declared UDP media ranges. `scripts/verify-vps-firewall.sh` refuses deployment if a LiveKit HTTP port is exposed.

## Backup and restore

Take encrypted off-host PocketBase backups daily. To prove recovery, stop `ntmy-pocketbase@<deployment>`, restore a copy into an isolated PocketBase data directory, start it on a loopback validation port with the same migrations/hooks, verify health and a known account/session record, then discard that copy. Record RTO/RPO in the release review. Migrations are forward-only after production use unless a reviewed downgrade is supplied.
