import "server-only";

import { base64url, EncryptJWT, jwtDecrypt } from "jose";
import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env";

const SESSION_TTL_SECONDS = 12 * 60 * 60;

export type ServerSession = {
  userId: string;
  pocketBaseToken: string;
};

function secret(): Uint8Array {
  return base64url.decode(getServerEnv().SESSION_ENCRYPTION_SECRET);
}

function usesSecureCookies(): boolean {
  return new URL(getServerEnv().NEXT_PUBLIC_APP_URL).protocol === "https:";
}

function cookieName(): string {
  return usesSecureCookies() ? "__Host-ntmy-session" : "ntmy-session";
}

export async function createSession(session: ServerSession): Promise<void> {
  const token = await new EncryptJWT({ userId: session.userId, pocketBaseToken: session.pocketBaseToken })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .encrypt(secret());

  const cookieStore = await cookies();
  cookieStore.set(cookieName(), token, {
    httpOnly: true,
    secure: usesSecureCookies(),
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS,
    path: "/"
  });
}

export async function getServerSession(): Promise<ServerSession | null> {
  const cookieStore = await cookies();
  const encrypted = cookieStore.get(cookieName())?.value;

  if (!encrypted) {
    return null;
  }

  try {
    const { payload } = await jwtDecrypt(encrypted, secret());
    if (typeof payload.userId !== "string" || typeof payload.pocketBaseToken !== "string") {
      return null;
    }

    return { userId: payload.userId, pocketBaseToken: payload.pocketBaseToken };
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName());
}
