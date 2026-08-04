import "server-only";

import PocketBase from "pocketbase";
import { getServerEnv } from "@/lib/env";
import type { ServerSession } from "@/lib/auth/session";

export function pocketBaseForSession(session?: ServerSession): PocketBase {
  const pb = new PocketBase(getServerEnv().POCKETBASE_INTERNAL_URL);
  pb.autoCancellation(false);
  if (session) {
    pb.authStore.save(session.pocketBaseToken, null);
  }
  return pb;
}

export async function callBusinessRoute<T>(
  path: string,
  init: RequestInit,
  session: ServerSession
): Promise<T> {
  const response = await fetch(`${getServerEnv().POCKETBASE_INTERNAL_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.pocketBaseToken}`,
      ...init.headers
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const body = await response.text();
    throw new PocketBaseBusinessError(response.status, body);
  }

  return response.json() as Promise<T>;
}

export async function callInternalBusinessRoute<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${getServerEnv().POCKETBASE_INTERNAL_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "X-Internal-Webhook-Secret": getServerEnv().POCKETBASE_INTERNAL_WEBHOOK_SECRET,
      ...init.headers
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new PocketBaseBusinessError(response.status, await response.text());
  }

  return response.json() as Promise<T>;
}

export class PocketBaseBusinessError extends Error {
  constructor(
    public readonly status: number,
    public readonly safeBody: string
  ) {
    super(`PocketBase business route failed with ${status}`);
  }
}
