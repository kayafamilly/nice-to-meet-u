import { NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function clientIdentifier(request: NextRequest): string {
  // The production app is reachable only through Caddy, so this header is set
  // by the trusted reverse proxy. Use the right-most hop so a client-supplied
  // leading X-Forwarded-For value cannot create a fresh rate-limit identity.
  // Do not expose the Next port publicly.
  const forwarded = request.headers.get("x-forwarded-for")?.split(",").map((value) => value.trim()).filter(Boolean);
  return forwarded?.at(-1) ?? request.headers.get("x-real-ip") ?? "unknown";
}

export function assertRateLimit(request: NextRequest, scope: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const key = `${scope}:${clientIdentifier(request)}`;
  const previous = buckets.get(key);
  const bucket = !previous || previous.resetAt <= now ? { count: 0, resetAt: now + windowMs } : previous;
  bucket.count += 1;
  buckets.set(key, bucket);

  if (buckets.size > 10_000) {
    for (const [candidate, value] of buckets) if (value.resetAt <= now) buckets.delete(candidate);
  }
  if (bucket.count > limit) throw new RateLimitError();
}

export class RateLimitError extends Error {
  readonly status = 429;
  readonly code = "RATE_LIMITED";
}
