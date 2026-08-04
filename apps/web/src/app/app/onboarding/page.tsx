import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding-form";
import { requireCurrentUser } from "@/lib/auth/app-user";

export default async function OnboardingPage() {
  const { user } = await requireCurrentUser();
  if (user.onboardingCompleted) redirect("/app/sessions");
  return <main className="onboarding-page"><OnboardingForm /></main>;
}
