import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, noStoreJson } from "@/lib/http";
import { callGuestBusinessRoute } from "@/lib/pocketbase/server";
import { assertCsrf, assertTrustedOrigin } from "@/lib/security/request";
import { assertRateLimit } from "@/lib/security/rate-limit";

const inputSchema = z.object({ token: z.string().min(20).max(2000) });

export async function POST(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
    assertCsrf(request);
    assertRateLimit(request, "email-verification-confirm", 6, 15 * 60 * 1000);
    const { token } = inputSchema.parse(await request.json());
    await callGuestBusinessRoute<{ verified: true }>("/api/ntmy/auth/confirm-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });
    return noStoreJson({ verified: true });
  } catch (error) {
    return apiError(error);
  }
}
