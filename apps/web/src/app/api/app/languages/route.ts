import { getServerSession } from "@/lib/auth/session";
import { apiError, noStoreJson, unauthorized } from "@/lib/http";
import { callBusinessRoute } from "@/lib/pocketbase/server";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) return unauthorized();
    return noStoreJson(await callBusinessRoute("/api/ntmy/languages", { method: "GET" }, session));
  } catch (error) {
    return apiError(error);
  }
}
