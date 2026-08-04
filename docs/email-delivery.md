# Transactional email

NiceToMeetU requires email confirmation before a new account can authenticate. PocketBase remains private: the browser calls the Next.js BFF, and the BFF calls the custom PocketBase authentication routes. Production email is delivered by PocketBase through Brevo's transactional API. The Brevo MCP server is an administration tool for Codex and is never part of the end-user request path.

## Required server-only environment

- `BREVO_API_KEY` (a standard Brevo API key, not an MCP token)
- `MAIL_SENDER_ADDRESS`
- `MAIL_SENDER_NAME`

None of these values may use a `NEXT_PUBLIC_` prefix. PocketBase intercepts its own mailer on the server and calls `POST /v3/smtp/email`; this covers verification and password-reset messages without exposing Brevo to the browser. SMTP remains an optional fallback when `BREVO_API_KEY` is absent. Production deployment fails before migrations when neither Brevo nor a complete SMTP configuration is available.

`MAIL_SENDER_ADDRESS` must be an active Brevo sender or belong to an authenticated Brevo domain. A `201` response only confirms that Brevo accepted the request; delivery must be checked through Brevo transactional events when activating a new sender.

## Domain delivery checklist

Before production activation, verify Brevo's SPF and DKIM records and publish a DMARC policy for `nice-to-meet-u.com`. Send a PocketBase verification test message, follow the received link, and confirm that the account can authenticate only after the link is used.

## Brevo MCP administration

The global Codex configuration points to Brevo's official Streamable HTTP server at `https://mcp.brevo.com/v1/brevo/mcp` and reads its bearer token from the local `BREVO_MCP_TOKEN` environment variable. This token is generated with Brevo's **Create MCP server API key** option and is distinct from `BREVO_API_KEY`. PocketBase uses the standard API key for runtime delivery.

## Account flow

1. Registration creates the account and profile transactionally with `verified = false`.
2. PocketBase sends a short-lived verification token to the submitted address.
3. The link opens `/verify-email#token=…`; the fragment keeps the token out of HTTP access logs.
4. The BFF submits the token to a custom PocketBase route, which validates it and marks the account verified in an audited transaction.
5. Authentication rules and the custom login route both reject unverified accounts.
