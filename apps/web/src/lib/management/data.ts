import "server-only";
import { RoomServiceClient } from "livekit-server-sdk";
import { getServerEnv } from "@/lib/env";
import { internalManagementSecret } from "@/lib/management/auth";
import type { ManagementSystemStatus } from "@/types/api";

export async function managementData<T>(section: string, query: Record<string, string | number | undefined> = {}): Promise<T> {
  const url = new URL("/api/ntmy/internal/management/data", getServerEnv().POCKETBASE_INTERNAL_URL);
  url.searchParams.set("section", section);
  for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  const response = await fetch(url, { headers: { "X-Management-Internal-Secret": internalManagementSecret() }, cache: "no-store" });
  if (!response.ok) throw new Error(`Management data request failed (${response.status})`);
  return response.json() as Promise<T>;
}

export async function managementInternal<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(new URL(path, getServerEnv().POCKETBASE_INTERNAL_URL), { ...init, headers: { Accept: "application/json", "X-Management-Internal-Secret": internalManagementSecret(), ...init.headers }, cache: "no-store" });
  if (!response.ok) throw new Error(`Management internal request failed (${response.status})`);
  return response.json() as Promise<T>;
}

export async function managementSystemStatus(): Promise<ManagementSystemStatus> {
  const data = await managementData<Pick<ManagementSystemStatus, "failedNotifications" | "failedWebhooks" | "lastWebhookAt" | "notificationWorkerLastSeenAt" | "liveKitWorkerLastSeenAt">>("system");
  const env = getServerEnv();
  let pocketBase: ManagementSystemStatus["pocketBase"] = "unavailable";
  let liveKit: ManagementSystemStatus["liveKit"] = "unavailable";
  try { pocketBase = (await fetch(new URL("/api/health", env.POCKETBASE_INTERNAL_URL), { cache: "no-store" })).ok ? "healthy" : "unavailable"; } catch {}
  try { await new RoomServiceClient(env.LIVEKIT_HTTP_URL, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET).listRooms(); liveKit = "healthy"; } catch {}
  const fresh = (value: string | null, threshold: number) => value !== null && Date.now() - Date.parse(value) <= threshold;
  return { ...data, pocketBase, liveKit, web: "healthy", notificationWorker: !fresh(data.notificationWorkerLastSeenAt, 90_000) ? "unavailable" : data.failedNotifications ? "attention" : "active", liveKitWorker: !fresh(data.liveKitWorkerLastSeenAt, 20_000) ? "unavailable" : data.failedWebhooks ? "attention" : "active" };
}
