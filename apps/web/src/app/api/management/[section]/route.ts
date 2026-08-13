import { NextRequest } from "next/server";
import { apiError, noStoreJson, unauthorized } from "@/lib/http";
import { hasManagementSession } from "@/lib/management/auth";
import { managementData, managementSystemStatus } from "@/lib/management/data";

const allowed = new Set(["overview", "analytics", "users", "user", "sessions", "session", "moderation", "system"]);
export async function GET(request: NextRequest, context: { params: Promise<{ section: string }> }) {
  try {
    if (!await hasManagementSession()) return unauthorized();
    const { section } = await context.params;
    if (!allowed.has(section)) return noStoreJson({ error: "NOT_FOUND" }, 404);
    const query = Object.fromEntries(request.nextUrl.searchParams);
    if (section === "system") return noStoreJson(await managementSystemStatus());
    return noStoreJson(await managementData<Record<string, unknown>>(section, query));
  } catch (error) { return apiError(error); }
}
