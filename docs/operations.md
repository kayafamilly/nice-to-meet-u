# Operations and moderation runbook

## Authority boundary

The PocketBase dashboard and `/api/ntmy/admin/*` routes are loopback-only. They require a PocketBase superuser token and are never called by browser code or proxied through Next.js.

## Technical exception

Use a technical exception only after reviewing LiveKit attendance evidence and confirming a platform-side issue. The action changes a `no_show` reservation to `cancelled`, records `technical_exception`, recalculates the 30-day threshold and writes an audit log. Do not use it to waive a late cancellation for convenience.

## Suspension override

The clear-suspension endpoint is an exceptional administrative action. The operator must add a case reference in the corresponding `audit_logs` metadata from the dashboard and record the rationale in the incident system.

## Rate limits

The BFF has conservative in-memory limits for authentication, session changes and reports. They are sufficient for one app process. Before horizontal scaling, move these counters to Redis with an atomic sliding-window implementation; do not simply add more web replicas.
