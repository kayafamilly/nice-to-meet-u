import { NextRequest } from "next/server";
import { apiError, noStoreJson } from "@/lib/http";
import { destroyManagementSession, managementFingerprint } from "@/lib/management/auth";
import { managementInternal } from "@/lib/management/data";
import { assertCsrf, assertTrustedOrigin } from "@/lib/security/request";

export async function POST(request: NextRequest) {
  try {
    assertTrustedOrigin(request); assertCsrf(request);
    await destroyManagementSession();
    await managementInternal("/api/ntmy/internal/management/auth-event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fingerprint: await managementFingerprint(), outcome: "logout" }) });
    return noStoreJson({ loggedOut: true });
  } catch (error) { return apiError(error); }
}
