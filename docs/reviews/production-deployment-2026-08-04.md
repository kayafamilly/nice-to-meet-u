# Production deployment review — 2026-08-04

## Scope

- Host: Hostinger VPS `srv813637` (`168.231.82.122`)
- Domain: `nice-to-meet-u.com`
- Source deployed under `/opt/nicetomeetu`
- Previous `/home/nice-to-meet-u` and `/var/www/nice-to-meet-u.com` deployments removed permanently after validation
- Fresh PocketBase data directory under `/var/lib/nicetomeetu/production/pocketbase`

## Corrective findings resolved during deployment

- Made the VPS deployment scripts executable in Git.
- Changed the rendered LiveKit config to `root:ntmy` mode `0640` so the unprivileged service can read it without exposing its credentials.
- Declared a separate TURN relay range (`60000–60999/UDP`) and made the firewall gate verify every required ICE and TURN rule.
- Rotated all production application, LiveKit, worker, session and VAPID secrets after diagnostic output exposed the previous values internally.
- Marked controlled Node `SIGTERM` shutdowns as successful in systemd.
- Added the production Nginx configuration and an isolated NiceToMeetU certificate-renewal timer.

## Validation evidence

- DNS: apex, `www`, `meet` and `turn` resolve to `168.231.82.122` through the authoritative nameserver, Cloudflare `1.1.1.1` and Google `8.8.8.8`.
- TLS: ECDSA certificate covers the apex, `www` and `meet`; valid through 2026-11-02.
- Renewal: `certbot renew --dry-run --cert-name nice-to-meet-u.com --no-random-sleep-on-renew` succeeded.
- Edge: HTTP redirects to HTTPS, `www` redirects to the apex, HSTS is present, and the LiveKit HTTPS proxy responds successfully.
- Health: `/api/health`, `/api/health/pocketbase` and `/api/health/livekit` return `200`/`ok`.
- Services: PocketBase, isolated Redis, LiveKit, Next.js, notification worker and lifecycle worker are active under systemd.
- LiveKit: external IPv4 and IPv6 were discovered; ICE/TCP uses `7881`, ICE/UDP uses `50000–54999`, TURN/UDP uses `3478`, and TURN relays use `60000–60999`.
- Exposure: public TCP ports `80`, `443` and `7881` are reachable; internal `3000`, `6380`, `7880` and `8090` are not reachable externally.
- Browser smoke test: production homepage rendered with its final content, styles and people images, with no console error; register, robots and sitemap routes return `200`.
- Repository: deployed checkout and `origin/main` were aligned after every operational correction.

## Shared-host observations

- Nginx still reports duplicate `vibe-ai-studio.com` server-name warnings from unrelated pre-existing configurations. NiceToMeetU syntax and routing remain valid.
- The shared generic Certbot timer reports an unrelated failing `trouve-ton-associe.online` renewal. `ntmy-certbot-renew.timer` isolates NiceToMeetU from that failure and was verified active/successful.

## Manual acceptance remaining

The automated production smoke checks deliberately did not create accounts or sessions, preserving the requested clean database. The final acceptance action is the user’s end-to-end test: register new accounts, create a session and join with 2–4 real devices to validate camera, microphone and real-world network quality.
