import { getServerEnv } from "@/lib/env";
import { noStoreJson } from "@/lib/http";

export async function GET() {
  try {
    const response = await fetch(`${getServerEnv().POCKETBASE_INTERNAL_URL}/api/health`, { cache: "no-store" });
    return noStoreJson({ status: response.ok ? "ok" : "degraded", services: { pocketbase: response.ok ? "ok" : "degraded" } }, response.ok ? 200 : 503);
  } catch {
    return noStoreJson({ status: "degraded", services: { pocketbase: "unreachable" } }, 503);
  }
}
