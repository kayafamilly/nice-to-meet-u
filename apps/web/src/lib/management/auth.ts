import "server-only";

import { createHash } from "node:crypto";
import { base64url, EncryptJWT, jwtDecrypt } from "jose";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerEnv } from "@/lib/env";
import { verifyScryptPassword } from "@/lib/management/crypto";

const TTL_SECONDS = 8 * 60 * 60;

function managementConfig() {
  const env = getServerEnv();
  if (!env.MANAGEMENT_PASSWORD_HASH || !env.MANAGEMENT_SESSION_SECRET || !env.MANAGEMENT_INTERNAL_SECRET || !env.ANALYTICS_HASH_SECRET) {
    throw new Error("Management is not configured");
  }
  return env as typeof env & Required<Pick<typeof env, "MANAGEMENT_PASSWORD_HASH" | "MANAGEMENT_SESSION_SECRET" | "MANAGEMENT_INTERNAL_SECRET" | "ANALYTICS_HASH_SECRET">>;
}

function cookieName(): string {
  return new URL(getServerEnv().NEXT_PUBLIC_APP_URL).protocol === "https:" ? "__Host-ntmy-management" : "ntmy-management";
}

export function verifyManagementPassword(password: string): boolean {
  return verifyScryptPassword(password, managementConfig().MANAGEMENT_PASSWORD_HASH);
}

export async function createManagementSession(): Promise<void> {
  const config = managementConfig();
  const token = await new EncryptJWT({ role: "owner", purpose: "management" })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" }).setIssuedAt().setExpirationTime(`${TTL_SECONDS}s`)
    .encrypt(base64url.decode(config.MANAGEMENT_SESSION_SECRET));
  (await cookies()).set(cookieName(), token, { httpOnly: true, secure: cookieName().startsWith("__Host-"), sameSite: "strict", maxAge: TTL_SECONDS, path: "/" });
}

export async function hasManagementSession(): Promise<boolean> {
  const value = (await cookies()).get(cookieName())?.value;
  if (!value) return false;
  try {
    const { payload } = await jwtDecrypt(value, base64url.decode(managementConfig().MANAGEMENT_SESSION_SECRET));
    return payload.role === "owner" && payload.purpose === "management";
  } catch { return false; }
}

export async function requireManagementSession(): Promise<void> {
  if (!await hasManagementSession()) redirect("/management/login");
}

export async function destroyManagementSession(): Promise<void> {
  (await cookies()).delete(cookieName());
}

export async function managementFingerprint(): Promise<string> {
  const values = await headers();
  const forwarded = values.get("x-forwarded-for")?.split(",").map((value) => value.trim()).filter(Boolean);
  const ip = forwarded?.[0] ?? values.get("x-real-ip") ?? "unknown";
  return createHash("sha256").update(`${managementConfig().ANALYTICS_HASH_SECRET}:${ip}`).digest("hex");
}

export function internalManagementSecret(): string { return managementConfig().MANAGEMENT_INTERNAL_SECRET; }
