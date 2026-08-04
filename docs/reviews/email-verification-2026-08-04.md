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
- VPS deployment now fails before migrations when neither Brevo nor a complete SMTP fallback is configured.

## Validation evidence

- `pnpm lint` — passed.
- `pnpm typecheck` — passed.
- `pnpm test` — passed: 4 files and 20 tests.
- `pnpm build` — passed in the local production-mode runtime.
- PocketBase integration suite — passed, including no session after registration, unverified login refusal, administrative test verification and verified BFF login.
- Custom confirmation route — passed with a locally generated PocketBase verification token; subsequent custom login returned `200`.
- Browser smoke test — passed: registration redirects to `/verify-email`, the address is prefilled, an unverified login returns to that page, and no browser console errors were observed.

## Production activation gate

Production activation requires a verified Brevo sender/domain and the corresponding SPF/DKIM records. The standard Brevo API key and the Codex MCP token are intentionally separate credentials.
