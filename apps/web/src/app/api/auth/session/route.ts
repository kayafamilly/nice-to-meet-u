import { getServerSession } from "@/lib/auth/session";
import { noStoreJson, unauthorized } from "@/lib/http";
import { callBusinessRoute } from "@/lib/pocketbase/server";
import type { CurrentUser } from "@/types/api";

export async function GET() {
  const session = await getServerSession();
  if (!session) return unauthorized();
  try {
    return noStoreJson(await callBusinessRoute<CurrentUser>("/api/ntmy/me", { method: "GET" }, session));
  } catch {
    return unauthorized();
  }
}
