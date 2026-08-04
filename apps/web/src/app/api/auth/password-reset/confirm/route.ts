import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, noStoreJson } from "@/lib/http";
import { pocketBaseForSession } from "@/lib/pocketbase/server";
import { assertCsrf, assertTrustedOrigin } from "@/lib/security/request";
import { assertRateLimit } from "@/lib/security/rate-limit";

const inputSchema = z.object({
  token: z.string().min(20).max(2000),
  password: z.string().min(12).max(128),
  passwordConfirm: z.string().min(12).max(128)
}).refine((input) => input.password === input.passwordConfirm, { message: "Passwords must match" });

export async function POST(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
    assertCsrf(request);
    assertRateLimit(request, "password-reset-confirm", 6, 15 * 60 * 1000);
    const input = inputSchema.parse(await request.json());
    await pocketBaseForSession().collection("users").confirmPasswordReset(input.token, input.password, input.passwordConfirm);
    return noStoreJson({ reset: true });
  } catch (error) {
    return apiError(error);
  }
}
