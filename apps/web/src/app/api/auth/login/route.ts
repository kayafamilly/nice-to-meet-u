import { NextRequest } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth/session";
import { apiError, noStoreJson } from "@/lib/http";
import { pocketBaseForSession } from "@/lib/pocketbase/server";
import { assertCsrf, assertTrustedOrigin } from "@/lib/security/request";
import { assertRateLimit } from "@/lib/security/rate-limit";

const inputSchema = z.object({ email: z.string().email(), password: z.string().min(1).max(128) });

export async function POST(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
    assertCsrf(request);
    assertRateLimit(request, "auth-login", 8, 10 * 60 * 1000);
    const { email, password } = inputSchema.parse(await request.json());
    const pb = pocketBaseForSession();
    const auth = await pb.collection("users").authWithPassword(email, password);
    await createSession({ userId: auth.record.id, pocketBaseToken: auth.token });
    return noStoreJson({ authenticated: true });
  } catch (error) {
    return apiError(error);
  }
}
