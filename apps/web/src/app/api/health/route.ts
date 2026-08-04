import { noStoreJson } from "@/lib/http";

export async function GET() {
  return noStoreJson({ status: "ok", services: { web: "ok" } });
}
