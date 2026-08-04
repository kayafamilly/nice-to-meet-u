import { getServerSession } from "@/lib/auth/session";
import { noStoreJson, unauthorized } from "@/lib/http";
import { getServerEnv } from "@/lib/env";

// The browser needs the VAPID public key to subscribe, but it is deliberately
// not a NEXT_PUBLIC_ environment value. This authenticated BFF is the sole
// way the client receives it.
export async function GET() {
  if (!await getServerSession()) return unauthorized();
  return noStoreJson({ publicKey: getServerEnv().VAPID_PUBLIC_KEY });
}
