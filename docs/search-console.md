# Google Search Console and search discovery

## Site behavior

- `/`, `/how-it-works`, `/guides`, the six approved language-speaking guides, `/pen-pals`, and its three generic pen-pal resources are the canonical URLs published in `/sitemap.xml`.
- `/robots.txt` points to the sitemap and prevents crawling of `/api/` and the authenticated `/app/` area.
- Authentication and authenticated pages send `noindex` both in HTML metadata and `X-Robots-Tag` headers.
- The public pages expose canonical URLs, descriptive titles, Open Graph/Twitter metadata, a scalable favicon and Website/Organization JSON-LD.
- Sitemap and canonical URLs are derived from `NEXT_PUBLIC_APP_URL`; production is configured with the single public origin `https://nice-to-meet-u.com`.

## Search Console ownership

For a URL-prefix property, choose the HTML tag method and copy only the `content` value into the server-only deployment variable:

```dotenv
GOOGLE_SITE_VERIFICATION=your-google-verification-token
```

Rebuild and deploy, then confirm that the homepage source contains `google-site-verification` before clicking **Verify**. Keep the value deployed because Google checks it periodically.

For a Domain property, verification must instead be completed with the DNS TXT record supplied by Search Console; no website code can replace that DNS step.

## Submission

After deploying on the final domain:

1. Open `https://nice-to-meet-u.com/robots.txt` and `https://nice-to-meet-u.com/sitemap.xml`.
2. Confirm every sitemap URL starts with `https://nice-to-meet-u.com`.
3. Add the Domain property `nice-to-meet-u.com` in Search Console and complete its DNS TXT verification.
4. Submit `https://nice-to-meet-u.com/sitemap.xml` in the **Sitemaps** report.
5. Inspect the homepage, `/how-it-works`, `/guides`, `/pen-pals`, and each resource URL with **URL Inspection**, then request indexing.

The canonical origin is the apex domain. `www.nice-to-meet-u.com` is configured to permanently redirect to `https://nice-to-meet-u.com` while preserving the path and query string. The DNS and TLS deployment also expects `meet.nice-to-meet-u.com` and `turn.nice-to-meet-u.com` for LiveKit. The staging subdomains are `staging.nice-to-meet-u.com`, `meet-staging.nice-to-meet-u.com` and `turn-staging.nice-to-meet-u.com`.

The guide URLs are:

- `/guides/spanish-speaking-practice`
- `/guides/english-speaking-practice`
- `/guides/french-speaking-practice`
- `/guides/german-speaking-practice`
- `/guides/japanese-speaking-practice`
- `/guides/korean-speaking-practice`

The generic pen-pal resource URLs are:

- `/pen-pals`
- `/pen-pals/find-language-pen-pals`
- `/pen-pals/pen-pal-conversation-starters`
- `/pen-pals/safe-online-language-exchange`

## Pen-pal search monitoring

Monitor the generic query groups `pen pal language exchange`, `online pen pals adults`, `language pen pal`, `pen pal questions`, and `safe online language exchange`, alongside indexed URLs, impressions, clicks, and average position. Search Console does not measure registrations; do not infer them from search data alone.

Do not create named competitor-comparison pages until Search Console shows sustained relevant demand and a separate review confirms that every claim can be independently sourced, kept current, and presented fairly. The generic resources must not use third-party platform brands to imply an affiliation.

Do not add authenticated profiles or session URLs to the sitemap: they are private, short-lived or personalized and are not valid search landing pages. The public activity counter is deliberately aggregate-only and never exposes member, reservation, attendance, or future-session data.
