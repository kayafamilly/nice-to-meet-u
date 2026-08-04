import { NextResponse, type NextRequest } from "next/server";
import { CSRF_COOKIE } from "@/lib/security/constants";

function csrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function proxy(request: NextRequest): NextResponse {
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const liveKitUrl = process.env.NEXT_PUBLIC_LIVEKIT_WS_URL ?? "ws://127.0.0.1:7880";
  const liveKitOrigin = new URL(liveKitUrl);
  const liveKitHttpOrigin = new URL(liveKitOrigin.origin);
  liveKitHttpOrigin.protocol = liveKitOrigin.protocol === "wss:" ? "https:" : "http:";
  const connectSource = `${new URL(appUrl).origin} ${liveKitOrigin.origin} ${liveKitHttpOrigin.origin}`;
  const contentSecurityPolicy = `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' ${connectSource}; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'`;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()");

  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/api/") || pathname === "/app" || pathname.startsWith("/app/") || ["/login", "/register", "/verify-email", "/forgot-password", "/reset-password"].includes(pathname)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }

  if (!request.cookies.has(CSRF_COOKIE)) {
    response.cookies.set(CSRF_COOKIE, csrfToken(), {
      httpOnly: false,
      sameSite: "lax",
      secure: new URL(appUrl).protocol === "https:",
      path: "/"
    });
  }

  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)"] };
