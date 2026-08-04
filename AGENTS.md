# NiceToMeetU engineering rules

- Keep PocketBase private: browser code must never call PocketBase directly.
- Keep all secrets server-only; `NEXT_PUBLIC_` variables may contain URLs only.
- Sensitive state changes go through a custom PocketBase route in one transaction.
- Never use raw PocketBase records as browser DTOs.
- Do not change session/cycle state from a client event; LiveKit webhooks are authoritative.
- Before merging a milestone, run its documented checks and record the review outcome.
