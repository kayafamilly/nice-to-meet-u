import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, noStoreJson } from "@/lib/http";
import { assertCsrf, assertTrustedOrigin } from "@/lib/security/request";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { callGuestBusinessRoute } from "@/lib/pocketbase/server";
import { ANALYTICS_VISITOR_COOKIE, analyticsVisitorHash } from "@/lib/analytics-identity";
import { getServerEnv } from "@/lib/env";

const inputSchema = z.object({
  displayName: z.string().trim().min(2).max(40),
  email: z.string().email().max(254),
  password: z.string().min(12).max(128),
  isAdultConfirmed: z.literal(true)
});

export async function POST(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
    assertCsrf(request);
    assertRateLimit(request, "auth-register", 4, 60 * 60 * 1000);
    const input = inputSchema.parse(await request.json());
    const email = input.email.toLowerCase();
    const visitor = request.cookies.get(ANALYTICS_VISITOR_COOKIE)?.value;
    const analyticsSecret = getServerEnv().ANALYTICS_HASH_SECRET;
    const visitorHash = visitor && analyticsSecret ? analyticsVisitorHash(visitor, analyticsSecret) : "";
    await callGuestBusinessRoute<{ created: true }>("/api/ntmy/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: input.displayName,
        email,
        password: input.password,
        passwordConfirm: input.password,
        isAdultConfirmed: input.isAdultConfirmed,
        visitorHash
      })
    });
    let emailSent = true;
    try {
      await callGuestBusinessRoute<{ accepted: true }>("/api/ntmy/auth/request-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
    } catch {
      emailSent = false;
      console.error("PocketBase could not send the registration verification email");
    }
    return noStoreJson({ created: true, verificationRequired: true, emailSent }, 201);
  } catch (error) {
    return apiError(error);
  }
}
