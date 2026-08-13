import { z } from "zod";
import { apiError, noStoreJson } from "@/lib/http";
import { callInternalBusinessRoute } from "@/lib/pocketbase/server";
import type { CommunityMetrics } from "@/types/api";

const communityMetricsSchema = z.object({
  verifiedCompletedSessionCount: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
}).strict();

export async function GET() {
  try {
    const upstream = await callInternalBusinessRoute<unknown>("/api/ntmy/internal/public-metrics", { method: "GET" });
    const metrics = communityMetricsSchema.parse(upstream);
    const response: CommunityMetrics = {
      verifiedCompletedSessionCount: metrics.verifiedCompletedSessionCount
    };
    return noStoreJson(response);
  } catch (error) {
    return apiError(error);
  }
}
