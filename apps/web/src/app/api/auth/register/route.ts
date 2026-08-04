import { NextRequest } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth/session";
import { apiError, noStoreJson } from "@/lib/http";
import { assertCsrf, assertTrustedOrigin } from "@/lib/security/request";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { pocketBaseForSession } from "@/lib/pocketbase/server";

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
    const pb = pocketBaseForSession();
    await pb.send("/api/ntmy/auth/register", {
      method: "POST",
      body: {
        displayName: input.displayName,
        email: input.email,
        password: input.password,
        passwordConfirm: input.password,
        isAdultConfirmed: input.isAdultConfirmed
      }
    });
    const auth = await pb.collection("users").authWithPassword(input.email, input.password);
    await createSession({ userId: auth.record.id, pocketBaseToken: auth.token });
    return noStoreJson({ created: true, authenticated: true }, 201);
  } catch (error) {
    return apiError(error);
  }
}
