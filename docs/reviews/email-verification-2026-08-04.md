# Email verification review — 2026-08-04

## Scope

- Require confirmation of a new account's email address before login.
- Preserve the private PocketBase boundary and the existing authentication UI.
- Provide a non-enumerating resend flow and an invalid/expired-link recovery path.
- Configure PocketBase with the Brevo transactional API exclusively from server-side environment values.

## Findings resolved

- Registration previously authenticated the account immediately and created a browser session before ownership of the address was proven.
- The login endpoint could not distinguish a valid but unverified account safely.
- No confirmation page, resend action or dedicated verification BFF routes existed.
- VPS deployment did not require a transactional-mail configuration.

## Implemented controls

- New users remain unverified and receive no browser session after registration.
- The PocketBase collection auth rule requires `verified = true`, with a custom password-first login route to avoid account enumeration.
- Verification mail generation and token confirmation use custom PocketBase routes; confirmation is transactional and writes an audit event.
- The verification token is carried in the URL fragment and removed from browser history before submission.
- Registration, resend and confirmation are CSRF-protected, origin-checked and rate-limited by the BFF.
- The Brevo API key remains server-only; PocketBase's mailer is intercepted centrally so verification and password-reset messages share the same transport.
- Authentication messages now distinguish account creation, login blocked pending confirmation, invalid or expired links, and successful activation. Resend responses remain account-enumeration safe.
- The Brevo transport is implemented entirely inside PocketBase's deferred mailer callback; this avoids losing module-scoped function references when PocketBase executes the hook.
- VPS deployment now fails before migrations when neither Brevo nor a complete SMTP fallback is configured.

## Validation evidence

- `pnpm lint` — passed.
- `pnpm typecheck` — passed.
- `pnpm test` — passed: 4 files and 20 tests.
- `pnpm build` — passed in the local production-mode runtime.
- PocketBase integration suite — passed, including no session after registration, unverified login refusal, administrative test verification and verified BFF login.
- Custom confirmation route — passed with a locally generated PocketBase verification token; subsequent custom login returned `200`.
- Browser smoke test — passed: registration redirects to `/verify-email`, the address is prefilled, an unverified login returns to that page, and no browser console errors were observed.
- Brevo MCP transport — passed through the authorised production VPS; initialization returned `MainBrevoMCPServer 2.14.7`.
- Brevo transactional transport — the initial `noreply@nice-to-meet-u.com` request returned `201` but was later rejected because the domain sender was not authenticated; the false positive was detected in Brevo's event report.
- Real delivery — passed with the already verified Brevo account sender: the provider recorded `requests`, `delivered`, then `opened`. This sender is active in the production PocketBase environment until the branded domain finishes authentication.
- Branded sender preparation — `nice-to-meet-u.com` is created in Brevo and its DKIM, ownership and DMARC records are ready to be published in Hostinger DNS.
- Production deployment — passed on commit `8d37b0c`; the email-verification migration is recorded, the users auth rule is `verified = true`, public verification and registration pages return `200`, and PocketBase/LiveKit health checks return `200`.

## Production activation gate

Production delivery is active through Brevo. The credential remains server-only in `/etc/nicetomeetu/production.env`; the MCP wrapper and token are root-readable only on the VPS. Brevo's local-IP restriction remains enabled, so Codex administration is tunneled through the authorised VPS instead of weakening the account allow-list.
