import { getServerSession } from "@/lib/auth/session";
import { apiError, noStoreJson, unauthorized } from "@/lib/http";
import { callBusinessRoute } from "@/lib/pocketbase/server";
import type { SessionSummary } from "@/types/api";

export async function GET(_: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const session = await getServerSession();
  if (!session) return unauthorized();
  try {
    const { sessionId } = await params;
    return noStoreJson(await callBusinessRoute<SessionSummary>(`/api/ntmy/sessions/${sessionId}`, { method: "GET" }, session));
  } catch (error) {
    return apiError(error);
  }
}
