import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, noStoreJson } from "@/lib/http";
import { pocketBaseForSession } from "@/lib/pocketbase/server";
import { assertCsrf, assertTrustedOrigin } from "@/lib/security/request";
import { assertRateLimit } from "@/lib/security/rate-limit";

const inputSchema = z.object({ email: z.string().email().max(254) });

export async function POST(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
    assertCsrf(request);
    assertRateLimit(request, "password-reset-request", 4, 15 * 60 * 1000);
    const parsed = inputSchema.safeParse(await request.json());
    if (parsed.success) {
      try {
        await pocketBaseForSession().collection("users").requestPasswordReset(parsed.data.email.toLowerCase());
      } catch {}
    }
    return noStoreJson({ accepted: true });
  } catch (error) {
    return apiError(error);
  }
}
