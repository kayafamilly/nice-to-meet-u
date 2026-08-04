import { NextRequest } from "next/server";
import { getServerEnv } from "@/lib/env";
import { CSRF_COOKIE } from "@/lib/security/constants";

function expectedOrigin(): string {
  return new URL(getServerEnv().NEXT_PUBLIC_APP_URL).origin;
}

export function assertTrustedOrigin(request: NextRequest): void {
  const origin = request.headers.get("origin");
  if (origin && origin !== expectedOrigin()) {
    throw new RequestSecurityError("UNTRUSTED_ORIGIN", 403);
  }
}

export function assertCsrf(request: NextRequest): void {
  const submitted = request.headers.get("x-csrf-token");
  const stored = request.cookies.get(CSRF_COOKIE)?.value;
  if (!submitted || !stored || submitted !== stored) {
    throw new RequestSecurityError("CSRF_REJECTED", 403);
  }
}

export class RequestSecurityError extends Error {
  constructor(
    public readonly code: "UNTRUSTED_ORIGIN" | "CSRF_REJECTED",
    public readonly status: 403
  ) {
    super(code);
  }
}

export { CSRF_COOKIE };
