import { NextResponse } from "next/server";
import { z } from "zod";
import { PocketBaseBusinessError } from "@/lib/pocketbase/server";
import { RequestSecurityError } from "@/lib/security/request";
import { RateLimitError } from "@/lib/security/rate-limit";

export function unauthorized(): NextResponse {
  return noStoreJson({ error: "UNAUTHORIZED" }, 401);
}

export function noStoreJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

export function apiError(error: unknown): NextResponse {
  if (error instanceof RequestSecurityError) {
    return noStoreJson({ error: error.code }, error.status);
  }
  if (error instanceof RateLimitError) {
    return noStoreJson({ error: error.code }, error.status);
  }
  if (error instanceof PocketBaseBusinessError) {
    let message = "";
    try { message = String((JSON.parse(error.safeBody) as { message?: string }).message ?? ""); } catch {}
    const code =
      message.includes("overlaps") ? "SCHEDULE_CONFLICT" :
      message.includes("three upcoming") ? "RESERVATION_LIMIT" :
      message.includes("temporarily suspended") ? "SUSPENDED" :
      message.includes("other participants") ? "HOST_CANCEL_LOCKED" :
      message.includes("full") ? "SESSION_FULL" :
      "REQUEST_REJECTED";
    return noStoreJson({ error: code }, error.status);
  }
  if (error instanceof SyntaxError) {
    return noStoreJson({ error: "INVALID_JSON" }, 400);
  }
  if (error instanceof z.ZodError) {
    return noStoreJson({ error: "INVALID_INPUT" }, 400);
  }
  if (typeof error === "object" && error !== null && "status" in error && typeof error.status === "number" && error.status >= 400 && error.status < 500) {
    return noStoreJson({ error: "REQUEST_REJECTED" }, error.status);
  }
  console.error("Unhandled API error", error);
  return noStoreJson({ error: "INTERNAL_ERROR" }, 500);
}
