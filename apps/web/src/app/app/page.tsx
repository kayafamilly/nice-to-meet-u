import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/app-user";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { user } = await requireCurrentUser();
  if (!user.onboardingCompleted) redirect("/app/onboarding");

  redirect("/app/sessions");
}
