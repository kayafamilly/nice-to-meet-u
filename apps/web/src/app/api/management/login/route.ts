import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, noStoreJson } from "@/lib/http";
import { createManagementSession, managementFingerprint, verifyManagementPassword } from "@/lib/management/auth";
import { managementInternal } from "@/lib/management/data";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { assertCsrf, assertTrustedOrigin } from "@/lib/security/request";

export async function POST(request: NextRequest) {
  try {
    assertTrustedOrigin(request); assertCsrf(request); assertRateLimit(request, "management-login", 10, 15 * 60_000);
    const { password } = z.object({ password: z.string().min(1).max(200) }).parse(await request.json());
    const fingerprint = await managementFingerprint();
    const status = await managementInternal<{ locked: boolean; attemptsRemaining: number }>(`/api/ntmy/internal/management/auth-status?fingerprint=${fingerprint}`);
    if (status.locked) return noStoreJson({ error: "LOCKED" }, 429);
    const valid = verifyManagementPassword(password);
    await managementInternal("/api/ntmy/internal/management/auth-event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fingerprint, outcome: valid ? "success" : "failure" }) });
    if (!valid) return noStoreJson({ error: "INVALID_PASSWORD", attemptsRemaining: Math.max(0, status.attemptsRemaining - 1) }, 401);
    await createManagementSession(); return noStoreJson({ authenticated: true });
  } catch (error) { return apiError(error); }
}
