import { NextRequest } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth/session";
import { apiError, noStoreJson } from "@/lib/http";
import { callGuestBusinessRoute } from "@/lib/pocketbase/server";
import { assertCsrf, assertTrustedOrigin } from "@/lib/security/request";
import { assertRateLimit } from "@/lib/security/rate-limit";

const inputSchema = z.object({ email: z.string().email(), password: z.string().min(1).max(128) });

export async function POST(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
    assertCsrf(request);
    assertRateLimit(request, "auth-login", 8, 10 * 60 * 1000);
    const { email, password } = inputSchema.parse(await request.json());
    const auth = await callGuestBusinessRoute<{ token: string; record: { id: string } }>("/api/ntmy/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.toLowerCase(), password })
    });
    await createSession({ userId: auth.record.id, pocketBaseToken: auth.token });
    return noStoreJson({ authenticated: true });
  } catch (error) {
    return apiError(error);
  }
}
