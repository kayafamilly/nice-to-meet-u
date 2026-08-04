# Validation gates

Each merge and environment promotion is blocked until the relevant gate is green.

| Gate | Command or evidence | Required before |
| --- | --- | --- |
| Dependency security | `pnpm audit` | every merge |
| Static quality | `pnpm lint && pnpm typecheck` | every merge |
| Business rules | `pnpm test` | every merge touching domain or BFF code |
| Production build | `pnpm build` | every merge |
| Browser smoke | `pnpm test:e2e` against `next build` and `next start` | staging promotion |
| Native integration | CI downloads native PocketBase and LiveKit, starts PocketBase, LiveKit and production Next.js, then runs `pnpm test:integration` | staging promotion |
| Realtime room | `pnpm test:realtime` against native PocketBase, LiveKit, production Next.js and the lifecycle worker; four browser contexts publish fake camera/microphone tracks into one 2-by-2 room and remain until hard closure | staging promotion |
| Realtime and notifications | signed webhook retry, exact LiveKit room deletion, one-hour reminder, simulated push and in-app fallback | production promotion |
| Operations | restore an isolated PocketBase backup, verify `systemd` auto-restart and firewall rules | production launch |

Review every milestone by comparing BFF and PocketBase contracts, confirming CSRF/origin checks and PB transactions on mutations, checking private collections/secret boundaries, then attaching command results to the release review.
