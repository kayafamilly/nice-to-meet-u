import { getServerSession } from "@/lib/auth/session";
import { apiError, noStoreJson, unauthorized } from "@/lib/http";
import { callBusinessRoute } from "@/lib/pocketbase/server";
import type { SessionHistory } from "@/types/api";

export async function GET() {
  const session = await getServerSession();
  if (!session) return unauthorized();
  try {
    return noStoreJson(await callBusinessRoute<SessionHistory>("/api/ntmy/profile/sessions", { method: "GET" }, session));
  } catch (error) {
    return apiError(error);
  }
}
