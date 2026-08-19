import { createHmac } from "node:crypto";

export const ANALYTICS_VISITOR_COOKIE = "ntmy-visitor";

export function analyticsVisitorHash(visitor: string, secret: string): string {
  return createHmac("sha256", secret).update(visitor).digest("hex");
}
