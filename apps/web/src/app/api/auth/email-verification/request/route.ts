import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, noStoreJson } from "@/lib/http";
import { callGuestBusinessRoute } from "@/lib/pocketbase/server";
import { assertCsrf, assertTrustedOrigin } from "@/lib/security/request";
import { assertRateLimit } from "@/lib/security/rate-limit";

const inputSchema = z.object({ email: z.string().email().max(254) });

export async function POST(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
    assertCsrf(request);
    assertRateLimit(request, "email-verification-request", 4, 15 * 60 * 1000);
    const parsed = inputSchema.safeParse(await request.json());
    if (parsed.success) {
      try {
        await callGuestBusinessRoute<{ accepted: true }>("/api/ntmy/auth/request-verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: parsed.data.email.toLowerCase() })
        });
      } catch {
        console.error("PocketBase could not process an email verification request");
      }
    }
    return noStoreJson({ accepted: true });
  } catch (error) {
    return apiError(error);
  }
}
