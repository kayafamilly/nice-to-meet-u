import { NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/auth/session";
import { apiError, noStoreJson, unauthorized } from "@/lib/http";
import { callBusinessRoute } from "@/lib/pocketbase/server";
import { assertCsrf, assertTrustedOrigin } from "@/lib/security/request";
import { assertRateLimit } from "@/lib/security/rate-limit";

const inputSchema = z.object({
  reportedParticipantId: z.string().max(30).optional(),
  sessionId: z.string().min(1).max(30),
  reason: z.enum(["harassment", "hate", "sexual_content", "spam", "other"]),
  details: z.string().trim().max(1000).optional()
});

export async function POST(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
    assertCsrf(request);
    assertRateLimit(request, "moderation-report", 10, 60 * 60 * 1000);
    const session = await getServerSession();
    if (!session) return unauthorized();
    const input = inputSchema.parse(await request.json());
    const report = await callBusinessRoute("/api/ntmy/moderation/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    }, session);
    return noStoreJson(report, 201);
  } catch (error) {
    return apiError(error);
  }
}
