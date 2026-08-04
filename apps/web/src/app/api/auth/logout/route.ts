import { NextRequest } from "next/server";
import { destroySession, getServerSession } from "@/lib/auth/session";
import { apiError, noStoreJson, unauthorized } from "@/lib/http";
import { assertCsrf, assertTrustedOrigin } from "@/lib/security/request";

export async function POST(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
    assertCsrf(request);
    if (!await getServerSession()) return unauthorized();
    await destroySession();
    return noStoreJson({ loggedOut: true });
  } catch (error) {
    return apiError(error);
  }
}
