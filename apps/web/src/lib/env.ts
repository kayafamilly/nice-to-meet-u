import { z } from "zod";

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_LIVEKIT_WS_URL: z.string().url(),
  POCKETBASE_INTERNAL_URL: z.string().url(),
  LIVEKIT_HTTP_URL: z.string().url(),
  LIVEKIT_API_KEY: z.string().min(1),
  LIVEKIT_API_SECRET: z.string().min(32),
  POCKETBASE_INTERNAL_WEBHOOK_SECRET: z.string().min(32),
  NOTIFICATION_WORKER_SECRET: z.string().min(32),
  LIVEKIT_LIFECYCLE_WORKER_SECRET: z.string().min(32),
  VAPID_SUBJECT: z.string().min(1),
  VAPID_PUBLIC_KEY: z.string().min(32),
  VAPID_PRIVATE_KEY: z.string().min(32),
  SESSION_ENCRYPTION_SECRET: z.string().regex(/^[A-Za-z0-9_-]{43}$/, "must be a 32-byte base64url value"),
  MANAGEMENT_PASSWORD_HASH: z.string().optional(),
  MANAGEMENT_SESSION_SECRET: z.string().regex(/^[A-Za-z0-9_-]{43}$/).optional(),
  MANAGEMENT_INTERNAL_SECRET: z.string().min(32).optional(),
  ANALYTICS_HASH_SECRET: z.string().min(32).optional()
});

const publicSchema = serverSchema.pick({
  NEXT_PUBLIC_APP_URL: true,
  NEXT_PUBLIC_LIVEKIT_WS_URL: true
});

let cachedServerEnv: z.infer<typeof serverSchema> | undefined;

export function getServerEnv(): z.infer<typeof serverSchema> {
  if (!cachedServerEnv) {
    cachedServerEnv = serverSchema.parse(process.env);
  }

  return cachedServerEnv;
}

export function getPublicEnv(): z.infer<typeof publicSchema> {
  return publicSchema.parse(process.env);
}
