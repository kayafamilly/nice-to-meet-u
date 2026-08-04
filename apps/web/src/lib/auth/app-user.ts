import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { callBusinessRoute } from "@/lib/pocketbase/server";
import type { CurrentUser } from "@/types/api";

export const requireCurrentUser = cache(async () => {
  const session = await getServerSession();
  if (!session) redirect("/login");

  try {
    const user = await callBusinessRoute<CurrentUser>("/api/ntmy/me", { method: "GET" }, session);
    return { session, user };
  } catch {
    redirect("/login");
  }
});

export const requireOnboardedUser = cache(async () => {
  const current = await requireCurrentUser();
  if (!current.user.onboardingCompleted) redirect("/app/onboarding");
  return current;
});
